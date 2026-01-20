export interface POSIntegrationConfig {
  system: 'square' | 'clover' | 'toast' | 'generic';
  apiKey?: string;
  merchantId?: string;
  environment?: 'production' | 'sandbox';
}

export interface VerificationRequirement {
  type: 'age' | 'identity' | 'license' | 'custom';
  minimumAge?: number;
  attributes?: string[];
  required: boolean;
}

export interface TransactionLink {
  verificationId: string;
  transactionId: string;
  timestamp: Date;
  metadata?: Record<string, string>;
}

export interface ItemVerificationRule {
  itemId: string;
  itemName?: string;
  requirements: VerificationRequirement[];
  category?: string;
}

export class POSIntegration {
  private config: POSIntegrationConfig;
  private verificationLinks: Map<string, TransactionLink> = new Map();
  private itemRules: Map<string, ItemVerificationRule> = new Map();

  constructor(config: POSIntegrationConfig) {
    this.config = {
      ...config,
      environment: config.environment || 'production',
    };

    this.validateConfig();
    this.initializeDefaultRules();
  }

  private validateConfig(): void {
    const validSystems = ['square', 'clover', 'toast', 'generic'];
    if (!validSystems.includes(this.config.system)) {
      throw new Error(`Invalid POS system: ${this.config.system}`);
    }

    if (this.config.system !== 'generic' && !this.config.apiKey) {
      throw new Error(`API key required for ${this.config.system} integration`);
    }
  }

  private initializeDefaultRules(): void {
    // Alcohol
    this.addItemRule({
      itemId: 'alcohol:*',
      requirements: [
        {
          type: 'age',
          minimumAge: 21,
          required: true,
        },
      ],
      category: 'alcohol',
    });

    // Tobacco
    this.addItemRule({
      itemId: 'tobacco:*',
      requirements: [
        {
          type: 'age',
          minimumAge: 21,
          required: true,
        },
      ],
      category: 'tobacco',
    });

    // Cannabis
    this.addItemRule({
      itemId: 'cannabis:*',
      requirements: [
        {
          type: 'age',
          minimumAge: 21,
          required: true,
        },
        {
          type: 'license',
          attributes: ['medical_cannabis_card'],
          required: false,
        },
      ],
      category: 'cannabis',
    });

    // Restricted medications
    this.addItemRule({
      itemId: 'medication:restricted:*',
      requirements: [
        {
          type: 'identity',
          attributes: ['full_name', 'date_of_birth'],
          required: true,
        },
      ],
      category: 'restricted_medication',
    });
  }

  async linkToTransaction(
    verificationId: string,
    transactionId: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const link: TransactionLink = {
      verificationId,
      transactionId,
      timestamp: new Date(),
      metadata,
    };

    this.verificationLinks.set(transactionId, link);

    // Send to POS system if supported
    await this.syncWithPOS(link);
  }

  private async syncWithPOS(link: TransactionLink): Promise<void> {
    switch (this.config.system) {
      case 'square':
        await this.syncSquare(link);
        break;
      case 'clover':
        await this.syncClover(link);
        break;
      case 'toast':
        await this.syncToast(link);
        break;
      case 'generic':
        // No sync for generic system
        break;
    }
  }

  private async syncSquare(link: TransactionLink): Promise<void> {
    // Square API integration
    const endpoint =
      this.config.environment === 'production'
        ? 'https://connect.squareup.com/v2'
        : 'https://connect.squareupsandbox.com/v2';

    try {
      const response = await fetch(`${endpoint}/payments/${link.transactionId}/metadata`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18',
        },
        body: JSON.stringify({
          metadata: {
            aura_verification_id: link.verificationId,
            aura_verification_timestamp: link.timestamp.toISOString(),
            ...link.metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Square API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync with Square:', error);
      // Don't throw - verification link is stored locally
    }
  }

  private async syncClover(link: TransactionLink): Promise<void> {
    // Clover API integration
    const endpoint =
      this.config.environment === 'production'
        ? 'https://api.clover.com/v3'
        : 'https://sandbox.dev.clover.com/v3';

    try {
      const response = await fetch(
        `${endpoint}/merchants/${this.config.merchantId}/payments/${link.transactionId}/metadata`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'aura_verification',
            value: JSON.stringify({
              id: link.verificationId,
              timestamp: link.timestamp.toISOString(),
              ...link.metadata,
            }),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Clover API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync with Clover:', error);
    }
  }

  private async syncToast(link: TransactionLink): Promise<void> {
    // Toast API integration
    const endpoint =
      this.config.environment === 'production'
        ? 'https://ws-api.toasttab.com'
        : 'https://ws-sandbox-api.eng.toasttab.com';

    try {
      const response = await fetch(`${endpoint}/orders/v2/${link.transactionId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Toast-Restaurant-External-ID': this.config.merchantId || '',
        },
        body: JSON.stringify({
          externalData: {
            aura_verification_id: link.verificationId,
            aura_verification_timestamp: link.timestamp.toISOString(),
            ...link.metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Toast API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to sync with Toast:', error);
    }
  }

  async getItemRequirements(itemId: string): Promise<VerificationRequirement[]> {
    // Check exact match first
    const rule = this.itemRules.get(itemId);
    if (rule) {
      return rule.requirements;
    }

    // Check wildcard patterns
    for (const [pattern, itemRule] of this.itemRules.entries()) {
      if (this.matchesPattern(itemId, pattern)) {
        return itemRule.requirements;
      }
    }

    return [];
  }

  private matchesPattern(itemId: string, pattern: string): boolean {
    if (pattern === itemId) {
      return true;
    }

    // Simple wildcard matching
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(itemId);
  }

  requiresAgeVerification(itemId: string): boolean {
    const requirements = this.itemRules.get(itemId)?.requirements || [];

    for (const [pattern, rule] of this.itemRules.entries()) {
      if (this.matchesPattern(itemId, pattern)) {
        requirements.push(...rule.requirements);
      }
    }

    return requirements.some((req) => req.type === 'age' && req.required);
  }

  addItemRule(rule: ItemVerificationRule): void {
    this.itemRules.set(rule.itemId, rule);
  }

  removeItemRule(itemId: string): boolean {
    return this.itemRules.delete(itemId);
  }

  getVerificationLink(transactionId: string): TransactionLink | undefined {
    return this.verificationLinks.get(transactionId);
  }

  async validateTransaction(transactionId: string): Promise<{
    valid: boolean;
    hasVerification: boolean;
    verificationId?: string;
    error?: string;
  }> {
    const link = this.verificationLinks.get(transactionId);

    if (!link) {
      return {
        valid: false,
        hasVerification: false,
        error: 'No verification linked to transaction',
      };
    }

    return {
      valid: true,
      hasVerification: true,
      verificationId: link.verificationId,
    };
  }

  clearOldLinks(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleared = 0;
    for (const [transactionId, link] of this.verificationLinks.entries()) {
      if (link.timestamp < cutoffDate) {
        this.verificationLinks.delete(transactionId);
        cleared++;
      }
    }

    return cleared;
  }

  exportRules(): ItemVerificationRule[] {
    return Array.from(this.itemRules.values());
  }

  importRules(rules: ItemVerificationRule[]): void {
    for (const rule of rules) {
      this.addItemRule(rule);
    }
  }
}
