import { exigirPapel } from "@/lib/auth/sessao";

export default async function EquipeLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("equipe");
  return children;
}
