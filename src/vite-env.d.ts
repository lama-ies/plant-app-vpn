/// <reference types="vite/client" />

// Tipado de las variables de entorno expuestas al cliente (prefijo VITE_).
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_COGNITO_REGION: string;
  readonly VITE_COGNITO_POOL_ID: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
