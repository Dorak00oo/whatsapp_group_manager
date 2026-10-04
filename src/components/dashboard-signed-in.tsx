type Props = {
  gamertag: string;
  isPanelOwner: boolean;
  layout: "rail" | "drawer";
};

/** Quién entró: gamertag, y «Dueño» si es la cuenta permanente. */
export function DashboardSignedIn({ gamertag, isPanelOwner, layout }: Props) {
  const tag = gamertag.trim() || "Cuenta";
  if (layout === "rail") {
    return (
      <div className="flex w-full min-w-0 flex-col items-center px-0.5 text-center">
        <p
          className="w-full truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50"
          title={tag}
        >
          {tag}
        </p>
        {isPanelOwner ? (
          <p className="mt-1 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white dark:bg-zinc-100 dark:text-zinc-900">
            Dueño
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50" title={tag}>
        {tag}
      </p>
      {isPanelOwner ? (
        <p className="mt-1 inline-flex rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium leading-none text-white dark:bg-zinc-100 dark:text-zinc-900">
          Dueño
        </p>
      ) : (
        <p className="mt-0.5 text-xs text-zinc-500">Cuenta de admin</p>
      )}
    </div>
  );
}
