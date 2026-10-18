# Plataforma de trading — roadmap de frontend

Objetivo: convertir el frontend de binder-app, hoy un organizador de colección local de un solo usuario, en la superficie de la plataforma de trading (identidad, curaduría de comerciables, acciones sobre matches, workflow de trades), por delante del backend `binder-api`.

Principio rector: cada etapa se construye contra **puertos con implementaciones local/mock** (el patrón existente de `CatalogPort` / `WishersPort` / `OffersPort`), de modo que el frontend crece ahora sin esperar al backend; cuando `binder-api` exista, solo se cambia el adapter del binding, sin tocar consumidores.

El backend `binder-api` tiene su propio plan por fases (`binder-api/docs/api-plan.md` §8). Aparece acá solo como **dependencia**, no se replanifica.

Estado: etapas 1–3 entregadas en feature/trading-identity (2026-10-18); etapas 4–5 pendientes. Escrito: 2026-10-16.

## Etapas y cadena de dependencias

```
Etapa 1 (toggle forTrade) ─┐
                           ├─→ Etapa 3 (acciones sobre match) ─→ Etapa 4 (workflow de trades)
Etapa 2 (identidad) ───────┘                                          │
                                                                      └─→ Etapa 5 (migración + binder público) [necesita backend real]
```

| # | Etapa | Valor | ¿Funciona sin backend? |
|---|-------|-------|------------------------|
| 1 | Toggle `forTrade` | La palanca del trading | Sí, al 100% (estado cliente) |
| 2 | Seam de identidad + login | El menú muerto cobra vida | Contra mock |
| 3 | Acciones sobre un match | Display → trading | Contra mock |
| 4 | Workflow de trades | El trading en sí | Contra mock (lógica real: backend) |
| 5 | Migración + binder público | Tejido conectivo | No — necesita backend real |

## Etapa 1 — Toggle forTrade

Alcance: conectar `toggleForTrade` (ya presente en `binderStore.ts`) a un control real en el modo edición de `CardDetail`; extender el patch de `onSaveDetails` para que lleve `forTrade` solo cuando el control lo cambió de verdad (tal como `finish` solo viaja si cambió); test RED→GREEN más un test de regresión que compruebe que editar solo las notas no reescribe `forTrade`.

Entregable: el usuario puede curar sus cartas comerciables; `WhoWants`/`WhoHas` empiezan a significar algo porque `for_trade` deja de ser un `true` permanente.

Mock/real: 100% real, estado cliente puro, sin dependencia de backend.

Entregado: 2026-10-17 en feature/trading-identity. El control es un checkbox "Para intercambio" en el modo edición de `CardDetail` que viaja en el patch de `onSaveDetails` (la acción del store `updateEntryDetails` se amplió a `forTrade?: boolean`); el mecanismo de "solo viaja si cambió" del alcance reemplaza conectar `toggleForTrade` directamente, que permanece en el store como la palanca para el acceso rápido del grid futuro. Decisión abierta resuelta: solo detalle por ahora. Tests: 4 nuevos en `CardDetailPage.test.tsx` (checkbox sembrado con el estado, marcar, desmarcar, y la regresión de solo-notas que asegura que el patch omite `forTrade` si no cambió).

## Etapa 2 — Seam de identidad + login

Alcance: un seam `AuthPort` (`session` / `login` / `register` / `logout` / `updateProfile`) + tipo `User`, con local/mock/binding; un store de sesión (zustand) que arranca consultando `authPort.session()`; pantallas y rutas de login/registro; un guard de rutas (binder/deseos requieren sesión); una pantalla de perfil (`displayName` + `avatarUrl`); conectar el "Mi cuenta" → perfil y el "Cerrar sesión" → `logout()`, hoy muertos.

Mock/real: la UI y el flujo funcionan contra mock; la cookie real (`httpOnly`) y `GET /users/me` esperan al backend.

Dependencia backend: los endpoints de auth + la restricción de hosting same-site (api-plan §6.3).

Decisión abierta: comportamiento del guard con datos que ya existen en `localStorage` sin sesión (la migración en sí es la Etapa 5).

## Etapa 3 — Acciones sobre un match

Alcance: una acción desde cada wisher/offerer en `WhoWants`/`WhoHas` ("proponer trade", luego "contactar"); un `TradesPort` (`proposeTrade` / `myTradePairs` / `respondTrade`) con local/mock; un panel mínimo "te ofrezco X por Y" abierto desde un match.

Dependencias: Etapa 2 (quién propone) + Etapa 1 (qué es comerciable).

Resuelta (2026-10-17, elección del usuario): selección bidireccional inline ("doy esto / pido esto") — sin carrito; el valor de un carrito depende del binder público de la Etapa 5. Spec: `odd/tasks/trade-proposal.es.md`.

## Etapa 4 — Workflow de trades

Alcance: una pantalla "Mis trades" (pendientes enviados y recibidos, aceptar/rechazar); los pares de trade (`findTradePairs`) — la vista de "lo que tengo y querés / lo que tenés y quiero"; historial de trades cerrados; estados de carga/vacío/error en cada uno.

Mock/real: estructura y UI reales; la resolución de pares y los estados reales de trade esperan al backend.

Decisión abierta: granularidad del historial y qué estados de trade modelar (el plan de backend lo difiere a la fase 4).

## Etapa 5 — Migración + binder público (necesita backend real)

Alcance: migración local→servidor (subir el binder y los wants de `localStorage` a una cuenta nueva); una ruta de binder público/compartible; export/import JSON como red de seguridad y de portabilidad (ya no el respaldo principal cuando el servidor es dueño de los datos).

Dependencia: backend real + usuarios. Es la única etapa que no se puede construir contra mocks.

## Convenciones que rigen cada etapa

- Puertos con local/mock/binding (el patrón de `WishersPort`/`OffersPort`); en producción resuelve al puerto local honesto.
- Tests RED→GREEN por comportamiento (`npx vitest run`); verificar `npm run build` + `npx oxlint`.
- Forma de error `CatalogError { status, code, message }`.
- Commits convencionales, sin atribución de IA. Artefactos (código, docs, copy de UI) en inglés.

## Log

- L1 (2026-10-16): plan registrado desde la discusión en chat; el usuario eligió auth con cookie `httpOnly` (registrado en el plan de `binder-api`) y pidió comenzar por la Etapa 2.
- L2 (2026-10-17): Etapa 1 entregada (toggle para intercambio, commit f97e47c) y la decisión de UX de composición de la Etapa 3 resuelta a selección bidireccional inline; la Etapa 3 pasa a `odd/tasks/trade-proposal.es.md`.
- L3 (2026-10-18): Etapa 3 entregada (seam de TradesPort, panel de propuesta y puntos de entrada sobre los match; commits f32e330, 1e06378, 4d0bd36; detalle en `odd/tasks/trade-proposal.es.md`). Sigue la decisión abierta de la Etapa 4 (granularidad y estados del historial de trades).
