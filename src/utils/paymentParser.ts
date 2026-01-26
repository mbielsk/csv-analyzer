export function parsePaymentStatus(value: string): boolean {
  return value.includes('✅');
}
