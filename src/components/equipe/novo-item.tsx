"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Info, RefreshCw } from "lucide-react";
import { CamposDoCadastro } from "@/components/itens/campos-do-cadastro";
import { Button } from "@/components/ui/button";
import { ModalFooter } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { cadastrarItem } from "@/lib/acoes/cadastro";
import type { Catalogo } from "@/lib/dados/tipos";
import { formatarCodigo } from "@/lib/formato";
import { comprimirImagem } from "@/lib/imagem";

type NovoItemProps = {
  catalogo: Catalogo;
  agoraIso: string;
  localPadraoId: string;
  modo: "modal" | "pagina";
};

/** E6 · Novo item pela equipe: foto do computador à esquerda, mesmos campos do monitor à direita. */
export function NovoItem({ catalogo, agoraIso, localPadraoId, modo }: NovoItemProps) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [erros, setErros] = useState<Partial<Record<string, string>>>({});
  const [salvando, iniciar] = useTransition();

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function escolherFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    setProcessandoFoto(true);
    try {
      const comprimida = await comprimirImagem(arquivo);
      setFoto(comprimida);
      setPreview(URL.createObjectURL(comprimida));
      setErros((atuais) => ({ ...atuais, foto: undefined }));
    } catch {
      toast.error("Não foi possível usar esta foto. Tente outra.");
    } finally {
      setProcessandoFoto(false);
    }
  }

  function fechar() {
    if (modo === "modal") router.back();
    else router.push("/equipe");
  }

  function enviar(formData: FormData) {
    if (!foto) {
      setErros((e) => ({ ...e, foto: "Escolha a foto do item." }));
      return;
    }
    formData.set("foto", new File([foto], foto.type === "image/webp" ? "foto.webp" : "foto.jpg", { type: foto.type }));
    iniciar(async () => {
      const r = await cadastrarItem(formData);
      if (!r.ok) {
        setErros(r.campos ?? {});
        toast.error(r.erro);
        return;
      }
      toast.success(`Item cadastrado com sucesso. ${formatarCodigo(r.codigo)}`);
      fechar();
      router.refresh();
    });
  }

  return (
    // onSubmit (e não action): com action o React limpa os campos ao terminar, mesmo quando o servidor recusa
    <form
      onSubmit={(e) => {
        e.preventDefault();
        enviar(new FormData(e.currentTarget));
      }}
    >
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-3 lg:col-span-5">
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="relative grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-surface-elevated text-muted hover:text-foreground"
            aria-describedby={erros.foto ? "foto-erro" : undefined}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Foto do item" className="absolute inset-0 size-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-label">
                <ImagePlus className="size-8" strokeWidth={1.5} aria-hidden />
                {processandoFoto ? "Preparando foto…" : "Escolher foto"}
              </span>
            )}
          </button>
          {preview && (
            <Button type="button" variant="secondary" onClick={() => entrada.current?.click()} loading={processandoFoto}>
              <RefreshCw aria-hidden />
              Trocar foto
            </Button>
          )}
          {erros.foto && (
            <p id="foto-erro" className="text-caption text-danger" role="alert">
              {erros.foto}
            </p>
          )}
          <p className="flex gap-2 text-caption text-muted">
            <Info className="size-4 shrink-0" aria-hidden />O item aparece na busca dos alunos assim que for cadastrado.
          </p>
          <input ref={entrada} type="file" accept="image/*" className="sr-only" onChange={escolherFoto} tabIndex={-1} aria-hidden />
        </div>

        <div className="lg:col-span-7">
          <CamposDoCadastro catalogo={catalogo} agoraIso={agoraIso} localPadraoId={localPadraoId} erros={erros} layout="desktop" />
        </div>
      </div>

      <ModalFooter>
        <Button type="button" variant="secondary" onClick={fechar} disabled={salvando}>
          Cancelar
        </Button>
        <Button type="submit" loading={salvando}>
          {!salvando && <Check aria-hidden />}
          Cadastrar item
        </Button>
      </ModalFooter>
    </form>
  );
}
