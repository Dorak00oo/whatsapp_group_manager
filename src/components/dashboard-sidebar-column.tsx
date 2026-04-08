import { SignOutButton } from "@/components/sign-out-button";
import { DashboardProfilePanel } from "@/components/dashboard-profile-panel";
import { DashboardProfileTheme } from "@/components/dashboard-profile-theme";
import { DashboardSidebarNav } from "@/components/dashboard-navigation";

type User = {
  email?: string | null;
  name?: string | null;
};

type Props = {
  user: User;
  defaultThemeDark: boolean;
};

/**
 * Columna izquierda: perfil arriba, navbar de iconos, cerrar sesión abajo.
 */
/** Carril único tipo referencia: cápsula crema, círculos semi-grandes, aire vertical. */
const sidebarRailClass =
  "mx-auto flex w-fit min-w-[10.5rem] flex-col items-center gap-3 rounded-[2rem] bg-zinc-100 px-3.5 py-7 shadow-sm ring-1 ring-zinc-900/[0.06] dark:bg-zinc-950 dark:shadow-none dark:ring-zinc-800/80";

const identityBandClass =
  "flex w-full flex-col items-center rounded-2xl bg-white/75 py-3 ring-1 ring-zinc-200/55 dark:bg-zinc-900/55 dark:ring-zinc-700/55";

const themeBandClass =
  "flex w-full flex-col items-center rounded-2xl bg-amber-50/90 py-3.5 ring-1 ring-amber-200/60 dark:bg-amber-950/35 dark:ring-amber-800/45";

const pagesBandClass =
  "flex w-full flex-col items-center rounded-2xl bg-sky-100/65 py-3.5 ring-1 ring-sky-200/55 dark:bg-sky-950/32 dark:ring-sky-900/45";

const signOutSepClass =
  "mt-1 flex w-full justify-center border-t border-zinc-300/45 pt-3.5 dark:border-zinc-700/55";

export function DashboardSidebarColumn({ user, defaultThemeDark }: Props) {
  return (
    <div className="sticky top-6 pt-0 lg:top-8">
      <div className={sidebarRailClass}>
        <div className={identityBandClass}>
          <DashboardProfilePanel
            user={user}
            defaultThemeDark={defaultThemeDark}
            embedded
            showTheme={false}
          />
        </div>

        <div className={themeBandClass} aria-label="Tema claro u oscuro">
          <DashboardProfileTheme defaultThemeDark={defaultThemeDark} />
        </div>

        <div className={pagesBandClass}>
          <DashboardSidebarNav />
        </div>

        <div className={signOutSepClass}>
          <SignOutButton iconOnly />
        </div>
      </div>
    </div>
  );
}
