"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ChevronUp, FlaskConical, Loader2, LogOut } from "lucide-react";
import { sair, trocarPerfilDemo } from "@/app/auth/actions";
import type { Papel } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { PERFIS_DEMO } from "./perfis-demo";

/**
 * Atalho da demonstração para alternar entre os quatro perfis em um clique.
 * Fica fixo no canto inferior esquerdo em telas largas (no notebook, as telas de celular ficam
 * centralizadas e o canto está livre). Nas telas de desktop (equipe, gestor) fica compacto, só o ícone,
 * para não cobrir o conteúdo. Em telas estreitas, as mesmas opções estão no menu do avatar.
 */
export function TrocaDePerfil({ papelAtual, compacto = false }: { papelAtual: Papel; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const atual = PERFIS_DEMO.find((p) => p.papel === papelAtual);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const fecharEsc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="fixed bottom-4 left-4 z-40 hidden lg:block">
      {aberto && (
        <div
          id="troca-de-perfil"
          className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-surface-elevated p-2 shadow-[0_8px_24px_rgb(0_0_0/0.4)]"
        >
          <p className="px-3 pt-2 pb-1 text-caption text-muted">Demonstração · ver o app como</p>
          <ul className="flex flex-col">
            {PERFIS_DEMO.map((perfil) => {
              const Icone = perfil.icone;
              const ehAtual = perfil.papel === papelAtual;
              return (
                <li key={perfil.papel}>
                  <form action={trocarPerfilDemo}>
                    <input type="hidden" name="papel" value={perfil.papel} />
                    <OpcaoPerfil ehAtual={ehAtual}>
                      <Icone className="size-5 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-label">{perfil.rotulo}</span>
                        <span className="text-caption text-muted">{perfil.descricao}</span>
                      </span>
                    </OpcaoPerfil>
                  </form>
                </li>
              );
            })}
          </ul>
          <div className="my-1 h-px bg-border" />
          <form action={sair}>
            <button type="submit" className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-label font-normal text-muted hover:bg-border hover:text-foreground">
              <LogOut className="size-4" aria-hidden />
              Sair para o login
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-controls="troca-de-perfil"
        aria-label={compacto ? `Demonstração: você está como ${atual?.rotulo}. Trocar perfil` : undefined}
        title={compacto ? `Demonstração · você está como ${atual?.rotulo}` : undefined}
        className={cn(
          "flex h-12 items-center rounded-full border border-border bg-surface-elevated text-left shadow-[0_8px_24px_rgb(0_0_0/0.4)] transition-colors hover:bg-border",
          compacto ? "w-12 justify-center" : "gap-3 py-2 pr-4 pl-3",
        )}
      >
        <span className="grid size-8 place-items-center rounded-full bg-aguardando/15">
          <FlaskConical className="size-4 text-aguardando-text" aria-hidden />
        </span>
        {!compacto && (
          <>
            <span className="flex flex-col leading-tight">
              <span className="text-caption text-muted">Demonstração</span>
              <span className="text-label">Você está como {atual?.rotulo}</span>
            </span>
            <ChevronUp className={cn("size-4 text-muted transition-transform", !aberto && "rotate-180")} aria-hidden />
          </>
        )}
      </button>
    </div>
  );
}

/** Botão de uma opção: mostra carregando enquanto troca e marca o perfil atual. */
function OpcaoPerfil({ ehAtual, children }: { ehAtual: boolean; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-current={ehAtual ? "true" : undefined}
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-border",
        ehAtual && "bg-border",
      )}
    >
      {children}
      {pending ? (
        <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
      ) : (
        ehAtual && <Check className="size-4 text-accent-text" aria-label="perfil atual" />
      )}
    </button>
  );
}
