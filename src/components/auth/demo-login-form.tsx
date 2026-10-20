"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, FlaskConical, Lock, User } from "lucide-react";
import { entrarDemo } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import type { Papel } from "@/lib/supabase/database.types";

const PERFIS: { papel: Papel; rotulo: string }[] = [
  { papel: "aluno", rotulo: "Aluno" },
  { papel: "monitor", rotulo: "Monitor" },
  { papel: "equipe", rotulo: "Equipe" },
  { papel: "gestor", rotulo: "Gestor" },
];

type DemoLoginFormProps = { papelInicial: Papel; next?: string };

/** Login provisório do modo demonstração: qualquer usuário e senha entram com o perfil escolhido. */
export function DemoLoginForm({ papelInicial, next }: DemoLoginFormProps) {
  const [papel, setPapel] = useState<Papel>(papelInicial);

  return (
    <form action={entrarDemo} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="papel" value={papel} />

      <Input label="Usuário" name="usuario" icon={User} autoComplete="off" placeholder="Seu nome" />
      {/* sem "name": a senha nem é enviada ao servidor */}
      <Input label="Senha" type="password" icon={Lock} autoComplete="off" placeholder="Qualquer senha" />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-muted">Entrar como</legend>
        <div className="grid grid-cols-4 gap-2">
          {PERFIS.map((p) => (
            <Chip key={p.papel} selected={papel === p.papel} onClick={() => setPapel(p.papel)} className="justify-center px-2">
              {p.rotulo}
            </Chip>
          ))}
        </div>
      </fieldset>

      <BotaoEntrar />

      <p className="flex items-center justify-center gap-2 text-center text-caption text-muted">
        <FlaskConical className="size-4 shrink-0 text-aguardando" aria-hidden />
        Modo demonstração: qualquer usuário e senha funcionam.
      </p>
    </form>
  );
}

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" fullWidth loading={pending} className="mt-2">
      Entrar
      {!pending && <ArrowRight aria-hidden />}
    </Button>
  );
}
