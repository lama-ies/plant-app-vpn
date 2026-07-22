// Punto de entrada del frontend. Monta React, inicializa i18next (import con efecto), Amplify (pool
// Staff) y el enrutador, envolviendo todo en el proveedor de sesión.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './lib/amplify'; // configura Amplify (Auth/Cognito) antes de cualquier uso
import './i18n';
import './index.css';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';

const contenedor = document.getElementById('root');
if (!contenedor) throw new Error('No se encontró el elemento #root');

createRoot(contenedor).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
