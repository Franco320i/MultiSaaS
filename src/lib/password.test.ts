import { describe, expect, it } from "vitest";
import { generatePassword, PASSWORD_ALPHABET } from "./password";

describe("generatePassword", () => {
  it("tiene 12 caracteres, sin letras ni números que se confunden al dictarla", () => {
    const password = generatePassword();
    expect(password).toHaveLength(12);
    for (const ch of password) expect(PASSWORD_ALPHABET).toContain(ch);
    for (const confusing of ["0", "O", "o", "1", "l", "I"]) expect(PASSWORD_ALPHABET).not.toContain(confusing);
  });

  it("cada una es distinta", () => {
    const passwords = new Set(Array.from({ length: 50 }, () => generatePassword()));
    expect(passwords.size).toBe(50);
  });
});
