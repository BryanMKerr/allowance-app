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
