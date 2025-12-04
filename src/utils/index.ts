export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function generateCommunity(nationality: string, country: string): string {
  return `${nationality.replace(/\s+/g, '')}En${country.replace(/\s+/g, '')}`;
}

export function isExpired(date: Date): boolean {
  return new Date() > date;
}

export function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}