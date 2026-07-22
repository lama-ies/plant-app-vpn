// Componente raíz: enrutado de la app. La ruta pública es /login; las privadas cuelgan de <AppShell>
// (topbar + puerta de sesión + Outlet). Ver plant-arquitectura/07-app-vpn.md y plan-de-trabajo.md Fase 6.6.
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { ActivarStaff } from './pages/ActivarStaff';
import { Dashboard } from './pages/Dashboard';
import { Filtros } from './pages/Filtros';
import { EditorPerfil } from './pages/EditorPerfil';
import { TerminalSSH } from './pages/TerminalSSH';
import { TransferenciaArchivos } from './pages/TransferenciaArchivos';
import { Auditoria } from './pages/Auditoria';
import { PanelErrores } from './pages/PanelErrores';
import { AltaCliente } from './pages/AltaCliente';
import { AltaEquipo } from './pages/AltaEquipo';
import { GestionZonas } from './pages/GestionZonas';
import { GestionGerentes } from './pages/GestionGerentes';
import { GestionPlantillas } from './pages/GestionPlantillas';
import { AppShell } from './components/layout/AppShell';

export function App() {
  return (
    <Routes>
      {/* Públicas (sin sesión). */}
      <Route path="/login" element={<Login />} />
      <Route path="/activar-staff" element={<ActivarStaff />} />

      {/* Privadas: cuelgan del marco autenticado (gate de sesión + topbar). */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/filtros" element={<Filtros />} />
        <Route path="/editor-perfil" element={<EditorPerfil />} />
        <Route path="/terminal-ssh" element={<TerminalSSH />} />
        <Route path="/transferencia-archivos" element={<TransferenciaArchivos />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/panel-errores" element={<PanelErrores />} />
        <Route path="/alta-cliente" element={<AltaCliente />} />
        <Route path="/alta-equipo" element={<AltaEquipo />} />
        <Route path="/gestion-zonas" element={<GestionZonas />} />
        <Route path="/gestion-gerentes" element={<GestionGerentes />} />
        <Route path="/gestion-plantillas" element={<GestionPlantillas />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
