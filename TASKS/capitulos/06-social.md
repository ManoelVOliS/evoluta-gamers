# Capítulo 06 — Camada social

**Estado:** ⏳ Pendente · PRD §5.5

## Objetivo

Dar contexto social leve ao progresso: grupos, feed de atividade e ranking. O PRD é explícito em
que esta camada é **secundária** — existe para dar leveza ao uso diário, não para competir com redes
sociais de verdade.

Feed, grupos e ranking foram **retirados da sidebar** até existirem, para o app não mostrar telas
vazias.

## Escopo

### Backend

- [ ] `groups` — nome, tipo (família/amigos), membros N:N; um usuário participa de mais de um
- [ ] `activity` — eventos gerados pelo domínio (zerou, começou), com `groupId` desnormalizado
- [ ] Feed paginado **por cursor**, nunca `skip/limit`
- [ ] Like e comentário com contadores desnormalizados (`$inc`) — nunca `countDocuments` no feed
- [ ] Ranking do grupo (mais zerados no mês, streak) via aggregation com índice
- [ ] Moderação: remover post/comentário, registrando quem removeu

### Frontend

- [ ] Feed com cards de atividade
- [ ] Página de grupo
- [ ] Ranking do mês
- [ ] Perfil público interno (catálogo e progresso de outro membro)
- [ ] Tela de moderação no admin

## Pronto quando

Zerar um jogo aparece no feed do grupo e move o ranking do mês.

## Notas

- O índice `activity {groupId, createdAt: -1}` já está previsto desde o capítulo 01 — feed sem ele
  degrada rápido.
- Métrica de sucesso do PRD §10: pelo menos 1 interação social por semana. Se não acontecer, a
  camada é decorativa e não vale manter.
