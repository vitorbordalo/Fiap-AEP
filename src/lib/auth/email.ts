import { z } from "zod";

/** E-mail normalizado (sem espaços, minúsculo). */
export const esquemaEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Digite um e-mail válido." }));

/** O domínio do e-mail está exatamente na lista de permitidos (subdomínios não entram). */
export function emailPermitido(email: string, dominios: string[]): boolean {
  const dominio = email.trim().toLowerCase().split("@")[1];
  return Boolean(dominio) && dominios.includes(dominio as string);
}
