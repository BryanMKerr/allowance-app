/**
 * Format a micro-USDC amount (6 decimals) to a human-readable dollar string.
 */
export function formatUSDC(microAmount: string | number): string {
  const num = typeof microAmount === "string" ? Number(microAmount) : microAmount;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 1_000_000);
}

/**
 * Convert a dollar amount (e.g. 5.50) to micro-USDC string.
 */
export function dollarsToMicro(dollars: number): string {
  return Math.round(dollars * 1_000_000).toString();
}

/**
 * Truncate a NEAR account ID or long address for display.
 */
export function truncateAddress(address: string, maxLen = 20): string {
  if (address.length <= maxLen) return address;
  const half = Math.floor((maxLen - 3) / 2);
  return `${address.slice(0, half)}...${address.slice(-half)}`;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Get the human-readable name for a day number (0-6).
 */
export function dayName(day: number): string {
  return DAY_NAMES[day] ?? "Unknown";
}

/**
 * Calculate the next occurrence of a given day of week.
 */
export function getNextPaymentDate(transferDay: number): Date {
  const now = new Date();
  const currentDay = now.getDay();
  let daysUntil = transferDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Format a date as a friendly string.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format an APY value (e.g. 4.23) as a percentage string.
 */
export function formatApy(apy: number): string {
  if (isNaN(apy) || apy === 0) return "0.00%";
  return `${apy.toFixed(2)}%`;
}

/**
 * Get the total weekly payout in micro-USDC for all active kids.
 */
export function getTotalWeekly(kids: { amount: string; active: boolean }[]): number {
  return kids
    .filter((k) => k.active)
    .reduce((sum, k) => sum + Number(k.amount), 0);
}
