import { AreaProvisoria } from "@/components/layout/area-provisoria";
import { exigirPapel } from "@/lib/auth/sessao";

export default async function EquipePage() {
  const perfil = await exigirPapel("equipe");
  return <AreaProvisoria perfil={perfil} area="Área do equipe" fase={5} />;
}
