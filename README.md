# SaaS Restaurant — Sistema POS Gastronómico Multi-Tenant

> Plataforma SaaS de punto de venta para restaurantes, construida con NestJS + TanStack Start sobre un monorepo Bun. Multi-tenant, modular, escalable y lista para crecer por fases.

---

## 🚀 Tech Stack

| Capa | Tecnología |
| --- | --- |
| Monorepo | Bun Workspaces (>= 1.1) |
| Backend | NestJS 10, Prisma 5, MySQL 8, JWT, Passport, Swagger, class-validator, bcrypt |
| Frontend | TanStack Start, React 18, TanStack Router, TanStack Query, Tailwind CSS, Zustand, React Hook Form, Zod |
| Shared | TypeScript estricto, Zod, tipos compartidos entre `api` y `admin` |
| Infra local | Docker Compose (MySQL 8 + Redis 7) |
| Lenguaje | TypeScript con `strict: true` en todo el monorepo |

---

## 📁 Estructura del monorepo

```
saas-restaurant/
├── apps/
│   ├── api/                    # NestJS (puerto 3001)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Modelos multi-tenant
│   │   │   └── seed.ts         # Datos demo
│   │   └── src/
│   │       ├── auth/           # Login, refresh, /me, strategies, guards
│   │       ├── prisma/         # PrismaService + módulo global
│   │       ├── users/          # UsersService
│   │       ├── common/         # Filtros e interceptores globales
│   │       ├── app.module.ts
│   │       └── main.ts
│   ├── admin/                  # TanStack Start (puerto 3000, montado en /app/* por nginx)
│   │   └── src/
│   │       ├── routes/         # File-based routing
│   │       │   ├── __root.tsx
│   │       │   ├── index.tsx
│   │       │   ├── login.tsx
│   │       │   ├── _authed.tsx
│   │       │   └── _authed/
│   │       │       ├── dashboard.tsx
│   │       │       ├── categories.tsx, categories.new.tsx, categories.$id.tsx
│   │       │       ├── products.tsx, products.new.tsx, products.$id.tsx
│   │       │       ├── preparation-areas.tsx, preparation-areas.new.tsx, preparation-areas.$id.tsx
│   │       │       ├── tables.tsx, tables.new.tsx, tables.$id.tsx
│   │       │       └── customers.tsx, customers.new.tsx, customers.$id.tsx
│   │       ├── components/     # admin-layout, form-field, select-field,
│   │       │                   # textarea-field, submit-button, confirm-dialog, status-badge
│   │       ├── lib/            # api, auth-store, schemas, slugify, query-client
│   │       └── styles/app.css
│   └── landing/                # Astro 5 (one-pager estático, servido en / por nginx)
│       ├── src/
│       │   ├── components/     # Hero, Features, HowItWorks, CTA, Footer
│       │   ├── layouts/Base.astro
│       │   ├── pages/index.astro
│       │   └── styles/global.css
│       ├── astro.config.mjs
│       └── Dockerfile
├── packages/
│   ├── shared/                 # Enums, Zod, tipos, constantes
│   ├── ui/                     # Placeholder para componentes compartidos
│   └── config/                 # tsconfig/eslint/prettier base
├── docker-compose.yml          # MySQL 8 + Redis 7
├── bunfig.toml
├── tsconfig.base.json
├── package.json
├── .env.example
└── README.md
```

---

## ✅ Prerrequisitos

1. **Bun >= 1.1** — [https://bun.sh](https://bun.sh)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. **Docker Desktop** (o Docker Engine + Compose) — para MySQL y Redis
3. **Node >= 20** (opcional, solo si querés usar `node` directamente)

---

## ⚙️ Setup inicial (primera vez)

```bash
# 1. Instalar dependencias del monorepo (raíz + workspaces)
bun install

# 2. Copiar variables de entorno
cp .env.example .env
# (editá los secretos JWT en .env antes de pasar a producción)

# 3. Levantar la infraestructura (MySQL + Redis)
docker compose up -d

# 4. Generar el cliente de Prisma
bun run db:generate

# 5. Aplicar migraciones (crea las tablas en MySQL)
bun run db:migrate
# Cuando pida nombre de migración: "init"

# 6. Cargar datos demo (1 business, 2 branches, 5 usuarios, 4 categorías, 8 productos,
#    3 áreas de preparación, 12 productos expandidos, 8 mesas, 6 clientes)
bun run db:seed

# 7. Arrancar API + Admin en paralelo
bun run dev
```

> **Nota:** la primera vez que ejecutes `bun run dev:admin`, TanStack Start auto-generará
> `src/routeTree.gen.ts` (necesario para el tipado del router). No commitees ese archivo.

---

## 🧩 Phase 2 — Catálogo, mesas y clientes

Phase 2 suma cinco módulos de catálogo y salón sobre la base multi-tenant de Phase 1.
Todos respetan el mismo contrato: `JwtAuthGuard` + `ScopeGuard` + filtrado por
`req.businessContext` en cada query.

### Endpoints nuevos

| Módulo | Endpoints | Notas |
| --- | --- | --- |
| **Categorías** | `GET/POST/PATCH/DELETE /categories` + `PATCH /categories/reorder` | Soft delete; bloquea si tiene productos (409). |
| **Áreas de preparación** | `GET/POST/PATCH/DELETE /preparation-areas` + `PATCH /preparation-areas/reorder` | Hard delete; bloquea si tiene productos (409). |
| **Productos** | `GET/POST/PATCH/DELETE /products` + `GET /products/low-stock` | Filtros: `search`, `categoryId`, `preparationAreaId`, `isActive`, `isAvailable`, `productType`. `low-stock` es stub Phase 2 (devuelve productos con `trackStock=true AND minStock != null`); `currentStock` real llega en Phase 6. |
| **Mesas** | `GET/POST/PATCH/DELETE /tables` + `PATCH /tables/:id/status` | Soft delete; el cambio de estado escribe en `TableStateLog` y `AuditService`. |
| **Clientes** | `GET/POST/PATCH/DELETE /customers` + `GET /customers/search?q=` | Soft delete; `search` es para autocompletar del POS (máx 50). |

### Páginas nuevas del frontend

Todas detrás de `_authed` (login requerido). Sidebar con acceso directo:

- **Dashboard** — quick links a los 5 módulos + contadores del salón.
- **Categorías** — tabla con búsqueda y filtro de activas; reordenamiento drag-free
  (form numérico de `displayOrder`); CRUD completo.
- **Productos** — tabla con búsqueda, filtros múltiples, paginación. Form con
  select de categoría y área de preparación, `productType`, `trackStock`, `minStock`,
  tiempos de preparación.
- **Áreas de preparación** — tabla con CRUD; `code` se normaliza a UPPERCASE.
- **Mesas** — tabla con dropdown inline de estado (color por estado), filtro de
  ubicación y estado; form con `posX/posY` opcionales para mapa futuro.
- **Clientes** — tabla con búsqueda full-text, filtro activos/inactivos,
  paginación. Form con `taxIdType` (NIT/CI/RFC/CF/PAS/OTHER), email, teléfono,
  dirección, coordenadas, notas.

### Migración de Phase 2

Cuando corras `bun run db:migrate` por primera vez tras hacer `git pull` de esta
fase, Prisma te va a pedir un nombre. Usá:

```
phase2_catalog_tables_customers
```

### Decisiones de Phase 2

- **JSON en camelCase**, no snake_case. La spec original sugería snake_case, pero
  Phase 1 ya estableció camelCase (accessToken, businessId, trialEndsAt) y romper
  eso rompería el dashboard. Los DTOs, los headers HTTP y los Zod schemas del
  frontend todos usan camelCase.
- **Soft delete** en Category, Product, RestaurantTable y Customer (campo
  `deletedAt DateTime?`). Todas las queries filtran `deletedAt: null`. El DELETE
  setea el timestamp, no elimina la fila.
- **PreparationArea usa hard delete** porque es config interna: si tiene
  productos referenciándola, devolvemos 409 con un mensaje claro.
- **`x-branch-id` header** se envía automáticamente desde el cliente API cuando
  la página declara un `branchId` activo. ScopeGuard valida que esté en
  `branchIds[]` del JWT.
- **`AuditService` es un placeholder stdout** (vía `Logger` de NestJS). En Phase 5
  se reemplaza por persistencia real en tabla `AuditLog`.
- **`low-stock` es un stub** porque la columna `currentStock` aún no existe
  (llega con el módulo de inventario en Phase 6).

---

## 🌐 URLs por defecto

| Servicio | URL |
| --- | --- |
| Landing (nginx) | http://localhost:8080/ |
| Admin (nginx) | http://localhost:8080/app/ |
| Admin (directo, dev) | http://localhost:3000 |
| API REST | http://localhost:3001/api |
| Swagger | http://localhost:3001/docs |
| MySQL | `localhost:3306` (root/rootpass) |
| Redis | `localhost:6379` |

---

## 🗄️ Workflow de base de datos

| Comando | Qué hace |
| --- | --- |
| `bun run db:generate` | Regenera el cliente Prisma tras cambiar `schema.prisma` |
| `bun run db:migrate` | Aplica migraciones en desarrollo (crea/actualiza tablas) |
| `bun run db:migrate -- --name algo` | Crea una nueva migración con nombre `algo` |
| `bun run db:migrate:deploy` | Aplica migraciones en CI/prod (no interactivo) |
| `bun run db:seed` | Carga los datos demo |
| `bun run db:reset` | Drop + migrate + seed (¡borra datos!) |
| `bun run db:studio` | Abre Prisma Studio en el navegador |

---

## 🧑‍🍳 Credenciales demo

Todas usan `businessSlug = demo`. Login: `POST /api/auth/login`.

| Rol | Email | Contraseña | Sucursal default |
| --- | --- | --- | --- |
| `OWNER` | [email protected] | `Owner123!` | — |
| `ADMIN` | [email protected] | `Admin123!` | — |
| `CAJERO` | [email protected] | `Cajero123!` | CENTRO |
| `MESERO` | [email protected] | `Mesero123!` | CENTRO |
| `COCINA` | [email protected] | `Cocina123!` | CENTRO |

---

## 🔐 Reglas multi-tenant (la parte importante)

1. **Business es el tenant raíz.** Ningún dato de negocio existe sin `businessId`.
2. **El email es único POR BUSINESS** (`User.@@unique([businessId, email])`), no global.
   Esto permite que el mismo email exista en distintos tenants.
3. **El login siempre requiere `businessSlug` + email + password.** El slug resuelve el tenant;
   el email se busca dentro de ese tenant.
4. **Branch es opcional en Category/Product:** si `branchId IS NULL`, el recurso es **global**
   para el business; si tiene branch, aplica solo a esa sucursal.
5. **El JWT lleva `businessId` y `branchIds[]`.** El `ScopeGuard` (en `apps/api/src/auth/guards/scope.guard.ts`)
   valida que los headers `x-business-id` y `x-branch-id` no se "salteen" el tenant del token.

### Cabeceras HTTP multi-tenant

| Header | Significado |
| --- | --- |
| `Authorization: Bearer <token>` | Obligatorio salvo en rutas `@Public()` |
| `x-business-id` | Opcional. Si viene, debe coincidir con el `businessId` del JWT |
| `x-branch-id` | Opcional. Si viene, debe estar en `branchIds` del JWT (o el array debe estar vacío) |

---

## 🛠️ Scripts útiles

| Script | Qué hace |
| --- | --- |
| `bun run dev` | API + Admin en paralelo (concurrently) |
| `bun run dev:api` | Solo NestJS con hot-reload |
| `bun run dev:admin` | Solo TanStack Start con HMR |
| `bun run dev:landing` | Solo Astro 5 (one-pager) |
| `bun run build` | Build de todos los workspaces |
| `bun run typecheck` | `tsc --noEmit` en todos los workspaces |
| `bun run lint` | ESLint en `apps/*/src` y `packages/*/src` |
| `bun run format` | Prettier en todo `src/` |
| `bun run clean` | Borra `dist`, `.output`, `.turbo` |

---

## 📐 Decisiones arquitectónicas clave (Phase 1 + 2)

- **Sin acoplamiento del frontend al cliente Prisma.** El paquete `@saas/shared` define
  DTOs "planos" que tanto la API como el admin consumen. Migraciones o cambios internos de
  Prisma no rompen al frontend.
- **Zod + class-validator conviven.** Zod vive en `@saas/shared` (formularios, validación
  compartida) y class-validator en los DTOs de NestJS (validación HTTP). El target es
  diferente: formularios vs. payload HTTP.
- **`ScopeGuard` es reutilizable, no hardcoded.** Lee los headers, los valida contra el JWT
  y adjunta `req.businessContext` para que los servicios downstream no tengan que repetir
  la lógica.
- **JWT stateless, dos secretos.** `JWT_SECRET` para access (corta duración), `JWT_REFRESH_SECRET`
  para refresh (larga duración). El campo `typ` en el payload impide usar uno en lugar del otro.
- **Sin cookies HttpOnly todavía.** El frontend guarda tokens en `localStorage` vía Zustand
  persist. En Phase 5 se evaluará migrar a cookies + CSRF.
- **Soft delete por convención, no por cascade.** El campo `deletedAt DateTime?` vive en
  Category, Product, RestaurantTable y Customer. Ninguna query permite filtrar
  entidades "muertas" — todas incluyen `deletedAt: null`. Esto preserva el historial
  de órdenes para auditoría.
- **Branch por recurso, branchId opcional en catálogo.** Category/Product/PreparationArea
  aceptan `branchId` opcional: si es `null`, el recurso es **global** del business;
  si tiene branch, aplica solo a esa sucursal. Table **siempre** tiene branch (no
  tiene sentido una mesa huérfana).

---

## 🔭 Próximas fases

- **Phase 3** — Flujo de pedido (comanda → cocina → caja), tickets, modificadores,
  propinas, división de cuenta.
- **Phase 4** — Facturación, impuestos, reportes, cierre de caja.
- **Phase 5** — Print agent local, integraciones con impresoras térmicas, cookies + CSRF.
- **Phase 6** — Inventario real (`currentStock` en Product), delivery, multi-canal.

---

## 🤝 Convenciones de código

- TypeScript estricto (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- Sin `any`. Si no podés tipar, tipá con `unknown` y un type guard.
- DTOs con `class-validator` + `@ApiProperty` (Swagger) en el backend.
- DTOs con Zod en `@saas/shared`, reutilizables para formularios.
- Naming: `kebab-case` para archivos, `PascalCase` para clases/tipos, `camelCase` para vars/funciones.
- Commits: conventional commits (`feat:`, `fix:`, `chore:`, etc.) — sin `Co-Authored-By` ni atribuciones AI.

---

¿Encontraste un bug o querés proponer algo? Abrí un issue o un PR siguiendo las convenciones del repo.
