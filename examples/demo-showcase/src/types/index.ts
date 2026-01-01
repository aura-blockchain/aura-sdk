export interface VerificationHistory {
  id: string;
  timestamp: Date;
  status: 'success' | 'failed';
  age?: number;
  ageVerification?: '18+' | '21+';
  holderDID?: string;
  verificationMethod: 'online' | 'offline';
}

export interface NetworkConfig {
  name: string;
  rpcEndpoint: string;
  restEndpoint: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Mainnet',
    rpcEndpoint: 'https://rpc.aura.network',
    restEndpoint: 'https://lcd.aura.network',
  },
  testnet: {
    name: 'Testnet (Euphoria)',
    rpcEndpoint: 'https://rpc.euphoria.aura.network',
    restEndpoint: 'https://lcd.euphoria.aura.network',
  },
};

export interface QRCodeData {
  v: string;
  p: string;
  h: string;
  vcs: string[];
  ctx: {
    show_age_over_18?: boolean;
    show_age_over_21?: boolean;
    show_full_name?: boolean;
    [key: string]: boolean | undefined;
  };
  exp: number;
  n: number;
  sig: string;
}
