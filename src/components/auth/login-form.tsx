"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Mail, MailCheck, ShieldCheck } from "lucide-react";
import { enviarLinkMagico, type EstadoLogin } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormProps = {
  placeholder: string;
  /** Para onde voltar depois do login (vem do ?next= que o proxy colocou). */
  next?: string;
};

const ESTADO_INICIAL: EstadoLogin = { status: "inicial" };

export function LoginForm(props: LoginFormProps) {
  // trocar a key recria o formulário do zero ("Usar outro e-mail")
  const [tentativa, setTentativa] = useState(0);
  return <Formulario key={tentativa} {...props} onRecomecar={() => setTentativa((t) => t + 1)} />;
}

function Formulario({ placeholder, next, onRecomecar }: LoginFormProps & { onRecomecar: () => void }) {
  const [estado, acao, enviando] = useActionState(enviarLinkMagico, ESTADO_INICIAL);

  if (estado.status === "enviado") {
    return (
      <div className="flex flex-col items-center gap-4 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-full bg-retirado/15">
          <MailCheck className="size-6 text-retirado" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-title">Confira seu e-mail</p>
          <p className="text-body text-muted">
            Enviamos um link de acesso para <strong className="font-semibold text-foreground">{estado.email}</strong>.
            Toque nele para entrar.
          </p>
        </div>
        <Button variant="ghost" onClick={onRecomecar}>
          Usar outro e-mail
        </Button>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Input
        label="E-mail institucional"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        icon={Mail}
        placeholder={placeholder}
        error={estado.status === "erro" ? estado.mensagem : undefined}
      />
      <Button type="submit" size="lg" fullWidth loading={enviando}>
        Receber link de acesso
        {!enviando && <ArrowRight aria-hidden />}
      </Button>
      <p className="flex items-center justify-center gap-2 text-caption text-muted">
        <ShieldCheck className="size-4 text-retirado" aria-hidden />
        Enviaremos um link para o seu e-mail. Sem senha.
      </p>
    </form>
  );
}
