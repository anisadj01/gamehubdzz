/**
 * Politique de mot de passe.
 * Mode développement : mots de passe simples autorisés (1234, 0000, admin...).
 * Passer PASSWORD_POLICY sur "strict" pour la production.
 */
export type PasswordPolicy = "dev" | "strict";

export const PASSWORD_POLICY = "dev" as PasswordPolicy;

export const passwordRules =
  PASSWORD_POLICY === "strict"
    ? {
        min: 8,
        message: "8 caractères minimum, avec majuscule et chiffre",
        regex: /^(?=.*[A-Z])(?=.*\d).{8,}$/,
      }
    : { min: 4, message: "4 caractères minimum", regex: /^.{4,}$/ };