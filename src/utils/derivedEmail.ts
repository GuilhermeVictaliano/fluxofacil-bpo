export const cnpjToEmail = (cnpj: string) => {
  const digits = (cnpj || '').replace(/\D/g, '');
  return `${digits}@bpo.local`;
};
