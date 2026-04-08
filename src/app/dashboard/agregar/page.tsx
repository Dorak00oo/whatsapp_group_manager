import { getCallingCodeOptions } from "@/lib/phone-calling-codes";
import { DirectoryForm } from "@/components/directory-form";

export default function DashboardAgregarPage() {
  const phoneCountryOptions = getCallingCodeOptions("es");

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Agregar persona
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Gamertag, celular y situación en la comunidad. Luego podrás editar
          strikes y baneos desde la lista.
        </p>
      </div>
      <DirectoryForm phoneCountryOptions={phoneCountryOptions} />
    </section>
  );
}
