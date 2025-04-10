/**
 * Utilitários para manipulação de números no formato brasileiro
 */

/**
 * Converte uma string no formato brasileiro (com vírgula como separador decimal)
 * para um número que o JavaScript entende (com ponto como separador decimal)
 * 
 * @param value String no formato brasileiro (ex: "10,5")
 * @returns Número convertido (ex: 10.5)
 */
export function parseDecimalBR(value: string): number | null {
  if (!value) return null;
  
  // Remove qualquer caractere que não seja número ou vírgula
  const sanitized = value.replace(/[^\d,]/g, '');
  
  // Substitui vírgula por ponto para o JavaScript entender
  const converted = sanitized.replace(',', '.');
  
  const number = parseFloat(converted);
  return isNaN(number) ? null : number;
}

/**
 * Formata um número para exibição em campos de entrada no formato brasileiro
 * 
 * @param value Número a ser formatado
 * @param decimals Número de casas decimais
 * @returns String formatada com vírgula como separador decimal
 */
export function formatInputDecimalBR(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '';
  
  return value.toFixed(decimals).replace('.', ',');
}
