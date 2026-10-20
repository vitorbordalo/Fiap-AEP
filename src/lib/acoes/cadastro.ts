"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapelNaAcao } from "@/lib/auth/sessao";
import { dados, ErroDeNegocio } from "@/lib/dados";
import { lerDataHoraLocal } from "@/lib/formato";
import { ehUuid } from "@/lib/utils";

const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

const esquemaCadastro = z.object({
  foto: z
    .instanceof(File, { error: "Tire uma foto do item." })
    .refine((f) => f.size > 0, { error: "Tire uma foto do item." })
    .refine((f) => f.size <= TAMANHO_MAXIMO_FOTO, { error: "A foto passou de 5 MB." })
    .refine((f) => ["image/webp", "image/jpeg", "image/png"].includes(f.type), { error: "Use uma foto em WebP, JPEG ou PNG." }),
  categoriaId: z.string({ error: "Escolha a categoria." }).refine(ehUuid, { error: "Escolha a categoria." }),
  salaId: z.string({ error: "Escolha a sala." }).refine(ehUuid, { error: "Escolha a sala." }),
  turmaId: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || ehUuid(v), { error: "Turma inválida." }),
  encontradoEm: z
    .string()
    .transform((v) => lerDataHoraLocal(v))
    .refine((d): d is Date => d !== null, { error: "Informe data e hora." }),
  observacao: z
    .string()
    .max(140, { error: "Use até 140 caracteres." })
    .optional()
    .transform((v) => v?.trim() || null),
  localId: z.string({ error: "Escolha onde vai ficar guardado." }).refine(ehUuid, { error: "Escolha onde vai ficar guardado." }),
});

export type ResultadoCadastro =
  | { ok: true; id: string; codigo: string }
  | { ok: false; erro: string; campos?: Partial<Record<string, string>> };

/** Cadastro de item pelo monitor (M3) ou pela equipe (E6). */
export async function cadastrarItem(formData: FormData): Promise<ResultadoCadastro> {
  const perfil = await exigirPapelNaAcao("monitor", "equipe", "gestor");

  const entrada = esquemaCadastro.safeParse(Object.fromEntries(formData));
  if (!entrada.success) {
    const campos = Object.fromEntries(entrada.error.issues.map((i) => [String(i.path[0]), i.message]));
    return { ok: false, erro: "Confira os campos destacados.", campos };
  }

  const { foto, ...item } = entrada.data;

  try {
    // Supabase: vai para o Storage (pasta de quem envia). Modo demonstração: fica em memória.
    const fotoPath = await dados().salvarFoto(perfil.id, foto);
    const { id, codigo } = await dados().cadastrarItem(perfil.id, { ...item, fotoPath });
    revalidatePath("/equipe", "layout");
    return { ok: true, id, codigo };
  } catch (erro) {
    if (erro instanceof ErroDeNegocio) return { ok: false, erro: erro.message };
    throw erro;
  }
}
