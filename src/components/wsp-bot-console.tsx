"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyBotStatus,
  type WspBotConsoleView,
  type WspBotLogLine,
} from "@/lib/wsp-bot-console";

const POLL_QR_MS = 500;
const POLL_CONNECTED_MS = 2500;

const statusCopy: Record<
  ReturnType<typeof classifyBotStatus>,
  { label: string; className: string }
> = {
  offline: {
    label: "Bot apagado",
    className:
      "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  },
  waiting: {
    label: "Esperando vínculo",
    className:
      "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100",
  },
  connected: {
    label: "Enlazado",
    className:
      "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-100",
  },
};

function formatLogTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function WspBotConsole() {
  const [view, setView] = useState<WspBotConsoleView | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<
    "code" | "unlink" | "start" | "stop" | "restart" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const logBoxRef = useRef<HTMLPreElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/wsp-bot/console?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as WspBotConsoleView;
      setView(data);
    } catch {
      setView({
        ok: false,
        offline: true,
        error: "No se pudo hablar con el panel (red).",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const kind = view ? classifyBotStatus(view) : "offline";

  useEffect(() => {
    const ms = kind === "connected" ? POLL_CONNECTED_MS : POLL_QR_MS;
    const id = setInterval(() => void refresh(), ms);
    return () => clearInterval(id);
  }, [kind, refresh]);

  const logs: WspBotLogLine[] = view && view.ok ? view.logs : [];

  useEffect(() => {
    const box = logBoxRef.current;
    if (!box) return;
    const distance = box.scrollHeight - box.scrollTop - box.clientHeight;
    if (distance < 80) box.scrollTop = box.scrollHeight;
  }, [logs.length]);

  async function requestCode() {
    setBusy("code");
    setMessage(null);
    try {
      const res = await fetch("/api/wsp-bot/console", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pair-code", phone }),
      });
      const data = (await res.json()) as {
        error?: string;
        pairingCode?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo generar el código");
        return;
      }
      setMessage(
        data.pairingCode
          ? `Código: ${data.pairingCode}`
          : "Código generado. Mirá el recuadro.",
      );
      await refresh();
    } catch {
      setMessage("Error de red al pedir el código.");
    } finally {
      setBusy(null);
    }
  }

  async function control(action: "start" | "stop" | "restart") {
    const labels = {
      start: "Encendiendo el bot…",
      stop: "Apagando el bot…",
      restart: "Reiniciando el bot…",
    };
    setBusy(action);
    setMessage(labels[action]);
    try {
      const res = await fetch("/api/wsp-bot/console", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo cambiar el estado del bot");
        return;
      }
      setMessage(data.message ?? "Listo.");
      await refresh();
      if (action !== "stop") {
        setTimeout(() => void refresh(), 1500);
        setTimeout(() => void refresh(), 4000);
      }
    } catch {
      setMessage("Error de red al controlar el bot.");
    } finally {
      setBusy(null);
    }
  }

  async function unlink() {
    if (
      !window.confirm(
        "Esto desvincula el WhatsApp y borra la sesión. Vas a tener que escanear un QR nuevo. ¿Seguís?",
      )
    ) {
      return;
    }
    setBusy("unlink");
    setMessage(null);
    try {
      const res = await fetch("/api/wsp-bot/console", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "unlink" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo desvincular");
        return;
      }
      setMessage("Sesión borrada. El bot se reinicia; el QR aparece en unos segundos.");
      setTimeout(() => void refresh(), 1500);
    } catch {
      setMessage("Error de red al desvincular.");
    } finally {
      setBusy(null);
    }
  }

  const online = view && view.ok ? view : null;
  const badge = statusCopy[kind];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
        {online?.connected && online.userName ? (
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {online.userName}
            {online.userJid ? (
              <span className="ml-2 font-mono text-xs text-zinc-400">
                {online.userJid.split(":")[0]}
              </span>
            ) : null}
          </span>
        ) : null}
        {view?.process?.pid ? (
          <span className="font-mono text-xs text-zinc-400">
            PID {view.process.pid}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null || kind !== "offline"}
          onClick={() => void control("start")}
          className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === "start" ? "Prendiendo…" : "Prender"}
        </button>
        <button
          type="button"
          disabled={busy !== null || kind === "offline"}
          onClick={() => void control("stop")}
          className="rounded-lg bg-zinc-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          {busy === "stop" ? "Apagando…" : "Apagar"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void control("restart")}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {busy === "restart" ? "Reiniciando…" : "Reiniciar"}
        </button>
      </div>

      {view && !view.ok ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {view.error}
        </p>
      ) : null}

      <p className="text-sm text-zinc-500">
        Fotos y videos (también “ver una sola vez”) se guardan en Nextcloud,
        cuenta <code className="font-mono text-xs">drk000</code>, carpeta{" "}
        <code className="font-mono text-xs">WhatsApp/</code>
        {online?.mediaRoot ? (
          <>
            {" "}
            (el bot las ve en{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              {online.mediaRoot}
            </code>
            ).
          </>
        ) : (
          "."
        )}{" "}
        Grupos →{" "}
        <code className="font-mono text-xs">WhatsApp/grupos/…</code>
        . Privados →{" "}
        <code className="font-mono text-xs">WhatsApp/privados/…</code>.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Código QR
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            WhatsApp → Dispositivos vinculados → Vincular dispositivo.
          </p>
          <div className="mt-4 flex min-h-[16rem] items-center justify-center rounded-md bg-zinc-50 p-4 dark:bg-zinc-950">
            {online?.hasQr && online.qrUpdatedAt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={online.qrUpdatedAt}
                src={`/api/wsp-bot/console/qr?t=${encodeURIComponent(online.qrUpdatedAt)}`}
                alt="Código QR para vincular WhatsApp"
                className="size-64 rounded-md bg-white p-2"
              />
            ) : online?.connected ? (
              <p className="text-center text-sm text-zinc-500">
                Ya está vinculado. No hace falta QR.
              </p>
            ) : (
              <p className="text-center text-sm text-zinc-500">
                El QR aparece acá cuando el bot está en marcha y espera el
                escaneo.
              </p>
            )}
          </div>
          {online?.qrUpdatedAt ? (
            <p className="mt-2 text-xs text-zinc-400">
              Actualizado{" "}
              {new Date(online.qrUpdatedAt).toLocaleTimeString("es")}
              {" · "}se recarga solo cada vez que WhatsApp emite uno nuevo
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Código de 8 dígitos
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            WhatsApp → Dispositivos vinculados → Vincular con número de
            teléfono.
          </p>
          {online?.pairingCode ? (
            <p className="mt-4 font-mono text-3xl font-semibold tracking-[0.35em] text-zinc-900 dark:text-zinc-50">
              {online.pairingCode}
            </p>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Todavía no hay código. Pedilo con el número que vas a vincular.
            </p>
          )}
          <label
            htmlFor="bot-pair-phone"
            className="mt-4 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Número (internacional)
          </label>
          <input
            id="bot-pair-phone"
            type="tel"
            inputMode="tel"
            placeholder="+57 300 111 2233"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <button
            type="button"
            disabled={busy !== null || kind === "offline" || Boolean(online?.connected)}
            onClick={() => void requestCode()}
            className="mt-3 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {busy === "code" ? "Generando…" : "Generar código"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Logs
          </h3>
          <button
            type="button"
            disabled={busy !== null || kind === "offline"}
            onClick={() => void unlink()}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            {busy === "unlink" ? "Desvinculando…" : "Desvincular sesión"}
          </button>
        </div>
        {message ? (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300" role="status">
            {message}
          </p>
        ) : null}
        <pre
          ref={logBoxRef}
          className="mt-3 max-h-[min(52rem,80vh)] min-h-[28rem] overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-zinc-200"
        >
          {logs.length === 0
            ? "Sin líneas todavía."
            : logs.map((line, i) => (
                <span
                  key={`${line.ts}-${i}`}
                  className={
                    line.level === "error"
                      ? "block text-red-300"
                      : line.level === "warn"
                        ? "block text-amber-200"
                        : "block text-zinc-200"
                  }
                >
                  {formatLogTime(line.ts)}  {line.message}
                </span>
              ))}
        </pre>
      </div>
    </div>
  );
}
