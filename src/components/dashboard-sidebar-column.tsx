import { SignOutButton } from "@/components/sign-out-button";
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

/** Contenido del carril (contorno y sombra van en el `aside` del layout para no recortarlos con overflow). */
const sidebarRailClass =
  "flex w-full min-w-0 max-w-full flex-col items-center gap-2.5 px-1.5 py-5";

const bandBase =
  "flex w-full flex-col items-center justify-center px-1.5";

const themeBandClass =
  `${bandBase} rounded-2xl bg-amber-50/90 py-2.5 ring-1 ring-amber-200/60 dark:bg-amber-950/35 dark:ring-amber-800/45`;

const pagesBandClass =
  `${bandBase} rounded-2xl bg-sky-100/65 py-3 ring-1 ring-sky-200/55 dark:bg-sky-950/32 dark:ring-sky-900/45`;

const signOutSepClass =
  "mt-1 flex w-full flex-col items-center justify-center border-t border-zinc-300/45 pt-3 dark:border-zinc-700/55";

export function DashboardSidebarColumn({ user: _user, defaultThemeDark }: Props) {
  return (
    <div className={sidebarRailClass}>
      <div className={themeBandClass} aria-label="Tema claro u oscuro">
        <DashboardProfileTheme defaultThemeDark={defaultThemeDark} columnCompact />
      </div>

      <div className={pagesBandClass}>
        <DashboardSidebarNav />
      </div>

      <div className={signOutSepClass}>
        <SignOutButton iconOnly />
      </div>
    </div>
  );
}
