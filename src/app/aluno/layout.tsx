import { exigirPapel } from "@/lib/auth/sessao";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("aluno");
  return children;
}
