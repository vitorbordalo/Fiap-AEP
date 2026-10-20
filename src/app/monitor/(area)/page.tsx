import { AreaProvisoria } from "@/components/layout/area-provisoria";
import { exigirPapel } from "@/lib/auth/sessao";

export default async function MonitorPage() {
  const perfil = await exigirPapel("monitor");
  return <AreaProvisoria perfil={perfil} area="Área do monitor" fase={3} />;
}
