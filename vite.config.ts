// Configuración de Vite para plant-app-vpn (frontend React del app de escritorio Tauri v2).
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Destino real de la API (API Gateway con dominio propio). En dev se hace proxy same-origin a /api.
  const apiDestino = env.VITE_API_BASE_URL || 'https://plant-api.iesinternacional.com';

  return {
    plugins: [react()],
    // aws-amplify referencia `global` en algunos paths; se mapea a globalThis por seguridad.
    define: { global: 'globalThis' },
    // Tauri espera el dev server en un puerto fijo y no debe limpiar la pantalla del build de Rust.
    clearScreen: false,
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        // Las llamadas del cliente van a /api/... (same-origin) y Vite las reenvía a la API real en dev.
        '/api': {
          target: apiDestino,
          changeOrigin: true,
          secure: true,
          rewrite: (ruta) => ruta.replace(/^\/api/, ''),
        },
      },
    },
  };
});
