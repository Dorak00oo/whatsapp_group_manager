import Link from "next/link";
import { getCallingCodeOptions } from "@/lib/phone-calling-codes";
import { DirectoryForm } from "@/components/directory-form";

export default function DashboardAgregarPage() {
  const phoneCountryOptions = getCallingCodeOptions("es");

  return (
    <section className="flex flex-col gap-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Formulario
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Agregar persona
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Gamertag, celular y situación en la comunidad. Luego podrás editar
          strikes y baneos desde la lista.           Para Excel o log de Minecraft usa{" "}
          <Link
            href="/dashboard/importar"
            className="font-medium text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Importar y log
          </Link>
          .
        </p>
      </div>
      <DirectoryForm phoneCountryOptions={phoneCountryOptions} />
    </section>
  );
}
