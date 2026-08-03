# Plano de Implementação — eVOLUTA Gamers

Documento previsto no `PRD_INICIO.md` §11. O detalhe de cada etapa vive em
`TASKS/capitulos/`; aqui fica só o mapa e o estado geral.

Pressupõe as decisões de [ANALISE_PRD.md](ANALISE_PRD.md) — em especial a correção da §2
(chave única da Steam no servidor, não uma por usuário).

---

## Capítulos

| # | Capítulo | Estado |
|---|---|---|
| 01 | [Fundação](capitulos/01-fundacao.md) — monorepo, Docker, contrato compartilhado | ✅ Concluído |
| 02 | [Autenticação e administração](capitulos/02-auth-e-admin.md) — login, convites, painel admin | ✅ Concluído |
| 03 | [Catálogo e planilha](capitulos/03-catalogo-planilha.md) — import do .xlsx, catálogo real | 🔨 Em andamento |
| 04 | [Integração Steam](capitulos/04-steam.md) — vínculo e sincronização da biblioteca | ✅ Concluído |
| 05 | [Classificação e rotina](capitulos/05-classificacao-rotina.md) — densidade, rotina mensal, painel | ⏳ Pendente |
| 06 | [Camada social](capitulos/06-social.md) — grupos, feed, ranking | ⏳ Pendente |
| 07 | [Deploy e operação](capitulos/07-deploy.md) — Dockge, Cloudflare Tunnel, backup | ⏳ Pendente |

---

## Ordem de ataque

```
01 Fundação ──► 02 Auth/Admin ──► 03 Catálogo+Planilha ──► 05 Classificação/Rotina
                                          │                        ▲
                                          └──► 04 Steam ───────────┘
                                                                   │
                                            06 Social ◄────────────┘
                                            07 Deploy (pode começar junto do 05)
```

**Por que o capítulo 03 vem antes do 04.** O `PRD_INICIO.md` sugeria começar pela Steam, mas a
`STEAM_API_KEY` ainda não existe — e sem ela nada da biblioteca entra. A planilha
`jogos-para-zerar.xlsx` já tem ~155 jogos classificados à mão, com duração estimada e status. Ou
seja: o import sozinho enche o catálogo, destrava a rotina e o painel, e roda hoje. A Steam, quando
entrar, apenas acrescenta ícone, horas jogadas e os jogos que faltam.

Um MVP utilizável termina no fim do capítulo 05. Os capítulos 06 e 07 são valor incremental.

---

## Convenções dos capítulos

Cada capítulo traz: **objetivo**, **escopo** (backend e frontend separados), **checklist**,
**pronto quando** (o teste de aceitação que você faz no navegador) e **riscos**.

Ao fim de cada capítulo a entrega para, você valida no localhost, e só então o próximo começa.
