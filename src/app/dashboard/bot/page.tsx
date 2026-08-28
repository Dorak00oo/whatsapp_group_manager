import { WspBotConsole } from "@/components/wsp-bot-console";

export default function DashboardBotPage() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Bot de WhatsApp
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          QR o código de 8 dígitos para vincular el número. Prender y Apagar
          controlan el bot en Coolify, no un Node de este PC.
        </p>
      </div>
      <WspBotConsole />
    </section>
  );
}
