/** Distancia al fondo por debajo de la cual se considera el último log a la vista. */
export const LOG_AT_END_SLACK = 16;

/** Si estás más cerca que esto, las líneas nuevas siguen pegadas al fondo. */
export const LOG_STICK_SLACK = 80;

export function isLogScrolledToEnd(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
  slack = LOG_AT_END_SLACK,
): boolean {
  if (el.scrollHeight <= el.clientHeight + 1) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight <= slack;
}

export function shouldShowJumpToLatestLog(
  el: { scrollHeight: number; scrollTop: number; clientHeight: number },
): boolean {
  return !isLogScrolledToEnd(el);
}
