# Análise do PRD — eVOLUTA Gamers

Documento de crítica técnica do `PRD_INICIO.md`, antes do Plano de Implementação.
Cada item marcado **[DECISÃO]** altera o PRD e precisa do teu aval (ou já está aplicado no plano).

---

## 1. Pontos onde o PRD está certo e não vou mexer

- Rede fechada por convite/aprovação — simplifica muita coisa (sem SEO, sem moderação em escala, sem LGPD pesado).
- Catálogo global compartilhado + override por usuário (§5.3). É a decisão mais inteligente do documento:
  classificar "Hollow Knight" uma vez pra base toda mata o maior custo manual do projeto.
- `games` separado de `user_games` (§6). Modelagem correta.
- Family Sharing resolvido por campo manual no v1 (§5.2). Scraping autenticado aqui seria um erro —
  guardar cookie de sessão Steam de terceiros é um risco que não paga o benefício.
- Fora de escopo do v1 (§3) está bem cortado.

---

## 2. [DECISÃO] A chave de API da Steam por usuário está baseada numa premissa incorreta

O PRD (§5.1, §6, §8) manda cada usuário gerar a própria API key da Steam, e a aplicação guardar
essa chave criptografada em AES-256.

**Isso não é necessário.** A Steam Web API key não é um token de acesso à conta do dono da chave —
é apenas uma credencial de aplicação. `IPlayerService/GetOwnedGames` aceita **qualquer** key válida
consultando **qualquer** `steamID64` cujo perfil esteja com "Detalhes do jogo" público. A chave do
usuário não desbloqueia nada que a chave do servidor não desbloqueie, e não contorna perfil privado.

Consequências de manter o desenho do PRD:
- Fricção brutal no onboarding — pedir pra tua mãe/irmão gerar uma API key na Steam é onde o projeto morre.
- Cria uma obrigação de segurança (guardar segredo reversível de terceiros) que não existiria.
- O item §8 "criptografia de credenciais AES-256" existe só por causa disso.

**Proposta:**
- Uma única `STEAM_API_KEY` no servidor (env var). Limite oficial: 100.000 req/dia — folga absurda
  pro escopo (dezenas de usuários, sync diária).
- Vínculo da conta Steam via **Steam OpenID** ("Sign in through Steam"), que devolve o `steamID64`
  com prova de posse. Melhor que digitar o ID à mão: impede alguém vincular o perfil de outra pessoa.
- Manter `ResolveVanityURL` como fallback pra quem preferir colar a URL.
- Campo `users.apiKey` e o requisito de AES-256 **saem** do modelo (§6) e das skills (§8).

**Fica no lugar:** o único segredo sensível vira a `STEAM_API_KEY` do servidor — env var, nunca no banco.

---

## 3. [DECISÃO] "Nível de densidade 1–5" não tem fonte de dados

`GetOwnedGames` devolve `playtime_forever` = horas que **aquele usuário já jogou**, e não a
**duração estimada do jogo**. A faixa da planilha (até 5h / 6–12h / 13–25h / 26–45h / 46h+) é
duração pra zerar — informação que a Steam simplesmente não expõe. O PRD trata as duas como a mesma
coisa em §5.3/§5.4.

Opções:
1. **Manual + herança do catálogo global** — já previsto no PRD, funciona, custo cai a cada usuário novo.
2. **HowLongToBeat** via lib não-oficial (scraping) — quebra sem aviso, mas é a única fonte real de duração.
3. **Seed a partir da `jogos-para-zerar.xlsx`** — a planilha já tem centenas de jogos classificados à mão.

**Proposta:** 1 + 3 no MVP (importar a planilha como seed do catálogo global, então a base já nasce
útil), e 2 como job opcional atrás de uma flag, isolado num adapter (`HltbProvider`) que pode ser
desligado quando quebrar. `playtime_forever` continua sendo guardado, mas como *horas jogadas*, campo
distinto de *duração estimada* — os dois nomes precisam ser diferentes no schema pra ninguém confundir.

> **Preciso da planilha**: me passa o caminho do `jogos-para-zerar.xlsx` que eu escrevo o importador.

---

## 4. Classificação automática "zerável vs. fora do escopo" (§5.3)

Fonte viável: `store.steampowered.com/api/appdetails?appids=` — dá `genres` e `categories`.
Ressalvas reais: é endpoint **não documentado oficialmente**, com rate limit agressivo (~200 req/5min
por IP) e sem key. Precisa de fila com throttle e cache permanente em `games` (o dado quase não muda).

Regras iniciais sugeridas (só *sugerem*, nunca decidem):
- Tem categoria multiplayer/PvP/MMO **e não tem** "Single-player" → sugerir *fora do escopo*.
- Gênero/tag "Roguelike", "Roguelite", "Sandbox", "Simulation" sem campanha → sugerir *fora do escopo*.
- Resto → sugerir *zerável*, densidade nula até alguém preencher.

Estado do jogo passa a ter 3 níveis, não 2: `unclassified` → `suggested` → `confirmed`. Sem isso não
dá pra distinguir "o robô achou" de "um humano decidiu", e o catálogo global vira lixo compartilhado.

---

## 5. Mongo vs. Postgres (§7)

O modelo é relacional: `user ↔ group` N:N, `user ↔ game` N:N com atributos, feed com join em user+game.
Postgres seria a escolha natural. **Mas** consistência com o stack do eVOLUTA Hub é uma razão legítima
— uma tecnologia a menos pra operar vale mais que elegância de modelagem nesse tamanho de projeto.

**Mantenho Mongo**, com duas exigências desde o dia 1, senão dói depois:
- Índices compostos definidos no schema: `user_games {userId, appid} unique`, `{userId, status}`,
  `activity {groupId, createdAt desc}`, `games {appid} unique`.
- Contadores desnormalizados (`likeCount`, `commentCount`) atualizados com `$inc` — nunca `countDocuments` no feed.

---

## 6. Buracos do PRD (resolvidos no Plano de Implementação)

| # | Buraco | Resolução proposta |
|---|---|---|
| 1 | Fluxo de convite não especificado | Token de convite com expiração (7d), uso único, gerado pelo admin, e-mail opcional (v1: link copiado à mão) |
| 2 | Como nasce o primeiro admin | Seed via env (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) no bootstrap, só se não existir nenhum usuário |
| 3 | Paginação do feed | Cursor (`createdAt` + `_id`), nunca `skip/limit` |
| 4 | Jogo some da biblioteca no re-sync | Soft delete (`removedAt`), não apagar — preserva histórico de zerados |
| 5 | Timezone da "rotina mensal" | Fixar `America/Sao_Paulo` no backend; mês = mês civil |
| 6 | Meta configurável (§5.4) sem regra de recálculo | Rotina é **derivada**, recalculada sob demanda, nunca persistida como plano fixo — senão desatualiza |
| 7 | Sem estratégia de testes/CI | Vitest no front (já vem do shadcn-admin), Jest no Nest, GitHub Actions em PR |
| 8 | Sem backup do Mongo | `mongodump` diário em volume do Dockge, retenção 7 dias |
| 9 | i18n | pt-BR direto, sem camada de i18n (rede fechada, público único) |
| 10 | Rate limit da Steam (§8) | Fila única com throttle global, não por usuário |

---

## 7. Reuso dos 3 repositórios

### `satnaing/shadcn-admin` (MIT) — **base do frontend, ~80% da casca pronta**
Stack idêntica ao que o PRD pede (§7: "React puro com Vite"): React 19, Vite 8, Tailwind 4,
TanStack Router + Query + Table, Zustand, Zod 4, shadcn/ui.

| Reusar | Vira o quê no eVOLUTA Gamers |
|---|---|
| Layout com sidebar, header, breadcrumb | Casca do app inteiro |
| Tema claro/escuro + seletor de fonte/direção | Pronto, zero trabalho |
| Command palette (`cmdk`) global | Busca de jogo/usuário |
| `features/users` (CRUD com tabela, dialogs, ações em linha) | §5.6 Gestão de usuários |
| `features/tasks` (tabela + filtros facetados + status) | **Molde do catálogo de jogos** (§5.3) |
| `features/settings` (perfil, aparência, conta) | §5.1 Perfil + vínculo Steam |
| `features/dashboard` (cards + recharts) | §5.4 Painel de métricas |
| Páginas de erro (401/403/404/500), `sign-in`, `sign-up`, `otp` | Auth §5.1 e erros |

**Remover:** Clerk (`@clerk/react`, rotas `/clerk/*`) → trocar por JWT próprio; `features/chats`
(fora de escopo §3); `features/apps` (demo).

### `openstatusHQ/data-table-filters` (MIT) — **porte seletivo, não dependência**
O pacote `@dtf/registry` tem `peerDependencies: { next: ">=15" }` e usa `nuqs`/`next/navigation`.
Não dá pra plugar inteiro num app Vite — tentar isso arrasta Next pra dentro do projeto.

**O que vale portar** (arquivos isolados, MIT, com o adapter `memory`/`zustand` no lugar do `nuqs`):
- `data-table-filter-controls` — checkbox facetado com contagem, slider de faixa, timerange.
  É exatamente a UX de filtrar catálogo por status / nível / gênero / horas.
- `data-table-filter-command` — barra de filtro por texto tipo query (`status:zerado nivel:3`).
- `data-table-sheet` — painel de detalhe do jogo abrindo em drawer lateral.
- Ideia do `createTableSchema` (definição declarativa de coluna + filtro + célula) — vale copiar o
  padrão, não necessariamente o código.

**Não portar:** infinite scroll com drizzle, `lib/ai`, `lib/mcp`, `lib/drizzle` — fora de escopo.

### `shadcn-ui/ui` — **registry, não repositório**
Nada de clonar. Uso normal: `pnpm dlx shadcn@latest add <componente>` conforme a necessidade aparecer
(`chart`, `sheet`, `drawer`, `sonner`). O `components.json` vem configurado no scaffold.

---

## 8. Arquitetura final proposta (delta sobre §7 do PRD)

Monorepo pnpm, um repo só (o PRD pede repo independente do eVOLUTA — mantido):

```
evoluta-gamers/
├── apps/
│   ├── web/          React 19 + Vite + TanStack Router  (base: shadcn-admin)
│   └── api/          NestJS + Mongoose + JWT
├── packages/
│   └── shared/       tipos + schemas Zod compartilhados (contrato único front↔back)
├── docker-compose.yml
└── TASKS/            PRD, análise, plano, tarefas
```

`packages/shared` é o acréscimo que mais paga: um só lugar define `GameStatus`, `DensityLevel`,
`ClassificationState` e os DTOs — o front não pode divergir do back por descuido.

---

## 9. O que eu preciso de ti pra destravar

1. **Confirmar a decisão §2** (chave única no servidor + Steam OpenID, em vez de key por usuário).
2. **Caminho da `jogos-para-zerar.xlsx`** pra escrever o seed do catálogo.
3. Se existe um repo Git remoto já criado pra este projeto (ou se eu inicializo local e tu cria depois).
