
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
  
  // Garante que haja apenas uma vírgula no número
  const parts = sanitized.split(',');
  if (parts.length > 2) {
    // Se houver mais de uma vírgula, junta tudo e mantém só a primeira
    const intPart = parts[0];
    const decPart = parts.slice(1).join('');
    const converted = `${intPart}.${decPart}`;
    const number = parseFloat(converted);
    return isNaN(number) ? null : number;
  }
  
  // Caso normal com 0 ou 1 vírgula
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
