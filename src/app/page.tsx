import Link from "next/link";
import { auth } from "@/auth";
import { CenteredScreen } from "@/components/centered-screen";

export default async function Home() {
  const session = await auth();

  return (
    <CenteredScreen className="gap-8 sm:gap-10">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl md:text-4xl">
          Panel de la comunidad
        </h1>
        <p className="mt-4 text-pretty text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
          {session?.user
            ? "Directorio de personas, WhatsApp y Minecraft."
            : "Directorio de personas, WhatsApp y Minecraft. Entrá con la cuenta compartida."}
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
    </CenteredScreen>
  );
}
