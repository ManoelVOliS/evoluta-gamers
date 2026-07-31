# @evoluta-gamers/web

Frontend do eVOLUTA Gamers — React 19 + Vite + TanStack Router/Query/Table + Tailwind 4 + shadcn/ui.

```bash
pnpm --filter @evoluta-gamers/web dev     # http://localhost:5173
```

`/api` é proxiado para a API NestJS (`VITE_API_URL`, padrão `http://localhost:3333`).

## Origem

A casca deste app (layout, sidebar, tema, command palette, páginas de auth/erro, tabelas)
vem de [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin), MIT — licença original
preservada em `LICENSE-shadcn-admin`. Removidos: Clerk, `features/chats`, `features/apps`.

Componentes de filtro de tabela serão portados de
[openstatusHQ/data-table-filters](https://github.com/openstatusHQ/data-table-filters), MIT.

Componentes novos: `pnpm dlx shadcn@latest add <nome>` (config em `components.json`).
