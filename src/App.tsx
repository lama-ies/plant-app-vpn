// Componente raíz: enrutado de la app. La ruta pública es /login; las privadas cuelgan de <AppShell>
// (topbar + puerta de sesión + Outlet). Ver plant-arquitectura/07-app-vpn.md y plan-de-trabajo.md Fase 6.6.
import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from './pages/Login';
import { ActivarStaff } from './pages/ActivarStaff';
import { RecuperarStaff } from './pages/RecuperarStaff';
import { Dashboard } from './pages/Dashboard';
import { Filtros } from './pages/Filtros';
import { EditorPerfil } from './pages/EditorPerfil';
import { VistaPlanta } from './pages/VistaPlanta';
import { TerminalSSH } from './pages/TerminalSSH';
import { TransferenciaArchivos } from './pages/TransferenciaArchivos';
import { Auditoria } from './pages/Auditoria';
import { PanelErrores } from './pages/PanelErrores';
import { AltaCliente } from './pages/AltaCliente';
import { AltaEquipo } from './pages/AltaEquipo';
import { GestionZonas } from './pages/GestionZonas';
import { GestionGerentes } from './pages/GestionGerentes';
import { GestionStaff } from './pages/GestionStaff';
import { GestionPlantillas } from './pages/GestionPlantillas';
import { AppShell } from './components/layout/AppShell';
import { RutaProtegida } from './components/RutaProtegida';

export function App() {
  return (
    <Routes>
      {/* Públicas (sin sesión). */}
      <Route path="/login" element={<Login />} />
      <Route path="/activar-staff" element={<ActivarStaff />} />
      <Route path="/recuperar-staff" element={<RecuperarStaff />} />

      {/* Privadas: cuelgan del marco autenticado (gate de sesión + topbar). */}
      <Route element={<AppShell />}>
        {/* El tablero es el destino común de todos los roles: sin permiso propio. */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/filtros" element={<RutaProtegida perm="canConectarVpn"><Filtros /></RutaProtegida>} />
        <Route path="/editor-perfil" element={<RutaProtegida perm="canEditorPerfil"><EditorPerfil /></RutaProtegida>} />
        {/* Vista de planta: SOLO LECTURA, así que basta con poder ver equipos (todos los roles). */}
        <Route path="/vista-planta" element={<VistaPlanta />} />
        <Route path="/terminal-ssh" element={<RutaProtegida perm="canSsh"><TerminalSSH /></RutaProtegida>} />
        <Route path="/transferencia-archivos" element={<RutaProtegida perm="canTransferirArchivos"><TransferenciaArchivos /></RutaProtegida>} />
        <Route path="/auditoria" element={<RutaProtegida perm="canAuditoria"><Auditoria /></RutaProtegida>} />
        <Route path="/panel-errores" element={<RutaProtegida perm="canPanelErrores"><PanelErrores /></RutaProtegida>} />
        <Route path="/alta-cliente" element={<RutaProtegida perm="canAltaCliente"><AltaCliente /></RutaProtegida>} />
        <Route path="/alta-equipo" element={<RutaProtegida perm="canAltaEquipo"><AltaEquipo /></RutaProtegida>} />
        <Route path="/gestion-zonas" element={<RutaProtegida perm="canGestionZonas"><GestionZonas /></RutaProtegida>} />
        <Route path="/gestion-gerentes" element={<RutaProtegida perm="canGestionGerentes"><GestionGerentes /></RutaProtegida>} />
        <Route path="/gestion-staff" element={<RutaProtegida perm="canGestionStaff"><GestionStaff /></RutaProtegida>} />
        <Route path="/gestion-plantillas" element={<RutaProtegida perm="canGestionPlantillas"><GestionPlantillas /></RutaProtegida>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
