import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-10 px-6 py-20">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Registros en la nube
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          WhatsApp & Minecraft
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Acceso comunitario con una sola cuenta. Notas por categoría, base de
          datos Postgres (Neon) y despliegue en Vercel.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {session?.user ? (
          <Link
            href="/dashboard"
            className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Ir al panel
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
