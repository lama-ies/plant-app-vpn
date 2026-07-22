// Componente raíz: enrutado de la app. La ruta pública es /login; las privadas cuelgan de <AppShell>
// (topbar + puerta de sesión + Outlet). Ver plant-arquitectura/07-app-vpn.md y plan-de-trabajo.md Fase 6.6.
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EditorPerfil } from './pages/EditorPerfil';
import { AppShell } from './components/layout/AppShell';

export function App() {
  return (
    <Routes>
      {/* Pública (sin sesión). */}
      <Route path="/login" element={<Login />} />

      {/* Privadas: cuelgan del marco autenticado (gate de sesión + topbar). */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor-perfil" element={<EditorPerfil />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
