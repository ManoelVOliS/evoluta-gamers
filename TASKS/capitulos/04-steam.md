# Capítulo 04 — Integração Steam (+ Epic Games)

**Estado:** ✅ Steam concluído · 🔨 Epic implementada, falta validar com sessão real · PRD §5.2

## Objetivo

Trazer a biblioteca real de cada membro para o catálogo, e reconciliar com o que a planilha já criou.

## A premissa corrigida do PRD

O `PRD_INICIO.md` §5.1/§6/§8 pedia que **cada usuário gerasse a própria API key** da Steam, guardada
criptografada em AES-256. Isso parte de um engano: a Steam Web API key não é um token de acesso à
conta — é credencial de **aplicação**. `GetOwnedGames` aceita **qualquer** key válida consultando
**qualquer** `steamID64` com perfil público.

Portanto:

- **Uma única `STEAM_API_KEY` no servidor** atende a rede inteira (limite: 100 mil chamadas/dia).
- Cada usuário só informa **o próprio steamID64** (ou a URL personalizada) e deixa
  "Detalhes do jogo" como **Público**.
- O requisito de criptografia AES-256 (§8) e o campo `users.apiKey` (§6) **não existem**.

Vínculo por steamID64 colado, decidido com o usuário. Steam OpenID fica para depois.

## O que foi feito

### Backend (`apps/api/src/steam/`)

- `SteamApiClient` — fila sequencial in-process (1,1s entre chamadas), sem HttpModule: chama a Steam
  direto via axios. Traduz os casos estranhos dela (ver armadilhas).
- `SteamLinkService` — aceita steamID64, URL do perfil ou vanity name; confere se já está vinculado a
  outro usuário; consulta `GetPlayerSummaries` no vínculo para avisar de perfil privado **na hora**.
- `SteamSyncService` — um `bulkWrite({ordered:false})` para `user_games`; soft delete (`removedAt`)
  do que sumiu; reconciliação com jogos que a planilha criou sem `appId`.
- `sync_runs` — histórico de cada sincronização, para o admin ver falhas.

Endpoints: `POST/DELETE /api/steam/link`, `GET /api/steam/status`, `POST /api/steam/sync`.

### Frontend

- `features/settings/steam/` — nova aba "Steam" nas configurações, com os três estados (desvinculado,
  vinculado, erro na última sync) e aviso de perfil privado.
- Corrigido de passagem: os links da barra de configurações apontavam para `/settings/*` em vez de
  `/app/settings/*` desde a reestruturação do capítulo 02 — ninguém tinha notado porque não havia
  TypeScript checando o valor (é `string`, não a união tipada de rotas).

### O que ficou de fora

- **Job diário agendado** (`@nestjs/schedule`) não foi implementado — a sync hoje é sempre manual,
  pelo botão. Entra quando o número de usuários justificar automatizar.
- **Reconciliação da planilha não foi testada em produção real**, só no cenário de teste abaixo.

## Pronto quando

1. Colar a URL personalizada resolve para o steamID64 ✅
2. Sincronizar traz a biblioteca real ✅ (1257 jogos de uma conta pública de teste)
3. Perfil com "Detalhes do jogo" privado dá mensagem clara (`STEAM_PROFILE_PRIVATE`) ✅
4. Vincular o mesmo steamID64 em outro usuário é recusado (`STEAM_ALREADY_LINKED`) ✅
5. Após o import da planilha **e** a sync, o catálogo não tem duplicatas ✅ (82 jogos reconciliados)

Validado por HTTP contra a Steam Web API real (chave fornecida pelo usuário) e o Mongo do homelab —
não simulado. Detalhe: usei uma conta pública de terceiro (`DoctorMcKay`, streamer/dev conhecido da
comunidade Steam, com biblioteca pública) para não misturar dado de teste com a conta pessoal de
ninguém da rede. **A validação com a sua própria conta Steam, pelo navegador, ainda é sua.**

## Bugs encontrados e corrigidos durante o teste

1. **Colisão silenciosa na reconciliação com a planilha.** Ao mesclar um jogo da Steam com um doc que
   a planilha criou (sem `appId`), o código só removia da lista de candidatos os *aliases do jogo que
   acabou de mesclar* — não todos os aliases do doc mesclado. Se o doc tinha outro alias não coberto
   por essa lista, um **segundo** jogo da Steam com nome parecido conseguia mesclar no mesmo doc,
   sobrescrevendo o primeiro. Resultado observado: 52 jogos "some" silenciosamente numa sincronização
   de 1257. Corrigido removendo todas as chaves do doc mesclado, não só as do jogo atual.
2. **`game_count` da própria Steam é inconsistente entre chamadas** — variou de 1241 para 1257 na
   mesma conta, sem repetir appid nenhum. Não é bug nosso; o código nunca confiou nesse campo para
   decisão, só como contexto.

## Armadilhas confirmadas com dado real

| Armadilha | Detalhe |
|---|---|
| **Perfil privado devolve HTTP 200** | `{"response":{}}` — não é erro. Detectado por `game_count` ausente |
| **Visibilidade geral ≠ "Detalhes do jogo"** | Confirmado com conta real: `communityvisibilitystate` público não garante que `GetOwnedGames` funcione — são configurações de privacidade independentes na Steam. O aviso no vínculo é só um sinal, a checagem de verdade é na sync |
| **`playtime_forever` vem em MINUTOS** | Guardado corretamente; convertido para horas só na leitura (`catalog.service.ts`) |
| **`ResolveVanityURL` não-encontrado é `success: 42`** | Confirmado, com HTTP 200 |
| **Key inválida devolve 403 com HTML** | Tratado com código próprio (`STEAM_KEY_INVALID`) |
| **`img_icon_url` é um hash, não URL** | A URL é montada com appid + hash |
| **Nunca apagar `user_games` com `status: 'finished'`** | Confirmado no re-vínculo: dados históricos sobrevivem a desvincular/religar |

## Adendo — Epic Games, primeira tentativa: entrada manual

O usuário pediu pra vincular a conta da Epic do mesmo jeito que a Steam. A Epic não tem API oficial
que devolva a lista de jogos comprados, e a primeira pesquisa pra imitar o launcher (client ID interno
dele) esbarrou no classificador de segurança do próprio Claude Code, que bloqueou buscas por
credenciais usadas pra imitar autenticação de terceiro. Nessa rodada, a solução foi Epic entrar só
como origem manual (`GameSource: 'manual_epic'`), reconciliando por nome com `POST /api/catalog/manual`
— sem OAuth, sem token de terceiro. Essa via **continua existindo**, pra quem preferir não instalar
nada.

## Adendo 2 — Epic Games via `legendary` (sincronização automática)

O usuário sugeriu usar a `legendary` (https://github.com/derrod/legendary, GPL-3.0, `legendary-gl` no
PyPI) como ferramenta em vez de eu reimplementar o OAuth do zero. Pesquisando a **API pública** dela
(onde guarda sessão, como listar jogos — não os segredos internos de autenticação), o classificador
não bloqueou, e deu pra desenhar uma integração legítima:

- `legendary auth` faz login real do usuário na página oficial da Epic.
- A sessão fica em `user.json` (com refresh token), confirmado lendo o código-fonte instalado
  localmente: `LGDLFS.__init__` em `legendary/lfs/lgndry.py`.
- `LEGENDARY_CONFIG_PATH` (variável de ambiente, confirmada no mesmo arquivo) isola o diretório de
  config — dá pra rodar a sessão de cada usuário da rede separada, num diretório temporário.
- `legendary status --json` valida a sessão (login real contra a Epic) e devolve o nome de exibição;
  `legendary list --json` devolve os jogos (`app_name`, `app_title`) — confirmado rodando o binário
  de verdade nesta máquina, não só lendo documentação.
- **Não precisou de script Python próprio**: o backend chama o binário `legendary` direto via
  `execFile`, com o `user.json` escrito num diretório temporário que é apagado logo depois.

### O que isso muda de verdade em relação à Steam

Diferente da `STEAM_API_KEY` (uma credencial só, da aplicação — PRD corrigido, ANALISE_PRD.md §2),
o `user.json` de cada pessoa é um **segredo por usuário de verdade** (refresh token de sessão). Isso
é exatamente o cenário de criptografia reversível que a Steam não precisava:

- `EPIC_TOKEN_ENCRYPTION_KEY` — AES-256-GCM (`apps/api/src/epic/epic-token-crypto.ts`), testado:
  criptografa/decriptografa corretamente, rejeita chave errada e blob adulterado (GCM autentica).
- Coleção `epic_sessions` guarda só o blob cifrado — nunca o `user.json` em texto puro no Mongo.
- O texto puro só existe em disco pelo tempo de uma chamada ao binário, num diretório temporário
  apagado logo depois (`legendary-cli.ts`, `withTempSession`).

### Schema: identificador da Epic é string, não número

`games.appId` (Steam) é `number`. A Epic identifica jogos por `app_name`, uma string. Novo campo
`games.epicAppName: string | null`, com o mesmo padrão de índice único parcial do `appId`, e a mesma
reconciliação por nome (`EpicSyncService.resolveGameIds`, réplica de
`SteamSyncService.resolveGameIds` trocando o campo de identidade).

### Bug encontrado durante a implementação (antes de qualquer sessão real)

**`/steam/status` e `/epic/status` contaminariam um ao outro.** Os dois iam ler
`user.lastSyncAt`/`user.lastSyncError` — campos compartilhados no documento do usuário. Sincronizar a
Epic atualizaria esses campos, e o card da Steam passaria a mostrar o resultado da sincronização da
Epic (e vice-versa) pra quem tivesse as duas vinculadas. Corrigido: os dois endpoints agora leem do
`sync_runs` filtrando por `source` (`'steam'` ou `'epic'`), que já guarda o dado isolado por
sincronização. `user.lastSyncAt`/`lastSyncError` continuam existindo, mas só alimentam a métrica
agregada do admin (`failedSyncs`), que é propositalmente grosseira ("a última sync de qualquer origem
falhou").

### Validado até agora

- Ambiente: Python 3.13 + `legendary-gl` instalados e funcionando nesta máquina.
- Todos os caminhos de erro sem sessão real: `EPIC_NOT_LINKED` (sync sem vínculo), `EPIC_SESSION_INVALID`
  (JSON sem `account_id`, texto que não é JSON nenhum) — confirmados via curl, o subprocess de verdade
  roda e falha do jeito esperado.
- Criptografia: 3 testes automatizados (`epic-token-crypto.spec.ts`) passando.
- **Não testado ainda: vínculo e sincronização com uma sessão Epic real.** Isso exige rodar
  `legendary auth` e logar de verdade — só o usuário pode fazer essa parte.

### Pendências

- Caminho do `user.json` no Windows: documentado na tela como `C:\Users\<usuário>\.config\legendary\user.json`,
  confirmado lendo o código-fonte (`os.path.expanduser('~/.config/legendary')`, e `~` no Windows
  resolve para `USERPROFILE`) — mas nunca visualmente conferido com um arquivo real gerado.
  **A confirmar quando você rodar `legendary auth`.**
- Sem job diário agendado pra Epic, mesma pendência já documentada pra Steam.
- Dockerfile ganhou um estágio `pip install legendary-gl` num venv — nunca testado rodando o
  container de verdade (ambiente sem Docker instalado, mesma limitação do capítulo 01).
