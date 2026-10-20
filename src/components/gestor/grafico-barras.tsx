"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type GraficoBarrasProps = {
  dados: { nome: string; total: number }[];
  /** Descrição para leitores de tela (o gráfico em si é SVG). */
  descricao: string;
};

// Uma série só: uma cor só (o destaque). Texto sempre em tokens de texto, nunca na cor da barra.
const COR_BARRA = "var(--color-accent)";
const COR_TEXTO = "var(--color-muted)";
const ALTURA_LINHA = 36;

/** Barras horizontais de magnitude (itens por sala, por categoria), com valor na ponta e tooltip. */
export function GraficoBarras({ dados, descricao }: GraficoBarrasProps) {
  return (
    <figure className="flex flex-col gap-2">
      <div style={{ height: dados.length * ALTURA_LINHA + 8 }} role="img" aria-label={descricao}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 0 }} barCategoryGap={4}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="nome"
              width={128}
              axisLine={false}
              tickLine={false}
              tick={{ fill: COR_TEXTO, fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface-elevated)" }}
              contentStyle={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                color: "var(--color-foreground)",
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
              itemStyle={{ color: "var(--color-muted)" }}
              formatter={(valor) => [`${valor} ${valor === 1 ? "item" : "itens"}`, ""]}
              separator=""
            />
            <Bar dataKey="total" fill={COR_BARRA} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
              <LabelList dataKey="total" position="right" fill="var(--color-foreground)" fontSize={13} fontWeight={600} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        <ul>
          {dados.map((d) => (
            <li key={d.nome}>
              {d.nome}: {d.total}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
