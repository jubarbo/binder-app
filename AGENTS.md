# binder-app — Agent Instructions

binder-app is the tactile virtual binder of MTGApp: a highly interactive, animated interface for browsing a physical Magic: The Gathering collection as if handling a real binder. Stack: React 19 + Vite + TypeScript. Catalog comes from the live Scryfall API. Standalone git repository (the MTGApp root folder owns only shared conventions — see `../AGENTS.md`).

## Quick path

1. Read the active feature document in `odd/tasks/` before editing — it holds scope, tasks, and the current state.
2. Respect the port boundaries: catalog goes through `src/shared/api/catalogPort.ts`, user binder persistence through `src/shared/api/binderPort.ts`.
3. Follow the oracle/printing split exactly (see Data model). It is the contract for future matching.
4. Verify before reporting done: `npm run build` and `npx oxlint` must pass.
5. Do not commit, push, or open PRs unless the user explicitly asks. Do not add AI attribution to commits.

## Idioma y comunicación
- Responde SIEMPRE en español rioplatense, incluso si el código, los logs o los comentarios están en inglés.
- No narres tu proceso de razonamiento ni lo que estás pensando hacer. Ve directo al resultado: qué hiciste, qué encontraste y qué sigue.
- Mantén las respuestas breves, sin preámbulos.

## Ambientes y flujo de ramas
Este repositorio usa tres ambientes con promoción por ramas, en este orden estricto:

```
feature/* · fixes/* · upgrade/*  →  develop  →  staging  →  main
```

| Ambiente | Rama        | Rol                                   |
| -------- | ----------- | ------------------------------------- |
| dev      | `dev`   | Integración y desarrollo              |
| staging  | `staging`   | Pre-producción / QA                   |
| main     | `main`      | Producción                            |

Reglas obligatorias:
- Rama base de un PR proveniente de `feature/*`, `fixes/*` o `upgrade/*` es **`dev`**.
- Promoción entre ambientes: `dev` → `staging` → `main`. No saltar etapas.
- Nunca hacer push directo a `staging` ni a `main`: todo entra por Pull Request.
- Nunca hacer `force-push` sobre ramas compartidas.
- Antes de crear un PR, confirmar la rama base correcta según este flujo.

## Engram memory

- This repo's Engram memory lives under project `binder-app` (bridged copy of the legacy `mtgapp` observations on 2026-10-10).
- If historical context is missing, search the legacy bucket: `mem_search(project: "mtgapp", ...)` or `all_projects: true`.

## Data model (non-negotiable)

| Concept | Key | Rule |
|---|---|---|
| "The card" | `oracleId` | Identity for search and matching. Wants (`WantEntry`) reference this. |
| "The physical card" | printing `id` | Owned cards (`BinderEntry`) reference this — your binder holds specific printings (set + collector number), not abstract cards. |
| Want preference | `preferredPrintingId?` | Optional: restricting a want to a specific edition. |

Matching defaults to `oracleId`; printing is a refinement, never the primary key of a want.

## Architecture

| Area | Decision |
|---|---|
| Stack | React 19, Vite 8, TypeScript 6, react-router-dom v7 |
| Server state | TanStack Query (catalog cache: `staleTime` 5 min) |
| Client/UI state | Zustand (binder store persisted under key `binder-app:binder:v1`, versioned) |
| Forms | react-hook-form + zod |
| Drag & drop | **@dnd-kit** (not react-dnd — unmaintained since 2022) |
| Motion | `motion` package (Framer Motion's new name), `reducedMotion="user"` globally |
| Layout | Feature-based: `src/features/<name>/` (components, hooks, state). Shared code in `src/shared/`. App shell in `src/app/` |
| Root | `src/app/App.tsx` (the scaffold `src/App.tsx` was intentionally removed) |

## Scryfall gotchas (verified)

- Double-faced / modal cards omit top-level `image_uris`; resolve images from `card_faces[0].image_uris`.
- Missing prices arrive as `null`; normalize to `undefined`.
- Tokens may lack `oracle_id`; fall back to the printing id.
- Rate limit ≈ 10 req/s; keep caching in TanStack Query.

## TypeScript & lint conventions

- The scaffold tsconfig uses `verbatimModuleSyntax` + `erasableSyntaxOnly`: use `import type` and never enums (use string unions).
- `strict: true` is not set in tsconfig, but write strict-compatible code anyway.
- oxlint `react/only-export-components`: keep component files component-only; put singletons (e.g. `queryClient`) in their own module.
- No test runner is configured yet; verification is build + lint. When tests arrive (vitest planned), keep behavior-first tests.

## Checklist before finishing any task

- [ ] `npm run build` passes
- [ ] `npx oxlint` passes
- [ ] Changes stay inside the authorized scope for the task
- [ ] No new dependencies without justification
- [ ] Code and comments in English; no emojis in artifacts