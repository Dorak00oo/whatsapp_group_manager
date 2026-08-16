import { redirect } from "next/navigation";

/** Ruta antigua: /dashboard/importar */
export default function DashboardImportarRedirectPage() {
  redirect("/dashboard/administracion");
}
