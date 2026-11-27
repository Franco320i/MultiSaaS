/**
 * Contraseña inicial de un dueño (alta asistida y "Nueva contraseña" del panel central).
 * Se dicta o se pega por WhatsApp: sin caracteres que se confunden (0/O/o, 1/l/I).
 * Sale del generador criptográfico (56^12 ≈ 70 bits); el sesgo por módulo es despreciable
 * con 56 símbolos sobre 32 bits. Siempre trae minúscula, mayúscula y número, por si Supabase
 * exige esos requisitos. Nunca se guarda: se muestra una sola vez.
 */
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
export const PASSWORD_ALPHABET = LOWER + UPPER + DIGITS;

const hasAllKinds = (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p);

export function generatePassword(length = 12): string {
  // Se descartan las que no traen los tres tipos (pasa en ~1 de cada 6): así cada
  // contraseña válida sigue siendo igual de probable que cualquier otra.
  for (;;) {
    const values = crypto.getRandomValues(new Uint32Array(length));
    const password = Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join("");
    if (hasAllKinds(password)) return password;
  }
}
