"use client";

import { useState } from "react";
import { Camera, DoorOpen, GraduationCap, Mail, PackageSearch, Search } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/ui/category-icon";
import { Chip, RemovableChip } from "@/components/ui/chip";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Input, Textarea } from "@/components/ui/input";
import { Modal, ModalClose, ModalContent, ModalFooter, ModalTrigger } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

const CATEGORIAS = [
  { nome: "Celular", icone: "smartphone" },
  { nome: "Fone", icone: "headphones" },
  { nome: "Notebook", icone: "laptop" },
  { nome: "Carregador", icone: "plug-zap" },
  { nome: "Documento", icone: "id-card" },
];

const SALAS = ["Sala 115", "Sala 210", "Sala 302", "Sala 304", "Sala 401"].map((s) => ({ value: s, label: s }));

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-caption font-medium tracking-wider text-muted uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

export function Vitrine() {
  const [categoria, setCategoria] = useState("Fone");
  const [observacao, setObservacao] = useState("");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-5 py-10 md:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-display">Componentes base</h1>
        <p className="text-body text-muted">Vitrine de desenvolvimento. Não existe em produção.</p>
      </header>

      <Secao titulo="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Novo item</Button>
          <Button variant="secondary">Registrar retirada</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="link">Ver todos</Button>
          <Button size="sm" variant="secondary">
            Ver detalhes
          </Button>
          <Button loading>Salvando</Button>
          <Button disabled>Confirmar retirada</Button>
          <Button size="icon" variant="secondary" aria-label="Abrir câmera">
            <Camera aria-hidden />
          </Button>
        </div>
        <div className="max-w-[430px]">
          <Button size="lg" fullWidth>
            Cadastrar item
          </Button>
        </div>
      </Secao>

      <Secao titulo="Input, Textarea e Select">
        <div className="grid gap-6 md:grid-cols-2">
          <Input label="E-mail institucional" type="email" icon={Mail} placeholder="seunome@fiap.com.br" />
          <Input label="RM" inputMode="numeric" error="Informe o RM do aluno." />
          <Select label="Sala" icon={DoorOpen} options={SALAS} placeholder="Escolha a sala" defaultValue="" />
          <Select
            label="Turma"
            icon={GraduationCap}
            options={[{ value: "2ESPH", label: "2ESPH" }]}
            defaultValue="2ESPH"
            hint="Opcional"
          />
          <Textarea
            label="Observação (opcional)"
            maxLength={140}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            aside={`${observacao.length}/140`}
            placeholder="Ex.: adesivo da FIAP na tampa"
            className="md:col-span-2"
          />
          <Input label="Buscar" icon={Search} placeholder="Buscar por código, item ou aluno" className="md:col-span-2" />
        </div>
      </Secao>

      <Secao titulo="Chip">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map((c) => (
            <Chip
              key={c.nome}
              selected={categoria === c.nome}
              onClick={() => setCategoria(c.nome)}
              icon={<CategoryIcon icon={c.icone} className="size-4 text-current" />}
            >
              {c.nome}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <RemovableChip removeLabel="Remover filtro Sala 304" onRemove={() => toast("Filtro removido.")}>
            Sala 304
          </RemovableChip>
          <RemovableChip removeLabel="Remover filtro Noite" onRemove={() => toast("Filtro removido.")}>
            Noite
          </RemovableChip>
        </div>
      </Secao>

      <Secao titulo="Badge de status">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="recebido" />
          <StatusBadge status="aguardando" />
          <StatusBadge status="retirado" />
          <StatusBadge status="recebido" label="Guardado" />
          <Badge tone="aguardando">Pedido de Aluno Exemplo</Badge>
          <Badge>Monitor</Badge>
        </div>
      </Secao>

      <Secao titulo="CategoryIcon">
        <div className="flex flex-wrap items-center gap-4">
          {Object.keys(CATEGORY_ICONS).map((nome) => (
            <CategoryIcon key={nome} icon={nome} label={nome} />
          ))}
          <CategoryIcon icon="headphones" variant="tile" label="Fone" />
          <CategoryIcon icon="smartphone" color="#22C55E" label="Celular" />
        </div>
      </Secao>

      <Secao titulo="Card">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Regras de guarda</CardTitle>
              <CardDescription>Tempo até um item ir para Aguardando retirada.</CardDescription>
            </CardHeader>
            <CardContent className="text-body">7 dias</CardContent>
          </Card>
          <Card interactive className="flex items-center gap-4 p-4">
            <div className="grid size-18 shrink-0 place-items-center rounded-xl bg-surface-elevated">
              <CategoryIcon icon="headphones" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-label font-semibold">Fone</span>
              <span className="text-caption text-muted">Sala 304 · 19/10 · 22:10</span>
            </div>
            <StatusBadge status="recebido" label="Guardado" />
          </Card>
          <Card className="flex flex-col gap-3 p-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </Card>
        </div>
      </Secao>

      <Secao titulo="Estados vazio e erro">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <EmptyState
              icon={PackageSearch}
              message="Ainda não foi encontrado. Volte a consultar amanhã."
              action={<Button variant="secondary">Limpar filtros</Button>}
            />
          </Card>
          <Card>
            <ErrorState
              message="Não foi possível carregar os itens."
              action={<Button variant="secondary">Tentar de novo</Button>}
            />
          </Card>
        </div>
      </Secao>

      <Secao titulo="Toast e Modal">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success("Item cadastrado com sucesso.")}>
            Toast de sucesso
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              toast.success("Retirada registrada.", {
                action: { label: "Desfazer", onClick: () => toast("Retirada desfeita.") },
              })
            }
          >
            Toast com Desfazer
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Não foi possível salvar. Tente de novo.")}>
            Toast de erro
          </Button>
          <Modal>
            <ModalTrigger asChild>
              <Button>Abrir modal</Button>
            </ModalTrigger>
            <ModalContent title="Registrar retirada">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="RM" inputMode="numeric" />
                <Input label="Nome completo" autoComplete="off" />
              </div>
              <ModalFooter hint="Confira a carteirinha para continuar">
                <ModalClose asChild>
                  <Button variant="secondary">Cancelar</Button>
                </ModalClose>
                <Button disabled>Confirmar retirada</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </Secao>
    </main>
  );
}
