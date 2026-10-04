import { revalidatePath } from "next/cache";

/** La lista vive en `/dashboard/lista`; Inicio sigue en `/dashboard`. */
export function revalidateDirectoryViews(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/lista");
}
