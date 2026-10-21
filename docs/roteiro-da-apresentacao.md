# Roteiro da apresentação (5 a 7 minutos)

## Antes de começar

1. Feche qualquer `npm run dev` aberto e rode:

   ```bash
   npm run demo
   ```

   Ele compila e sobe a demonstração em cerca de 1 minuto. É mais rápido que o `npm run dev`, porque nenhuma tela compila na primeira visita, e nada de desenvolvimento aparece na tela. (`npm run dev` também funciona; nesse caso, abra cada tela uma vez antes, para o Next compilar.)
2. Abra **http://localhost:3000/login** no navegador, em tela cheia (F11), com zoom em 100%.
3. Os dados são fictícios e ficam em memória: **Ctrl+C e `npm run demo` de novo** voltam tudo ao estado inicial.

**Trocar de perfil durante a apresentação:** botão **"Demonstração"** no canto inferior esquerdo (ou o menu do avatar, no canto superior direito).

## 1. O problema (30 s)

> Hoje o monitor encontra o objeto, tira foto, manda por e-mail e leva ao Achados e Perdidos; depois das 22h vai para a Sala de TI. O aluno precisa ir pessoalmente nos dois lugares, e **ninguém registra quem retirou cada item**.

## 2. Monitor: cadastrar em menos de 30 segundos (1 min)

1. Na tela de login, escolha **Monitor** e clique em **Entrar** (qualquer usuário e senha).
2. A câmera abre. Fotografe um objeto **ou** use **✨ Usar foto de exemplo** (canto direito), se a webcam não estiver disponível.
3. Toque em uma categoria (ex.: **Garrafa**), escolha a **Sala 304** e clique em **Cadastrar item**.
   - Destaques: nada para digitar; data e hora já preenchidas; o local de guarda é sugerido pelo horário (depois das 22h, Sala de TI); a sala fica lembrada para o próximo item.
4. Mostre o **protocolo #AP-00xx**.

## 3. Aluno: encontrar e pedir (1 min 30 s)

1. **Demonstração → Aluno.** Você é a Mariana Costa.
2. Escolha **Garrafa** e clique em **Buscar itens**. O item que o monitor acabou de cadastrar aparece.
3. Abra o item e clique em **É meu**. Informe sala, turma e horário, marque a confirmação da carteirinha e **envie**.
   - Destaques: o aluno vê onde retirar, o horário e o que levar.
4. Volte, busque **Documento** e mostre **"Foto oculta · documento"**: privacidade (LGPD) garantida no banco, não só na tela.

## 4. Equipe: registrar quem retirou (2 min)

1. **Demonstração → Equipe.** Você é a Ana Souza. No topo, troque o local para **Todos os locais**.
2. Em **Pedidos de retirada**, o pedido da Mariana aparece. Clique em **Registrar retirada**.
3. Mostre a **conferência**: sala, turma e horário com ✓ verde quando batem com o cadastro.
4. Marque **Conferi a carteirinha do aluno** (sem isso, o botão não libera) e **Confirmar retirada**. Aparece o aviso com **Desfazer**.
5. Abra **Retirados → Ver detalhes**: o **histórico completo** (cadastro, pedido, retirada, quem registrou e quando). Mostre **Desfazer retirada**: a retirada é marcada, nunca apagada (auditoria).

## 5. Gestor: números para decidir (1 min 30 s)

1. **Demonstração → Gestor.** Você é o Ricardo Lima.
2. **Dashboard**: itens cadastrados, taxa de devolução, tempo médio até a retirada, onde, o que e quando mais se perde, e a dica automática (ex.: "A Sala 115 concentra 21% dos itens, principalmente à noite").
3. **Histórico**: todas as retiradas, com **Exportar CSV** (abre no Excel).
4. **Configurações**: mude **Mover para Aguardando retirada após** de 7 para 5 dias e salve. Os itens mudam de lista sozinhos, sem ninguém arrastar nada.

## 6. Fechamento (30 s)

- O que já está pronto: as 20 telas, regras de negócio, privacidade aplicada no banco, testes automáticos (incluindo acessibilidade).
- Próximos passos: ligar ao Supabase (banco, login pelo e-mail institucional com link mágico, fotos), publicar na Vercel e piloto com os monitores.

## Se algo sair do roteiro

| Situação | O que fazer |
|---|---|
| A webcam não abre ou o navegador bloqueou | Use **✨ Usar foto de exemplo** |
| Quer recomeçar com os dados originais | Ctrl+C no terminal e `npm run demo` de novo |
| A porta 3000 está ocupada | `npm run demo -- 3100` e abra http://localhost:3100/login |
| Quer mostrar as telas de celular "dentro de um celular" | F12 → ícone de dispositivo (Ctrl+Shift+M) → iPhone 12 Pro |
