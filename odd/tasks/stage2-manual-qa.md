# Manual QA checklist — Stage 2 (identity + login)

Purpose: manual verification for the Stage 2 work (`odd/tasks/trading-identity.md`, tasks T1–T7).
When: run sections A → B → C before merging to `dev`; section D after the production deploy; E is optional polish.
Why manual at all: the automated suite (235 tests) covers the logic; this checklist targets what jsdom cannot see — real CSS, real `localStorage` persistence, the route guard running against the REAL port binding (tests mock it), and the real deploy.

## A. Local mode — production reality today (P0)

Run `npm run dev` (no flags → `localAuthPort`, auth unavailable).

- [ ] Open `http://localhost:5173/` — the binder loads with the cards already in `localStorage`; nothing about the new identity work broke local use.
- [ ] `#/login` — the form renders; submitting anything shows the honest alert "El backend no está conectado todavía…".
- [ ] `#/register` — same honest refusal on submit.
- [ ] `#/profile` — shows "No hay una sesión activa en este navegador." with an "Inicia sesión" link instead of a form.
- [ ] Hamburger menu → only "Iniciar sesión" appears; no "Mi cuenta", no "Cerrar sesión".
- [ ] `#/any-bogus-route` — "Página no encontrada" with "Volver al binder"; the top navigation still renders around it.
- [ ] Regression spot-check: add a card, edit wants, browse "La tienen".

## B. Mock mode — full identity flow (P0, pre-merge)

Run `VITE_MOCK_AUTH=1 npm run dev` (→ `mockAuthPort`, the guard is ACTIVE).

- [ ] Load `#/` with no session → redirected to `#/login`.
- [ ] Log in with any email/password → land on the binder.
- [ ] Hamburger menu now shows "Mi cuenta" and "Cerrar sesión".
- [ ] `#/profile` — fields prefilled from the mock user; an invalid avatar URL shows the field error "Ingresa una URL válida"; a valid edit saves with "Perfil actualizado".
- [ ] "Cerrar sesión" → the guard redirects you to `#/login`.
- [ ] Escape key and clicking outside close the menu.

## C. Persistence — people fear losing data (P1)

- [ ] **Logout never touches the collection**: in mock mode, log in → log out → log in again → all local binder cards intact.
- [ ] Reload while in mock mode → session lost, redirected to login. Expected: the mock session lives in memory; the real backend will use an httpOnly cookie.
- [ ] Deep links (`#/profile`, `#/card/<entryId>`) and the browser back/forward buttons behave.

## D. Production, after deploy (P0)

- [ ] `https://binder.mantisuy.com/` — the local-first binder works exactly as before (guard inactive: no backend → routes stay open).
- [ ] `#/login` renders; submitting shows "El backend no está conectado todavía…" — correct until `binder-api` exists.
- [ ] `#/any-bogus-route` — the friendly 404 page.
- [ ] If anything looks stale: hard refresh (Ctrl+Shift+R) — `index.html` is cached about 10 minutes.

## E. Visual pass (P2)

- [ ] Dark mode (follows the OS): login, profile and 404 keep readable contrast.
- [ ] Tab traversal through the forms shows a visible focus ring.
