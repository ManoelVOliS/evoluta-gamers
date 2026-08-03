# Capítulo 03 — Catálogo e planilha

**Estado:** 🔨 Em andamento · PRD §5.3 · [ANALISE_PRD.md §3](../ANALISE_PRD.md)

## Objetivo

Encher o catálogo com dado real **sem depender da Steam**. A planilha
`jogos-para-zerar.xlsx` já tem o trabalho manual feito: ~155 jogos com duração estimada, gênero,
motivo de ser zerável e status. Importar isso é o caminho mais curto até um app que serve para algo.

## Por que este capítulo vem antes da Steam

A `STEAM_API_KEY` ainda não existe. Sem ela, nenhum jogo entra pela biblioteca. A planilha entra
hoje, e traz justamente o que a Steam **nunca** vai dar: a **duração estimada para zerar**
(`estimatedHours`), que é a base da rotina mensal. Quando a Steam entrar, ela acrescenta ícone,
horas jogadas e os jogos que faltam — e é reconciliada com o que a planilha já criou.

## A distinção que não pode se perder

| Campo | O que é | De onde vem |
|---|---|---|
| `playtimeHours` | horas que o usuário **já jogou** | Steam (`playtime_forever`, em minutos) |
| `estimatedHours` | horas para **zerar** o jogo | planilha ou preenchimento manual |

O `PRD_INICIO.md` §5.3/§5.4 tratava os dois como a mesma coisa. São campos distintos no schema.
`density` (1–5) é sempre derivada de `estimatedHours` via `densityFromHours()`.

## Estrutura da planilha (conferida no XML)

| Aba | Linhas | Colunas (cabeçalho na linha 4) |
|---|---|---|
| **Catalogo** | ~155 | Jogo · Nivel · Faixa · Horas est. · Genero · Por que e zeravel · Status · Zerado em · Nota (0-10) |
| **Fora do escopo** | ~162 | Jogo/grupo · Motivo |
| **Nao classificados** | ~53 | Jogo · Sua classificacao |
| Leia-me, Plano mensal, Painel | — | derivadas/instrucionais, ignoradas na importação |

## Escopo

### Backend

- [ ] `games` — catálogo global: `appId` (nulo por ora), `name`, `nameNormalized`, `aliases`,
      `genres`, `classification { state, finishable, estimatedHours, density, reason, tagsPtBr, source }`
- [ ] `user_games` — `userId`, `gameId`, `status`, `finishedAt`, `rating`, `source`, `override`
- [ ] Índices: `games {nameNormalized}`, `games {appId}` único parcial,
      `user_games {userId, gameId}` único
- [ ] Parser `.xlsx` com **exceljs**, mapeando colunas **pelo texto do cabeçalho**, não pela posição
- [ ] Normalização de nomes (acentos, `™`, sufixos de edição) para casar planilha ↔ Steam depois
- [ ] `POST /api/import/preview` — devolve relatório de conferência **sem gravar**
- [ ] `POST /api/import/apply` — grava classificação no catálogo global e status no `user_games`
- [ ] `GET /api/import/template` — modelo `.xlsx` para quem quiser montar a própria planilha
- [ ] `GET /api/catalog` — listagem com filtros; `PATCH /api/catalog/:id` — status, nota, data

### Frontend

- [ ] Tela de import: upload, **relatório de conferência antes de confirmar**, botão de baixar o modelo
- [ ] Tela "Meu catálogo": tabela real com nome, nível, duração estimada, gênero, status

## Pronto quando

1. Baixar o modelo pela interface e abrir no Excel sem erro
2. Subir a `jogos-para-zerar.xlsx` e ver o relatório: ~155 do catálogo, ~162 fora do escopo,
   ~53 não classificados, com a linha "EXEMPLO — apague esta linha" ignorada
3. Confirmar o import e ver os jogos em "Meu catálogo", com nível e duração
4. Marcar um jogo como "Zerado" e o estado persistir
5. Reimportar a mesma planilha não duplica nada

## Riscos

| Risco | Mitigação |
|---|---|
| A planilha não tem `appid`, só o nome | Casamento por nome normalizado; o que não casar entra sem `appId` e é reconciliado no capítulo 04 |
| Entradas agrupadas (`"Overcooked! (1 e 2)"`, "todos os X") | Detectadas e mandadas para o balde *ambíguo* do relatório — nunca divididas automaticamente |
| Coluna "Nivel" inconsistente com "Horas est." (conferido: linha 6 tem Nivel 1 com 8h) | A coluna Nivel é ignorada; a densidade é sempre derivada das horas |
| Coluna "Genero" é texto livre em pt-BR ("Co-op / gerência") | Vai para `tagsPtBr`, nunca para `genres` (que é o dado em inglês da Steam) |
| Datas em formatos diferentes (texto ISO ou serial do Excel) | Parser aceita `Date`, string ISO e número serial |
| Upload de .xlsx é superfície de ataque (zip bomb) | Limite de tamanho, teto de linhas, e leitura só de valores em cache — nunca avaliar fórmulas |
