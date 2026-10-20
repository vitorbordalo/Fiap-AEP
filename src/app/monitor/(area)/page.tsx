import type { Metadata } from "next";
import { exigirPapel } from "@/lib/auth/sessao";
import { Camera } from "./camera";

export const metadata: Metadata = { title: "Novo item" };

/** M2 · Câmera */
export default async function MonitorCameraPage() {
  const perfil = await exigirPapel("monitor");
  return <Camera usuario={perfil.nome || perfil.email} />;
}
