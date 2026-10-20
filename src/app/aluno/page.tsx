import type { Metadata } from "next";
import { NavAluno } from "@/components/layout/nav-aluno";
import { TopoMobile } from "@/components/layout/topo-mobile";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { dataIso } from "@/lib/formato";
import { Busca } from "./busca";

export const metadata: Metadata = { title: "Buscar" };

/** A2 · Buscar item perdido */
export default async function AlunoBuscaPage() {
  const perfil = await exigirPapel("aluno");
  const catalogo = await dados().catalogo();
  const primeiroNome = perfil.nome.split(" ")[0];

  return (
    <>
      <TopoMobile titulo="Buscar" usuario={{ nome: perfil.nome || perfil.email, detalhe: perfil.rm ? `RM ${perfil.rm}` : perfil.email }} />
      <div className="flex flex-col gap-1 px-5 pt-2 pb-6">
        <p className="text-title">{primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}</p>
        <p className="text-body text-muted">O que você perdeu?</p>
      </div>
      <Busca catalogo={catalogo} hojeIso={dataIso(new Date())} />
      <NavAluno />
    </>
  );
}
