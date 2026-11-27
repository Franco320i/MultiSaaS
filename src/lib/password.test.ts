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

describe("generatePassword con los requisitos que puede exigir Supabase", () => {
  it("siempre trae minúscula, mayúscula y número", () => {
    for (let i = 0; i < 300; i++) {
      const password = generatePassword();
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[0-9]/);
    }
  });
});
