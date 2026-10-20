import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { periodoDoDia } from "@/lib/dominio/periodo";
import type { Database, Papel } from "@/lib/supabase/database.types";
import {
  calcularDashboard,
  catalogoDe,
  filtrarHistorico,
  filtrarItensEquipe,
  montarConfiguracoes,
  montarDetalhe,
  montarItemEquipe,
  montarItemPublico,
  resumirEquipe,
  type ItemLinha,
  type PedidoLinha,
  type PerfilLinha,
  type Retrato,
  type RetiradaLinha,
} from "./montagem";
import { ErroDeNegocio, type Catalogo, type ItemPublico, type MeuPedido, type Repositorio } from "./tipos";

/**
 * Repositório sobre o Supabase. Toda leitura passa pelo RLS da sessão de quem está logado:
 * se a policy não deixa, a linha simplesmente não vem. A montagem (status, pedidos, relatórios)
 * é a mesma do modo demonstração (montagem.ts).
 */

type Cliente = SupabaseClient<Database>;

const BUCKET_FOTOS = "itens";
const VALIDADE_URL_FOTO = 60 * 60; // 1 hora
const TAMANHO_PAGINA = 1000; // limite padrão de linhas do PostgREST no Supabase
const TAMANHO_LOTE_IDS = 100; // mantém as URLs com filtro "in" curtas

type Opcoes = {
  /** Cliente com a sessão do usuário (cookies), criado por requisição. */
  cliente: () => Promise<Cliente>;
  /** Cliente com service role, só para criar usuário em G3. */
  admin?: () => Cliente;
};

function falhar(etapa: string, erro: PostgrestError | { message: string }): never {
  throw new Error(`${etapa}: ${erro.message}`);
}

/** Lê todas as páginas de uma consulta (o PostgREST devolve no máximo 1000 linhas por vez). */
async function todas<T>(etapa: string, pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const linhas: T[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await pagina(de, de + TAMANHO_PAGINA - 1);
    if (error) falhar(etapa, error);
    linhas.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) return linhas;
  }
}

/** Mesma consulta em lotes de ids, juntando os resultados. */
async function emLotes<T>(etapa: string, ids: string[], consulta: (lote: string[]) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>) {
  const unicos = [...new Set(ids)];
  const linhas: T[] = [];
  for (let i = 0; i < unicos.length; i += TAMANHO_LOTE_IDS) {
    const { data, error } = await consulta(unicos.slice(i, i + TAMANHO_LOTE_IDS));
    if (error) falhar(etapa, error);
    linhas.push(...(data ?? []));
  }
  return linhas;
}

const hora = (valor: string) => valor.slice(0, 5);

// ---------------------------------------------------------------------------
// Catálogo e fotos
// ---------------------------------------------------------------------------

async function carregarCatalogo(c: Cliente): Promise<Catalogo> {
  const [categorias, salas, turmas, locais, config] = await Promise.all([
    c.from("categorias").select("id, nome, icone, cor, foto_sensivel, ordem").order("ordem"),
    c.from("salas").select("id, nome").order("nome"),
    c.from("turmas").select("id, nome").order("nome"),
    c.from("locais").select("id, nome, horario_retirada").order("nome"),
    c.from("configuracoes").select("dias_para_aguardando").maybeSingle(),
  ]);
  for (const [etapa, r] of [
    ["categorias", categorias],
    ["salas", salas],
    ["turmas", turmas],
    ["locais", locais],
    ["configurações", config],
  ] as const) {
    if (r.error) falhar(`Carregar ${etapa}`, r.error);
  }
  return {
    categorias: (categorias.data ?? []).map((x) => ({ id: x.id, nome: x.nome, icone: x.icone, cor: x.cor, fotoSensivel: x.foto_sensivel })),
    salas: salas.data ?? [],
    turmas: turmas.data ?? [],
    locais: (locais.data ?? []).map((l) => ({ id: l.id, nome: l.nome, horarioRetirada: l.horario_retirada })),
    diasParaAguardando: config.data?.dias_para_aguardando ?? 7,
  };
}

/**
 * Converte foto_path em URL: fotos de exemplo vêm de public/seed; as do Storage ganham URL assinada
 * (o bucket é privado e o Storage aplica as mesmas regras de LGPD do banco).
 * Se a assinatura falhar, cai no desenho da categoria, para a tela não quebrar.
 */
async function resolverFotos(c: Cliente, fotos: { caminho: string; icone: string }[]) {
  const urls = new Map<string, string>();
  const doStorage: string[] = [];
  for (const { caminho } of fotos) {
    if (caminho.startsWith("seed/")) urls.set(caminho, `/${caminho}`);
    else if (caminho.startsWith("data:") || caminho.startsWith("/")) urls.set(caminho, caminho);
    else doStorage.push(caminho);
  }
  const unicos = [...new Set(doStorage)];
  if (unicos.length) {
    const { data } = await c.storage.from(BUCKET_FOTOS).createSignedUrls(unicos, VALIDADE_URL_FOTO);
    for (const assinada of data ?? []) {
      if (assinada.path && assinada.signedUrl) urls.set(assinada.path, assinada.signedUrl);
    }
  }
  return (caminho: string, icone: string) => urls.get(caminho) ?? `/seed/${icone}.svg`;
}

// ---------------------------------------------------------------------------
// Retrato (recorte para a montagem)
// ---------------------------------------------------------------------------

type FiltroRetrato = { localId?: string | null; ids?: string[] };

const COLUNAS_ITEM = "id, numero, foto_path, categoria_id, sala_id, turma_id, encontrado_em, observacao, local_id, cadastrado_por, created_at";

async function carregarRetrato(c: Cliente, filtro: FiltroRetrato = {}): Promise<Retrato> {
  const catalogo = await carregarCatalogo(c);

  const linhasItens = filtro.ids
    ? await emLotes("Carregar itens", filtro.ids, (lote) => c.from("itens").select(COLUNAS_ITEM).in("id", lote))
    : await todas("Carregar itens", (de, ate) => {
        let q = c.from("itens").select(COLUNAS_ITEM).order("numero").range(de, ate);
        if (filtro.localId) q = q.eq("local_id", filtro.localId);
        return q;
      });

  const idsItens = linhasItens.map((i) => i.id);
  const [linhasPedidos, linhasRetiradas] = await Promise.all([
    emLotes("Carregar pedidos", idsItens, (lote) =>
      c.from("pedidos").select("id, item_id, aluno_id, sala_informada_id, turma_informada_id, horario_informado, created_at").in("item_id", lote),
    ),
    emLotes("Carregar retiradas", idsItens, (lote) =>
      c.from("retiradas").select("id, item_id, pedido_id, rm, nome, registrado_por, retirado_em, desfeita_em, desfeita_por").in("item_id", lote),
    ),
  ]);

  const idsPessoas = [
    ...linhasItens.map((i) => i.cadastrado_por),
    ...linhasPedidos.map((p) => p.aluno_id),
    ...linhasRetiradas.flatMap((r) => [r.registrado_por, r.desfeita_por ?? ""]).filter(Boolean),
  ];
  const linhasPerfis = await emLotes("Carregar perfis", idsPessoas, (lote) =>
    c.from("profiles").select("id, email, nome, rm, role, local_id").in("id", lote),
  );

  const iconeDe = (categoriaId: string) => catalogo.categorias.find((x) => x.id === categoriaId)?.icone ?? "package";
  const foto = await resolverFotos(
    c,
    linhasItens.map((i) => ({ caminho: i.foto_path, icone: iconeDe(i.categoria_id) })),
  );

  return {
    ...catalogo,
    perfis: linhasPerfis.map(paraPerfil),
    itens: linhasItens.map(
      (i): ItemLinha => ({
        id: i.id,
        numero: i.numero,
        fotoUrl: foto(i.foto_path, iconeDe(i.categoria_id)),
        categoriaId: i.categoria_id,
        salaId: i.sala_id,
        turmaId: i.turma_id,
        encontradoEm: new Date(i.encontrado_em),
        observacao: i.observacao,
        localId: i.local_id,
        cadastradoPor: i.cadastrado_por,
        criadoEm: new Date(i.created_at),
      }),
    ),
    pedidos: linhasPedidos.map(
      (p): PedidoLinha => ({
        id: p.id,
        itemId: p.item_id,
        alunoId: p.aluno_id,
        salaId: p.sala_informada_id,
        turmaId: p.turma_informada_id,
        horario: hora(p.horario_informado),
        criadoEm: new Date(p.created_at),
      }),
    ),
    retiradas: linhasRetiradas.map(
      (r): RetiradaLinha => ({
        id: r.id,
        itemId: r.item_id,
        pedidoId: r.pedido_id,
        rm: r.rm,
        nome: r.nome,
        registradoPor: r.registrado_por,
        retiradoEm: new Date(r.retirado_em),
        desfeitaEm: r.desfeita_em ? new Date(r.desfeita_em) : null,
        desfeitaPor: r.desfeita_por,
      }),
    ),
  };
}

function paraPerfil(p: { id: string; email: string; nome: string; rm: string | null; role: Papel; local_id: string | null }): PerfilLinha {
  return { id: p.id, email: p.email, nome: p.nome, rm: p.rm, papel: p.role, localId: p.local_id };
}

// ---------------------------------------------------------------------------
// Aluno (só pelas views itens_busca e meus_pedidos)
// ---------------------------------------------------------------------------

const COLUNAS_BUSCA = "id, numero, categoria_id, sala_id, turma_id, encontrado_em, local_id, foto_path, observacao";
type LinhaBusca = {
  id: string;
  numero: number;
  categoria_id: string;
  sala_id: string;
  turma_id: string | null;
  encontrado_em: string;
  local_id: string;
  foto_path: string | null;
  observacao: string | null;
};

async function paraItensPublicos(c: Cliente, catalogo: Catalogo, linhas: LinhaBusca[]): Promise<ItemPublico[]> {
  const iconeDe = (categoriaId: string) => catalogo.categorias.find((x) => x.id === categoriaId)?.icone ?? "package";
  const foto = await resolverFotos(
    c,
    linhas.flatMap((l) => (l.foto_path ? [{ caminho: l.foto_path, icone: iconeDe(l.categoria_id) }] : [])),
  );
  return linhas.map((l) =>
    montarItemPublico(catalogo, {
      id: l.id,
      numero: l.numero,
      categoriaId: l.categoria_id,
      salaId: l.sala_id,
      turmaId: l.turma_id,
      encontradoEm: new Date(l.encontrado_em),
      observacao: l.observacao,
      localId: l.local_id,
      fotoUrl: l.foto_path ? foto(l.foto_path, iconeDe(l.categoria_id)) : null,
    }),
  );
}

/** Dia seguinte a "2026-10-19", para o filtro por data. */
function diaSeguinte(data: string) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Repositório
// ---------------------------------------------------------------------------

export function criarRepositorioSupabase({ cliente, admin }: Opcoes): Repositorio {
  async function meusPedidos(c: Cliente, pedidoId?: string): Promise<MeuPedido[]> {
    const catalogo = await carregarCatalogo(c);
    let q = c
      .from("meus_pedidos")
      .select(
        "id, item_id, sala_informada_id, turma_informada_id, horario_informado, created_at, numero, categoria_id, sala_id, turma_id, local_id, encontrado_em, foto_path, observacao, status",
      )
      .order("created_at", { ascending: false });
    if (pedidoId) q = q.eq("id", pedidoId);
    const { data, error } = await q;
    if (error) falhar("Carregar pedidos", error);

    const linhas = data ?? [];
    const itens = await paraItensPublicos(
      c,
      catalogo,
      linhas.map((l) => ({ ...l, id: l.item_id })),
    );
    return linhas.map((l, indice) => ({
      id: l.id,
      item: itens[indice] as ItemPublico,
      salaInformada: catalogo.salas.find((s) => s.id === l.sala_informada_id) ?? { id: l.sala_informada_id, nome: "Sala" },
      turmaInformada: catalogo.turmas.find((t) => t.id === l.turma_informada_id) ?? { id: l.turma_informada_id, nome: "Turma" },
      horarioInformado: hora(l.horario_informado),
      criadoEm: new Date(l.created_at),
      situacao: l.status,
    }));
  }

  return {
    async catalogo() {
      return carregarCatalogo(await cliente());
    },

    // ---------------------------------------------------------------- aluno

    async buscarItensPublicos(filtro) {
      const c = await cliente();
      const catalogo = await carregarCatalogo(c);
      const linhas = await todas("Buscar itens", (de, ate) => {
        let q = c.from("itens_busca").select(COLUNAS_BUSCA).order("encontrado_em", { ascending: false }).range(de, ate);
        if (filtro.data) {
          q = q.gte("encontrado_em", `${filtro.data}T00:00:00-03:00`).lt("encontrado_em", `${diaSeguinte(filtro.data)}T00:00:00-03:00`);
        }
        if (filtro.salaId) q = q.eq("sala_id", filtro.salaId);
        if (filtro.categoriaId) q = q.eq("categoria_id", filtro.categoriaId);
        return q;
      });
      // o período do dia depende do fuso; filtrar aqui evita SQL específico
      const doPeriodo = filtro.periodo ? linhas.filter((l) => periodoDoDia(new Date(l.encontrado_em)) === filtro.periodo) : linhas;
      return paraItensPublicos(c, catalogo, doPeriodo);
    },

    async obterItemPublico(id) {
      const c = await cliente();
      const { data, error } = await c.from("itens_busca").select(COLUNAS_BUSCA).eq("id", id).maybeSingle();
      if (error) falhar("Carregar item", error);
      if (!data) return null;
      const [item] = await paraItensPublicos(c, await carregarCatalogo(c), [data]);
      return item ?? null;
    },

    async pedidoDoAluno(alunoId, itemId) {
      const c = await cliente();
      const { data, error } = await c.from("pedidos").select("id").eq("item_id", itemId).eq("aluno_id", alunoId).maybeSingle();
      if (error) falhar("Carregar pedido", error);
      return data?.id ?? null;
    },

    async criarPedido(alunoId, novo) {
      const c = await cliente();
      const { data, error } = await c
        .from("pedidos")
        .insert({
          item_id: novo.itemId,
          sala_informada_id: novo.salaId,
          turma_informada_id: novo.turmaId,
          horario_informado: novo.horario,
          confirmou_carteirinha: true,
        })
        .select("id")
        .single();
      if (!error) return { id: data.id };
      // já pediu este item: devolve o pedido existente
      if (error.code === "23505") {
        const existente = await this.pedidoDoAluno(alunoId, novo.itemId);
        if (existente) return { id: existente };
      }
      // a policy recusa pedido de item já retirado
      if (error.code === "42501") throw new ErroDeNegocio("Este item não está mais disponível.");
      if (error.code === "23503") throw new ErroDeNegocio("Sala ou turma inválida.");
      falhar("Criar pedido", error);
    },

    async listarMeusPedidos() {
      return meusPedidos(await cliente());
    },

    async obterMeuPedido(_alunoId, pedidoId) {
      const [pedido] = await meusPedidos(await cliente(), pedidoId);
      return pedido ?? null;
    },

    // ---------------------------------------------------------------- cadastro

    async salvarFoto(autorId, foto) {
      const c = await cliente();
      const extensao = foto.type === "image/webp" ? "webp" : foto.type === "image/png" ? "png" : "jpg";
      // a policy do Storage só aceita a pasta com o id de quem envia
      const caminho = `${autorId}/${crypto.randomUUID()}.${extensao}`;
      const { error } = await c.storage.from(BUCKET_FOTOS).upload(caminho, foto, { contentType: foto.type, upsert: false });
      if (error) {
        console.error("Falha ao enviar foto", error);
        throw new ErroDeNegocio("Não foi possível enviar a foto. Tente de novo.");
      }
      return caminho;
    },

    async cadastrarItem(autorId, novo) {
      const c = await cliente();
      const { data, error } = await c
        .from("itens")
        .insert({
          foto_path: novo.fotoPath,
          categoria_id: novo.categoriaId,
          sala_id: novo.salaId,
          turma_id: novo.turmaId,
          encontrado_em: novo.encontradoEm.toISOString(),
          observacao: novo.observacao,
          local_id: novo.localId,
          cadastrado_por: autorId,
        })
        .select("id, codigo")
        .single();
      if (!error) return { id: data.id, codigo: data.codigo };
      if (error.code === "23514") throw new ErroDeNegocio("A data e hora não podem estar no futuro.");
      if (error.code === "23503") throw new ErroDeNegocio("Categoria, sala ou local inválido.");
      if (error.code === "42501") throw new ErroDeNegocio("Seu perfil não pode cadastrar itens.");
      falhar("Cadastrar item", error);
    },

    async obterItemCadastrado(_autorId, id) {
      // o RLS só devolve o item se quem pede o cadastrou (monitor) ou é da equipe
      const r = await carregarRetrato(await cliente(), { ids: [id] });
      const item = r.itens[0];
      return item ? montarItemEquipe(r, item) : null;
    },

    // ---------------------------------------------------------------- equipe

    async listarItensEquipe(filtro) {
      return filtrarItensEquipe(await carregarRetrato(await cliente(), { localId: filtro.localId }), filtro);
    },

    async resumoEquipe(localId) {
      return resumirEquipe(await carregarRetrato(await cliente(), { localId }), localId);
    },

    async obterItemDetalhe(id) {
      const r = await carregarRetrato(await cliente(), { ids: [id] });
      const item = r.itens[0];
      return item ? montarDetalhe(r, item) : null;
    },

    async registrarRetirada(equipeId, nova) {
      const c = await cliente();
      const { data, error } = await c
        .from("retiradas")
        .insert({
          item_id: nova.itemId,
          pedido_id: nova.pedidoId,
          rm: nova.rm,
          nome: nova.nome,
          carteirinha_conferida: true,
          registrado_por: equipeId,
        })
        .select("id")
        .single();
      if (!error) return { id: data.id };
      if (error.code === "23505") throw new ErroDeNegocio("Este item já foi retirado.");
      if (error.code === "23503") throw new ErroDeNegocio("Este pedido não é deste item.");
      if (error.code === "42501") throw new ErroDeNegocio("Seu perfil não pode registrar retiradas.");
      falhar("Registrar retirada", error);
    },

    async desfazerRetirada(equipeId, retiradaId) {
      const c = await cliente();
      // data e autor reais vêm do trigger; os valores aqui só satisfazem o "desfeita completa"
      const { data, error } = await c
        .from("retiradas")
        .update({ desfeita_em: new Date().toISOString(), desfeita_por: equipeId })
        .eq("id", retiradaId)
        .select("item_id")
        .maybeSingle();
      if (error) {
        if (error.code === "P0001") throw new ErroDeNegocio(error.message);
        falhar("Desfazer retirada", error);
      }
      if (!data) throw new ErroDeNegocio("Retirada não encontrada.");
      return { itemId: data.item_id };
    },

    // ---------------------------------------------------------------- gestor

    async dashboard(localId, periodo) {
      return calcularDashboard(await carregarRetrato(await cliente(), { localId }), localId, periodo);
    },

    async historico(filtro) {
      return filtrarHistorico(await carregarRetrato(await cliente(), { localId: filtro.localId }), filtro);
    },

    async configuracoes() {
      const c = await cliente();
      const catalogo = await carregarCatalogo(c);
      const perfis = await todas("Carregar equipe", (de, ate) =>
        c.from("profiles").select("id, email, nome, rm, role, local_id").neq("role", "aluno").order("nome").range(de, ate),
      );
      return montarConfiguracoes({ ...catalogoDe(catalogo), perfis: perfis.map(paraPerfil) });
    },

    async atualizarDiasParaAguardando(dias) {
      const c = await cliente();
      const { data, error } = await c.from("configuracoes").update({ dias_para_aguardando: dias }).eq("id", true).select("id");
      if (error) falhar("Salvar configurações", error);
      if (!data?.length) throw new ErroDeNegocio("Só a coordenação pode alterar as configurações.");
    },

    async alterarPessoa(id, papel, localId) {
      const c = await cliente();
      const { data, error } = await c
        .from("profiles")
        .update({ role: papel, local_id: papel === "equipe" ? localId : null })
        .eq("id", id)
        .select("id");
      if (error) {
        if (error.code === "42501") throw new ErroDeNegocio(error.message);
        falhar("Alterar perfil", error);
      }
      if (!data?.length) throw new ErroDeNegocio("Pessoa não encontrada.");
    },

    async definirPapelPorEmail(email, papel, localId) {
      const c = await cliente();
      const { data: existente, error } = await c.from("profiles").select("id").eq("email", email).maybeSingle();
      if (error) falhar("Procurar pessoa", error);

      let id = existente?.id;
      if (!id) {
        if (!admin) throw new ErroDeNegocio("Peça para a pessoa entrar uma vez no app e tente de novo.");
        // cria a conta (o trigger cria o perfil como aluno); a pessoa entra depois pelo link mágico
        const { data: criado, error: erroCriacao } = await admin().auth.admin.createUser({ email, email_confirm: true });
        if (erroCriacao || !criado.user) falhar("Criar conta", erroCriacao ?? { message: "sem usuário" });
        id = criado.user.id;
      }
      await this.alterarPessoa(id, papel, localId);
    },
  };
}
