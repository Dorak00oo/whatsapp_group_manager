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
  /** Avatar y texto más chicos (rail lateral o barra móvil). */
  compact?: boolean;
  /** Con `embedded`: fila horizontal (barra superior móvil). */
  embeddedInline?: boolean;
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
  compact = false,
  embeddedInline = false,
}: Props) {
  const initial = initialFromUser(user);

  const inner = (
    <>
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-900 font-bold text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-none ${
          compact
            ? "size-10 text-sm"
            : "size-14 text-xl"
        }`}
        aria-hidden
      >
        {initial}
      </div>

      <div
        className={`min-w-0 w-full ${
          embeddedInline ? "flex-1 px-0 text-left" : "text-center"
        } ${
          embeddedInline
            ? ""
            : compact
              ? "max-w-[9rem]"
              : "w-full max-w-full"
        }`}
      >
        <p
          className={`font-semibold leading-tight text-zinc-900 dark:text-zinc-50 ${
            embeddedInline
              ? "truncate text-sm"
              : compact
                ? "text-xs"
                : "text-[0.9375rem]"
          }`}
        >
          {user.name?.trim() || "Cuenta comunitaria"}
        </p>
        {user.email ? (
          <p
            className={`text-zinc-500 dark:text-zinc-400 ${
              embeddedInline
                ? "truncate text-[11px] leading-snug"
                : `break-all leading-snug ${
                    compact ? "mt-1 text-[10px]" : "mt-1.5 text-xs"
                  }`
            }`}
          >
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
    if (embeddedInline) {
      return (
        <div
          className="flex min-w-0 flex-1 items-center gap-2.5"
          aria-label="Perfil y preferencias"
        >
          {inner}
        </div>
      );
    }
    return (
      <div
        className={`flex w-full flex-col items-center ${compact ? "gap-2" : "gap-3"}`}
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
