/** Pausa tras la última tecla antes de aplicar la búsqueda. */
export const SEARCH_DEBOUNCE_MS = 300;

type MirrorSearchOpts = {
  draft: string;
  lastSent: string;
  incoming: string;
  focused: boolean;
};

/**
 * Si se debe copiar `incoming` (URL / resultado) al input.
 * No, si el usuario sigue escribiendo o el campo tiene foco: un `q` atrasado
 * no debe borrar letras.
 */
export function shouldMirrorExternalSearch({
  draft,
  lastSent,
  incoming,
  focused,
}: MirrorSearchOpts): boolean {
  if (focused) return false;
  if (draft.trim() !== lastSent) return false;
  return incoming !== lastSent;
}
