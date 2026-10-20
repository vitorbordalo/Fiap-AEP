import type { Dashboard } from "@/lib/dados/tipos";
import { PERIODO_FAIXA, PERIODO_LABEL, PERIODOS } from "@/lib/dominio/periodo";
import { plural } from "@/lib/formato";
import { cn } from "@/lib/utils";

const DIAS = [
  { dia: 1, rotulo: "Seg" },
  { dia: 2, rotulo: "Ter" },
  { dia: 3, rotulo: "Qua" },
  { dia: 4, rotulo: "Qui" },
  { dia: 5, rotulo: "Sex" },
  { dia: 6, rotulo: "Sáb" },
];

// Sequencial de um matiz só: do quase-superfície ao destaque cheio (mais escuro = menos itens no fundo escuro).
const NIVEIS = [8, 22, 40, 62, 100];

function nivel(total: number, maximo: number) {
  if (total === 0 || maximo === 0) return -1;
  return Math.min(NIVEIS.length - 1, Math.floor((total / maximo) * (NIVEIS.length - 0.001)));
}

const fundo = (n: number) =>
  n < 0 ? "var(--color-surface-elevated)" : `color-mix(in oklab, var(--color-accent) ${NIVEIS[n]}%, var(--color-surface))`;

/** Mapa de calor dia da semana × período. É uma tabela de verdade: o número de cada célula é a visão em texto. */
export function MapaDeCalor({ calor }: { calor: Dashboard["calor"] }) {
  const maximo = Math.max(0, ...calor.map((c) => c.total));
  const valor = (dia: number, periodo: string) => calor.find((c) => c.dia === dia && c.periodo === periodo)?.total ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <table className="w-full border-separate border-spacing-2 text-label">
        <caption className="sr-only">Itens encontrados por dia da semana e período do dia</caption>
        <thead>
          <tr>
            <td />
            {PERIODOS.map((p) => (
              <th key={p} scope="col" className="pb-1 text-center font-normal">
                <span className="block text-label text-foreground">{PERIODO_LABEL[p]}</span>
                <span className="block text-caption text-muted">{PERIODO_FAIXA[p]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIAS.map(({ dia, rotulo }) => (
            <tr key={dia}>
              <th scope="row" className="w-12 pr-2 text-left font-normal text-muted">
                {rotulo}
              </th>
              {PERIODOS.map((p) => {
                const total = valor(dia, p);
                const n = nivel(total, maximo);
                return (
                  <td
                    key={p}
                    title={`${rotulo}, ${PERIODO_LABEL[p].toLowerCase()}: ${plural(total, "item", "itens")}`}
                    className={cn(
                      "h-11 rounded-lg text-center font-semibold transition-[outline] hover:outline-2 hover:outline-foreground",
                      n >= 3 ? "text-white" : n >= 0 ? "text-foreground" : "text-disabled",
                    )}
                    style={{ background: fundo(n) }}
                  >
                    {total}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-2 text-caption text-muted" aria-hidden>
        Menos
        {NIVEIS.map((_, n) => (
          <span key={n} className="size-3 rounded-sm" style={{ background: fundo(n) }} />
        ))}
        Mais
      </div>
    </div>
  );
}
