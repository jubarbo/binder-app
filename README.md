# binder-app

## Deploy (Railway, with binder-api)

`railway.toml` builds the SPA and serves `dist/` with `serve` on Railway's `PORT`. Routes use a hash router
(`/#/wants`), so no server-side rewrite is needed.

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://sbinderapi.mantisuy.com/api/v1` (read at **build** time; redeploy after changing it) |

- With `VITE_API_URL` set, auth, catalog, matching and the signed-in binder go to binder-api; without it the
  app keeps its local behavior (Scryfall catalog, binder in `localStorage`, no accounts).
- Signed in, the binder and wants live on the server. After the first sign-in the app offers to import the
  binder saved in this browser (`POST /binder/import`); the local copy is removed only if nothing was lost.
- The app and the API must share a registrable domain (`sbinder.mantisuy.com` + `sbinderapi.mantisuy.com`) so the
  `httpOnly` session cookie travels; binder-api's `ALLOWED_ORIGIN` must be the app's origin.
- Trade proposals still use their local port: binder-api has no proposal endpoints yet.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
