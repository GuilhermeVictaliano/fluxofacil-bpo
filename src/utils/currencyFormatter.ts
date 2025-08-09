export const formatCurrencyInput = (value: string) => {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '');
  
  // If empty, return empty
  if (!numbers) return '';
  
  // Convert to cents and format
  const cents = parseInt(numbers);
  const reais = cents / 100;
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
};

export const parseCurrencyInput = (value: string): number => {
  // Remove currency symbols and convert comma to dot
  const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};