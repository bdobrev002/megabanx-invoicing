/** Validate Bulgarian EIK (9 or 13 digits) */
export function isValidEik(eik: string): boolean {
  if (!/^\d{9}$|^\d{13}$/.test(eik)) return false
  const digits = eik.split('').map(Number)

  // Validate 9th digit (positions 0-7 → check digit at 8)
  let sum = digits.slice(0, 8).reduce((s, d, i) => s + d * (i + 1), 0)
  let check = sum % 11
  if (check === 10) {
    sum = digits.slice(0, 8).reduce((s, d, i) => s + d * (i + 3), 0)
    check = (sum % 11) % 10
  }
  if (digits[8] !== check) return false

  // For 13-digit EIK, validate 13th digit (positions 8-11 → check digit at 12)
  if (digits.length === 13) {
    const w13a = [2, 7, 3, 5]
    sum = digits.slice(8, 12).reduce((s, d, i) => s + d * w13a[i], 0)
    check = sum % 11
    if (check === 10) {
      const w13b = [4, 9, 5, 7]
      sum = digits.slice(8, 12).reduce((s, d, i) => s + d * w13b[i], 0)
      check = (sum % 11) % 10
    }
    if (digits[12] !== check) return false
  }

  return true
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
