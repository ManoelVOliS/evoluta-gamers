# PRD — eVOLUTA Gamers

## 1. Visão geral

Rede social fechada de jogos, focada em acompanhar backlog e "zeramento" de jogos entre um grupo
fechado de usuários (amigos/família). Projeto **independente** do ecossistema eVOLUTA existente
(eVOLUTA Hub, eVOLUTA Barber) — repositório, deploy e banco próprios, sem dependência dos módulos
de barbearia.

O núcleo funcional é o que já foi validado na planilha `jogos-para-zerar.xlsx`: importar a
biblioteca Steam, classificar jogos como "zerável" (tem fim definido) ou "fora do escopo"
(roguelike, online, PvP, sandbox infinito), organizar em níveis de densidade (1 a 5) e gerar uma
rotina mensal de progresso. A camada social (perfis, grupos, feed) é secundária — existe para dar
contexto e leveza ao uso do dia a dia, não para competir com redes sociais de verdade.

## 2. Objetivos

- Substituir a planilha manual por uma aplicação web viva, com dados atualizados via API do Steam.
- Permitir que cada usuário importe sua própria biblioteca e a de sua "família"/grupo, sem precisar
  colar HTML manualmente.
- Dar visibilidade social leve ao progresso (quem zerou o quê, ranking do grupo, comentários).
- Manter uma área administrativa separada para gestão de usuários, grupos e moderação.

## 3. Fora de escopo (v1)

- Epic Games Store (sem API oficial — fica para uma v2, via scraping/lib não-oficial).
- Chat em tempo real, mensagens diretas.
- Monetização/assinatura.
- Importação de outras lojas (GOG, Xbox, PlayStation).
- Recomendação automática de jogos por IA (pode virar v2, mas não é essencial pro MVP).

## 4. Papéis de usuário

| Papel | Permissões |
|---|---|
| **Admin** | Gerencia usuários, grupos, aprova cadastros (se fechado por convite), modera conteúdo, vê métricas gerais da plataforma |
| **Usuário** | Conecta Steam, gerencia seu próprio catálogo/status, participa de grupos, vê feed, comenta/reage |
| **Convidado (opcional v1.1)** | Acesso só-leitura a um grupo público, sem conta completa |

## 5. Módulos funcionais

### 5.1 Autenticação e perfil
- Cadastro/login (e-mail + senha, JWT), rede fechada = cadastro por convite ou aprovação do admin.
- Perfil: nome, avatar, SteamID vinculado, bio curta.
- Vínculo de conta Steam: usuário informa `steamID64` (ou vanity URL) + orientação de como gerar
  a própria API key na conta Steam dele (a chave fica associada à conta Steam de cada usuário,
  nunca compartilhada).

### 5.2 Integração Steam
- Sincronização via `IPlayerService/GetOwnedGames` (nome, appid, horas jogadas, ícone).
- Job periódico (diário) resincroniza bibliotecas conectadas — usar `@nestjs/schedule` ou fila
  (BullMQ) para não travar a API em syncs simultâneas.
- Se o perfil do usuário estiver com "Detalhes do jogo" privado, a sincronização falha de forma
  clara — a aplicação deve orientar o usuário a abrir essa configuração na Steam.
- **Sem solução automática para Family Sharing** (API do Steam não expõe isso). Para v1: cada
  membro do grupo conecta sua própria conta Steam; a "biblioteca do grupo" é a união das bibliotecas
  individuais + um campo manual "jogos compartilhados que não aparecem na minha conta" que o próprio
  usuário preenche à mão quando souber que tem acesso via family sharing.

### 5.3 Catálogo e classificação
- Todo jogo importado entra como "não classificado" por padrão.
- Classificação em duas etapas:
  1. **Zerável ou fora do escopo** (regra: precisa ter fim definido; roguelike/online/PvP/sandbox
     infinito = fora do escopo).
  2. Se zerável, **nível de densidade** (1–5, pela mesma faixa de horas da planilha: até 5h, 6–12h,
     13–25h, 26–45h, 46h+).
- Classificação pode ser: manual (usuário edita), sugerida por regras simples (lista de tags/gêneros
  conhecidos como "online"/"roguelike" vindos da Steam Store API), ou copiada de um catálogo global
  compartilhado (se outro usuário já classificou "Hollow Knight", todo mundo herda a classificação
  por padrão, mas pode sobrescrever).
- Status por usuário: Não iniciado / Jogando / Zerado / Abandonado + data de conclusão + nota.

### 5.4 Rotina / plano mensal
- Geração automática da rotina (2+ jogos por mês, dos mais leves aos mais densos), igual à lógica
  da planilha, mas recalculada dinamicamente conforme o catálogo do usuário muda.
- Meta configurável por usuário (não travar em "2 por mês" fixo).
- Painel com métricas: % concluído, horas jogadas vs. restantes, jogos por nível.

### 5.5 Camada social (rede fechada)
- Grupos (ex.: "Família", "Galera do trampo") — o usuário pode participar de mais de um.
- Feed de atividade: "Fulano zerou X", "Fulano começou Y", com curtir/comentar.
- Ranking do grupo (mais zerados no mês, maior streak, etc.) — gamificação leve.
- Perfil público (dentro da rede fechada) mostrando o catálogo e progresso do usuário.

### 5.6 Área administrativa
- Gestão de usuários (aprovar cadastro, banir, resetar senha).
- Gestão de grupos (criar, arquivar, mover usuário entre grupos).
- Moderação de conteúdo do feed (remover post/comentário).
- Métricas gerais: usuários ativos, sincronizações Steam com falha, jogos mais zerados da base toda.

## 6. Modelo de dados (MongoDB, alto nível)

- `users` — auth, perfil, steamId, apiKey (criptografada), role (admin/user).
- `games` — catálogo global (appid, nome, gênero, classificação sugerida) — cache compartilhado
  entre usuários pra não reclassificar o mesmo jogo do zero toda vez.
- `user_games` — relação usuário↔jogo: status, nível, horas, data zerado, nota (dados que só
  pertencem àquele usuário, não ao catálogo global).
- `groups` — nome, membros, tipo (família/amigos).
- `posts` / `activity` — eventos de feed (zerou, começou, comentário).

## 7. Arquitetura técnica proposta

Consistente com o stack já usado no eVOLUTA Hub e no módulo de agenda:

- **Frontend**: React (ou Next.js, se quiser SSR/SEO — mas rede fechada não precisa de SEO, então
  React puro com Vite já resolve)
- **Backend**: NestJS + TypeScript
- **Banco**: MongoDB — instância própria (projeto independente), não a compartilhada do eVOLUTA
- **Auth**: JWT (mesmo padrão do eVOLUTA Hub)
- **Fila/agendamento**: `@nestjs/schedule` para sync diária da Steam; se o volume de usuários
  crescer, migrar para BullMQ + Redis
- **Deploy**: Docker Compose, stack própria no Dockge, exposta via um novo túnel Cloudflare
  (ou hostname adicional no túnel existente)
- **Repositório**: novo repo Git, independente do eVOLUTA

## 8. Skills / conhecimentos necessários

- **NestJS avançado**: guards/roles (RBAC admin vs. user), scheduling (`@nestjs/schedule`),
  módulos de integração externa (HttpModule para chamar a Steam API)
- **Steam Web API**: `GetOwnedGames`, `ResolveVanityURL` (pra aceitar tanto steamID quanto
  `/id/nome`), tratamento de perfis privados/erros
- **Criptografia de credenciais**: armazenar API key da Steam de cada usuário de forma segura
  (nunca em texto puro) — `crypto` nativo do Node ou `bcrypt`/`argon2` só serve pra senha, então
  aqui é criptografia simétrica reversível (AES-256), não hash
- **Modelagem de dados social**: relação N:N usuário↔grupo, feed paginado, contadores
  desnormalizados (like count) para não sobrecarregar queries
- **React**: state management pra feed/catálogo (Context API ou Zustand — mais leve que Redux
  pra esse escopo), componentização de cards de jogos reutilizáveis
- **Design de permissões**: middleware/guard de admin separado do guard de usuário autenticado
- **Docker/Dockge**: já domina, só replicar o padrão do eVOLUTA Hub com stack e rede próprias
- **Cloudflare Tunnel**: expor mais um serviço (novo hostname ou túnel dedicado)
- **Rate limiting**: a Steam Web API tem limites de requisição — throttling no lado do backend
  pra não estourar o limite quando vários usuários sincronizarem ao mesmo tempo

## 9. Riscos conhecidos

- **Family Sharing sem API**: é a limitação mais séria — resolvida via campo manual no v1, não
  automatizada. Se isso for essencial, a alternativa é scraping autenticado (frágil, quebra com
  updates da Steam, e exige guardar sessão/cookies do usuário — risco de segurança maior que vale
  a pena documentar antes de decidir).
- **Perfis com "Detalhes do jogo" privados**: sync falha silenciosamente se não for tratado, gerando
  frustração — precisa de mensagem de erro clara.
- **Classificação subjetiva** (zerável vs. não): jogos híbridos (ex.: Inscryption, Undertale) exigem
  julgamento; o catálogo global compartilhado ajuda a não repetir esse trabalho por usuário.

## 10. Métricas de sucesso (v1)

- Todos os membros do grupo (você + família) com Steam conectada e catálogo classificado.
- Rotina mensal gerada automaticamente sem intervenção manual.
- Pelo menos 1 interação social por semana no feed (like/comentário) — sinal de que a camada social
  não é só decorativa.

## 11. Próximos passos (fora deste PRD)

Seguindo a metodologia (PRD → Plano de Implementação → Lista de Tarefas): o próximo documento é o
**Plano de Implementação**, quebrando os módulos acima em etapas sequenciáveis (ex.: Fase 1 = auth +
integração Steam + catálogo individual; Fase 2 = classificação e rotina; Fase 3 = camada social;
Fase 4 = admin).