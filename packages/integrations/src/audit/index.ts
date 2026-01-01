import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface AuditConfig {
  storage: 'local' | 'remote';
  remoteEndpoint?: string;
  encryptLogs?: boolean;
  retentionDays?: number;
  localStoragePath?: string;
  encryptionKey?: string; // hex-encoded 32-byte key
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: 'verification' | 'sync' | 'error' | 'config_change';
  verificationId?: string;
  result?: 'success' | 'failure';
  holderDID?: string;
  verifierAddress?: string;
  attributes?: string[]; // Which attributes were disclosed
  deviceId: string;
  location?: GeoLocation;
  metadata?: Record<string, string>;
}

export interface AuditFilter {
  startDate?: Date;
  endDate?: Date;
  type?: AuditEvent['type'];
  result?: 'success' | 'failure';
  holderDID?: string;
  verifierAddress?: string;
  deviceId?: string;
  limit?: number;
}

export interface AuditSummary {
  totalEvents: number;
  byType: Record<string, number>;
  byResult: Record<string, number>;
  dateRange: { start: Date; end: Date };
  uniqueHolders: number;
  uniqueDevices: number;
}

export class AuditLogger {
  private config: AuditConfig;
  private events: AuditEvent[] = [];
  private encryptionKey?: Buffer;

  constructor(config: AuditConfig) {
    this.config = {
      retentionDays: 90,
      localStoragePath: './audit-logs',
      ...config
    };

    this.validateConfig();
    this.initializeEncryption();
  }

  private validateConfig(): void {
    if (this.config.storage === 'remote' && !this.config.remoteEndpoint) {
      throw new Error('Remote endpoint required for remote storage');
    }

    if (this.config.encryptLogs && !this.config.encryptionKey) {
      throw new Error('Encryption key required when encryptLogs is true');
    }

    if (this.config.encryptionKey && this.config.encryptionKey.length !== 64) {
      throw new Error('Encryption key must be 64 hex characters (32 bytes)');
    }
  }

  private initializeEncryption(): void {
    if (this.config.encryptLogs && this.config.encryptionKey) {
      this.encryptionKey = Buffer.from(this.config.encryptionKey, 'hex');
    }
  }

  async log(event: AuditEvent): Promise<void> {
    // Ensure event has ID and timestamp
    const eventToLog: AuditEvent = {
      ...event,
      id: event.id || uuidv4(),
      timestamp: event.timestamp || new Date()
    };

    // Store in memory
    this.events.push(eventToLog);

    // Persist based on storage type
    if (this.config.storage === 'local') {
      await this.saveToLocalStorage(eventToLog);
    } else if (this.config.storage === 'remote') {
      await this.saveToRemoteStorage(eventToLog);
    }

    // Auto-purge old events
    await this.purgeOld();
  }

  private async saveToLocalStorage(event: AuditEvent): Promise<void> {
    const storagePath = this.config.localStoragePath!;

    try {
      await fs.mkdir(storagePath, { recursive: true });

      const dateStr = event.timestamp.toISOString().split('T')[0];
      const fileName = `audit-${dateStr}.jsonl`;
      const filePath = path.join(storagePath, fileName);

      let eventData = JSON.stringify(event) + '\n';

      if (this.config.encryptLogs && this.encryptionKey) {
        eventData = this.encrypt(eventData);
      }

      await fs.appendFile(filePath, eventData);
    } catch (error) {
      console.error('Failed to save audit event to local storage:', error);
      throw error;
    }
  }

  private async saveToRemoteStorage(event: AuditEvent): Promise<void> {
    try {
      let payload = JSON.stringify(event);

      if (this.config.encryptLogs && this.encryptionKey) {
        payload = this.encrypt(payload);
      }

      const response = await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Audit-Event-ID': event.id
        },
        body: payload
      });

      if (!response.ok) {
        throw new Error(`Remote storage failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to save audit event to remote storage:', error);
      // Fallback to local storage
      await this.saveToLocalStorage(event);
    }
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted
    }) + '\n';
  }

  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) {
      return encryptedData;
    }

    const { iv, data } = JSON.parse(encryptedData);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async query(filter: AuditFilter = {}): Promise<AuditEvent[]> {
    let events: AuditEvent[] = [];

    if (this.config.storage === 'local') {
      events = await this.queryLocalStorage(filter);
    } else if (this.config.storage === 'remote') {
      events = await this.queryRemoteStorage(filter);
    } else {
      events = [...this.events];
    }

    return this.filterEvents(events, filter);
  }

  private async queryLocalStorage(_filter: AuditFilter): Promise<AuditEvent[]> {
    const storagePath = this.config.localStoragePath!;
    const events: AuditEvent[] = [];

    try {
      const files = await fs.readdir(storagePath);

      for (const file of files) {
        if (!file.startsWith('audit-') || !file.endsWith('.jsonl')) {
          continue;
        }

        const filePath = path.join(storagePath, file);
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          try {
            let eventData = line;
            if (this.config.encryptLogs && this.encryptionKey) {
              eventData = this.decrypt(line);
            }

            const event = JSON.parse(eventData);
            event.timestamp = new Date(event.timestamp);
            events.push(event);
          } catch (error) {
            console.error('Failed to parse audit event:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to query local storage:', error);
    }

    return events;
  }

  private async queryRemoteStorage(filter: AuditFilter): Promise<AuditEvent[]> {
    try {
      const queryParams = new URLSearchParams();
      if (filter.startDate) queryParams.set('start', filter.startDate.toISOString());
      if (filter.endDate) queryParams.set('end', filter.endDate.toISOString());
      if (filter.type) queryParams.set('type', filter.type);
      if (filter.result) queryParams.set('result', filter.result);
      if (filter.limit) queryParams.set('limit', filter.limit.toString());

      const response = await fetch(
        `${this.config.remoteEndpoint}/query?${queryParams}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`Remote query failed: ${response.status}`);
      }

      const data = await response.json() as { events: AuditEvent[] };
      return data.events.map((e: AuditEvent) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }));
    } catch (error) {
      console.error('Failed to query remote storage:', error);
      return [];
    }
  }

  private filterEvents(events: AuditEvent[], filter: AuditFilter): AuditEvent[] {
    let filtered = events;

    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }

    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }

    if (filter.result) {
      filtered = filtered.filter(e => e.result === filter.result);
    }

    if (filter.holderDID) {
      filtered = filtered.filter(e => e.holderDID === filter.holderDID);
    }

    if (filter.verifierAddress) {
      filtered = filtered.filter(e => e.verifierAddress === filter.verifierAddress);
    }

    if (filter.deviceId) {
      filtered = filtered.filter(e => e.deviceId === filter.deviceId);
    }

    // Sort by timestamp descending (most recent first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  async export(format: 'csv' | 'json' | 'pdf', filter?: AuditFilter): Promise<Buffer> {
    const events = await this.query(filter || {});

    switch (format) {
      case 'csv':
        return this.exportCSV(events);
      case 'json':
        return this.exportJSON(events);
      case 'pdf':
        return this.exportPDF(events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportCSV(events: AuditEvent[]): Buffer {
    const headers = [
      'ID',
      'Timestamp',
      'Type',
      'Result',
      'Verification ID',
      'Holder DID',
      'Verifier Address',
      'Attributes',
      'Device ID',
      'Location'
    ];

    const rows = events.map(e => [
      e.id,
      e.timestamp.toISOString(),
      e.type,
      e.result || '',
      e.verificationId || '',
      e.holderDID || '',
      e.verifierAddress || '',
      e.attributes?.join(';') || '',
      e.deviceId,
      e.location ? `${e.location.latitude},${e.location.longitude}` : ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return Buffer.from(csv, 'utf8');
  }

  private exportJSON(events: AuditEvent[]): Buffer {
    const data = {
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events
    };

    return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  }

  private exportPDF(events: AuditEvent[]): Buffer {
    // Simple PDF generation (in production, use a library like pdfkit)
    const content = [
      'AUDIT LOG REPORT',
      '================',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total Events: ${events.length}`,
      '',
      'EVENTS',
      '======',
      '',
      ...events.map(e => [
        `ID: ${e.id}`,
        `Timestamp: ${e.timestamp.toISOString()}`,
        `Type: ${e.type}`,
        `Result: ${e.result || 'N/A'}`,
        `Device: ${e.deviceId}`,
        '---'
      ].join('\n'))
    ].join('\n');

    return Buffer.from(content, 'utf8');
  }

  async purgeOld(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays!);

    let deleted = 0;

    if (this.config.storage === 'local') {
      deleted = await this.purgeLocalStorage(cutoffDate);
    }

    // Remove from memory cache
    const originalLength = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= cutoffDate);
    deleted += originalLength - this.events.length;

    return deleted;
  }

  private async purgeLocalStorage(cutoffDate: Date): Promise<number> {
    const storagePath = this.config.localStoragePath!;
    let deleted = 0;

    try {
      const files = await fs.readdir(storagePath);

      for (const file of files) {
        if (!file.startsWith('audit-') || !file.endsWith('.jsonl')) {
          continue;
        }

        // Extract date from filename (audit-YYYY-MM-DD.jsonl)
        const dateMatch = file.match(/audit-(\d{4}-\d{2}-\d{2})\.jsonl/);
        if (!dateMatch) continue;

        const fileDate = new Date(dateMatch[1]);
        if (fileDate < cutoffDate) {
          const filePath = path.join(storagePath, file);
          await fs.unlink(filePath);
          deleted++;
        }
      }
    } catch (error) {
      console.error('Failed to purge old audit logs:', error);
    }

    return deleted;
  }

  async getSummary(filter?: AuditFilter): Promise<AuditSummary> {
    const events = await this.query(filter || {});

    const byType: Record<string, number> = {};
    const byResult: Record<string, number> = {};
    const uniqueHolders = new Set<string>();
    const uniqueDevices = new Set<string>();

    let minDate = new Date();
    let maxDate = new Date(0);

    for (const event of events) {
      byType[event.type] = (byType[event.type] || 0) + 1;

      if (event.result) {
        byResult[event.result] = (byResult[event.result] || 0) + 1;
      }

      if (event.holderDID) {
        uniqueHolders.add(event.holderDID);
      }

      uniqueDevices.add(event.deviceId);

      if (event.timestamp < minDate) minDate = event.timestamp;
      if (event.timestamp > maxDate) maxDate = event.timestamp;
    }

    return {
      totalEvents: events.length,
      byType,
      byResult,
      dateRange: { start: minDate, end: maxDate },
      uniqueHolders: uniqueHolders.size,
      uniqueDevices: uniqueDevices.size
    };
  }
}
