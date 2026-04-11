import Link from "next/link";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 py-16 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pt-[max(4rem,env(safe-area-inset-top,0px))] sm:gap-10 sm:px-6 sm:py-20 sm:pb-20 sm:pl-6 sm:pr-6 sm:pt-20">
      <div className="w-full max-w-lg text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Registros en la nube
        </p>
        <h1 className="mt-3 text-pretty text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl md:text-4xl">
          WhatsApp & Minecraft
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
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
