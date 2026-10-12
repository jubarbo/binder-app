# binder-app — Instrucciones del Agente

binder-app es el archivador virtual táctil de MTGApp: una interfaz interactiva y animada para explorar una colección física de Magic: The Gathering como si se tratara de un archivador real. Tecnología: React 19 + Vite + TypeScript. El catálogo proviene de la API de Scryfall. Repositorio Git independiente (la carpeta raíz de MTGApp solo contiene las convenciones compartidas; consulte `../AGENTS.md`).

## Ruta rápida

1. Lea el documento de características activas en `odd/tasks/` antes de editarlo; contiene el alcance, las tareas y el estado actual.

2. Respete los límites de los puertos: el catálogo se gestiona a través de `src/shared/api/catalogPort.ts`, y la persistencia del archivador de usuario a través de `src/shared/api/binderPort.ts`.

3. Siga la división oráculo/impresión al pie de la letra (consulte el modelo de datos). Es el contrato para la coincidencia futura.
4. Antes de informar, verifique que `npm run build` y `npx oxlint` se hayan completado correctamente.

5. No realice commits, pushes ni abra solicitudes de extracción a menos que el usuario lo solicite explícitamente. No añada atribuciones de IA a los commits.

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

## Memoria de Engram

- La memoria de Engram de este repositorio reside en el proyecto `binder-app` (copia puenteada de las observaciones heredadas de `mtgapp` del 10/10/2026).

- Si falta el contexto histórico, busque en el bucket heredado: `mem_search(project: "mtgapp", ...)` o `all_projects: true`.

## Modelo de datos (no negociable)

| Concepto | Clave | Regla |

|---|---|---|

| "La carta" | `oracleId` | Identidad para búsqueda y coincidencia. Los deseos (`WantEntry`) hacen referencia a esto. |

| "La carta física" | `id de impresión` | Las cartas que posee (`BinderEntry`) hacen referencia a esto: su carpeta contiene impresiones específicas (conjunto + número de coleccionista), no cartas abstractas. |

| Preferencia de deseo | `preferredPrintingId?` | Opcional: restringir un deseo a una edición específica.

La coincidencia predeterminada es `oracleId`; la impresión es un refinamiento, nunca la clave principal de una solicitud.

## Arquitectura

| Área | Decisión |

|---|---|

| Pila | React 19, Vite 8, TypeScript 6, react-router-dom v7 |

| Estado del servidor | Consulta TanStack (caché de catálogo: `staleTime` 5 min) |

| Estado del cliente/interfaz de usuario | Zustand (almacenamiento de Binder persistente bajo la clave `binder-app:binder:v1`, versionado) |

| Formularios | react-hook-form + zod |

| Arrastrar y soltar | **@dnd-kit** (no react-dnd — sin mantenimiento desde 2022) |

| Movimiento | Paquete `motion` (nuevo nombre de Framer Motion), `reducedMotion="user"` globalmente |

| Diseño | Basado en características: `src/features/<name>/` (componentes, hooks, estado). Código compartido en `src/shared/`. Estructura de la aplicación en `src/app/` |

| Raíz | `src/app/App.tsx` (el scaffold `src/App.tsx` se eliminó intencionalmente) |

## Problemas comunes de Scryfall (verificados)

- Las tarjetas modales o de doble cara omiten `image_uris` de nivel superior; las imágenes se resuelven a partir de `card_faces[0].image_uris`.

- Los precios faltantes llegan como `null`; se normalizan a `undefined`.

- Los tokens pueden carecer de `oracle_id`; se utiliza el ID de impresión.

- Límite de velocidad ≈ 10 solicitudes/s; se mantiene el almacenamiento en caché en TanStack Query.

## Convenciones de TypeScript y lint

- El scaffold tsconfig usa `verbatimModuleSyntax` + `erasableSyntaxOnly`: usa `import type` y nunca enumeraciones (usa uniones de cadenas).

- `strict: true` no está configurado en tsconfig, pero escribe código compatible con strict de todos modos.

- oxlint `react/only-export-components`: mantén los archivos de componentes como componentes exclusivos; coloca los singletons (p. ej., `queryClient`) en su propio módulo.

- Aún no hay ningún ejecutor de pruebas configurado; la verificación es build + lint. Cuando lleguen las pruebas (vitest está previsto), mantén las pruebas con enfoque behavior-first.

## Lista de verificación antes de finalizar cualquier tarea

- [ ] `npm run build` se ejecuta correctamente
- [ ] `npx oxlint` se ejecuta correctamente
- [ ] Los cambios se mantienen dentro del ámbito autorizado para la tarea
- [ ] No se añaden nuevas dependencias sin justificación
- [ ] El código y los comentarios están en inglés; No hay emojis en los artefactos