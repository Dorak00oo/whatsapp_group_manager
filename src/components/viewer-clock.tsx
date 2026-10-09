"use client";

import { createContext, useCallback, useContext } from "react";
import { formatInstant } from "@/lib/format-instant";

const ViewerClockContext = createContext<string | null>(null);

export function ViewerClockProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  return (
    <ViewerClockContext.Provider value={timeZone}>
      {children}
    </ViewerClockContext.Provider>
  );
}

export function useViewerTimeZone(): string {
  const tz = useContext(ViewerClockContext);
  if (!tz) throw new Error("useViewerTimeZone sin ViewerClockProvider");
  return tz;
}

export function useFormatInstant() {
  const timeZone = useViewerTimeZone();
  return useCallback((d: Date) => formatInstant(d, timeZone), [timeZone]);
}
