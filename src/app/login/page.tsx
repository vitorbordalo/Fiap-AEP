import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";
import { LOGIN_MONITOR } from "@/lib/auth/rotas";

export const metadata: Metadata = { title: "Entrar" };

/** A1 · Login do aluno. */
export default async function LoginAlunoPage({ searchParams }: PageProps<"/login">) {
  const { next, erro } = await searchParams;

  return (
    <LoginScreen
      area="Área do aluno"
      descricao="Perdeu algo no campus? Consulte de qualquer lugar se já foi encontrado."
      placeholder="rm000000@fiap.com.br"
      outroLogin={{ href: LOGIN_MONITOR, rotulo: "Sou monitor ou funcionário" }}
      next={typeof next === "string" ? next : undefined}
      erro={typeof erro === "string" ? erro : undefined}
    />
  );
}
