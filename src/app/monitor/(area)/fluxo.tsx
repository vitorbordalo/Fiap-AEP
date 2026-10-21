"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FluxoCadastro = {
  foto: Blob | null;
  fotoUrl: string | null;
  /** Demonstração: foto de exemplo, trocada pela ilustração da categoria escolhida ao cadastrar. */
  exemplo: boolean;
  definirFoto: (foto: Blob, exemplo?: boolean) => void;
  limpar: () => void;
};

const Contexto = createContext<FluxoCadastro | null>(null);

/** Guarda a foto entre a câmera (M2) e os detalhes (M3) sem passar pela rede. */
export function FluxoCadastroProvider({ children }: { children: React.ReactNode }) {
  const [foto, setFoto] = useState<Blob | null>(null);
  const [exemplo, setExemplo] = useState(false);
  const fotoUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);

  useEffect(() => {
    return () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    };
  }, [fotoUrl]);

  const definirFoto = useCallback((nova: Blob, deExemplo = false) => {
    setFoto(nova);
    setExemplo(deExemplo);
  }, []);
  const limpar = useCallback(() => {
    setFoto(null);
    setExemplo(false);
  }, []);

  return <Contexto.Provider value={{ foto, fotoUrl, exemplo, definirFoto, limpar }}>{children}</Contexto.Provider>;
}

export function useFluxoCadastro() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useFluxoCadastro precisa do FluxoCadastroProvider");
  return contexto;
}
