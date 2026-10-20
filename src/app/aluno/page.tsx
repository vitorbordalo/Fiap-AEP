import { AreaProvisoria } from "@/components/layout/area-provisoria";
import { exigirPapel } from "@/lib/auth/sessao";

export default async function AlunoPage() {
  const perfil = await exigirPapel("aluno");
  return <AreaProvisoria perfil={perfil} area="Área do aluno" fase={4} />;
}
