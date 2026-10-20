// Gateway que imita a frente do Supabase para rodar o app inteiro localmente, sem Docker:
//   /rest/v1/*     -> PostgREST de verdade (mesmo banco, mesmo RLS)
//   /auth/v1/*     -> só o que o app usa: user, admin/users, otp (envio de link: aceito e ignorado)
//   /storage/v1/*  -> upload, URL assinada e download de fotos, em uma pasta temporária
// Serve para testes de ponta a ponta. NÃO é o Supabase: as policies do Storage não são aplicadas aqui
// (estão testadas em supabase/tests/rls.test.ts) e o e-mail do link mágico não é enviado.

import { createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import pg from "pg";

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    req.on("data", (p) => partes.push(p));
    req.on("end", () => resolve(Buffer.concat(partes)));
    req.on("error", reject);
  });
}

function responderJson(res, status, corpo) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(corpo));
}

/** Valida um JWT HS256 com o segredo do PostgREST e devolve as claims (ou null). */
function lerJwt(segredo, cabecalho) {
  const token = cabecalho?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const [h, c, assinatura] = token.split(".");
  if (!h || !c || !assinatura) return null;
  const esperada = createHmac("sha256", segredo).update(`${h}.${c}`).digest("base64url");
  if (esperada !== assinatura) return null;
  const claims = JSON.parse(Buffer.from(c, "base64url").toString("utf8"));
  return claims.exp && claims.exp * 1000 < Date.now() ? null : claims;
}

const usuarioJson = (linha) => ({
  id: linha.id,
  aud: "authenticated",
  role: "authenticated",
  email: linha.email,
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: new Date(linha.created_at ?? Date.now()).toISOString(),
  updated_at: new Date().toISOString(),
});

/**
 * @param {{ url: string, uri: string, segredo: string, pastaArquivos: string }} local
 * @param {number} porta
 */
export async function iniciarGateway(local, porta) {
  const { segredo } = local;
  // pool próprio: várias requisições ao mesmo tempo, sem disputar o cliente dos testes
  const sql = new pg.Pool({ connectionString: local.uri, max: 4 });
  const pastaFotos = path.join(local.pastaArquivos, "storage");
  await mkdir(pastaFotos, { recursive: true });
  const tipos = new Map();

  const servidor = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const rota = url.pathname;

      // ---------------------------------------------------------------- REST
      if (rota.startsWith("/rest/v1")) {
        const corpo = req.method === "GET" || req.method === "HEAD" ? undefined : await lerCorpo(req);
        const cabecalhos = { ...req.headers };
        delete cabecalhos.host;
        delete cabecalhos["content-length"];
        delete cabecalhos.connection;
        const resposta = await fetch(`${local.url}${rota.replace("/rest/v1", "")}${url.search}`, {
          method: req.method,
          headers: cabecalhos,
          body: corpo,
        });
        const saida = {};
        for (const nome of ["content-type", "content-range", "preference-applied", "location"]) {
          const valor = resposta.headers.get(nome);
          if (valor) saida[nome] = valor;
        }
        res.writeHead(resposta.status, saida);
        res.end(Buffer.from(await resposta.arrayBuffer()));
        return;
      }

      // ---------------------------------------------------------------- AUTH
      if (rota === "/auth/v1/user" && req.method === "GET") {
        const claims = lerJwt(segredo, req.headers.authorization);
        if (!claims?.sub) return responderJson(res, 401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
        const { rows } = await sql.query("select id, email, created_at from auth.users where id = $1", [claims.sub]);
        if (!rows[0]) return responderJson(res, 404, { code: 404, error_code: "user_not_found", msg: "User not found" });
        return responderJson(res, 200, usuarioJson(rows[0]));
      }

      if (rota.startsWith("/auth/v1/admin/users")) {
        const claims = lerJwt(segredo, req.headers.authorization);
        if (claims?.role !== "service_role") return responderJson(res, 401, { code: 401, msg: "service role required" });

        const id = rota.split("/")[5];
        if (req.method === "GET" && id) {
          const { rows } = await sql.query("select id, email, created_at from auth.users where id = $1", [id]);
          if (!rows[0]) return responderJson(res, 404, { code: 404, error_code: "user_not_found", msg: "User not found" });
          return responderJson(res, 200, usuarioJson(rows[0]));
        }
        if (req.method === "POST") {
          const corpo = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
          const existe = await sql.query("select 1 from auth.users where email = lower($1)", [corpo.email]);
          if (existe.rowCount) return responderJson(res, 422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
          const { rows } = await sql.query(
            "insert into auth.users (id, email) values (coalesce($1::uuid, gen_random_uuid()), lower($2)) returning id, email, created_at",
            [corpo.id ?? null, corpo.email],
          );
          return responderJson(res, 200, usuarioJson(rows[0]));
        }
      }

      if (rota === "/auth/v1/otp" && req.method === "POST") {
        // o envio do e-mail não é simulado: o link mágico é testado à parte
        return responderJson(res, 200, {});
      }

      if (rota === "/auth/v1/logout") {
        res.writeHead(204);
        res.end();
        return;
      }

      // ---------------------------------------------------------------- STORAGE
      const assinar = /^\/storage\/v1\/object\/sign\/([^/]+)$/.exec(rota);
      if (assinar && req.method === "POST") {
        const { paths = [] } = JSON.parse((await lerCorpo(req)).toString("utf8") || "{}");
        return responderJson(
          res,
          200,
          paths.map((p) => ({ error: null, path: p, signedURL: `/object/sign/${assinar[1]}/${p}?token=${randomUUID()}` })),
        );
      }

      const baixar = /^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/.exec(rota);
      if (baixar && req.method === "GET") {
        const caminho = decodeURIComponent(baixar[2]);
        const arquivo = path.join(pastaFotos, baixar[1], caminho);
        const conteudo = await readFile(arquivo).catch(() => null);
        if (!conteudo) return responderJson(res, 404, { statusCode: "404", error: "not_found", message: "Object not found" });
        res.writeHead(200, { "content-type": tipos.get(`${baixar[1]}/${caminho}`) ?? "application/octet-stream" });
        res.end(conteudo);
        return;
      }

      const enviar = /^\/storage\/v1\/object\/([^/]+)\/(.+)$/.exec(rota);
      if (enviar && (req.method === "POST" || req.method === "PUT")) {
        const claims = lerJwt(segredo, req.headers.authorization);
        if (!claims?.sub) return responderJson(res, 403, { statusCode: "403", error: "Unauthorized", message: "invalid JWT" });
        const [, bucket, caminhoCodificado] = enviar;
        const caminho = decodeURIComponent(caminhoCodificado);
        // mesma regra da policy: só na pasta do próprio usuário
        if (caminho.split("/")[0] !== claims.sub) {
          return responderJson(res, 403, { statusCode: "403", error: "Unauthorized", message: "new row violates row-level security policy" });
        }
        const corpo = await lerCorpo(req);
        let conteudo = corpo;
        let tipo = req.headers["content-type"] ?? "application/octet-stream";
        if (tipo.startsWith("multipart/form-data")) {
          const formulario = await new Request("http://x", { method: "POST", headers: { "content-type": tipo }, body: corpo }).formData();
          const arquivo = [...formulario.values()].find((v) => typeof v !== "string");
          conteudo = Buffer.from(await arquivo.arrayBuffer());
          tipo = arquivo.type || "application/octet-stream";
        }
        const destino = path.join(pastaFotos, bucket, caminho);
        await mkdir(path.dirname(destino), { recursive: true });
        await writeFile(destino, conteudo);
        tipos.set(`${bucket}/${caminho}`, tipo);
        await sql.query("insert into storage.objects (bucket_id, name, owner, owner_id) values ($1, $2, $3::uuid, $4)", [bucket, caminho, claims.sub, claims.sub]);
        return responderJson(res, 200, { Id: randomUUID(), Key: `${bucket}/${caminho}` });
      }

      responderJson(res, 404, { message: `Rota não simulada: ${req.method} ${rota}` });
    } catch (erro) {
      responderJson(res, 500, { message: erro instanceof Error ? erro.message : String(erro) });
    }
  });

  await new Promise((resolve) => servidor.listen(porta, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${porta}`,
    parar: async () => {
      await new Promise((resolve) => servidor.close(resolve));
      await sql.end();
    },
  };
}
