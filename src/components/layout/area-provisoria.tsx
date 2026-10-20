import { LogOut } from "lucide-react";
import { sair } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Perfil } from "@/lib/auth/sessao";

type AreaProvisoriaProps = {
  perfil: Perfil;
  area: string;
  fase: number;
};

/** Página temporária de cada área até as telas reais chegarem. Some na fase indicada. */
export function AreaProvisoria({ perfil, area, fase }: AreaProvisoriaProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-mobile flex-col justify-center gap-6 px-5">
      <Card className="flex flex-col gap-4 p-6">
        <p className="text-caption font-medium tracking-wider text-muted uppercase">{area}</p>
        <h1 className="text-title">Olá{perfil.nome ? `, ${perfil.nome}` : ""}</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-label font-normal">
          <dt className="text-muted">E-mail</dt>
          <dd className="truncate">{perfil.email}</dd>
          <dt className="text-muted">Perfil</dt>
          <dd className="capitalize">{perfil.role}</dd>
        </dl>
        <p className="text-body text-muted">As telas desta área chegam na Fase {fase}.</p>
        <form action={sair}>
          <Button type="submit" variant="secondary" fullWidth>
            <LogOut aria-hidden />
            Sair
          </Button>
        </form>
      </Card>
    </main>
  );
}
