/**
 * Formats a number as currency in Brazilian Real (BRL)
 * @param value The number to format
 * @returns Formatted string in BRL
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formats a number as an integer or with 2 decimal places if needed
 * @param value The number to format
 * @returns Formatted string
 */
export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  
  // If it's a whole number, return without decimals
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  // Otherwise, return with 2 decimal places using Brazilian format (comma as decimal separator)
  return value.toFixed(2).replace('.', ',');
}

/**
 * Formats a number with Brazilian decimal format (using comma)
 * @param value The number to format
 * @param decimals Number of decimal places
 * @returns Formatted string with comma as decimal separator
 */
export function formatDecimal(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return "0";
  
  // If it's a whole number and we don't need decimals, return without decimals
  if (Number.isInteger(value) && decimals === 0) {
    return value.toString();
  }
  
  // Format with specified decimal places using Brazilian format
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/AAAA)
 * @param date Data a ser formatada
 * @returns String formatada no padrão brasileiro
 */
export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma data no formato brasileiro (DD/MM/AAAA) para o formato ISO (AAAA-MM-DD)
 * @param dateStr Data no formato brasileiro
 * @returns Data no formato ISO
 */
export function parseDateBR(dateStr: string): string {
  if (!dateStr) return '';
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';
  
  const day = parts[0];
  const month = parts[1];
  const year = parts[2];
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string into Brazilian format (DD/MM/YYYY)
 * @param dateString The date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}
