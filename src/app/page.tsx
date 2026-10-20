import { redirect } from "next/navigation";
import { AREA_DO_PAPEL, LOGIN_ALUNO } from "@/lib/auth/rotas";
import { obterPerfil } from "@/lib/auth/sessao";

/** A raiz não tem tela: leva cada perfil para a sua área (o proxy normalmente já fez isso). */
export default async function HomePage() {
  const perfil = await obterPerfil();
  redirect(perfil ? AREA_DO_PAPEL[perfil.role] : LOGIN_ALUNO);
}
