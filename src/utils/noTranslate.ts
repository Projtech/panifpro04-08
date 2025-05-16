export const NO_TRANSLATE_ELEMENTS = {
  // Unidades de medida
  units: ['Kg', 'UN', 'g', 'ml'],
  
  // Abreviações de dias da semana
  weekDays: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
  
  // Tipos de produtos
  productTypes: ['Matéria-prima', 'Sub-receita', 'Receita'],
  
  // Moeda
  currency: ['R$'],
  
  // Etapas de produção
  stages: ['massa', 'recheio', 'cobertura', 'finalização'],
  
  // Status
  status: ['Ativo', 'Inativo'],
  
  // Campos específicos que não devem ser traduzidos
  fields: ['SKU', 'CNPJ', 'CPF']
};

export const shouldNotTranslate = (text: string): boolean => {
  return Object.values(NO_TRANSLATE_ELEMENTS).some(category =>
    category.some(item => item.toLowerCase() === text.toLowerCase())
  );
};

export const wrapWithNoTranslate = (text: string): string => {
  if (shouldNotTranslate(text)) {
    return `<span translate="no">${text}</span>`;
  }
  return text;
};
