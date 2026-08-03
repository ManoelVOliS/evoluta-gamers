# Capítulo 05 — Classificação e rotina

**Estado:** ⏳ Pendente · PRD §5.3, §5.4

## Objetivo

O coração do produto: transformar o catálogo na rotina mensal que a planilha já gerava, e mostrar o
progresso. É aqui que o app passa a substituir a planilha de fato.

## Classificação em três estados, não dois

O PRD previa "zerável ou fora do escopo". Falta um estado: **quem decidiu**.

```
unclassified ──► suggested ──► confirmed
                (regra)        (humano)
```

Sem separar sugestão automática de decisão humana, o catálogo global compartilhado — que é a melhor
ideia do PRD — vira lixo compartilhado: um palpite errado do robô se propaga para todo mundo como se
fosse verdade.

## Escopo

### Backend

- [ ] Regras de sugestão a partir de `store.steampowered.com/api/appdetails`
- [ ] Sugestão **nunca** sobrescreve `confirmed`; só age em `unclassified`
- [ ] `GET /api/routine?month=` — rotina **derivada, nunca persistida**
- [ ] `GET /api/metrics/overview` — % concluído, horas jogadas vs. restantes, jogos por nível
- [ ] Override pessoal (`user_games.override`) sobre a classificação global

### Frontend

- [ ] Filtros facetados do catálogo (status, nível, gênero) + slider de horas, portados do
      [data-table-filters](https://github.com/openstatusHQ/data-table-filters) (MIT)
- [ ] Drawer de detalhe do jogo
- [ ] Tela "Rotina do mês"
- [ ] Painel com métricas reais

## O paradoxo da rotina derivada

"Recalcular sempre, ordenando do mais curto ao mais longo" significa que **zerar um jogo reembaralha
os meses passados**. A resolução: partir o eixo do tempo.

- **Meses anteriores** vêm do histórico real (`user_games.finishedAt` dentro dos limites do mês).
- **Mês atual e futuros** são derivados da fila de pendentes, ordenada por `estimatedHours` asc,
  com `name` como desempate determinístico — sem isso o plano dança sozinho entre dois requests.

Assim a rotina continua não-persistida sem reescrever o passado.

## Riscos

| Risco | Detalhe |
|---|---|
| **`appdetails` não expõe "Roguelike"** | Esses são *user tags*, que o endpoint não devolve. A regra "roguelike → fora do escopo" do PRD **não é implementável só com appdetails**. Vem da planilha ou de decisão humana |
| **O que É implementável** | `categories` traz Single-player / Multi-player / PvP / MMO. Regra: multiplayer sem single-player → sugerir fora do escopo. E `type` (`game`/`dlc`/`demo`/`music`) filtra o lixo do catálogo |
| **Rate limit ~200 req/5min** | Token bucket global e backoff. A fila é "quem nunca foi consultado", não "todos" |
| **`TZ` do Node não afeta o Mongo** | `$month` opera em UTC. Passar `timezone: 'America/Sao_Paulo'` nas aggregations, senão um jogo zerado dia 31 às 22h conta no mês seguinte |
