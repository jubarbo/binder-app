# binder-add-shortcuts

Objetivo: dos atajos de alta en el binder — el modal de agregar carta arranca
con una impresión ya elegida, y el primer bolsillo vacío ofrece un `+` que abre
ese mismo modal. Rama `dev`, sin commits hasta pedido explícito. Runner:
`npx vitest run`; gates: `npx tsc -b`, `npx oxlint`, `npm run build`.

## Specs

**S1** — "En el modal de agregar carta al binder el select de 'seleccionar
impresión' debe cargar con la primera opción cargada por defecto."

Al elegir una carta, cuando el catálogo responde con sus impresiones, la primera
de la lista ordenada queda seleccionada automáticamente (y con ella su primer
acabado conocido, la misma regla del `onChange` manual). El botón Agregar queda
habilitado de entrada. Elegir otra impresión a mano no se pisa. La opción
placeholder se mantiene como estado de carga.

**S2** — "Debería haber un icono de + en el primer espacio disponible del binder
que dispare el modal de Agregar carta."

El primer bolsillo vacío de la página visible se vuelve interactivo: un botón
con `+` y `aria-label="Agregar una carta en este espacio"` que abre el modal.
Los demás slots vacíos siguen decorativos (`aria-hidden`). Aceptado por el
usuario: una página llena (15, 30… copias) no tiene bolsillo vacío, así que no
muestra `+`; el botón del header queda como única entrada.

**S3** — "Deberias quitar del modal de Agregar carta a binder 'Filtrar ediciones'
en texto y quedarnos solo con el select."

El campo de texto "Buscar edición" desaparece del paso de impresiones; queda el
selector de impresiones (hoy en dos pasos, ver S4), sin filtro y sin tope.

**S4** — "Es que puede haber cartas impresas cientos de veces. Qué implementación
recomiendas? Se me ocurre lazy loading" / "Sí, probemoslo".

La elección de impresión pasa a un picker en dos pasos: **Edición** (nombres de
set únicos, ya ordenados) y **Número de coleccionista** (las impresiones de esa
edición, ordenadas por número de forma numérica). Sin filtro de texto, sin
dependencias nuevas y sin tope de opciones. El lazy loading se descartó con
evidencia: el popup de un `<select>` nativo lo renderiza el navegador y no
admite virtualización; solo aplicaría a un listbox custom con su propia dep.

Conocida y aceptada: Scryfall pagina `/cards/search` a **175 cards por página**
(doc oficial: "This method is paginated, returning 175 cards at a time") y el
cliente hace un solo request, así que una Montaña básica llega truncada a 175 de
sus miles de impresiones. Es limitación del catálogo, no del picker; queda
fuera de este alcance.

## Tasks

| ID  | Specs | Ruta    | Estado   | Commit |
| --- | ----- | ------- | -------- | ------ |
| T1  | S1    | inline  | hecho    | RED→GREEN, sin commit |
| T2  | S2    | inline  | hecho    | RED→GREEN, sin commit |
| T3  | S3    | inline  | hecho    | RED→GREEN, sin commit |
| T4  | S4    | inline  | hecho    | RED→GREEN, sin commit |

## Log

**L1 (2026-10-13)** — Petición original, verbatim: "Hagamos: 1. En el modal de
agregar carta al binder el select de 'seleccionar impresión' debe cargar con la
primera opción cargada por defecto. 2. Debería haber un icono de + en el primer
espacio disponible del binder que dispare el modal de Agregar carta. Haz un
plan." El plan se presentó con la consecuencia "página llena sin `+`" marcada
como decisión abierta; respuesta del usuario: "si, sobre consecuenia 1 me sirve
la propuesta."

Riesgo declarado en el plan: item 6 (cambia comportamiento observable de UI,
cubierto por tests).

**L2 (2026-10-13)** — T1 implementado. `sortedPrintings` pasó a `useMemo` sobre
`printings`: sin identidad estable, cualquier ajuste de estado que dependa de su
primer elemento se re-dispara en cada render (y re-ordena en cada tecla del
filtro). La selección por defecto se deriva **durante el render** (patrón
documentado de React "adjust state during render") y no en un `useEffect`, para
no sumar un segundo warning `set-state-in-effect` al único preexistente de
`WantEntryForm.tsx:109`. Elegida la primera impresión se le asigna su primer
acabado conocido, la misma regla del `onChange` manual.

Decisión de producto derivada del spec, registrada acá: la regla "la selección
actual nunca se pierde al filtrar" ahora separa `matchingPrintings` (las que
matchean el texto) de `filteredPrintings` (matches + ancla de la selección
actual al final). Sin eso, la selección por defecto quedaba anclada dentro del
propio filtro y el mensaje "Sin ediciones para tu búsqueda." dejaba de aparecer
nunca — un muerto visual que el spec no pedía. El mensaje ahora mide
`matchingPrintings.length`.

Tests: 2 nuevos (`AddCard default printing selection`: primera impresión
preseleccionada con preview + Agregar habilitado; la elección manual no se pisa),
1 borrado (`shows no preview until a printing is selected`, comportamiento
suprimido por el spec) y 3 actualizados por el ancla del filtro.

**L3 (2026-10-13)** — T2 implementado. El primer slot vacío de la página pasa a
ser `<li>` interactivo con `<button className="binder-add-pocket">` +
`aria-label="Agregar una carta en este espacio"` (el `+` va `aria-hidden`); los
otros 13 siguen `aria-hidden="true"` decorativos. El nombre accesible evita la
colisión con el botón del header ("Agregar carta"), así que los tests
existentes que buscan `/Agregar carta/i` siguen pasando sin tocar. CSS
`.binder-add-pocket`: mismo borde punteado y gradiente que
`.binder-empty-pocket`, `+` en `--color-accent` al hover y `:focus-visible`.

Tests: 3 nuevos (`BinderPage add shortcut`: abre el modal desde el primer
bolsillo; solo el primer slot lo ofrece y la página conserva su forma 5x3 con
14 spacers; página llena sin `+`, la consecuencia aceptada en L1).

Evidencia final: RED observado (4 failed antes de implementar), GREEN después.
Gates: 132 tests, `tsc` 0, `oxlint` 0 errores / 1 warning preexistente, `build`
ok. Nada commiteado.

**L4 (2026-10-14)** — T3, corrección directa, verbatim: "Deberias quitar del
modal de Agregar carta a binder 'Filtrar ediciones' en texto y quedarnos solo
con el select."

Eliminados: el input `Buscar edición`, el estado `printingFilter`, toda la
derivación `normalizedFilter` / `matchingPrintings` / `filteredPrintings` (el
ancla de selección de L2 muere junto con el filtro que la motivaba), el mensaje
"Sin ediciones para tu búsqueda." y el import de `normalizeText`, que no tenía
otro usuario en el archivo. El select renderiza `sortedPrintings` directo,
con el tope de 25 y su aviso sin cambios.

Tests: 1 nuevo (`offers the printings as a plain select, with no edition filter`),
5 borrados (el describe completo `AddCard printing filter`: presencia del campo,
acotado al tipear, coincidencia sin acentos, ancla de la selección, mensaje sin
coincidencias). RED observado (1 failed), GREEN después. Gates: 128 tests,
`tsc` 0, `oxlint` 1 warning preexistente, `build` ok.

**Consecuencia abierta, reportada al usuario:** con el filtro afuera el tope de
`MAX_PRINTING_OPTIONS = 25` pasa a ser la única barrera, y Scryfall reporta
**70 impresiones de Lightning Bolt** (`total_cards: 70`,
`/cards/search?q=!"lightning bolt"&unique=prints`): 45 ediciones quedarían
inalcanzables. Pendiente de decisión: levantar o quitar el tope.

**L5 (2026-10-14)** — Decisión del usuario: "Sí, probemoslo" al picker en dos
pasos propuesto en L4. Implementado en `AddCard.tsx`:

- Estado nuevo `selectedEdition`; derivaciones `editions` (set names únicos de
  `sortedPrintings`, ya ordenados) y `editionPrintings` (las de la edición
  elegida), ambas `useMemo` sobre `sortedPrintings`.
- Dos selects: `aria-label="Edición"` y `aria-label="Número de coleccionista"`
  (opciones etiquetadas `#123`). El placeholder de la edición cubre el estado de
  carga y el caso sin impresiones.
- La selección por defecto sigue derivándose durante el render: primera edición
  + su primera impresión, con su primer acabado y cantidad en 1. Cambiar de
  edición re-arma la impresión con la misma regla (`selectedPrinting?.setName !== selectedEdition`),
  y una impresión dentro de la edición actual siempre gana sobre el default.
- Eliminados `MAX_PRINTING_OPTIONS`, el aviso "Mostrando 25 de N ediciones" y
  `visiblePrintings`/`isPrintingsTruncated`: la regla de ahorro ya no hace
  falta porque ninguna lista es larga.

Tests: 3 nuevos (todas las ediciones sin filtro ni tope; números ordenados
numéricamente dentro de la edición; cambiar de edición cambia números y
preview), 2 borrados (los del tope de 25), 1 reescrito (preview al cambiar de
número dentro de la misma edición — antes cambiaba de edición desde el select
de números, interacción que ya no existe), y los 8 usos de `{ name: 'Impresión' }`
pasaron a `{ name: 'Número de coleccionista' }`.

Evidencia: RED observado (fallaban los 3 nuevos y seguían en pie los del tope),
GREEN después. Gates: 128 tests, `tsc` 0, `oxlint` 1 warning preexistente,
`build` ok. Nada commiteado.
