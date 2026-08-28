"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  isLogScrolledToEnd,
  LOG_STICK_SLACK,
  shouldShowJumpToLatestLog,
} from "@/lib/log-scroll";

function DownArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

type Props = {
  children: ReactNode;
  className: string;
  wrapClassName?: string;
  as?: "div" | "pre";
  followToken?: unknown;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

export function LogScrollViewport({
  as = "div",
  className,
  wrapClassName,
  children,
  followToken,
  ...rest
}: Props) {
  const boxRef = useRef<HTMLElement | null>(null);
  const [showJump, setShowJump] = useState(false);

  const refreshButton = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    setShowJump(shouldShowJumpToLatestLog(el));
  }, []);

  const stickIfNearEnd = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    if (isLogScrolledToEnd(el, LOG_STICK_SLACK)) {
      el.scrollTop = el.scrollHeight;
    }
    refreshButton();
  }, [refreshButton]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.addEventListener("scroll", refreshButton, { passive: true });
    const mo = new MutationObserver(stickIfNearEnd);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    refreshButton();
    return () => {
      el.removeEventListener("scroll", refreshButton);
      mo.disconnect();
    };
  }, [refreshButton, stickIfNearEnd]);

  useLayoutEffect(() => {
    stickIfNearEnd();
  }, [followToken, stickIfNearEnd]);

  function jumpToEnd() {
    const el = boxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setShowJump(false);
  }

  const Tag = as;
  return (
    <div className={`relative min-h-0 ${wrapClassName ?? ""}`}>
      <Tag
        ref={(node: HTMLElement | null) => {
          boxRef.current = node;
        }}
        className={className}
        {...rest}
      >
        {children}
      </Tag>
      {showJump ? (
        <button
          type="button"
          onClick={jumpToEnd}
          className="absolute bottom-2 right-8 flex size-8 items-center justify-center rounded-none bg-white text-zinc-900 ring-1 ring-zinc-950/15 transition hover:bg-zinc-100 dark:bg-zinc-950 dark:text-white dark:ring-white/20 dark:hover:bg-zinc-900"
          aria-label="Ir al último log"
          title="Ir al último log"
        >
          <DownArrowIcon />
        </button>
      ) : null}
    </div>
  );
}
