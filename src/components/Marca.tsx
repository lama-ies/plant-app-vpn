// Marca de la aplicación: los 2 logos oficiales de IES Internacional lado a lado, separados por una
// línea divisoria. Reemplaza el wordmark de texto "IES Monitor Plant" en la topbar y las pantallas de
// auth (decisión del usuario 2026-08-05: mostrar los logos reales en vez de texto). Ambos archivos viven
// en public/ (ies-logo.png = IES_Logo_R.png, ies-logo-monitorplant.png = IES_MonitorPlant_LogoAjustado.png).
export function Marca() {
  return (
    <span className="marca-ies">
      <img src="/ies-logo.png" alt="IES" className="marca-ies__logo" />
      <span className="marca-ies__divisor" aria-hidden="true" />
      <img
        src="/ies-logo-monitorplant.png"
        alt="IES Monitor Plant"
        className="marca-ies__logo marca-ies__logo--monitor"
      />
    </span>
  );
}
