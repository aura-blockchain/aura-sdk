import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier?: number; // exponential backoff
}

export interface WebhookConfig {
  url: string;
  secret: string;
  events: ('verification_success' | 'verification_failure' | 'sync_complete')[];
  retryPolicy?: RetryPolicy;
  timeout?: number; // milliseconds
}

export interface VerificationResult {
  id: string;
  timestamp: Date;
  success: boolean;
  holderDID?: string;
  verifierAddress: string;
  attributes?: Record<string, unknown>;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  type: 'verification_success' | 'verification_failure' | 'sync_complete';
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
  success: boolean;
  attempts: number;
  lastError?: string;
  deliveredAt?: Date;
}

export class WebhookIntegration {
  private config: WebhookConfig;
  private defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  };

  constructor(config: WebhookConfig) {
    this.config = {
      ...config,
      retryPolicy: config.retryPolicy || this.defaultRetryPolicy,
      timeout: config.timeout || 30000
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.url) {
      throw new Error('Webhook URL is required');
    }

    if (!this.config.url.startsWith('http://') && !this.config.url.startsWith('https://')) {
      throw new Error('Webhook URL must start with http:// or https://');
    }

    if (!this.config.secret || this.config.secret.length < 16) {
      throw new Error('Webhook secret must be at least 16 characters');
    }

    if (!this.config.events || this.config.events.length === 0) {
      throw new Error('At least one webhook event must be specified');
    }
  }

  async sendVerificationResult(result: VerificationResult): Promise<WebhookDeliveryResult> {
    const eventType = result.success ? 'verification_success' : 'verification_failure';

    if (!this.config.events.includes(eventType)) {
      return {
        success: true,
        attempts: 0
      };
    }

    const event: WebhookEvent = {
      id: uuidv4(),
      type: eventType,
      timestamp: result.timestamp,
      data: {
        verificationId: result.id,
        holderDID: result.holderDID,
        verifierAddress: result.verifierAddress,
        attributes: result.attributes,
        error: result.error
      }
    };

    return this.sendEvent(event);
  }

  async sendEvent(event: WebhookEvent): Promise<WebhookDeliveryResult> {
    if (!this.config.events.includes(event.type)) {
      return {
        success: true,
        attempts: 0
      };
    }

    const payload = JSON.stringify(event);
    const signature = this.generateSignature(payload);

    const retryPolicy = this.config.retryPolicy!;
    let attempts = 0;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      attempts++;

      try {
        const response = await this.makeRequest(payload, signature);

        if (response.ok) {
          return {
            success: true,
            attempts,
            deliveredAt: new Date()
          };
        }

        lastError = `HTTP ${response.status}: ${response.statusText}`;

        // Don't retry on 4xx errors (except 429)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Wait before retry (except on last attempt)
      if (attempt < retryPolicy.maxRetries) {
        const delay = retryPolicy.retryDelay *
          Math.pow(retryPolicy.backoffMultiplier || 1, attempt);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempts,
      lastError
    };
  }

  private async makeRequest(payload: string, signature: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Aura-Signature': signature,
          'X-Aura-Timestamp': Date.now().toString(),
          'User-Agent': 'Aura-Webhook/1.0'
        },
        body: payload,
        signal: controller.signal
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  generateSignature(payload: string): string {
    const hmac = crypto.createHmac('sha256', this.config.secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = this.generateSignature(payload);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const testEvent: WebhookEvent = {
      id: uuidv4(),
      type: 'verification_success',
      timestamp: new Date(),
      data: {
        test: true,
        message: 'Webhook connection test'
      }
    };

    const result = await this.sendEvent(testEvent);

    return {
      success: result.success,
      error: result.lastError
    };
  }

  updateConfig(updates: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
