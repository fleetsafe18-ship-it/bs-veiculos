export const SITE_NAME = 'BS Veículos';
export const SITE_LOCATION = 'Adamantina/SP';
export const WHATSAPP_NUMBER = '5518996302761';
export const WHATSAPP_DISPLAY = '(18) 99630-2761';
export const INSTAGRAM_HANDLE = '@bsveiculos_';
export const INSTAGRAM_URL = 'https://instagram.com/bsveiculos_';

export function whatsappLink(mensagem) {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export const TIPO_LABEL = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
  outro: 'Outro',
};

export function formatPreco(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function formatKm(valor) {
  return `${Number(valor || 0).toLocaleString('pt-BR')} km`;
}
