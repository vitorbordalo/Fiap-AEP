"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera as IconeCamera, CameraOff, Images, Loader2, ScanLine, Sparkles } from "lucide-react";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { carregarImagem, comprimirImagem } from "@/lib/imagem";
import { MODO_DEMO } from "@/lib/modo";
import { useFluxoCadastro } from "./fluxo";

type Estado = "abrindo" | "pronta" | "indisponivel";

/** M2 · Câmera em tela cheia (traseira), com fallback para o seletor de arquivo do sistema. */
export function Camera({ usuario }: { usuario: string }) {
  const router = useRouter();
  const { definirFoto } = useFluxoCadastro();
  const video = useRef<HTMLVideoElement>(null);
  const entradaCamera = useRef<HTMLInputElement>(null);
  const entradaGaleria = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>("abrindo");
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelado = false;

    async function abrir() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado("indisponivel");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelado || !video.current) {
          // a câmera abriu depois de o monitor sair da tela: desliga para não ficar presa
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        setEstado("pronta");
      } catch {
        if (!cancelado) setEstado("indisponivel");
      }
    }

    abrir();
    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /** Demonstração: plano B para apresentar sem webcam (ou com a permissão negada). */
  async function usarFotoDeExemplo() {
    // neutra por enquanto: no cadastro ela vira a ilustração da categoria escolhida
    await usarFoto(await carregarImagem("/seed/package.svg").catch(() => null), true);
  }

  async function usarFoto(origem: Blob | HTMLVideoElement | HTMLImageElement | null, exemplo = false) {
    if (!origem) {
      toast.error("Não foi possível carregar a foto de exemplo.");
      return;
    }
    setProcessando(true);
    try {
      definirFoto(await comprimirImagem(origem), exemplo);
      router.push("/monitor/novo");
    } catch {
      toast.error("Não foi possível usar esta foto. Tente de novo.");
      setProcessando(false);
    }
  }

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (arquivo) usarFoto(arquivo);
  }

  return (
    <main className="relative mx-auto flex h-dvh max-w-mobile flex-col overflow-hidden bg-black">
      <video
        ref={video}
        playsInline
        muted
        className={estado === "pronta" ? "absolute inset-0 size-full object-cover" : "hidden"}
        aria-label="Visualização da câmera"
      />

      <header className="relative z-10 flex h-16 items-center justify-between bg-linear-to-b from-black/70 to-transparent px-3">
        <span className="w-12" />
        <h1 className="text-body font-semibold">Novo item</h1>
        <MenuUsuario nome={usuario} detalhe="Monitor" variante="compacto" />
      </header>

      {estado === "pronta" && (
        <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-10">
          <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-label">
            <ScanLine className="size-4 text-accent-text" aria-hidden />
            Enquadre o objeto encontrado
          </span>
          <div className="aspect-square w-full max-w-64 rounded-3xl border-2 border-dashed border-white/40" aria-hidden />
        </div>
      )}

      {estado === "abrindo" && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 text-muted">
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <p className="text-label font-normal">Abrindo a câmera…</p>
        </div>
      )}

      {estado === "indisponivel" && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-surface-elevated">
            <CameraOff className="size-6 text-muted" aria-hidden />
          </span>
          <p className="text-body text-muted">Não foi possível abrir a câmera aqui. Tire a foto pelo aplicativo do celular.</p>
          <Button size="lg" onClick={() => entradaCamera.current?.click()} loading={processando}>
            <IconeCamera aria-hidden />
            Tirar foto
          </Button>
          {MODO_DEMO && (
            <Button variant="secondary" onClick={usarFotoDeExemplo} disabled={processando}>
              Usar foto de exemplo
            </Button>
          )}
        </div>
      )}

      <footer className="relative z-10 flex items-center justify-around bg-linear-to-t from-black/80 to-transparent px-6 pt-10 pb-10">
        <button
          type="button"
          onClick={() => entradaGaleria.current?.click()}
          disabled={processando}
          className="grid size-14 place-items-center rounded-full bg-white/10 text-foreground hover:bg-white/20 disabled:opacity-50"
          aria-label="Escolher foto da galeria"
        >
          <Images className="size-6" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => video.current && usarFoto(video.current)}
          disabled={estado !== "pronta" || processando}
          aria-label="Tirar foto"
          className="grid size-20 place-items-center rounded-full border-4 border-white bg-accent transition-transform active:scale-95 disabled:opacity-40"
        >
          {processando ? <Loader2 className="size-7 animate-spin" aria-hidden /> : <IconeCamera className="size-7" aria-hidden />}
        </button>
        {MODO_DEMO ? (
          <button
            type="button"
            onClick={usarFotoDeExemplo}
            disabled={processando}
            className="grid size-14 place-items-center rounded-full bg-white/10 text-foreground hover:bg-white/20 disabled:opacity-50"
            aria-label="Usar foto de exemplo"
            title="Usar foto de exemplo (demonstração)"
          >
            <Sparkles className="size-6" aria-hidden />
          </button>
        ) : (
          <span className="size-14" />
        )}
      </footer>

      <input ref={entradaCamera} type="file" accept="image/*" capture="environment" className="sr-only" onChange={aoEscolherArquivo} tabIndex={-1} aria-hidden />
      <input ref={entradaGaleria} type="file" accept="image/*" className="sr-only" onChange={aoEscolherArquivo} tabIndex={-1} aria-hidden />
    </main>
  );
}
