import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";

/** 404: página, item ou pedido que não existe (ou que o perfil não pode ver). */
export default function NaoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5">
      <EmptyState
        icon={SearchX}
        message="Não encontramos esta página. O item pode já ter sido retirado."
        action={
          <Button asChild>
            <Link href="/">Voltar ao início</Link>
          </Button>
        }
      />
    </main>
  );
}
