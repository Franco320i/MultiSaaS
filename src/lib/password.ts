/**
 * Contraseña inicial de un dueño (alta asistida y "Nueva contraseña" del panel central).
 * Se dicta o se pega por WhatsApp: sin caracteres que se confunden (0/O/o, 1/l/I).
 * Sale del generador criptográfico; el sesgo por módulo es despreciable con 56 símbolos
 * sobre 32 bits. Nunca se guarda: se muestra una sola vez.
 */
export const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePassword(length = 12): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => PASSWORD_ALPHABET[v % PASSWORD_ALPHABET.length]).join("");
}
