/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of binder-api, including the version prefix
   * (e.g. `http://localhost:3000/api/v1`). When set, every port binds to the
   * API adapter; when unset, the app keeps its local behavior (Scryfall
   * catalog, honest local ports, opt-in dev mocks).
   */
  readonly VITE_API_URL?: string
  readonly VITE_MOCK_AUTH?: string
  readonly VITE_MOCK_WISHERS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
