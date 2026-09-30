/** Altura real del chrome móvil, publicada por `DashboardMobileChrome`. */
export const DASH_MOBILE_NAV_H_VAR = "--dash-mobile-nav-h";

/** Host del editor en celular: hijo de la navbar, pegado a `top: 100%`. */
export const DASHBOARD_MOBILE_EDITOR_ROOT_ID = "dashboard-mobile-editor-root";

/**
 * Fallback si la variable aún no está medida: tabs + mundo, sin el aire
 * extra del `pt` de la página.
 */
export const MOBILE_TOP_NAV_TOP_CSS = `var(${DASH_MOBILE_NAV_H_VAR}, calc(5.25rem + max(0.5rem, env(safe-area-inset-top, 0px))))`;
