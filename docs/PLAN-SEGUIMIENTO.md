# Plan de seguimiento — SaaS Restaurant

> Documento generado a partir del análisis del proyecto (julio 2026).  
> Usar checkboxes `- [ ]` / `- [x]` para marcar avance.  
> Estados sugeridos por tarea: `pendiente` · `en curso` · `hecho` · `bloqueado`

---

## Resumen de progreso

| Categoría    | Total | Hecho | En curso | Pendiente |
|--------------|-------|-------|----------|-----------|
| Implementar  | 15    | 0     | 0        | 15        |
| Mejorar      | 14    | 0     | 0        | 14        |
| Optimizar    | 10    | 0     | 0        | 10        |
| **Total**    | **39**| **0** | **0**    | **39**    |

| Fase | Nombre                         | Tareas | Estado      |
|------|--------------------------------|--------|-------------|
| 0    | Preparación                    | 2      | completado  |
| 1    | Correcciones y base operativa  | 6      | en curso    |
| 2    | Permisos y multi-sucursal      | 4      | pendiente   |
| 3    | SaaS y monetización            | 3      | pendiente   |
| 4    | Inventario y operaciones       | 4      | pendiente   |
| 5    | POS avanzado                   | 4      | pendiente   |
| 6    | Canales (mobile, print)        | 5     | pendiente   |
| 7    | Infra, seguridad y calidad     | 7      | pendiente   |
| 8    | Optimización y DX              | 4      | pendiente   |

---

## Leyenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Prioridad alta — impacto directo en operación o ingresos |
| 🟡 | Prioridad media |
| 🟢 | Prioridad baja — puede esperar |
| ⚡ | Quick win (< 1 día) |
| 🔗 | Tiene dependencias (ver columna **Depende de**) |

**Categorías:** `IMP` = Implementar · `MEJ` = Mejorar · `OPT` = Optimizar

---

## Fase 0 — Preparación

> Antes de tocar features: alinear repo y entorno.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F0-01 | MEJ | Sincronizar `main` con `origin` (7 commits pendientes) | 🔴 ⚡ | Git | `git pull` sin conflictos; CI local pasa | — | - [ ] |
| F0-02 | MEJ | Actualizar README con estado real del proyecto (Fases 3–6) | 🟡 | `README.md` | Documenta módulos, endpoints y flujos actuales | F0-01 | - [ ] |

---

## Fase 1 — Correcciones y base operativa

> Bugs y deuda que afectan el uso diario del admin.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F1-01 | MEJ | Corregir `expectedVersion` en KDS | 🔴 ⚡ | `admin/src/routes/_authed/kds.tsx`, `kds-order-card.tsx` | Transiciones usan `order.version` real; sin 409 espurios | — | - [ ] |
| F1-02 | IMP | Selector global de sucursal en admin | 🔴 | `admin-layout.tsx`, nuevo `branch-store.ts`, `api.ts` | Header `x-branch-id` consistente en todas las pantallas | — | - [ ] |
| F1-03 | IMP | RBAC en sidebar y rutas del admin | 🔴 | `admin-layout.tsx`, `@saas/shared` (mapa roles), rutas `_authed/*` | Cajero/mesero/cocina solo ven sus secciones; rutas protegidas con `beforeLoad` | — | - [ ] |
| F1-04 | MEJ | Agregar `RolesGuard` a inventario y reportes | 🟡 | `inventory.controller.ts`, `reports.controller.ts` | Solo OWNER/ADMIN (o roles definidos) acceden a escritura/reportes | F1-03 | - [ ] |
| F1-05 | MEJ | Reemplazar input manual de `branchId` en proveedores | 🟡 ⚡ | `suppliers.new.tsx`, `suppliers.$id.tsx` | Select de sucursales como en otras pantallas | F1-02 | - [ ] |
| F1-06 | MEJ | Planes: editor de `features` (no CSV manual) | 🟢 | `plans.new.tsx`, `plans.$id.tsx` | Multi-select o checklist de features del plan | — | - [ ] |

---

## Fase 2 — Permisos y multi-sucursal

> Restringir acceso por sucursal a nivel de backend.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F2-01 | IMP | Modelo Prisma `UserBranch` | 🔴 | `schema.prisma`, migración | Tabla `user_branches` con `userId`, `branchId`, índices | F0-01 | - [ ] |
| F2-02 | IMP | `resolveUserBranchIds()` lee `UserBranch` | 🔴 | `auth.service.ts`, seed | JWT `branchIds[]` refleja asignación real | F2-01 | - [ ] |
| F2-03 | IMP | UI asignación de sucursales por usuario | 🟡 | `users.new.tsx`, `users.$id.tsx`, API users | OWNER/ADMIN asignan sucursales al crear/editar usuario | F2-01, F1-02 | - [ ] |
| F2-04 | MEJ | Validar en API que mesero/cajero no opere fuera de sus branches | 🟡 | `ScopeGuard`, servicios críticos | 403 si `x-branch-id` no está en `branchIds` del usuario | F2-02 | - [ ] |

---

## Fase 3 — SaaS y monetización

> Convertir planes de demo en límites reales.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F3-01 | IMP | `PlanQuotaService` — lectura de límites | 🔴 | Nuevo `api/src/plan-quota/` | Resuelve plan + subscription + overrides del business | — | - [ ] |
| F3-02 | IMP | Enforcement en creación de recursos | 🔴 | `products`, `users`, `branches`, `orders` services | 403/402 con código `PLAN_LIMIT_EXCEEDED` al superar cuota | F3-01 | - [ ] |
| F3-03 | IMP | UI de uso de cuota + upsell en admin | 🟡 | `dashboard.tsx`, `business.tsx` | Muestra "3/5 usuarios", "48/50 productos"; link a planes | F3-02 | - [ ] |
| F3-04 | IMP | Integración Stripe (suscripciones) | 🟡 | Nuevo módulo `billing/`, webhooks | Checkout, renovación, `stripeSubscriptionId` poblado | F3-01 | - [ ] |
| F3-05 | IMP | Onboarding: registro de nuevo tenant | 🟢 | `landing/`, API `POST /businesses` | Flujo signup → trial → primer login | F3-01 | - [ ] |

---

## Fase 4 — Inventario y operaciones

> Cerrar el ciclo compra → stock → venta.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F4-01 | IMP | Descuento de stock al pagar orden | 🔴 | `orders.service.ts`, `payments.service.ts` | Al `PAID`: `InventoryMovement` OUT + `currentStock` actualizado | — | - [ ] |
| F4-02 | IMP | Validación stock insuficiente antes de cobrar | 🔴 | `payments.service.ts` | Error claro si `trackStock` y cantidad > stock | F4-01 | - [ ] |
| F4-03 | IMP | Ajustes manuales de inventario (entrada/salida) | 🟡 | Nuevo endpoint + UI en `inventory.tsx` | Movimiento `ADJUSTMENT` con motivo y usuario | F4-01 | - [ ] |
| F4-04 | OPT | Job BullMQ: alertas stock bajo | 🟢 | Nuevo processor + email/webhook stub | Notifica productos con `currentStock <= minStock` | F4-01 | - [ ] |

---

## Fase 5 — POS avanzado

> Features que el README promete y el landing vende.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F5-01 | IMP | Modelo y API de combos (`ComboItem`) | 🟡 | `schema.prisma`, `products` module | Producto COMBO con N ítems; precio calculado o fijo | — | - [ ] |
| F5-02 | IMP | Modificadores / extras (`ADDON`) en POS | 🟡 | `order-cart-panel.tsx`, `orders` DTO | Agregar extras a un ítem; reflejado en snapshot | — | - [ ] |
| F5-03 | IMP | División de cuenta (split bill) | 🟡 | `payments`, `orders.$id.tsx`, `payment-modal.tsx` | N pagos parciales; orden PAID cuando Σ = total | — | - [ ] |
| F5-04 | IMP | Propinas en flujo de pago | 🟡 | `payment-modal.tsx`, `payments.service.ts` | Campo propina; movimiento `TIP` opcional en caja | — | - [ ] |
| F5-05 | IMP | Mapa visual de mesas | 🟢 | Nueva ruta `tables/map.tsx` | Canvas con `posX`/`posY`; click abre POS de mesa | F1-02 | - [ ] |
| F5-06 | MEJ | Mapa / coordenadas en clientes (delivery) | 🟢 | `customers.new.tsx`, picker de mapa | Lat/lng desde mapa, no solo inputs manuales | — | - [ ] |

---

## Fase 6 — Canales: mobile e impresión

> Completar apps satélite y cablear print-agent.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F6-01 | MEJ | Mobile: adoptar `@saas/shared` + React Query | 🟡 | `mobile/src/**` | Sin tipos duplicados; mismos enums/schemas que admin | — | - [ ] |
| F6-02 | MEJ | Mobile mesero: flujo completo con WS | 🟡 | `mesero.tsx`, nuevo `realtime.ts` | Crear orden → enviar cocina; updates por WebSocket | F6-01, F1-01 | - [ ] |
| F6-03 | IMP | Mobile repartidor: estados delivery + dirección | 🟡 | `delivery.tsx` | Lista órdenes DELIVERY; transiciones READY → DELIVERED | F6-01 | - [ ] |
| F6-04 | ~~IMP~~ | ~~Desktop Tauri: integración nativa con print-agent~~ | ~~🟡~~ | ~~`desktop/src/**`~~ | ~~Eliminado — desktop fuera del alcance del proyecto~~ | — | ✅ Eliminado |
| F6-05 | ~~MEJ~~ | ~~Desktop: POS embebido robusto~~ | ~~🟢~~ | ~~`pos-view.tsx`~~ | ~~Eliminado — desktop fuera del alcance del proyecto~~ | — | ✅ Eliminado |
| F6-06 | IMP | Impresión automática en transiciones de orden | 🔴 | Admin/POS hook o listener API | `SENT_TO_KITCHEN` → comanda; `PAID` → ticket | `print-agent` | - [ ] |
| F6-07 | IMP | Facturación fiscal (según jurisdicción) | 🟢 | Módulo nuevo | Definir alcance (BOB/Bolivia u otro); modelo `Invoice` | — | - [ ] |

---

## Fase 7 — Infraestructura, seguridad y calidad

> Listo para producción multi-réplica.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F7-01 | MEJ | Migrar auth a cookies HttpOnly + CSRF | 🔴 | `auth` module, `auth-store.ts` | Refresh en cookie; access en memoria; sin token en localStorage | — | - [ ] |
| F7-02 | MEJ | Reportes: storage S3/MinIO (no disco local) | 🟡 | `report-storage.service.ts` | `resultUrl` apunta a object storage; funciona con N réplicas | — | - [ ] |
| F7-03 | MEJ | Cron limpieza reportes expirados | 🟢 | BullMQ job | Borra archivos y filas con `expiresAt < now` | F7-02 | - [ ] |
| F7-04 | ~~MEJ~~ | ~~Habilitar WebSockets en Docker dev~~ | ~~🟢~~ | ~~`docker-compose.yml`~~ | ~~Eliminado — Docker removido del proyecto~~ | — | ✅ Eliminado |
| F7-05 | MEJ | CI estricta: tests deben fallar el pipeline | 🟡 | `.github/workflows/ci.yml` | Sin `\|\| echo`; job e2e con MySQL+Redis | — | - [ ] |
| F7-06 | IMP | E2E flujo venta completo | 🟡 | `api/test/e2e/` | caja abierta → orden → cocina → pago → cierre turno | F1-01, F4-01 | - [ ] |
| F7-07 | IMP | Tests unitarios: inventario, reportes, caja | 🟡 | `api/src/**` | Coverage en módulos sin tests hoy | F4-01, F7-02 | - [ ] |

---

## Fase 8 — Optimización y experiencia de desarrollo

> Rendimiento y mantenibilidad una vez estable el producto.

| ID | Cat | Tarea | Prioridad | Archivos / área | Criterio de aceptación | Depende de | Estado |
|----|-----|-------|-----------|-----------------|------------------------|------------|--------|
| F8-01 | OPT | KDS/POS: confiar en WS, reducir polling | 🟡 | `kds.tsx`, queries POS | `refetchInterval` eliminado o > 2 min como fallback | F7-04 | - [ ] |
| F8-02 | OPT | Cache agresivo de catálogo en POS | 🟡 | `product-grid.tsx`, React Query | `staleTime` 5–15 min; invalidación en WS de productos | — | - [ ] |
| F8-03 | OPT | Lazy loading de rutas admin + Chart.js | 🟢 | Rutas TanStack, `chart-utils.ts` | Chunks separados; LCP mejorado en POS | — | - [ ] |
| F8-04 | OPT | Revisar isolation `Serializable` en órdenes | 🟢 | `orders.service.ts` | Retry P2034; métricas de contención en carga | — | - [ ] |
| F8-05 | OPT | Migrar formularios admin a `@saas/ui` | 🟢 | `admin/src/components/**` | Menos clases `input`/`btn-*` duplicadas | — | - [ ] |
| F8-06 | OPT | Paginación cursor-based en `/orders` | 🟢 | `orders.service.ts`, `orders.tsx` | Sin offset en listas grandes | — | - [ ] |
| F8-07 | OPT | Turbo/CI: cache typecheck+lint sin build completo | 🟢 | `turbo.json`, CI | Pipeline más rápido en PRs | F7-05 | - [ ] |

---

## Orden recomendado de ejecución

```
Fase 0 ──► Fase 1 ──► Fase 2 ──► Fase 3
                  │                    │
                  ▼                    ▼
              Fase 4 ◄─────────── Fase 5
                  │
                  ▼
              Fase 6 ──► Fase 7 ──► Fase 8
```

**Sprint 1 (1 semana):** F0 + F1 completa  
**Sprint 2 (1–2 semanas):** F2 + F3-01/02/03  
**Sprint 3 (1–2 semanas):** F4 + F6-06  
**Sprint 4 (2 semanas):** F5 (priorizar split bill y propinas)  
**Sprint 5 (2 semanas):** F6 mobile  
**Sprint 6 (1 semana):** F7 seguridad + CI  
**Sprint 7 (continuo):** F8 según métricas  

---

## Registro de avance (bitácora)

| Fecha | ID(s) | Responsable | Notas |
|-------|-------|-------------|-------|
| | | | |
| | | | |
| | | | |

---

## Notas y decisiones pendientes

- [ ] **Facturación fiscal:** definir país/regulación antes de F6-07
- [ ] **Stripe:** ¿solo suscripción SaaS o también pagos QR del restaurante?
- [ ] **Storage reportes:** ¿S3, MinIO self-hosted o R2?
- [ ] ~~**Desktop:** ¿seguir con iframe o app React nativa en Tauri?~~ ✅ Eliminado — desktop fuera del alcance
- [ ] **Roles por sucursal:** ¿mismo rol global o rol distinto por branch en `UserBranch`?

---

## Cómo actualizar este documento

1. Marcar checkbox `- [x]` al completar la tarea.
2. Actualizar tabla **Resumen de progreso** al cierre de cada sprint.
3. Agregar fila en **Registro de avance** con fecha y notas.
4. Si una tarea se divide, crear sub-ID (ej. `F3-02a`, `F3-02b`).

---

*Última actualización: 2026-07-04*
