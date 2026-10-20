import { exigirPapel } from "@/lib/auth/sessao";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("aluno");
  return <div className="mx-auto flex min-h-dvh max-w-mobile flex-col">{children}</div>;
}
