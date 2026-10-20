"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type FluxoCadastro = {
  foto: Blob | null;
  fotoUrl: string | null;
  definirFoto: (foto: Blob) => void;
  limpar: () => void;
};

const Contexto = createContext<FluxoCadastro | null>(null);

/** Guarda a foto entre a câmera (M2) e os detalhes (M3) sem passar pela rede. */
export function FluxoCadastroProvider({ children }: { children: React.ReactNode }) {
  const [foto, setFoto] = useState<Blob | null>(null);
  const fotoUrl = useMemo(() => (foto ? URL.createObjectURL(foto) : null), [foto]);

  useEffect(() => {
    return () => {
      if (fotoUrl) URL.revokeObjectURL(fotoUrl);
    };
  }, [fotoUrl]);

  const definirFoto = useCallback((nova: Blob) => setFoto(nova), []);
  const limpar = useCallback(() => setFoto(null), []);

  return <Contexto.Provider value={{ foto, fotoUrl, definirFoto, limpar }}>{children}</Contexto.Provider>;
}

export function useFluxoCadastro() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useFluxoCadastro precisa do FluxoCadastroProvider");
  return contexto;
}
