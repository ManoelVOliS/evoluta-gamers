# Capítulo 02 — Autenticação e administração

**Estado:** ✅ Concluído · PRD §4, §5.1, §5.6

## Objetivo

Sair do template: login de verdade, rede fechada por convite, e um painel de administração que é
administração — não uma tela de cliente com nome diferente.

## Decisões

- **Duas áreas separadas.** `/admin` (gestão da plataforma) e `/app` (a experiência de jogar).
  Cada uma com sua própria sidebar; o login redireciona conforme o papel.
- **Convite com token, como no PRD**, mas com o fluxo **explicado na própria tela de convites** —
  regra escondida em documentação não ajuda ninguém.
- **Guard global fechado por padrão.** Rota nova nasce protegida; abrir exige `@Public()`
  explícito. O contrário (abrir por padrão) faz um esquecimento virar vazamento.
- **Refresh token em cookie httpOnly**, com rotação a cada uso e hash no banco. O access token dura
  15 min e fica em cookie legível só para sobreviver a um F5.

## Escopo entregue

### Backend

| Rota | Guard | O quê |
|---|---|---|
| `POST /api/auth/login` | público | access token + refresh em cookie httpOnly |
| `POST /api/auth/register` | público | consome o convite; conta nasce `pending` |
| `GET /api/auth/invite-check` | público | valida o token antes de mostrar o formulário |
| `POST /api/auth/refresh` · `logout` | público | rotação e revogação |
| `GET/PATCH /api/me` | usuário | perfil próprio |
| `GET /api/admin/users` · `PATCH /api/admin/users/:id` | admin | aprovar, suspender, reativar |
| `GET/POST /api/admin/invites` · `DELETE /api/admin/invites/:id` | admin | gerar, listar, revogar |
| `GET /api/admin/metrics` | admin | ativos, pendentes, convites, syncs com falha |

Coleções: `users`, `invites`, `refresh_tokens` (com índice TTL).

### Frontend

- `_authenticated/route.tsx` virou **guard de sessão** (antes era só layout — qualquer rota abria
  sem login).
- Sidebar por área via `sidebarFor(area)`; `nav-group.tsx` e os componentes de UI não mudaram.
- `src/lib/api-client.ts`: axios com refresh automático em 401, **com uma única renovação em voo**
  por vez.
- Telas: login, cadastro por convite, visão geral do admin, usuários, convites.

### Limpeza

Removidos `features/tasks`, `features/users` (500 usuários de faker), `otp`, `forgot-password`
(era mock e não há envio de e-mail), `sign-in-2`, e a dependência `@faker-js/faker`.

## Pronto quando

1. Primeiro boot cria o admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) só se a base estiver vazia ✅
2. Login como admin cai em `/admin` ✅
3. Admin gera convite → link cadastra segundo usuário → conta nasce pendente ✅
4. Reusar o mesmo convite é recusado (`INVITE_INVALID`) ✅
5. Conta pendente não loga (`ACCOUNT_PENDING_APPROVAL`) ✅
6. Admin aprova → usuário loga → cai em `/app` ✅
7. Usuário comum em rota de admin recebe 403 ✅

Verificado via HTTP contra o Mongo real. **A validação visual no navegador é sua** — não tenho
navegador neste ambiente (o download do Chromium do Playwright falhou).

## Armadilhas encontradas

- **`unique + sparse` não serve para `steamId64`.** `sparse` só ignora documentos em que o campo
  está *ausente*; `steamId64: null` é um valor presente, então o segundo usuário sem Steam
  estouraria `E11000`. Resolvido com `partialFilterExpression: { steamId64: { $type: 'string' } }`.
- **`@Prop` não resolve tipos união.** Campos `string | null` precisam de `type` explícito, senão o
  Mongoose quebra no boot com `CannotDetermineTypeError`.
- **`ThrottlerModule` estava inerte** — importado sem registrar o `ThrottlerGuard`, não limitava nada.
- **O plugin do TanStack Router sobrescreve arquivos de rota** com placeholder "Hello" quando
  detecta uma rota nova. Conferir o conteúdo depois de criar rotas.

## Dívida assumida

- Não há recuperação de senha (exige envio de e-mail). O admin reseta manualmente.
- Os testes do front foram removidos junto com o código mock que testavam; o modo browser do Vitest
  não roda neste ambiente. Cobertura a refazer.
