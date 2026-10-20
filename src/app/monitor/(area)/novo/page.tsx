import type { Metadata } from "next";
import { dados } from "@/lib/dados";
import { sugerirLocal } from "@/lib/dominio/local";
import { dataHoraIso, horaLocal } from "@/lib/formato";
import { FormularioMonitor } from "./formulario";

export const metadata: Metadata = { title: "Detalhes do item" };

/** M3 · Detalhes do item */
export default async function MonitorNovoPage() {
  const catalogo = await dados().catalogo();
  const agora = new Date();

  return (
    <FormularioMonitor
      catalogo={catalogo}
      agoraIso={dataHoraIso(agora)}
      localPadraoId={sugerirLocal(catalogo.locais, horaLocal(agora))}
    />
  );
}
