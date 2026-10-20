"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, CircleCheck } from "lucide-react";
import { CamposDoCadastro } from "@/components/itens/campos-do-cadastro";
import { RodapeFixo } from "@/components/layout/topo-mobile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";
import { cadastrarItem } from "@/lib/acoes/cadastro";
import type { Catalogo } from "@/lib/dados/tipos";
import { useFluxoCadastro } from "../fluxo";

type FormularioMonitorProps = {
  catalogo: Catalogo;
  agoraIso: string;
  localPadraoId: string;
};

/** M3 · Detalhes do item */
export function FormularioMonitor({ catalogo, agoraIso, localPadraoId }: FormularioMonitorProps) {
  const router = useRouter();
  const { foto, fotoUrl, limpar } = useFluxoCadastro();
  const [enviando, iniciar] = useTransition();
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    router.prefetch("/monitor/novo/sucesso");
  }, [router]);

  if (!foto || !fotoUrl) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-mobile flex-col justify-center px-5">
        <EmptyState
          icon={Camera}
          message="Comece pela foto do item."
          action={
            <Button asChild size="lg">
              <Link href="/monitor">Abrir câmera</Link>
            </Button>
          }
        />
      </main>
    );
  }

  function enviar(formData: FormData) {
    if (!foto) return;
    const extensao = foto.type === "image/webp" ? "webp" : "jpg";
    formData.set("foto", new File([foto], `foto.${extensao}`, { type: foto.type }));

    iniciar(async () => {
      const resultado = await cadastrarItem(formData);
      if (!resultado.ok) {
        setErros(resultado.campos ?? {});
        toast.error(resultado.erro);
        return;
      }
      limpar();
      router.push(`/monitor/novo/sucesso?id=${resultado.id}`);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-mobile flex-col">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-2 px-2">
          <Link href="/monitor" aria-label="Voltar para a câmera" className="grid size-12 place-items-center rounded-full hover:bg-surface-elevated">
            <ArrowLeft className="size-6" aria-hidden />
          </Link>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-caption tracking-wider text-muted uppercase">Fluxo do monitor</span>
            <h1 className="text-title">Detalhes do item</h1>
          </div>
          <span className="rounded-full bg-surface-elevated px-3 py-1 text-caption text-muted">
            Passo <strong className="text-foreground">2/3</strong>
          </span>
        </div>
        <div className="mx-5 h-1 rounded-full bg-surface-elevated" aria-hidden>
          <div className="h-1 w-2/3 rounded-full bg-accent" />
        </div>
      </header>

      <form action={enviar} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-5 pt-5 pb-4">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fotoUrl} alt="Foto capturada do item" className="size-full object-cover" />
              <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-md bg-black/70 py-0.5 text-caption font-semibold">
                <CircleCheck className="size-3 text-retirado" aria-hidden />
                Capturada
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-label">Foto pronta</p>
              <Link href="/monitor" className="inline-flex min-h-10 items-center gap-2 text-label text-accent-text">
                <Camera className="size-4" aria-hidden />
                Refazer foto
              </Link>
            </div>
          </div>

          <CamposDoCadastro catalogo={catalogo} agoraIso={agoraIso} localPadraoId={localPadraoId} erros={erros} layout="mobile" />
        </div>

        <RodapeFixo>
          <Button type="submit" size="lg" fullWidth loading={enviando}>
            Cadastrar item
            {!enviando && <ArrowRight aria-hidden />}
          </Button>
        </RodapeFixo>
      </form>
    </main>
  );
}
