# eVOLUTA Gamers

Rede social fechada para acompanhar backlog e "zeramento" de jogos entre um grupo fechado.
Substitui a planilha `jogos-para-zerar.xlsx` por uma aplicação viva, alimentada pela Steam Web API.

Projeto **independente** do eVOLUTA Hub / eVOLUTA Barber — repo, banco e deploy próprios.

## Documentos

| Documento | O que é |
|---|---|
| [TASKS/PRD_INICIO.md](TASKS/PRD_INICIO.md) | PRD original |
| [TASKS/ANALISE_PRD.md](TASKS/ANALISE_PRD.md) | Crítica técnica do PRD, decisões e buracos |
| [TASKS/PLANO_IMPLEMENTACAO.md](TASKS/PLANO_IMPLEMENTACAO.md) | Fases 0 a 6 |

## Estrutura

```
apps/web        React 19 + Vite + TanStack Router + Tailwind 4 + shadcn/ui
apps/api        NestJS 11 + Mongoose + JWT
packages/shared tipos e schemas Zod compartilhados (contrato único front↔back)
```

## Rodando local

```bash
cp .env.example .env          # preencha JWT_SECRET e STEAM_API_KEY
pnpm install
pnpm --filter @evoluta-gamers/shared build

# Mongo em container, resto na máquina:
docker compose up -d mongo
pnpm dev                      # web em :5173, api em :3333
```

Tudo em container: `pnpm up` (web em `:8080`, api em `:3333`).

## Créditos

- Casca do frontend: [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT)
- Filtros de tabela: [openstatusHQ/data-table-filters](https://github.com/openstatusHQ/data-table-filters) (MIT)
- Componentes: [shadcn/ui](https://github.com/shadcn-ui/ui) via registry
