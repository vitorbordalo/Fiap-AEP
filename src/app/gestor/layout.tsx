import { exigirPapel } from "@/lib/auth/sessao";

export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("gestor");
  return children;
}
