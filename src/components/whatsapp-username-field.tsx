"use client";

import { useId, useState } from "react";
import { softInputNeutral } from "@/lib/soft-ui";

function stripLeadingAt(raw: string) {
  return String(raw ?? "").replace(/^@+/, "");
}

type Props = {
  name: string;
  defaultValue?: string;
  id?: string;
  inputClassName?: string;
};

export function WhatsAppUsernameField({
  name,
  defaultValue = "",
  id,
  inputClassName,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [value, setValue] = useState(() => stripLeadingAt(defaultValue));
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className="relative w-full min-w-0">
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3.5 text-sm font-semibold transition-colors ${
          active
            ? "text-zinc-900 dark:text-zinc-50"
            : "text-zinc-400/45 dark:text-zinc-500/40"
        }`}
      >
        @
      </span>
      <input
        id={inputId}
        name={name}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(stripLeadingAt(e.target.value))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Drak00_oo"
        className={`${inputClassName ?? softInputNeutral} w-full !pl-[1.65rem]`}
      />
    </div>
  );
}
