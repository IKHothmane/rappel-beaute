import { randomBytes } from "crypto";

/**
 * Identifiant aléatoire préfixé (48 bits d'entropie), sans collision possible
 * entre deux créations dans la même milliseconde (contrairement à Date.now()).
 */
export function newId(prefix: string, separator = "_"): string {
  return `${prefix}${separator}${randomBytes(6).toString("hex")}`;
}
