import { TrocaDePerfil } from "@/components/layout/troca-de-perfil";
import { MODO_DEMO } from "@/lib/modo";
import { exigirPapel } from "@/lib/auth/sessao";
import { FluxoCadastroProvider } from "./fluxo";

export default async function MonitorLayout({ children }: { children: React.ReactNode }) {
  await exigirPapel("monitor");
  return (
    <FluxoCadastroProvider>
      {children}
      {MODO_DEMO && <TrocaDePerfil papelAtual="monitor" />}
    </FluxoCadastroProvider>
  );
}
