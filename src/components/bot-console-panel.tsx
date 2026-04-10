"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Remote = {
  sessionConnected: boolean;
  qrDataUrl: string | null;
  logs: string[];
  runtimeConfig: Record<string, unknown>;
  panelConfigFromWeb: Record<string, unknown>;
} | null;

const ENV_SNIPPET = `BOT_REMOTE_BASE_URL="https://bot-wasap.fly.dev"
BOT_DASHBOARD_SECRET="mismo-secreto-que-en-fly"`;

function statusLabel(
  botRemoteConfigured: boolean | null,
  remote: Remote,
  error: string | null,
): { text: string; tone: "neutral" | "ok" | "warn" | "bad" } {
  if (botRemoteConfigured === false) {
    return {
      text: "Falta enlazar este panel con el bot en Fly",
      tone: "warn",
    };
  }
  if (error?.includes("migrate") || error?.includes("bot_panel_settings")) {
    return { text: "Hay que aplicar migraciones en la base de datos", tone: "bad" };
  }
  if (error && botRemoteConfigured) {
    return { text: "No responde el bot (revisá Fly o la URL)", tone: "bad" };
  }
  if (!remote) {
    return { text: "Sin datos del bot todavía", tone: "neutral" };
  }
  if (remote.sessionConnected) {
    return { text: "WhatsApp conectado", tone: "ok" };
  }
  if (remote.qrDataUrl) {
    return { text: "Emparejamiento: escaneá el código", tone: "warn" };
  }
  return { text: "Desconectado o arrancando el socket", tone: "neutral" };
}

function toneClasses(tone: "neutral" | "ok" | "warn" | "bad") {
  switch (tone) {
    case "ok":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100";
    case "warn":
      return "bg-amber-100 text-amber-950 dark:bg-amber-950/45 dark:text-amber-100";
    case "bad":
      return "bg-rose-100 text-rose-950 dark:bg-rose-950/45 dark:text-rose-100";
    default:
      return "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }
}

export function BotConsolePanel() {
  const [remote, setRemote] = useState<Remote>(null);
  const [panelText, setPanelText] = useState("{}");
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pairingMsg, setPairingMsg] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);
  const [botRemoteConfigured, setBotRemoteConfigured] = useState<boolean | null>(
    null,
  );
  const [copyEnvOk, setCopyEnvOk] = useState(false);
  const logsRef = useRef<HTMLPreElement>(null);
  const seededPanelFromApi = useRef(false);
  const lastPanelConfig = useRef<Record<string, unknown>>({});

  const pull = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard/bot/state", { cache: "no-store" });
      const j = (await r.json()) as {
        remote: Remote;
        panelConfig: Record<string, unknown>;
        error: string | null;
        botRemoteConfigured?: boolean;
      };

      if (r.status === 401) {
        setError("Sesión caducada. Iniciá sesión de nuevo.");
        return;
      }

      setError(j.error ?? null);
      setBotRemoteConfigured(
        typeof j.botRemoteConfigured === "boolean" ? j.botRemoteConfigured : null,
      );
      setRemote(j.remote);
      lastPanelConfig.current = j.panelConfig ?? {};
      if (!seededPanelFromApi.current) {
        setPanelText(JSON.stringify(lastPanelConfig.current, null, 2));
        seededPanelFromApi.current = true;
      }
    } catch {
      setError("Fallo de red al leer el estado");
    }
  }, []);

  useEffect(() => {
    void pull();
    const id = setInterval(() => void pull(), 2800);
    return () => clearInterval(id);
  }, [pull]);

  useEffect(() => {
    const el = logsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [remote?.logs]);

  useEffect(() => {
    if (!pairingDialogOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPairingDialogOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pairingDialogOpen]);

  async function copyEnvSnippet() {
    try {
      await navigator.clipboard.writeText(ENV_SNIPPET);
      setCopyEnvOk(true);
      setTimeout(() => setCopyEnvOk(false), 2000);
    } catch {
      setCopyEnvOk(false);
    }
  }

  async function savePanel() {
    setSaveMsg(null);
    let data: Record<string, unknown>;
    try {
      const parsed = JSON.parse(panelText) as unknown;
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setSaveMsg("El JSON debe ser un objeto (no un array ni texto).");
        return;
      }
      data = parsed as Record<string, unknown>;
    } catch {
      setSaveMsg("JSON inválido: revisa comillas y llaves.");
      return;
    }

    setSaving(true);
    try {
      const r = await fetch("/api/dashboard/bot/panel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const j = (await r.json()) as {
        ok?: boolean;
        pushedToBot?: boolean;
        pushError?: string | null;
        error?: string;
      };
      if (!r.ok) {
        setSaveMsg(j.error || "No se pudo guardar");
        return;
      }
      if (j.pushError) {
        setSaveMsg(
          `Guardado en la web. El bot no recibió el cambio al instante: ${j.pushError}`,
        );
      } else {
        setSaveMsg(
          j.pushedToBot
            ? "Guardado y enviado al bot."
            : "Guardado (sin URL del bot: solo en base de datos).",
        );
      }
      void pull();
    } catch {
      setSaveMsg("Error de red al guardar");
    } finally {
      setSaving(false);
    }
  }

  function reloadPanelFromServer() {
    setSaveMsg(null);
    setPanelText(JSON.stringify(lastPanelConfig.current, null, 2));
    void pull();
  }

  async function runPairingReset() {
    setPairingDialogOpen(false);
    setPairingMsg(null);
    setPairingLoading(true);
    try {
      const r = await fetch("/api/dashboard/bot/pairing", { method: "POST" });
      const j = (await r.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (j.ok) {
        setPairingMsg(
          j.message ||
            "Listo: en unos segundos debería mostrarse el QR en esta página.",
        );
        void pull();
      } else {
        setPairingMsg(
          j.message ||
            j.error ||
            "No se pudo reiniciar el emparejamiento. Revisá los logs del bot en Fly.",
        );
      }
    } catch {
      setPairingMsg("No hubo respuesta del servidor. Probá de nuevo.");
    } finally {
      setPairingLoading(false);
    }
  }

  const status = statusLabel(botRemoteConfigured, remote, error);

  return (
    <div className="space-y-8">
      {pairingDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px]"
            aria-label="Cerrar"
            onClick={() => setPairingDialogOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pairing-dialog-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="pairing-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              ¿Reiniciar emparejamiento?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
              El bot en Fly va a cerrar la sesión actual, borrar la carpeta de
              sesión del dueño y volver a iniciar. Vas a necesitar escanear un
              QR nuevo con WhatsApp (Menú → Dispositivos vinculados → Vincular
              dispositivo).
            </p>
            <ul className="mt-3 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
              <li>La sesión en el servidor se pierde hasta que vuelvas a emparejar.</li>
              <li>Si el dispositivo sigue listado en WhatsApp, podés desvincularlo ahí.</li>
            </ul>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setPairingDialogOpen(false)}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void runPairingReset()}
                disabled={pairingLoading}
                className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
              >
                Sí, generar QR nuevo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800/90 dark:bg-zinc-950/40 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Estado del bot
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          El código QR lo genera WhatsApp en el servidor del bot. Desde acá podés
          ver logs, el QR cuando exista y pedir un emparejamiento limpio.
        </p>

        {botRemoteConfigured === false ? (
          <div className="mt-5 rounded-2xl border border-sky-200/90 bg-sky-50/90 p-5 dark:border-sky-900/50 dark:bg-sky-950/35">
            <h3 className="text-sm font-semibold text-sky-950 dark:text-sky-100">
              Enlazar el panel con tu bot en Fly
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-sky-900/90 dark:text-sky-200/90">
              Creá o editá el archivo{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-zinc-900/80">
                .env.local
              </code>{" "}
              en la raíz del proyecto{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-zinc-900/80">
                whatsapp
              </code>{" "}
              (junto a{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-zinc-900/80">
                package.json
              </code>
              ), pegá estas variables y reiniciá{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-zinc-900/80">
                npm run dev
              </code>
              . El secreto tiene que ser el mismo que configuraste en Fly con{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs dark:bg-zinc-900/80">
                fly secrets set BOT_DASHBOARD_SECRET=...
              </code>
              .
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
              {ENV_SNIPPET}
            </pre>
            <button
              type="button"
              onClick={() => void copyEnvSnippet()}
              className="mt-3 rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {copyEnvOk ? "Copiado" : "Copiar ejemplo al portapapeles"}
            </button>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${toneClasses(status.tone)}`}
          >
            {status.text}
          </span>
          {remote?.qrDataUrl ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Abrí WhatsApp en el teléfono → Dispositivos vinculados → Vincular
              dispositivo
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setPairingDialogOpen(true)}
            disabled={pairingLoading || botRemoteConfigured === false}
            className="rounded-full border border-violet-300 bg-violet-50 px-5 py-2.5 text-sm font-medium text-violet-950 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-45 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
          >
            {pairingLoading
              ? "Reiniciando emparejamiento…"
              : "Pedir un QR nuevo"}
          </button>
          {pairingMsg ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              {pairingMsg}
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {remote?.qrDataUrl ? (
          <div className="mt-6 flex justify-center rounded-xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={remote.qrDataUrl}
              alt="Código QR de emparejamiento WhatsApp"
              width={320}
              height={320}
              className="max-w-full"
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800/90 dark:bg-zinc-950/40 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Log reciente
        </h2>
        <pre
          ref={logsRef}
          className="mt-4 max-h-[min(420px,50vh)] overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100"
        >
          {(remote?.logs ?? []).join("\n") || "— sin líneas todavía —"}
        </pre>
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm dark:border-zinc-800/90 dark:bg-zinc-950/40 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Parámetros (JSON)
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Se guardan en tu base de datos. El bot puede leerlos con polling a{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
            /api/bot/panel-config
          </code>{" "}
          (mismo{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
            BOT_WEBHOOK_SECRET
          </code>
          ) si configurás{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
            PANEL_CONFIG_URL
          </code>{" "}
          en Fly. En código del bot:{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">
            globalThis.__panelConfigFromWeb
          </code>
          .
        </p>
        <textarea
          value={panelText}
          onChange={(e) => setPanelText(e.target.value)}
          spellCheck={false}
          className="mt-4 min-h-[200px] w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-100"
          aria-label="Parámetros JSON del bot"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void savePanel()}
            disabled={saving}
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Guardando…" : "Guardar y enviar al bot"}
          </button>
          <button
            type="button"
            onClick={reloadPanelFromServer}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Recargar desde servidor
          </button>
        </div>
        {saveMsg ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {saveMsg}
          </p>
        ) : null}
      </section>
    </div>
  );
}
