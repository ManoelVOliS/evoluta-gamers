# Capítulo 01 — Fundação

**Estado:** ✅ Concluído

## Objetivo

Repositório de pé: `pnpm dev` sobe web e API, a API conversa com o Mongo, e existe um contrato de
tipos único entre as duas pontas. Nenhuma funcionalidade de produto.

## O que foi feito

### Estrutura

```
evoluta-gamers/
├── apps/web/          React 19 + Vite 8 + TanStack Router/Query/Table + Tailwind 4 + shadcn/ui
├── apps/api/          NestJS 11 + Mongoose + JWT
├── packages/shared/   domínio, DTOs e códigos de erro em Zod
└── docker-compose.yml
```

### Decisões

- **Base do frontend:** [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT).
  Entrega layout, sidebar, tema claro/escuro, command palette e páginas de erro prontos. Clerk,
  `features/chats` e `features/apps` foram removidos.
- **`packages/shared` como contrato único.** `GameStatus`, `DensityLevel`, `ClassificationState`,
  DTOs e `ErrorCode` moram num lugar só — o front não diverge do back por descuido.
- **Validação por Zod, não class-validator.** A `ValidationPipe` do Nest exigiria DTOs em classe,
  duplicando os schemas que o front já consome. Em vez dela, `ZodBody`
  (`apps/api/src/common/zod-validation.pipe.ts`).
- **Erros normalizados** para `{ code, message }` por um filtro global; o front decide a mensagem
  pelo `code`, nunca pelo texto.

### Checklist

- [x] Monorepo pnpm com workspaces
- [x] `apps/web` limpo do template
- [x] `apps/api` com `ConfigModule` validado por Zod e healthcheck
- [x] `packages/shared` com domínio e DTOs
- [x] `docker-compose.yml` (mongo + api + web) e Dockerfiles
- [x] `.env.example` documentado

## Pronto quando

`pnpm dev:api` e `pnpm dev:web` sobem, e `http://localhost:3333/api/health` responde
`{"status":"ok","info":{"mongodb":{"status":"up"}}}`. ✅ Verificado.

## Armadilhas encontradas

- **`tsBuildInfoFile` fora do `dist`.** O `deleteOutDir` do nest-cli apagava o `dist`, mas o cache
  incremental do tsc achava que já tinha emitido — arquivos sumiam do build. O cache foi movido
  para dentro do `dist`.
- **Porta 5273 em vez de 5173.** A 5173 é do eVOLUTA Hub, que roda na mesma máquina.
- **Docker não instalado** no ambiente de desenvolvimento: o Mongo usado é a instância própria do
  homelab, via Tailscale, configurada em `apps/api/.env`.
