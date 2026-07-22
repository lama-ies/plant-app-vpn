// Configuración de AWS Amplify (Auth/Cognito) para el pool STAFF (personal de IES Internacional) —
// independiente del pool del portal-client, aunque comparta nombres de rol. Importar por su efecto en
// main.tsx antes de usar cualquier API de Amplify. Ver plant-arquitectura/07-app-vpn.md.
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});
