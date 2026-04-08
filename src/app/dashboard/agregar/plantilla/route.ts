import { redirect } from "next/navigation";
import * as XLSX from "xlsx";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const format = new URL(request.url).searchParams.get("format");
  if (format === "csv") {
    const csv =
      "\ufeff" +
      [
        "gamertag,telefono,pais,activo,admin,protegido,se_salio,notas",
        "PlayerEjemplo,+52 55 1234 5678,,si,no,no,no,",
        "OtroPlayer,5512345678,MX,si,no,no,no,grupo A",
      ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="plantilla-jugadores.csv"',
      },
    });
  }

  const ws = XLSX.utils.aoa_to_sheet([
    [
      "gamertag",
      "telefono",
      "pais",
      "activo",
      "admin",
      "protegido",
      "se_salio",
      "notas",
    ],
    [
      "PlayerEjemplo",
      "+52 55 1234 5678",
      "",
      "si",
      "no",
      "no",
      "no",
      "",
    ],
    ["OtroPlayer", "5512345678", "MX", "si", "no", "no", "no", "grupo A"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "jugadores");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-jugadores.xlsx"',
    },
  });
}
