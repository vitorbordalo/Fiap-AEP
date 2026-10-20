import { AreaProvisoria } from "@/components/layout/area-provisoria";
import { exigirPapel } from "@/lib/auth/sessao";

export default async function GestorPage() {
  const perfil = await exigirPapel("gestor");
  return <AreaProvisoria perfil={perfil} area="Área do gestor" fase={6} />;
}
