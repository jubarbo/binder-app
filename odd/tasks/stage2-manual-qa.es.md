# Checklist de QA manual — plataforma de trading frontend (etapas 1–3)

Propósito: verificación manual del trabajo de la Etapa 2 (`odd/tasks/trading-identity.es.md`, tareas T1–T7), del toggle para intercambio de la Etapa 1 y de la propuesta de trade de la Etapa 3 (`odd/tasks/trade-proposal.es.md`, tareas T1–T3).
Cuándo: correr las secciones A → B → C → F antes de mergear a `dev`; la sección D después del deploy a producción; E es pulido opcional.
Por qué manual: la suite automatizada (269 tests) cubre la lógica; esta checklist apunta a lo que jsdom no ve — CSS real, persistencia real de `localStorage`, el guard de rutas corriendo contra el binding REAL del puerto (los tests lo mockean), y el deploy real.

## A. Modo local — la realidad de producción de hoy (P0)

Corré `npm run dev` (sin flags → `localAuthPort`, auth no disponible).

- [ ] Abrí `http://localhost:5173/` — el binder carga con las cartas que ya están en `localStorage`; nada del trabajo nuevo rompió el uso local.
- [ ] `#/login` — el formulario carga; enviar cualquier cosa muestra la alerta honesta "El backend no está conectado todavía…".
- [ ] `#/register` — el mismo rechazo honesto al enviar.
- [ ] `#/profile` — muestra "No hay una sesión activa en este navegador." con un link "Inicia sesión" en vez de un formulario.
- [ ] Menú hamburguesa → solo aparece "Iniciar sesión"; sin "Mi cuenta" ni "Cerrar sesión".
- [ ] `#/cualquier-ruta` — "Página no encontrada" con "Volver al binder"; la navegación superior sigue visible alrededor.
- [ ] Regresión rápida: agregar carta, editar deseos, recorrer "La tienen".
- [ ] Editá cualquier carta: el checkbox "Para intercambio" aparece en el panel de edición (Etapa 1); marcalo, guardá, y la fila "Para intercambio:" del detalle alterna entre Sí/No; una recarga conserva el cambio (vive en `localStorage`).
- [ ] Editar solo las notas de una carta marcada "Para intercambio: Sí" deja esa bandera intacta al guardar.

## B. Modo mock — flujo completo de identidad (P0, pre-merge)

Corré `VITE_MOCK_AUTH=1 npm run dev` (→ `mockAuthPort`, el guard está ACTIVO).

- [ ] Cargá `#/` sin sesión → te redirige a `#/login`.
- [ ] Entrá con cualquier email/contraseña → caes en el binder.
- [ ] El menú hamburguesa ahora muestra "Mi cuenta" y "Cerrar sesión".
- [ ] `#/profile` — campos prellenados con el usuario mock; un avatar URL inválido muestra el error "Ingresa una URL válida"; una edición válida guarda con "Perfil actualizado".
- [ ] "Cerrar sesión" → el guard te redirige a `#/login`.
- [ ] La tecla Escape y el click afuera cierran el menú.

## C. Persistencia — la gente teme perder datos (P1)

- [ ] **El logout nunca toca la colección**: en modo mock, entrá → salí → entrá de nuevo → todas las cartas locales del binder intactas.
- [ ] Recarga en modo mock → se pierde la sesión, redirige al login. Esperado: la sesión del mock vive en memoria; el backend real usará una cookie httpOnly.
- [ ] Deep links (`#/profile`, `#/card/<entryId>`) y los botones atrás/adelante del navegador se comportan bien.

## D. Producción, después del deploy (P0)

- [ ] `https://binder.mantisuy.com/` — el binder local-first funciona igual que siempre (guard inactivo: sin backend las rutas quedan abiertas).
- [ ] `#/login` carga; al enviar muestra "El backend no está conectado todavía…" — correcto hasta que exista `binder-api`.
- [ ] `#/cualquier-ruta` — la página 404 amigable.
- [ ] Si algo se ve viejo: hard refresh (Ctrl+Shift+R) — el `index.html` se cachea unos 10 minutos.

## E. Repaso visual (P2)

- [ ] Modo oscuro (sigue al SO): login, perfil y 404 con contraste legible.
- [ ] Recorrer los formularios con Tab muestra el anillo de foco visible.

## F. Superficie de trading — Etapa 3 (P0, pre-merge)

Corré `VITE_MOCK_WISHERS=1 npm run dev` (→ listas mock de deseantes/ofrecedores más el puerto de trades en memoria — el mismo flag que previsualiza toda la superficie de trading).

- [ ] Marcá una carta "Para intercambio" y abrí su detalle: "La buscan" lista los deseantes mock; cada fila muestra avatar, conteo de copias, nombre y un botón "Proponer trade".
- [ ] Clickeá "Proponer trade": el panel "Proponer trade a <nombre>" se abre sobre un scrim con esa carta premarcada en "Yo doy" y mis deseos listados en "Pido".
- [ ] Con alguna columna sin selección, "Proponer" sigue deshabilitado; con una carta y un deseo elegidos se habilita.
- [ ] Enviar → aparece el toast "Propuesta enviada a <nombre>" y el panel se cierra.
- [ ] Escape y clic en el scrim cierran el panel sin enviar nada.
- [ ] En `#/wants`, una fila de deseo con dueños muestra "N la tienen" con caras chicas de avatar y SIN nombres visibles; clickear una cara abre el panel con ese dueño como contraparte y la carta de la fila premarcada en "Pido".
- [ ] Abrí desde una superficie, cerrá, y abrí desde la otra: los prellenados nunca se arrastran — cada columna muestra solo su propia preselección.
- [ ] Vuelta a `npm run dev` sin flags: "La buscan" informa "Nadie la desea todavía.", "La tienen" sigue ausente y no aparece ningún botón de proponer — el modo local sigue siendo honesto.
