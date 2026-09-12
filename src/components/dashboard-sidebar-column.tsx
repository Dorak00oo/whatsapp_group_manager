import { SignOutButton } from "@/components/sign-out-button";
import { DashboardProfileTheme } from "@/components/dashboard-profile-theme";
import { DashboardSidebarNav } from "@/components/dashboard-navigation";
import { sidebarGroupRule } from "@/components/sidebar-glyph-caption";

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
  "flex w-full min-w-0 max-w-full flex-col items-center px-1.5 py-6";

const groupClass = "flex w-full flex-col items-center px-1";

const dividerWrap = "mt-4 flex w-full flex-col items-stretch px-1";

export function DashboardSidebarColumn({ user: _user, defaultThemeDark }: Props) {
  return (
    <div className={sidebarRailClass}>
      <div className={groupClass} aria-label="Tema claro u oscuro">
        <DashboardProfileTheme defaultThemeDark={defaultThemeDark} columnCompact />
      </div>

      <div className={dividerWrap}>
        <span className={sidebarGroupRule} aria-hidden />
        <div className="pt-4">
          <DashboardSidebarNav />
        </div>
      </div>

      <div className={dividerWrap}>
        <span className={sidebarGroupRule} aria-hidden />
        <div className="pt-4">
          <SignOutButton iconOnly />
        </div>
      </div>
    </div>
  );
}
