import { DashboardProfileTheme } from "@/components/dashboard-profile-theme";

type User = {
  email?: string | null;
  name?: string | null;
};

type Props = {
  user: User;
  defaultThemeDark: boolean;
  /** Sin caja propia: va dentro del carril lateral o del bloque móvil unificado. */
  embedded?: boolean;
  /** Si es false, solo identidad (el toggle va en otra franja del carril). */
  showTheme?: boolean;
};

function initialFromUser(user: User): string {
  const n = user.name?.trim() || user.email?.trim() || "?";
  return n.charAt(0).toUpperCase();
}

/**
 * Columna de perfil: círculos alineados con la nav; con `embedded` sin contenedor propio.
 */
export function DashboardProfilePanel({
  user,
  defaultThemeDark,
  embedded = false,
  showTheme = true,
}: Props) {
  const initial = initialFromUser(user);

  const inner = (
    <>
      <div
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-bold text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-none"
        aria-hidden
      >
        {initial}
      </div>

      <div className="max-w-[11rem] px-1 text-center">
        <p className="text-[0.9375rem] font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
          {user.name?.trim() || "Cuenta comunitaria"}
        </p>
        {user.email ? (
          <p className="mt-1.5 break-all text-xs leading-snug text-zinc-500 dark:text-zinc-400">
            {user.email}
          </p>
        ) : null}
      </div>

      {showTheme ? (
        <DashboardProfileTheme defaultThemeDark={defaultThemeDark} />
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div
        className="flex w-full flex-col items-center gap-3"
        aria-label="Perfil y preferencias"
      >
        {inner}
      </div>
    );
  }

  return (
    <div
      className="mx-auto flex w-fit min-w-[10.5rem] flex-col items-center gap-3 rounded-[2rem] bg-zinc-100 px-3.5 py-6 shadow-sm ring-1 ring-zinc-900/[0.06] dark:bg-zinc-950 dark:shadow-none dark:ring-zinc-800/80"
      aria-label="Perfil y preferencias"
    >
      {inner}
    </div>
  );
}
