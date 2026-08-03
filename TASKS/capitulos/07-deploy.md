# Capítulo 07 — Deploy e operação

**Estado:** ⏳ Pendente · PRD §7

## Objetivo

Colocar no ar com stack própria, independente do eVOLUTA Hub, e garantir que dá para operar sem
mexer no banco à mão.

## Escopo

- [ ] Stack no Dockge, rede e volumes próprios
- [ ] Cloudflare Tunnel com hostname novo
- [ ] `mongodump` diário, retenção de 7 dias
- [ ] Logs estruturados e alerta de falha de sincronização

## Pendências de configuração

- **Cookie cross-site.** Se o front e a API ficarem em subdomínios diferentes no Tunnel,
  `SameSite=Lax` não envia o cookie de refresh. Vai precisar de `SameSite=None; Secure` — deixar
  `COOKIE_SAMESITE`/`COOKIE_DOMAIN` configuráveis por env antes do deploy, não durante.
- **`argon2` é módulo nativo.** No Dockerfile multi-stage, o `pnpm install` precisa rodar na mesma
  imagem base do runtime, senão o binário compilado não carrega.
- **Em produção `MONGO_URI` e `STEAM_API_KEY` são obrigatórias** — o `validateEnv` recusa subir sem
  elas quando `NODE_ENV=production`. Em desenvolvimento são opcionais de propósito.
- **`ADMIN_PASSWORD` atual tem 8 caracteres.** Passa na validação mas é fraca; trocar antes de expor
  na internet.

## Estado atual

O `docker-compose.yml` e os Dockerfiles existem desde o capítulo 01, mas **nunca foram executados** —
não há Docker instalado na máquina de desenvolvimento. O Mongo em uso é a instância do homelab via
Tailscale. O compose precisa de um teste real antes de valer como caminho de deploy.
