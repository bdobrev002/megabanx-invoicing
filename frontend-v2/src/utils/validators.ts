/** Validate Bulgarian EIK (9 or 13 digits) */
export function isValidEik(eik: string): boolean {
  if (!/^\d{9}$|^\d{13}$/.test(eik)) return false
  const digits = eik.split('').map(Number)
  const w1 = [1, 2, 3, 4, 5, 6, 7, 8]
  let sum = digits.slice(0, 8).reduce((s, d, i) => s + d * w1[i], 0)
  let check = sum % 11
  if (check === 10) {
    const w2 = [3, 4, 5, 6, 7, 8, 9, 10]
    sum = digits.slice(0, 8).reduce((s, d, i) => s + d * w2[i], 0)
    check = (sum % 11) % 10
  }
  return digits[8] === check
}

/** Validate email */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** Validate Bulgarian phone */
export function isValidPhone(phone: string): boolean {
  return /^(\+359|0)\d{9}$/.test(phone.replace(/\s/g, ''))
}

/** Validate IBAN */
export function isValidIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase()
  return /^BG\d{2}[A-Z]{4}\d{6}[A-Z0-9]{8}$/.test(cleaned)
}
