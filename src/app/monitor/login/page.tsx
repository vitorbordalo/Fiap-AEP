import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";
import { LOGIN_ALUNO } from "@/lib/auth/rotas";

export const metadata: Metadata = { title: "Entrar" };

/** M1 · Login do monitor (também usado pela equipe e pela coordenação). */
export default async function LoginMonitorPage({ searchParams }: PageProps<"/monitor/login">) {
  const { next, erro } = await searchParams;

  return (
    <LoginScreen
      area="Área do monitor"
      descricao="Entre com seu e-mail institucional para cadastrar itens encontrados."
      placeholder="seunome@fiap.com.br"
      outroLogin={{ href: LOGIN_ALUNO, rotulo: "Sou aluno" }}
      next={typeof next === "string" ? next : undefined}
      erro={typeof erro === "string" ? erro : undefined}
    />
  );
}
