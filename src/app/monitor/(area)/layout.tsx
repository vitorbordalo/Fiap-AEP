import { exigirPapel } from "@/lib/auth/sessao";

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("monitor");
  return children;
}
