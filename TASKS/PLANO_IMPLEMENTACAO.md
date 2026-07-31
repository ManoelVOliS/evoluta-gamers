# Plano de Implementação — eVOLUTA Gamers

Documento previsto em `PRD_INICIO.md` §11. Pressupõe as decisões de `ANALISE_PRD.md`.
Cada fase é entregável de ponta a ponta (back + front + rodando no Docker), não camada por camada.

---

## Fase 0 — Fundação (scaffold)

**Objetivo:** repo rodando, `pnpm dev` sobe web + api + mongo, sem nenhuma feature.

- [ ] Monorepo pnpm (`pnpm-workspace.yaml`), `.editorconfig`, `.gitignore`, `git init`
- [ ] `apps/web`: base do **shadcn-admin** limpa — Clerk removido, `features/chats` e `features/apps`
      removidos, branding trocado pra eVOLUTA Gamers, pt-BR
- [ ] `apps/api`: NestJS + Mongoose + `ConfigModule` com validação de env por Zod + healthcheck
- [ ] `packages/shared`: enums e schemas Zod (`GameStatus`, `DensityLevel`, `ClassificationState`, DTOs)
- [ ] `docker-compose.yml`: mongo + api + web (nginx servindo o build), rede própria
- [ ] `.env.example` documentando `STEAM_API_KEY`, `JWT_SECRET`, `MONGO_URI`, `ADMIN_EMAIL/PASSWORD`
- [ ] GitHub Actions: lint + typecheck + test em PR

**Pronto quando:** `docker compose up` sobe tudo e `/api/health` responde `{status:"ok"}`.

---

## Fase 1 — Auth, perfil e rede fechada  *(PRD §5.1, §4)*

**Backend**
- [ ] `users` schema (email, passwordHash argon2, name, avatarUrl, role, steamId, status)
- [ ] JWT (access curto + refresh em cookie httpOnly), `AuthGuard` + `RolesGuard` (admin/user)
- [ ] Convite: `invites` (token, criadoPor, expiraEm 7d, usoÚnico) + `POST /auth/register?invite=`
- [ ] Bootstrap do primeiro admin via env, só se a coleção `users` estiver vazia
- [ ] `GET/PATCH /me` (perfil, bio, avatar)

**Frontend**
- [ ] Telas `sign-in` / `sign-up` (com convite) reaproveitadas do shadcn-admin, ligadas na API real
- [ ] Rota `_authenticated` guardada por token, refresh automático no interceptor axios
- [ ] `features/settings/profile` ligado no `/me`

**Pronto quando:** admin nasce sozinho, gera convite, segundo usuário se cadastra pelo link e loga.

---

## Fase 2 — Integração Steam e catálogo individual  *(PRD §5.2)*

**Backend**
- [ ] `SteamModule` (HttpModule) com throttle global e retry — chave única do servidor
- [ ] Login/vínculo por **Steam OpenID** → grava `steamId64` verificado; fallback `ResolveVanityURL`
- [ ] `GET /steam/sync` → `GetOwnedGames` → upsert em `games` (catálogo global) + `user_games`
- [ ] Erro de perfil privado tratado como código próprio (`STEAM_PROFILE_PRIVATE`) com instrução de correção
- [ ] Soft delete (`removedAt`) pra jogo que sumiu da biblioteca no re-sync
- [ ] Job diário `@nestjs/schedule` resincronizando bibliotecas vinculadas, escalonado (não todas de uma vez)
- [ ] Campo manual "jogos via Family Sharing" (§5.2) — entrada avulsa em `user_games` sem origem Steam

**Frontend**
- [ ] Card "Conectar Steam" no perfil, com estado (nunca sincronizado / ok / falhou / privado)
- [ ] Tabela do catálogo (base: `features/tasks` do shadcn-admin) com nome, ícone, horas jogadas, origem

**Pronto quando:** conectar a Steam traz a biblioteca inteira pra tabela, e perfil privado dá mensagem clara.

---

## Fase 3 — Classificação e rotina mensal  *(PRD §5.3, §5.4)*

**Backend**
- [ ] `games.classification`: `state` (`unclassified|suggested|confirmed`), `finishable`, `density` 1–5,
      `suggestedBy`, `confirmedBy` — duração estimada é campo **separado** de horas jogadas
- [ ] Regras de sugestão a partir de `appdetails` (gêneros/categorias), com cache permanente e throttle
- [ ] Override por usuário em `user_games.classificationOverride`
- [ ] Seed do catálogo global a partir da `jogos-para-zerar.xlsx`
- [ ] `GET /routine?month=` — rotina **derivada** (nunca persistida): meta do usuário, do mais leve ao mais denso
- [ ] `PATCH /user-games/:id` — status (não iniciado/jogando/zerado/abandonado), data de conclusão, nota

**Frontend**
- [ ] Filtros do catálogo portados do **data-table-filters**: facetado por status/nível/gênero, slider de horas
- [ ] Drawer de detalhe do jogo (`data-table-sheet`) com classificação e status editáveis
- [ ] Tela "Rotina do mês" + painel de métricas (recharts do shadcn-admin): % concluído, horas, jogos por nível

**Pronto quando:** catálogo classificado gera a rotina do mês sozinho, e marcar "zerado" recalcula tudo.

---

## Fase 4 — Camada social  *(PRD §5.5)*

- [ ] `groups` (nome, tipo, membros N:N) + convite pra grupo
- [ ] `activity` gerado por evento de domínio (zerou / começou), com `groupId` desnormalizado
- [ ] Feed paginado por cursor; like/comentário com contadores `$inc`
- [ ] Ranking do grupo (mais zerados no mês, streak) via aggregation com índice
- [ ] Perfil público interno mostrando catálogo e progresso
- [ ] Front: feed, cards de atividade, ranking, página de grupo

**Pronto quando:** zerar um jogo aparece no feed do grupo e no ranking do mês.

---

## Fase 5 — Administração  *(PRD §5.6)*

- [ ] Gestão de usuários (aprovar, banir, resetar senha, trocar papel) — base `features/users`
- [ ] Gestão de grupos (criar, arquivar, mover membro)
- [ ] Moderação do feed (remover post/comentário, com registro de quem removeu)
- [ ] Métricas da plataforma: ativos, syncs com falha, jogos mais zerados da base

**Pronto quando:** dá pra operar a rede inteira sem tocar no banco à mão.

---

## Fase 6 — Deploy e operação

- [ ] Stack no Dockge, rede e volumes próprios (independente do eVOLUTA Hub)
- [ ] Cloudflare Tunnel com hostname novo
- [ ] `mongodump` diário, retenção 7 dias
- [ ] Logs estruturados + alerta de falha de sync

---

## Ordem de ataque e dependências

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3 ──► Fase 4 ──► Fase 5
                                    └──────────────────► Fase 6 (pode começar junto da 3)
```

A Fase 3 é o coração (é o que a planilha já faz). Fases 4 e 5 são valor incremental — se o tempo
apertar, um MVP utilizável termina no fim da Fase 3.

---

## Riscos de execução

| Risco | Sinal de alerta | Plano B |
|---|---|---|
| `appdetails` bloquear por rate limit | 429 em série no job | Reduzir throttle, classificar 100% manual (não bloqueia nada) |
| Steam OpenID chato de integrar no Vite (redirect) | Mais de meio dia travado | Cair no `ResolveVanityURL` + steamID colado à mão |
| Porte dos filtros do data-table-filters arrastar Next | `next/navigation` aparecendo nos imports | Escrever os filtros do zero sobre TanStack Table (é meio dia de trabalho) |
| Densidade sem fonte de dados | Catálogo grande e todo sem nível | Seed da planilha + classificar só o que entra na rotina |
