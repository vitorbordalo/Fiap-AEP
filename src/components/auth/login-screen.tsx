import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MODO_DEMO } from "@/lib/modo";
import type { Papel } from "@/lib/supabase/database.types";
import { DemoLoginForm } from "./demo-login-form";
import { LoginForm } from "./login-form";

const MENSAGENS_DE_ERRO: Record<string, string> = {
  link: "Esse link expirou ou já foi usado. Peça um novo abaixo.",
  perfil: "Não encontramos seu perfil. Fale com a coordenação do Achados e Perdidos.",
};

type LoginScreenProps = {
  area: string;
  descricao: string;
  placeholder: string;
  outroLogin: { href: string; rotulo: string };
  /** Perfil já marcado no login de demonstração. */
  papelInicial: Papel;
  next?: string;
  erro?: string;
};

/** Tela de login compartilhada por M1 (monitor) e A1 (aluno): link mágico, ou login provisório no modo demonstração. */
export function LoginScreen({ area, descricao, placeholder, outroLogin, papelInicial, next, erro }: LoginScreenProps) {
  const mensagemErro = erro ? MENSAGENS_DE_ERRO[erro] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-mobile flex-col px-5 pt-14 pb-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <p className="text-display tracking-wider">FIAP</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1 text-caption text-muted">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          {area}
        </span>
        <h1 className="text-display">Achados e Perdidos</h1>
        <p className="max-w-xs text-body text-muted">{descricao}</p>
      </header>

      <div className="mt-16 flex flex-col gap-6">
        {mensagemErro && (
          <p role="alert" className="rounded-xl border border-border bg-surface px-4 py-3 text-label font-normal text-danger">
            {mensagemErro}
          </p>
        )}
        {MODO_DEMO ? (
          <DemoLoginForm papelInicial={papelInicial} next={next} />
        ) : (
          <LoginForm placeholder={placeholder} next={next} />
        )}
      </div>

      <Link
        href={outroLogin.href}
        className="mt-auto inline-flex min-h-12 items-center justify-center gap-1 self-center px-4 pt-12 text-label text-muted hover:text-foreground"
      >
        {outroLogin.rotulo}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </main>
  );
}
