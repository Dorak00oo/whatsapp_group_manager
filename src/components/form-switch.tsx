const accentTrack: Record<"emerald" | "violet" | "cyan" | "slate", string> = {
  emerald:
    "peer-checked:bg-emerald-600 peer-focus-visible:ring-emerald-500/60 dark:peer-checked:bg-emerald-500",
  violet:
    "peer-checked:bg-violet-600 peer-focus-visible:ring-violet-500/60 dark:peer-checked:bg-violet-500",
  cyan: "peer-checked:bg-cyan-600 peer-focus-visible:ring-cyan-500/60 dark:peer-checked:bg-cyan-500",
  slate:
    "peer-checked:bg-slate-600 peer-focus-visible:ring-slate-500/60 dark:peer-checked:bg-slate-500",
};

type Props = {
  name: string;
  label: string;
  defaultChecked?: boolean;
  /** Modo controlado: envía `name` con hidden `on` solo si está activo. */
  checked?: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  accent?: keyof typeof accentTrack;
};

/** Switch accesible: checkbox nativo para envío con server actions. */
export function FormSwitch({
  name,
  label,
  defaultChecked = false,
  checked,
  onCheckedChange,
  disabled = false,
  accent = "emerald",
}: Props) {
  const track = accentTrack[accent];
  const controlled = checked !== undefined;
  const isOn = controlled ? checked : defaultChecked;

  return (
    <label
      className={`flex items-center justify-between gap-3 text-xs font-medium text-zinc-600 dark:text-zinc-400 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="select-none">{label}</span>
      <span className="relative inline-flex shrink-0">
        {controlled && isOn ? (
          <input type="hidden" name={name} value="on" />
        ) : null}
        <input
          type="checkbox"
          name={controlled ? undefined : name}
          value="on"
          checked={controlled ? checked : undefined}
          defaultChecked={controlled ? undefined : defaultChecked}
          disabled={disabled}
          onChange={(e) => {
            if (controlled) {
              onCheckedChange?.(e.target.checked);
            }
          }}
          className="peer sr-only"
        />
        <span
          className={`relative block h-7 w-12 rounded-full bg-zinc-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-zinc-50 dark:bg-zinc-600 dark:after:bg-zinc-100 dark:peer-focus-visible:ring-offset-zinc-950 ${track} peer-checked:after:translate-x-[1.25rem]`}
        />
      </span>
    </label>
  );
}
