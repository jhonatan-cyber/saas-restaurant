#!/usr/bin/env bash
# Dev launcher — shows all project routes and starts services

BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}  ║     🍽️  MenuGest SaaS — Monorepo                ║${NC}"
echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}  📡 Rutas del proyecto:${NC}"
echo ""
echo -e "  ${GREEN}  API         ${NC}  →  http://localhost:3001       ${DIM}(NestJS)${NC}"
echo -e "  ${BLUE}  API Docs    ${NC}  →  http://localhost:3001/docs   ${DIM}(Swagger)${NC}"
echo -e "  ${MAGENTA}  App         ${NC}  →  http://localhost:3000       ${DIM}(TanStack Start - multi-tenant)${NC}"
echo -e "  ${YELLOW}  Admin       ${NC}  →  http://localhost:3003       ${DIM}(Panel SUPER_ADMIN)${NC}"
echo -e "  ${CYAN}  Landing     ${NC}  →  http://localhost:4321       ${DIM}(Astro)${NC}"
echo ""
echo -e "${DIM}  💡 App multi-tenant: usa http://localhost:3000/{slug}${NC}"
echo -e "${DIM}     Ejemplo: http://localhost:3000/demo   (slug del negocio)${NC}"
echo ""
echo -e "${DIM}  Presiona Ctrl+C para detener todos los servicios${NC}"
echo ""