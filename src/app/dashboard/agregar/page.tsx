import { getCallingCodeOptions } from "@/lib/phone-calling-codes";
import { DirectoryBulkUpload } from "@/components/directory-bulk-upload";
import { DirectoryForm } from "@/components/directory-form";

export default function DashboardAgregarPage() {
  const phoneCountryOptions = getCallingCodeOptions("es");

  return (
    <section className="flex flex-col gap-10">
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

      <div className="border-t border-zinc-200 pt-10 dark:border-zinc-800">
        <DirectoryBulkUpload />
      </div>
    </section>
  );
}
