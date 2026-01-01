/**
 * Configuration management for Aura Verifier CLI
 */

import Conf from 'conf';
import type { NetworkType } from '@aura-network/verifier-sdk';

export interface CLIConfig {
  network: NetworkType;
  verbose: boolean;
  jsonOutput: boolean;
  grpcEndpoint?: string;
  restEndpoint?: string;
}

const schema = {
  network: {
    type: 'string',
    enum: ['mainnet', 'testnet', 'local'],
    default: 'mainnet',
  },
  verbose: {
    type: 'boolean',
    default: false,
  },
  jsonOutput: {
    type: 'boolean',
    default: false,
  },
  grpcEndpoint: {
    type: 'string',
  },
  restEndpoint: {
    type: 'string',
  },
} as const;

class ConfigManager {
  private config: Conf<CLIConfig>;

  constructor() {
    this.config = new Conf<CLIConfig>({
      projectName: 'aura-verifier',
      schema: schema as any,
    });
  }

  get(key: keyof CLIConfig): any {
    return this.config.get(key);
  }

  set(key: keyof CLIConfig, value: any): void {
    this.config.set(key, value);
  }

  getAll(): CLIConfig {
    return this.config.store;
  }

  reset(): void {
    this.config.clear();
  }

  getConfigPath(): string {
    return this.config.path;
  }
}

export const configManager = new ConfigManager();
