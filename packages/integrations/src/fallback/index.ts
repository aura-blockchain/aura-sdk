import { v4 as uuidv4 } from 'uuid';

export interface FallbackConfig {
  provider: 'manual' | 'document_scan';
  enabled: boolean;
  triggerConditions: ('network_error' | 'aura_unavailable' | 'user_no_aura')[];
  requireApproval?: boolean;
  approverRoles?: string[];
  photoRequired?: boolean;
  notesRequired?: boolean;
}

export interface AuraVerifierError {
  code: string;
  message: string;
  type: 'network' | 'blockchain' | 'user' | 'system';
  recoverable: boolean;
}

export interface ManualVerificationRecord {
  id: string;
  timestamp: Date;
  documentType: string;
  verifierNotes: string;
  verifierId?: string;
  verifierName?: string;
  photoEvidence?: Buffer;
  photoHash?: string;

  extractedData: {
    fullName?: string;
    dateOfBirth?: string;
    documentNumber?: string;
    expirationDate?: string;
    issuingAuthority?: string;
  };

  verification: {
    ageVerified: boolean;
    documentAuthentic: boolean;
    photoMatches: boolean;
    notExpired: boolean;
  };

  approval?: {
    approved: boolean;
    approvedBy: string;
    approvedAt: Date;
    comments?: string;
  };

  metadata?: Record<string, string>;
}

export interface DocumentScanResult {
  success: boolean;
  documentType: string;
  confidence: number;
  extractedData: Record<string, string>;
  warnings: string[];
}

export class FallbackVerification {
  private config: FallbackConfig;
  private manualRecords: Map<string, ManualVerificationRecord> = new Map();

  constructor(config: FallbackConfig) {
    this.config = {
      requireApproval: false,
      approverRoles: ['manager', 'supervisor'],
      photoRequired: true,
      notesRequired: true,
      ...config,
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (this.config.triggerConditions.length === 0) {
      throw new Error('At least one trigger condition must be specified');
    }

    const validTriggers = ['network_error', 'aura_unavailable', 'user_no_aura'];
    for (const trigger of this.config.triggerConditions) {
      if (!validTriggers.includes(trigger)) {
        throw new Error(`Invalid trigger condition: ${trigger}`);
      }
    }

    const validProviders = ['manual', 'document_scan'];
    if (!validProviders.includes(this.config.provider)) {
      throw new Error(`Invalid fallback provider: ${this.config.provider}`);
    }
  }

  shouldUseFallback(error: AuraVerifierError): boolean {
    if (!this.config.enabled) {
      return false;
    }

    // Check if error type matches trigger conditions
    switch (error.type) {
      case 'network':
        return this.config.triggerConditions.includes('network_error');

      case 'blockchain':
        return this.config.triggerConditions.includes('aura_unavailable');

      case 'user':
        // User doesn't have Aura credentials
        if (error.code === 'NO_CREDENTIALS' || error.code === 'NO_WALLET') {
          return this.config.triggerConditions.includes('user_no_aura');
        }
        return false;

      case 'system':
        return this.config.triggerConditions.includes('aura_unavailable');

      default:
        return false;
    }
  }

  async recordManualVerification(
    documentType: string,
    verifierNotes: string,
    photoEvidence?: Buffer,
    verifierId?: string,
    verifierName?: string
  ): Promise<ManualVerificationRecord> {
    // Validate required fields
    if (this.config.notesRequired && !verifierNotes) {
      throw new Error('Verifier notes are required for manual verification');
    }

    if (this.config.photoRequired && !photoEvidence) {
      throw new Error('Photo evidence is required for manual verification');
    }

    const record: ManualVerificationRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      documentType,
      verifierNotes,
      verifierId,
      verifierName,
      photoEvidence,
      photoHash: photoEvidence ? this.hashPhoto(photoEvidence) : undefined,

      extractedData: this.extractDataFromNotes(verifierNotes, documentType),

      verification: {
        ageVerified: false,
        documentAuthentic: false,
        photoMatches: false,
        notExpired: false,
      },
    };

    // Perform automatic verification checks
    await this.performVerificationChecks(record);

    // Store record
    this.manualRecords.set(record.id, record);

    return record;
  }

  private hashPhoto(photo: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(photo).digest('hex');
  }

  private extractDataFromNotes(
    notes: string,
    _documentType: string
  ): ManualVerificationRecord['extractedData'] {
    const data: ManualVerificationRecord['extractedData'] = {};

    // Simple pattern matching (in production, use more sophisticated NLP)
    const patterns = {
      fullName: /name:?\s*([^\n,]+)/i,
      dateOfBirth: /(?:dob|date of birth|born):?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      documentNumber: /(?:id|license|doc)(?:\s*#|num)?:?\s*([A-Z0-9-]+)/i,
      expirationDate: /(?:exp|expires?):?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      issuingAuthority: /(?:issued by|issuer):?\s*([^\n,]+)/i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = notes.match(pattern);
      if (match && match[1]) {
        data[key as keyof typeof data] = match[1].trim();
      }
    }

    return data;
  }

  private async performVerificationChecks(record: ManualVerificationRecord): Promise<void> {
    // Check age verification
    if (record.extractedData.dateOfBirth) {
      const dob = this.parseDate(record.extractedData.dateOfBirth);
      if (dob) {
        const age = this.calculateAge(dob);
        record.verification.ageVerified = age >= 18;
      }
    }

    // Check document expiration
    if (record.extractedData.expirationDate) {
      const expDate = this.parseDate(record.extractedData.expirationDate);
      if (expDate) {
        record.verification.notExpired = expDate > new Date();
      }
    }

    // Document authenticity would require more advanced checks
    // For now, mark as true if document number is present
    record.verification.documentAuthentic = !!record.extractedData.documentNumber;

    // Photo match would require facial recognition
    // For now, mark as true if photo is provided
    record.verification.photoMatches = !!record.photoEvidence;
  }

  private parseDate(dateStr: string): Date | null {
    // Try multiple date formats
    const formats = [
      /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // MM/DD/YYYY
      /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY/MM/DD
      /(\d{1,2})[-/](\d{1,2})[-/](\d{2})/, // MM/DD/YY
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        const [, p1, p2, p3] = match;

        // Determine which format it is
        if (p1.length === 4) {
          // YYYY/MM/DD
          return new Date(parseInt(p1), parseInt(p2) - 1, parseInt(p3));
        } else if (p3.length === 4) {
          // MM/DD/YYYY
          return new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2));
        } else {
          // MM/DD/YY - assume 20xx
          const year = 2000 + parseInt(p3);
          return new Date(year, parseInt(p1) - 1, parseInt(p2));
        }
      }
    }

    return null;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  async approveVerification(
    recordId: string,
    approvedBy: string,
    approved: boolean,
    comments?: string
  ): Promise<ManualVerificationRecord> {
    const record = this.manualRecords.get(recordId);

    if (!record) {
      throw new Error(`Manual verification record not found: ${recordId}`);
    }

    if (record.approval) {
      throw new Error('Verification has already been approved/rejected');
    }

    record.approval = {
      approved,
      approvedBy,
      approvedAt: new Date(),
      comments,
    };

    this.manualRecords.set(recordId, record);
    return record;
  }

  getRecord(recordId: string): ManualVerificationRecord | undefined {
    return this.manualRecords.get(recordId);
  }

  async queryRecords(filter: {
    startDate?: Date;
    endDate?: Date;
    documentType?: string;
    verifierId?: string;
    approved?: boolean;
    pendingApproval?: boolean;
  }): Promise<ManualVerificationRecord[]> {
    let records = Array.from(this.manualRecords.values());

    if (filter.startDate) {
      records = records.filter((r) => r.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      records = records.filter((r) => r.timestamp <= filter.endDate!);
    }

    if (filter.documentType) {
      records = records.filter((r) => r.documentType === filter.documentType);
    }

    if (filter.verifierId) {
      records = records.filter((r) => r.verifierId === filter.verifierId);
    }

    if (filter.approved !== undefined) {
      records = records.filter((r) => r.approval?.approved === filter.approved);
    }

    if (filter.pendingApproval) {
      records = records.filter((r) => !r.approval);
    }

    return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async scanDocument(_imageData: Buffer): Promise<DocumentScanResult> {
    // This would integrate with a document scanning service
    // For now, return a mock result

    return {
      success: true,
      documentType: 'drivers_license',
      confidence: 0.95,
      extractedData: {
        fullName: 'EXTRACTED FROM SCAN',
        dateOfBirth: '01/01/1990',
        documentNumber: 'DL123456',
        expirationDate: '12/31/2025',
        issuingAuthority: 'State DMV',
      },
      warnings: [],
    };
  }

  async createFromScan(
    scanResult: DocumentScanResult,
    verifierNotes: string,
    photoEvidence?: Buffer
  ): Promise<ManualVerificationRecord> {
    if (!scanResult.success) {
      throw new Error('Document scan was not successful');
    }

    if (scanResult.confidence < 0.7) {
      throw new Error('Document scan confidence too low. Manual verification required.');
    }

    const record: ManualVerificationRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      documentType: scanResult.documentType,
      verifierNotes: verifierNotes + '\n\nAuto-extracted from document scan.',
      photoEvidence,
      photoHash: photoEvidence ? this.hashPhoto(photoEvidence) : undefined,

      extractedData: {
        fullName: scanResult.extractedData.fullName,
        dateOfBirth: scanResult.extractedData.dateOfBirth,
        documentNumber: scanResult.extractedData.documentNumber,
        expirationDate: scanResult.extractedData.expirationDate,
        issuingAuthority: scanResult.extractedData.issuingAuthority,
      },

      verification: {
        ageVerified: false,
        documentAuthentic: scanResult.confidence > 0.8,
        photoMatches: false,
        notExpired: false,
      },

      metadata: {
        scanConfidence: scanResult.confidence.toString(),
        warnings: scanResult.warnings.join('; '),
      },
    };

    await this.performVerificationChecks(record);
    this.manualRecords.set(record.id, record);

    return record;
  }

  isApprovalRequired(): boolean {
    return this.config.requireApproval || false;
  }

  canApprove(userRole: string): boolean {
    if (!this.config.requireApproval) {
      return true;
    }

    return this.config.approverRoles?.includes(userRole) || false;
  }

  exportRecords(format: 'json' | 'csv'): Buffer {
    const records = Array.from(this.manualRecords.values());

    if (format === 'json') {
      return Buffer.from(JSON.stringify(records, null, 2), 'utf8');
    } else {
      // CSV export
      const headers = [
        'ID',
        'Timestamp',
        'Document Type',
        'Full Name',
        'DOB',
        'Document Number',
        'Age Verified',
        'Document Authentic',
        'Approved',
      ];

      const rows = records.map((r) => [
        r.id,
        r.timestamp.toISOString(),
        r.documentType,
        r.extractedData.fullName || '',
        r.extractedData.dateOfBirth || '',
        r.extractedData.documentNumber || '',
        r.verification.ageVerified.toString(),
        r.verification.documentAuthentic.toString(),
        r.approval?.approved?.toString() || 'pending',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      return Buffer.from(csv, 'utf8');
    }
  }
}
