export function normalizeAmount(value: string): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove currency symbols and whitespace
  let cleaned = value
    .replace(/[złusdPLNUSDEUR€$]/gi, '')
    .replace(/\s/g, '')
    .trim();

  if (cleaned === '') {
    return null;
  }

  // Handle European format: "1,092.00" or "1.092,00"
  // Check if we have both comma and dot
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // Determine which is the decimal separator (last one)
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Format: 1.092,00 (European with dot as thousands)
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Format: 1,092.00 (comma as thousands separator)
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Only comma - could be decimal or thousands
    // If comma is followed by exactly 2 digits at end, it's decimal
    if (/,\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // If only dot, parseFloat handles it

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function formatCurrency(amount: number, originalString?: string): string {
  const currencyMatch = originalString?.match(/[złusdPLNUSDEUR€$]+/i);
  const currency = currencyMatch ? currencyMatch[0] : 'zł';
  
  return `${amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
