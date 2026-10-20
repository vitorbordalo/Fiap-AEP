import type { Metadata } from "next";
import { MapPin, Monitor } from "lucide-react";
import { ConteudoDesktop } from "@/components/layout/topo-desktop";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { exigirPapel } from "@/lib/auth/sessao";
import { dados } from "@/lib/dados";
import { ehSalaDeTi } from "@/lib/dominio/local";
import { iniciais } from "@/lib/formato";
import type { Papel } from "@/lib/supabase/database.types";
import { AdicionarPessoa, EditarPessoa, FormularioDias } from "./componentes";

export const metadata: Metadata = { title: "Configurações" };

const ROTULO_PAPEL: Record<Papel, string> = { gestor: "Coordenação", equipe: "Equipe", monitor: "Monitor", aluno: "Aluno" };

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="text-title">{titulo}</h2>
        <p className="text-label font-normal text-muted">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

/** G3 · Configurações: regra de guarda, locais, pessoas com acesso de funcionário e categorias. */
export default async function GestorConfiguracoesPage() {
  await exigirPapel("gestor");
  const config = await dados().configuracoes();

  return (
    <ConteudoDesktop estreito>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-display">Configurações</h1>
          <p className="text-body text-muted">Regras de guarda, locais, equipe e categorias.</p>
        </div>

        <Secao titulo="Regras de guarda" descricao="Quanto tempo um item fica em Recebidos antes de ir para Aguardando retirada.">
          <FormularioDias atual={config.diasParaAguardando} />
        </Secao>

        <Secao titulo="Locais de retirada" descricao="Onde os itens ficam guardados e o horário em que os alunos podem retirar.">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {config.locais.map((local) => (
              <li key={local.id} className="flex items-center gap-4 px-4 py-3">
                <span className="grid size-10 place-items-center rounded-lg bg-surface-elevated text-muted">
                  {ehSalaDeTi(local) ? <Monitor className="size-5" aria-hidden /> : <MapPin className="size-5" aria-hidden />}
                </span>
                <div>
                  <p className="text-label">{local.nome}</p>
                  <p className="text-caption text-muted">{local.horarioRetirada}</p>
                </div>
              </li>
            ))}
          </ul>
        </Secao>

        <Secao titulo="Equipe" descricao="Quem tem acesso de monitor, equipe ou coordenação. Todo mundo que entra pela primeira vez é aluno.">
          <ul className="divide-y divide-border rounded-xl border border-border">
            {config.pessoas.map((pessoa) => (
              <li key={pessoa.id} className="flex items-center gap-4 px-4 py-3">
                <span className="grid size-10 place-items-center rounded-full bg-surface-elevated text-caption font-semibold">
                  {iniciais(pessoa.nome)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="flex items-center gap-2 text-label">
                    {pessoa.nome}
                    <Badge tone={pessoa.papel === "monitor" ? "recebido" : "neutro"}>{ROTULO_PAPEL[pessoa.papel]}</Badge>
                  </p>
                  <p className="flex items-center gap-1 truncate text-caption text-muted">
                    <MapPin className="size-3" aria-hidden />
                    {pessoa.local?.nome ?? "Todos os locais"} · {pessoa.email}
                  </p>
                </div>
                <EditarPessoa pessoa={pessoa} locais={config.locais} />
              </li>
            ))}
          </ul>
          <AdicionarPessoa locais={config.locais} />
        </Secao>

        <Secao titulo="Categorias" descricao="Usadas no cadastro rápido e nos filtros de busca.">
          <ul className="flex flex-wrap gap-2">
            {config.categorias.map((c) => (
              <li key={c.id} className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-label font-normal">
                <span className="size-2 rounded-full" style={{ background: c.cor }} aria-hidden />
                <CategoryIcon icon={c.icone} className="size-4" />
                {c.nome}
                {c.fotoSensivel && <span className="text-caption text-muted">· foto oculta para alunos</span>}
              </li>
            ))}
          </ul>
        </Secao>
      </div>
    </ConteudoDesktop>
  );
}
