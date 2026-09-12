import type { ReactNode } from "react";

/** Inicio y login: el bloque queda en el centro del viewport. */
export function CenteredScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-dvh w-full flex-col items-center justify-center px-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pt-[max(4rem,env(safe-area-inset-top,0px))] pb-[max(4rem,env(safe-area-inset-bottom,0px))] sm:px-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
