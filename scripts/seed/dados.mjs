// Gera os dados de exemplo (100% fictícios) do Achados e Perdidos.
// Determinístico: a mesma semente gera os mesmos dados; as datas são relativas a `agora`,
// então o dashboard sempre mostra o último mês. Usado pelo seed (scripts/seed/index.mjs)
// e validado contra as migrations em supabase/tests/seed.test.ts.

import usuariosTeste from "./usuarios-teste.json" with { type: "json" };

/** São Paulo não tem horário de verão desde 2019: UTC-3 o ano todo. */
const FUSO_HORAS = -3;
const MS_MIN = 60 * 1000;
const MS_HORA = 60 * MS_MIN;

const SEMENTE = 20261020;

const LOCAIS = [
  { chave: "ap", nome: "Achados e Perdidos", horario_retirada: "Seg a sex, 8h às 22h" },
  { chave: "ti", nome: "Sala de TI", horario_retirada: "Seg a sex, 17h às 23h" },
];

// [nome, peso]: a Sala 304 concentra mais itens, como no case do dashboard
const SALAS = [
  ["Sala 304", 9],
  ["Sala 302", 6],
  ["Sala 210", 5],
  ["Sala 401", 4],
  ["Sala 115", 4],
  ["Sala 205", 3],
  ["Sala 101", 2],
  ["Sala 102", 2],
  ["Sala 201", 2],
  ["Sala 202", 2],
  ["Sala 301", 2],
  ["Sala 402", 1],
  ["Sala 403", 1],
  ["Laboratório 501", 2],
  ["Auditório", 1],
];

const TURMAS = ["1TDSA", "1TDSB", "2TDSA", "2TDSB", "1ESPA", "2ESPA", "2ESPH", "3ESPA", "3ESPB", "1CCPA"];

// [nome, ícone lucide, cor, sensível, peso]
const CATEGORIAS = [
  ["Celular", "smartphone", "#22C55E", false, 5],
  ["Fone", "headphones", "#EC4899", false, 7],
  ["Notebook", "laptop", "#A855F7", false, 2],
  ["Carregador", "plug-zap", "#F59E0B", false, 6],
  ["Garrafa", "glass-water", "#3B82F6", false, 8],
  ["Casaco", "shirt", "#14B8A6", false, 5],
  ["Mochila", "backpack", "#10B981", false, 3],
  ["Documento", "id-card", "#F43F5E", true, 3],
  ["Guarda-chuva", "umbrella", "#06B6D4", false, 2],
  ["Outros", "ellipsis", "#737373", false, 2],
];

// Sem nomes de pessoas nem números de documento: só descrição do objeto.
const OBSERVACOES = {
  Celular: ["Capinha transparente", "Tela trincada no canto", "Capinha preta com suporte"],
  Fone: ["Fone preto com estojo", "Fone sem fio branco", "Headphone com almofada gasta"],
  Notebook: ["Prata, adesivo na tampa", "Com capa de neoprene azul"],
  Carregador: ["Cabo USB-C branco", "Fonte de notebook com cabo", "Carregador turbo preto"],
  Garrafa: ["Garrafa térmica azul", "Squeeze com adesivos", "Garrafa de vidro com capa"],
  Casaco: ["Moletom cinza com capuz", "Jaqueta jeans", "Blusa preta tamanho M"],
  Mochila: ["Mochila preta com chaveiro", "Mochila azul, sem conteúdo de valor"],
  Documento: ["Carteirinha estudantil", "Documento de identidade", "Cartão de transporte"],
  "Guarda-chuva": ["Guarda-chuva preto dobrável", "Sombrinha estampada"],
  Outros: ["Estojo azul", "Óculos de grau com estojo", "Chaveiro com três chaves"],
};

const NOMES = ["Bruna", "Caio", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena", "Igor", "Júlia", "Kaique", "Larissa", "Mateus", "Natália", "Otávio", "Paula", "Rafael", "Sabrina", "Tiago", "Vanessa", "Yuri"];
const SOBRENOMES = ["Almeida", "Barros", "Cardoso", "Duarte", "Esteves", "Farias", "Gomes", "Henriques", "Lacerda", "Moreira", "Nascimento", "Pacheco", "Queiroz", "Rezende", "Siqueira", "Teixeira", "Vasconcelos"];

/** PRNG pequeno e determinístico (mulberry32). */
function criarAleatorio(semente) {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{ agora?: Date }} [opcoes]
 */
export function gerarDadosDemo({ agora = new Date() } = {}) {
  const rand = criarAleatorio(SEMENTE);
  const inteiro = (min, max) => min + Math.floor(rand() * (max - min + 1));
  const escolher = (lista) => lista[Math.floor(rand() * lista.length)];
  const escolherComPeso = (pares) => {
    const total = pares.reduce((soma, [, peso]) => soma + peso, 0);
    let alvo = rand() * total;
    for (const [valor, peso] of pares) {
      alvo -= peso;
      if (alvo < 0) return valor;
    }
    return pares[pares.length - 1][0];
  };
  const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const n = Math.floor(rand() * 16);
      return (c === "x" ? n : (n & 0x3) | 0x8).toString(16);
    });

  // datas no fuso de São Paulo, convertidas para UTC
  const agoraLocal = new Date(agora.getTime() + FUSO_HORAS * MS_HORA);
  const momentoLocal = (diasAtras, hora, minuto) =>
    new Date(
      Date.UTC(agoraLocal.getUTCFullYear(), agoraLocal.getUTCMonth(), agoraLocal.getUTCDate() - diasAtras, hora, minuto) -
        FUSO_HORAS * MS_HORA,
    );
  const diaDaSemana = (diasAtras) =>
    new Date(Date.UTC(agoraLocal.getUTCFullYear(), agoraLocal.getUTCMonth(), agoraLocal.getUTCDate() - diasAtras)).getUTCDay();
  const horaLocal = (data) => {
    const local = new Date(data.getTime() + FUSO_HORAS * MS_HORA);
    return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
  };
  const noPassado = (data, folgaMin = 10) =>
    data.getTime() > agora.getTime() - folgaMin * MS_MIN ? new Date(agora.getTime() - inteiro(folgaMin, 90) * MS_MIN) : data;

  // ---------------------------------------------------------------------------
  // Cadastros de apoio
  // ---------------------------------------------------------------------------

  const locais = LOCAIS.map(({ nome, horario_retirada }) => ({ id: uuid(), nome, horario_retirada }));
  const [localAP, localTI] = locais;
  const salas = SALAS.map(([nome]) => ({ id: uuid(), nome }));
  const pesosSalas = SALAS.map(([, peso], i) => [salas[i], peso]);
  const turmas = TURMAS.map((nome) => ({ id: uuid(), nome }));
  const categorias = CATEGORIAS.map(([nome, icone, cor, foto_sensivel], ordem) => ({
    id: uuid(),
    nome,
    icone,
    cor,
    foto_sensivel,
    ordem,
  }));
  const pesosCategorias = CATEGORIAS.map(([, , , , peso], i) => [categorias[i], peso]);
  const categoria = (nome) => categorias.find((c) => c.nome === nome);

  // ---------------------------------------------------------------------------
  // Usuários (os 4 de teste + extras para dar volume)
  // ---------------------------------------------------------------------------

  const rmDoEmail = (email) => /^rm(\d{4,10})@/i.exec(email)?.[1] ?? null;
  const usuarios = usuariosTeste.map((u) => ({
    id: u.id,
    email: u.email,
    nome: u.nome,
    rm: rmDoEmail(u.email),
    role: u.role,
    local_id: u.local === "Sala de TI" ? localTI.id : u.local === "Achados e Perdidos" ? localAP.id : null,
  }));
  const porPapel = (papel) => usuarios.filter((u) => u.role === papel);
  const [alunoTeste] = porPapel("aluno");
  const [monitorTeste] = porPapel("monitor");
  const [equipeTI] = porPapel("equipe");

  const monitor2 = { id: uuid(), email: "monitor2@example.com", nome: "Lucas Andrade", rm: null, role: "monitor", local_id: null };
  const equipeAP = { id: uuid(), email: "equipe.ap@example.com", nome: "Carla Nogueira", rm: null, role: "equipe", local_id: localAP.id };
  usuarios.push(monitor2, equipeAP);

  const nomeFicticio = () => `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
  const alunosExtras = Array.from({ length: 10 }, (_, i) => {
    const rm = String(551000 + i * 137);
    return { id: uuid(), email: `rm${rm}@example.com`, nome: nomeFicticio(), rm, role: "aluno", local_id: null };
  });
  usuarios.push(...alunosExtras);

  const equipeDoLocal = (localId) => (localId === localTI.id ? equipeTI : equipeAP);

  // ---------------------------------------------------------------------------
  // Itens: 10 recebidos, 7 aguardando, 23 retirados, espalhados no último mês
  // ---------------------------------------------------------------------------

  const plano = [
    ...[0, 0, 1, 1, 2, 3, 4, 5, 5, 6].map((dias) => ({ estado: "recebido", dias })),
    ...[8, 9, 11, 13, 16, 20, 24].map((dias) => ({ estado: "aguardando", dias })),
    ...Array.from({ length: 23 }, () => ({ estado: "retirado", dias: inteiro(1, 30) })),
  ];

  const horarioDoAchado = () => {
    const periodo = escolherComPeso([
      ["noite", 60],
      ["tarde", 25],
      ["manha", 15],
    ]);
    if (periodo === "noite") return [inteiro(19, 22), inteiro(0, 59)];
    if (periodo === "tarde") return [inteiro(13, 18), inteiro(0, 59)];
    return [inteiro(8, 11), inteiro(0, 59)];
  };

  const itens = plano.map(({ estado, dias }) => {
    // domingo não tem aula: passa para sábado (aguardando e retirados continuam no estado planejado)
    const diasAjustados = diaDaSemana(dias) === 0 && estado !== "recebido" ? dias + 1 : dias;
    const [hora, minuto] = horarioDoAchado();
    const encontradoEm = noPassado(momentoLocal(diasAjustados, hora, minuto), 20);
    const cat = escolherComPeso(pesosCategorias);
    // depois das 22h o Achados e Perdidos já fechou: vai para a Sala de TI
    const local = hora >= 22 || (hora >= 17 && rand() < 0.35) ? localTI : localAP;
    const cadastradoPor = rand() < 0.8 ? (rand() < 0.6 ? monitorTeste : monitor2) : equipeDoLocal(local.id);

    return {
      estado,
      diasAtras: diasAjustados,
      linha: {
        id: uuid(),
        foto_path: `seed/${cat.icone}.svg`,
        categoria_id: cat.id,
        sala_id: escolherComPeso(pesosSalas).id,
        turma_id: rand() < 0.8 ? escolher(turmas).id : null,
        encontrado_em: encontradoEm,
        observacao: rand() < 0.5 ? escolher(OBSERVACOES[cat.nome]) : null,
        local_id: local.id,
        cadastrado_por: cadastradoPor.id,
        created_at: new Date(Math.min(encontradoEm.getTime() + inteiro(2, 25) * MS_MIN, agora.getTime())),
      },
    };
  });

  const recebidos = itens.filter((i) => i.estado === "recebido");
  const aguardando = itens.filter((i) => i.estado === "aguardando");
  const retirados = itens.filter((i) => i.estado === "retirado");

  // garante os casos que as telas precisam mostrar
  const fixarCategoria = (item, nome) => {
    const cat = categoria(nome);
    item.linha.categoria_id = cat.id;
    item.linha.foto_path = `seed/${cat.icone}.svg`;
    item.linha.observacao = escolher(OBSERVACOES[nome]);
  };
  fixarCategoria(recebidos[0], "Fone");
  // Documentos recebidos e aguardando: aparecem na busca do aluno, sempre sem foto (LGPD)
  fixarCategoria(recebidos[2], "Documento");
  fixarCategoria(aguardando[0], "Documento");

  // ---------------------------------------------------------------------------
  // Pedidos e retiradas
  // ---------------------------------------------------------------------------

  const pedidos = [];
  const retiradas = [];

  /** Pedido coerente com o item; `confere: false` gera divergência de horário para a conferência. */
  const criarPedido = (item, aluno, { ate = agora, confere = true } = {}) => {
    const encontrado = item.linha.encontrado_em.getTime();
    const inicio = encontrado + 30 * MS_MIN;
    const fim = Math.max(inicio, ate.getTime() - 20 * MS_MIN);
    // entre o achado e o limite, sem passar de agora
    const criadoEm = Math.min(Math.max(inicio + rand() * (fim - inicio), encontrado + 5 * MS_MIN), agora.getTime() - 2 * MS_MIN);
    const deslocamentoMin = confere ? inteiro(-40, 40) : inteiro(90, 150);
    const pedido = {
      id: uuid(),
      item_id: item.linha.id,
      aluno_id: aluno.id,
      sala_informada_id: item.linha.sala_id,
      turma_informada_id: item.linha.turma_id ?? escolher(turmas).id,
      horario_informado: horaLocal(new Date(encontrado + deslocamentoMin * MS_MIN)),
      confirmou_carteirinha: true,
      created_at: new Date(criadoEm),
    };
    pedidos.push(pedido);
    return pedido;
  };

  const alunoAleatorio = (exceto = []) => escolher(alunosExtras.filter((a) => !exceto.includes(a)));

  // recebidos: o Aluno Teste tem um pedido pendente no fone mais recente, disputado com outro aluno
  criarPedido(recebidos[0], alunoTeste);
  criarPedido(recebidos[0], alunoAleatorio());
  criarPedido(recebidos[3], alunoAleatorio(), { confere: false });
  criarPedido(recebidos[5], alunoAleatorio());
  criarPedido(aguardando[1], alunoAleatorio());
  criarPedido(aguardando[4], alunoAleatorio());

  retirados.forEach((item, indice) => {
    const encontrado = item.linha.encontrado_em;
    // retirado de 0 a 6 dias depois de encontrado, no horário de atendimento do local
    const diasAteRetirar = Math.min(inteiro(0, 6), item.diasAtras);
    const hora = item.linha.local_id === localTI.id ? inteiro(17, 22) : inteiro(9, 21);
    let retiradoEm = momentoLocal(item.diasAtras - diasAteRetirar, hora, inteiro(0, 59));
    if (retiradoEm.getTime() <= encontrado.getTime() + 30 * MS_MIN) {
      retiradoEm = new Date(encontrado.getTime() + inteiro(40, 120) * MS_MIN);
    }
    retiradoEm = noPassado(retiradoEm, 30);

    const equipe = equipeDoLocal(item.linha.local_id);
    const viaPedido = indice === 0 || rand() < 0.65;

    let pedido = null;
    let quem;
    if (viaPedido) {
      // o primeiro retirado foi entregue ao Aluno Teste (pedido "retirado" em Meus pedidos)
      const aluno = indice === 0 ? alunoTeste : alunoAleatorio();
      pedido = criarPedido(item, aluno, { ate: retiradoEm });
      quem = { rm: aluno.rm, nome: aluno.nome };
    } else {
      quem = { rm: String(inteiro(540000, 559999)), nome: nomeFicticio() };
    }

    // o segundo retirado também foi pedido pelo Aluno Teste, mas outra pessoa retirou ("encerrado")
    if (indice === 1) criarPedido(item, alunoTeste, { ate: retiradoEm });

    // um caso de retirada desfeita (entregue por engano e corrigida minutos depois)
    if (indice === 2) {
      const engano = new Date(Math.max(encontrado.getTime() + 10 * MS_MIN, retiradoEm.getTime() - 25 * MS_MIN));
      retiradas.push({
        id: uuid(),
        item_id: item.linha.id,
        pedido_id: null,
        rm: String(inteiro(540000, 559999)),
        nome: nomeFicticio(),
        carteirinha_conferida: true,
        registrado_por: equipe.id,
        retirado_em: engano,
        desfeita_em: new Date(engano.getTime() + 12 * MS_MIN),
        desfeita_por: equipe.id,
      });
    }

    retiradas.push({
      id: uuid(),
      item_id: item.linha.id,
      pedido_id: pedido?.id ?? null,
      rm: quem.rm,
      nome: quem.nome,
      carteirinha_conferida: true,
      registrado_por: equipe.id,
      retirado_em: retiradoEm,
      desfeita_em: null,
      desfeita_por: null,
    });
  });

  // ordem cronológica: os códigos #AP-0001... seguem a data em que o item foi encontrado
  const itensOrdenados = itens
    .map((i) => i.linha)
    .sort((a, b) => a.encontrado_em.getTime() - b.encontrado_em.getTime());

  return {
    locais,
    salas,
    turmas,
    categorias,
    usuarios,
    itens: itensOrdenados,
    pedidos,
    retiradas,
    resumo: {
      recebidos: recebidos.length,
      aguardando: aguardando.length,
      retirados: retirados.length,
    },
  };
}
