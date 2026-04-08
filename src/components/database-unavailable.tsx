import Link from "next/link";

export function DatabaseUnavailable() {
  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50/90 p-5 dark:border-amber-900/60 dark:bg-amber-950/30"
      role="alert"
    >
      <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100">
        No hay conexión con la base de datos
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
        El servidor no alcanza tu base en Neon (error Prisma <code className="rounded bg-amber-200/60 px-1 text-xs dark:bg-amber-900/80">P1001</code>
        ). Suele pasar si el proyecto Neon está <strong className="font-medium">en pausa</strong> por
        inactividad: entra en{" "}
        <a
          href="https://console.neon.tech"
          className="font-medium text-amber-950 underline underline-offset-2 dark:text-amber-50"
          target="_blank"
          rel="noopener noreferrer"
        >
          console.neon.tech
        </a>
        , abre el proyecto y espera a que arranque; luego recarga esta página.
      </p>
      <p className="mt-2 text-sm text-amber-900/85 dark:text-amber-200/85">
        También revisa que <code className="rounded bg-amber-200/60 px-1 text-xs dark:bg-amber-900/80">DATABASE_URL</code> en{" "}
        <code className="rounded bg-amber-200/60 px-1 text-xs dark:bg-amber-900/80">.env</code> coincida con la cadena de
        conexión del panel (pooler o directa) y que no haya firewall bloqueando el puerto.
      </p>
      <p className="mt-4 text-sm">
        <Link
          href="/dashboard"
          className="font-medium text-amber-950 underline underline-offset-2 dark:text-amber-50"
        >
          Reintentar
        </Link>
      </p>
    </section>
  );
}
