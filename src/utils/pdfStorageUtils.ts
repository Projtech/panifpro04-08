// Funções para armazenar e recuperar PDFs do localStorage

// Armazenar um PDF no localStorage
export async function storePdfLocally(
  key: string, 
  pdfBlob: Blob, 
  expirationHours: number = 24
): Promise<boolean> {
  try {
    // Verificar se há espaço disponível (localStorage tem limite de ~5MB)
    if (pdfBlob.size > 4 * 1024 * 1024) {
      console.warn("PDF muito grande para armazenamento local");
      return false;
    }
    
    // Salvar timestamp de expiração
    const expirationTime = Date.now() + (expirationHours * 60 * 60 * 1000);
    localStorage.setItem(`pdf_${key}_expiration`, expirationTime.toString());
    
    // Converter Blob para string base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          localStorage.setItem(`pdf_${key}_data`, reader.result as string);
          resolve(true);
        } catch (error) {
          console.error("Erro ao salvar PDF no localStorage:", error);
          resolve(false);
        }
      };
      reader.readAsDataURL(pdfBlob);
    });
  } catch (error) {
    console.error("Erro ao processar PDF para armazenamento:", error);
    return false;
  }
}

// Recuperar um PDF do localStorage
export function getStoredPdf(key: string): Blob | null {
  try {
    // Verificar se existe e não expirou
    const expirationTime = localStorage.getItem(`pdf_${key}_expiration`);
    const pdfData = localStorage.getItem(`pdf_${key}_data`);
    
    if (!expirationTime || !pdfData) return null;
    
    // Verificar se expirou
    if (Date.now() > parseInt(expirationTime)) {
      // Limpar itens expirados
      localStorage.removeItem(`pdf_${key}_expiration`);
      localStorage.removeItem(`pdf_${key}_data`);
      return null;
    }
    
    // Converter base64 para Blob
    const base64Response = pdfData.split(',')[1];
    const binaryString = atob(base64Response);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return new Blob([bytes], { type: 'application/pdf' });
  } catch (error) {
    console.error("Erro ao recuperar PDF do localStorage:", error);
    return null;
  }
}

// Limpar um PDF específico do localStorage
export function clearStoredPdf(key: string): void {
  localStorage.removeItem(`pdf_${key}_expiration`);
  localStorage.removeItem(`pdf_${key}_data`);
}
