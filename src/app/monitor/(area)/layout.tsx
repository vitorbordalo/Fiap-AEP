import { exigirPapel } from "@/lib/auth/sessao";
import { FluxoCadastroProvider } from "./fluxo";

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("monitor");
  return <FluxoCadastroProvider>{children}</FluxoCadastroProvider>;
}
