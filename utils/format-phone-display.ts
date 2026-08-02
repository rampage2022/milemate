/** Display US-style phone numbers for UI (persistence stays raw). */
export function formatPhoneNumberForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    return formatTenDigitUsPhone(digits.slice(1));
  }

  if (digits.length === 10) {
    return formatTenDigitUsPhone(digits);
  }

  return phone.trim();
}

function formatTenDigitUsPhone(digits: string): string {
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

export function phoneDigitsForDialLink(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits;
  }

  if (digits.length === 10) {
    return `1${digits}`;
  }

  return digits;
}
