export interface Kid {
  name: string;
  wallet_id: string;
  amount: string; // U128 string from contract (micro-USDC)
  active: boolean;
}

export interface Config {
  owner_id: string;
  kids: Kid[];
  transfer_day: number; // 0=Sunday .. 6=Saturday
  last_paid_week: number;
}

export interface VaultInfo {
  burrow_contract: string;
  usdc_contract: string;
}

export interface BurrowSupplied {
  token_id: string;
  shares: string;
  balance: string;
}

export interface BurrowAccount {
  supplied: BurrowSupplied[];
  [key: string]: unknown;
}
