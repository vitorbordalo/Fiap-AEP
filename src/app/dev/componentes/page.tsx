import { notFound } from "next/navigation";
import { Vitrine } from "./vitrine";

export const metadata = { title: "Componentes" };

/** Vitrine dos componentes base para revisão visual. Só existe em desenvolvimento. */
export default function ComponentesPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <Vitrine />;
}
