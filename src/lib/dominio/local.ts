import type { Local } from "@/lib/dados/tipos";

/** Identifica a Sala de TI pelo nome (é o local que atende depois das 22h). */
export function ehSalaDeTi(local: Pick<Local, "nome">) {
  return /\bti\b/i.test(local.nome);
}

/**
 * Local de guarda sugerido no cadastro: depois das 22h (e antes das 8h) o Achados e Perdidos
 * está fechado e o item vai para a Sala de TI. Recebe a hora local (0 a 23).
 */
export function sugerirLocal(locais: Local[], hora: number) {
  const salaDeTi = locais.find(ehSalaDeTi);
  const achados = locais.find((l) => l !== salaDeTi);
  return (hora >= 22 || hora < 8 ? salaDeTi : achados)?.id ?? locais[0]?.id ?? "";
}
