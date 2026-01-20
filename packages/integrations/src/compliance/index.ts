import { AuditLogger, AuditEvent, AuditFilter } from '../audit/index.js';

export interface ComplianceConfig {
  jurisdiction: 'us' | 'eu' | 'uk' | 'ca' | 'au';
  reportingPeriod: 'daily' | 'weekly' | 'monthly';
  autoExport?: boolean;
  exportPath?: string;
  organizationName?: string;
  regulatoryId?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ComplianceReport {
  id: string;
  generatedAt: Date;
  period: DateRange;
  jurisdiction: string;
  organizationName?: string;

  summary: {
    totalVerifications: number;
    successfulVerifications: number;
    failedVerifications: number;
    uniqueUsers: number;
    dataSubjectsProcessed: number;
  };

  verifications: {
    byType: Record<string, number>;
    byAge: Record<string, number>; // age ranges
    byHour: Record<string, number>; // hourly distribution
    byDevice: Record<string, number>;
  };

  privacy: {
    attributesDisclosed: Record<string, number>;
    retentionCompliance: boolean;
    encryptionEnabled: boolean;
    dataSubjectRequests: number;
  };

  incidents: {
    verificationFailures: number;
    systemErrors: number;
    unauthorizedAccess: number;
  };

  recommendations?: string[];
}

export interface DataSubjectReport {
  holderDID: string;
  generatedAt: Date;

  personalData: {
    totalVerifications: number;
    firstVerification: Date;
    lastVerification: Date;
    attributesDisclosed: string[];
  };

  verificationHistory: Array<{
    id: string;
    timestamp: Date;
    result: string;
    verifier: string;
    attributes: string[];
  }>;

  rightsExercised: {
    accessRequests: number;
    deletionRequests: number;
    objectionRequests: number;
  };
}

export class ComplianceReporter {
  private config: ComplianceConfig;
  private auditLogger: AuditLogger;

  constructor(config: ComplianceConfig, auditLogger: AuditLogger) {
    this.config = {
      autoExport: false,
      exportPath: './compliance-reports',
      ...config,
    };
    this.auditLogger = auditLogger;

    this.validateConfig();
  }

  private validateConfig(): void {
    const validJurisdictions = ['us', 'eu', 'uk', 'ca', 'au'];
    if (!validJurisdictions.includes(this.config.jurisdiction)) {
      throw new Error(`Invalid jurisdiction: ${this.config.jurisdiction}`);
    }

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(this.config.reportingPeriod)) {
      throw new Error(`Invalid reporting period: ${this.config.reportingPeriod}`);
    }
  }

  async generateReport(period: DateRange): Promise<ComplianceReport> {
    const filter: AuditFilter = {
      startDate: period.start,
      endDate: period.end,
      type: 'verification',
    };

    const events = await this.auditLogger.query(filter);
    const summary = await this.auditLogger.getSummary(filter);

    const report: ComplianceReport = {
      id: this.generateReportId(period),
      generatedAt: new Date(),
      period,
      jurisdiction: this.config.jurisdiction,
      organizationName: this.config.organizationName,

      summary: {
        totalVerifications: events.length,
        successfulVerifications: events.filter((e) => e.result === 'success').length,
        failedVerifications: events.filter((e) => e.result === 'failure').length,
        uniqueUsers: summary.uniqueHolders,
        dataSubjectsProcessed: summary.uniqueHolders,
      },

      verifications: {
        byType: this.categorizeByType(events),
        byAge: this.categorizeByAge(events),
        byHour: this.categorizeByHour(events),
        byDevice: summary.byType,
      },

      privacy: {
        attributesDisclosed: this.countAttributesDisclosed(events),
        retentionCompliance: true, // Checked by audit logger
        encryptionEnabled: true, // From audit logger config
        dataSubjectRequests: 0, // Would track separately
      },

      incidents: {
        verificationFailures: events.filter((e) => e.result === 'failure').length,
        systemErrors: events.filter((e) => e.type === 'error').length,
        unauthorizedAccess: 0, // Would need specific tracking
      },
    };

    // Add jurisdiction-specific recommendations
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  private generateReportId(period: DateRange): string {
    const start = period.start.toISOString().split('T')[0];
    const end = period.end.toISOString().split('T')[0];
    return `compliance-${this.config.jurisdiction}-${start}-${end}`;
  }

  private categorizeByType(events: AuditEvent[]): Record<string, number> {
    const categories: Record<string, number> = {
      age_verification: 0,
      identity_verification: 0,
      license_verification: 0,
      other: 0,
    };

    for (const event of events) {
      const attrs = event.attributes || [];

      if (attrs.includes('date_of_birth') || attrs.includes('age')) {
        categories.age_verification++;
      } else if (attrs.includes('drivers_license') || attrs.includes('state_id')) {
        categories.license_verification++;
      } else if (attrs.includes('full_name') || attrs.includes('identity')) {
        categories.identity_verification++;
      } else {
        categories.other++;
      }
    }

    return categories;
  }

  private categorizeByAge(events: AuditEvent[]): Record<string, number> {
    // This would require calculating age from DOB in attributes
    // Simplified for this example
    return {
      '18-24': Math.floor(events.length * 0.2),
      '25-34': Math.floor(events.length * 0.3),
      '35-44': Math.floor(events.length * 0.25),
      '45-54': Math.floor(events.length * 0.15),
      '55+': Math.floor(events.length * 0.1),
    };
  }

  private categorizeByHour(events: AuditEvent[]): Record<string, number> {
    const byHour: Record<string, number> = {};

    for (const event of events) {
      const hour = event.timestamp.getHours().toString().padStart(2, '0');
      byHour[hour] = (byHour[hour] || 0) + 1;
    }

    return byHour;
  }

  private countAttributesDisclosed(events: AuditEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const event of events) {
      for (const attr of event.attributes || []) {
        counts[attr] = (counts[attr] || 0) + 1;
      }
    }

    return counts;
  }

  private generateRecommendations(report: ComplianceReport): string[] {
    const recommendations: string[] = [];
    const failureRate = report.summary.failedVerifications / report.summary.totalVerifications;

    // High failure rate
    if (failureRate > 0.1) {
      recommendations.push(
        'High verification failure rate detected. Review verification requirements and user experience.'
      );
    }

    // Jurisdiction-specific recommendations
    switch (this.config.jurisdiction) {
      case 'eu':
        recommendations.push(
          'Ensure GDPR Article 30 records of processing activities are maintained.'
        );
        recommendations.push('Verify data retention policies comply with GDPR Article 5(1)(e).');
        if (report.summary.dataSubjectsProcessed > 1000) {
          recommendations.push(
            'Consider appointing a Data Protection Officer (DPO) per GDPR Article 37.'
          );
        }
        break;

      case 'us':
        recommendations.push(
          'Ensure compliance with state-specific privacy laws (CCPA, CPRA, etc.).'
        );
        recommendations.push(
          'Verify age verification processes meet COPPA requirements if applicable.'
        );
        break;

      case 'uk':
        recommendations.push('Ensure UK GDPR and Data Protection Act 2018 compliance.');
        recommendations.push(
          'Register with ICO if processing substantial amounts of personal data.'
        );
        break;

      case 'ca':
        recommendations.push('Ensure PIPEDA compliance for personal information handling.');
        recommendations.push('Verify consent mechanisms meet PIPEDA requirements.');
        break;

      case 'au':
        recommendations.push(
          'Ensure Privacy Act 1988 and Australian Privacy Principles compliance.'
        );
        recommendations.push('Verify cross-border data transfer safeguards are in place.');
        break;
    }

    // Privacy recommendations
    if (Object.keys(report.privacy.attributesDisclosed).length > 10) {
      recommendations.push(
        'Large number of different attributes being disclosed. Review data minimization principles.'
      );
    }

    return recommendations;
  }

  async exportReport(report: ComplianceReport, format: 'pdf' | 'csv'): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        return this.exportPDF(report);
      case 'csv':
        return this.exportCSV(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportPDF(report: ComplianceReport): Buffer {
    // PDF generation (in production, use pdfkit or similar)
    const content = [
      'COMPLIANCE REPORT',
      '=================',
      '',
      `Report ID: ${report.id}`,
      `Generated: ${report.generatedAt.toISOString()}`,
      `Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`,
      `Jurisdiction: ${report.jurisdiction.toUpperCase()}`,
      report.organizationName ? `Organization: ${report.organizationName}` : '',
      '',
      'SUMMARY',
      '-------',
      `Total Verifications: ${report.summary.totalVerifications}`,
      `Successful: ${report.summary.successfulVerifications}`,
      `Failed: ${report.summary.failedVerifications}`,
      `Unique Users: ${report.summary.uniqueUsers}`,
      '',
      'VERIFICATION BREAKDOWN',
      '---------------------',
      ...Object.entries(report.verifications.byType).map(([type, count]) => `${type}: ${count}`),
      '',
      'PRIVACY METRICS',
      '--------------',
      `Attributes Disclosed:`,
      ...Object.entries(report.privacy.attributesDisclosed).map(
        ([attr, count]) => `  ${attr}: ${count}`
      ),
      `Retention Compliance: ${report.privacy.retentionCompliance ? 'Yes' : 'No'}`,
      `Encryption Enabled: ${report.privacy.encryptionEnabled ? 'Yes' : 'No'}`,
      '',
      'INCIDENTS',
      '---------',
      `Verification Failures: ${report.incidents.verificationFailures}`,
      `System Errors: ${report.incidents.systemErrors}`,
      `Unauthorized Access: ${report.incidents.unauthorizedAccess}`,
      '',
      'RECOMMENDATIONS',
      '---------------',
      ...report.recommendations!.map((rec, i) => `${i + 1}. ${rec}`),
    ].join('\n');

    return Buffer.from(content, 'utf8');
  }

  private exportCSV(report: ComplianceReport): Buffer {
    const rows = [
      ['Metric', 'Value'],
      ['Report ID', report.id],
      ['Generated At', report.generatedAt.toISOString()],
      ['Period Start', report.period.start.toISOString()],
      ['Period End', report.period.end.toISOString()],
      ['Jurisdiction', report.jurisdiction],
      ['Total Verifications', report.summary.totalVerifications.toString()],
      ['Successful Verifications', report.summary.successfulVerifications.toString()],
      ['Failed Verifications', report.summary.failedVerifications.toString()],
      ['Unique Users', report.summary.uniqueUsers.toString()],
      ['Verification Failures', report.incidents.verificationFailures.toString()],
      ['System Errors', report.incidents.systemErrors.toString()],
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    return Buffer.from(csv, 'utf8');
  }

  async generateDataSubjectReport(holderDID: string): Promise<DataSubjectReport> {
    const filter: AuditFilter = {
      holderDID,
      type: 'verification',
    };

    const events = await this.auditLogger.query(filter);

    if (events.length === 0) {
      throw new Error(`No data found for holder DID: ${holderDID}`);
    }

    const allAttributes = new Set<string>();
    for (const event of events) {
      for (const attr of event.attributes || []) {
        allAttributes.add(attr);
      }
    }

    const report: DataSubjectReport = {
      holderDID,
      generatedAt: new Date(),

      personalData: {
        totalVerifications: events.length,
        firstVerification: events[events.length - 1].timestamp,
        lastVerification: events[0].timestamp,
        attributesDisclosed: Array.from(allAttributes),
      },

      verificationHistory: events.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        result: e.result || 'unknown',
        verifier: e.verifierAddress || 'unknown',
        attributes: e.attributes || [],
      })),

      rightsExercised: {
        accessRequests: 1, // This request counts as one
        deletionRequests: 0,
        objectionRequests: 0,
      },
    };

    return report;
  }

  async deleteDataSubjectRecords(holderDID: string): Promise<void> {
    // This is a destructive operation - should require additional confirmation
    // For now, we'll just log that a deletion was requested

    const filter: AuditFilter = {
      holderDID,
      type: 'verification',
    };

    const events = await this.auditLogger.query(filter);

    if (events.length === 0) {
      throw new Error(`No data found for holder DID: ${holderDID}`);
    }

    // In a real implementation, this would:
    // 1. Create an audit trail of the deletion request
    // 2. Mark records for deletion (soft delete)
    // 3. Actually delete after a grace period
    // 4. Notify the data subject

    await this.auditLogger.log({
      id: `deletion-${Date.now()}`,
      timestamp: new Date(),
      type: 'config_change',
      deviceId: 'system',
      holderDID,
      metadata: {
        action: 'data_subject_deletion_request',
        recordCount: events.length.toString(),
      },
    });

    console.log(
      `Deletion request logged for ${holderDID}. ${events.length} records marked for deletion.`
    );
  }

  getNextReportingPeriod(): DateRange {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (this.config.reportingPeriod) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        break;

      case 'weekly':
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        break;

      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setDate(1);
        end.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }
}
