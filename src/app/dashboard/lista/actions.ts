"use server";

import { auth } from "@/auth";
import {
  decodeDirectoryCursor,
  directoryCursorMatches,
  directoryListMode,
  parseDirectoryFilters,
  type DirectoryColumnLane,
  type DirectoryUrlFilters,
} from "@/lib/directory-query";
import { loadDirectorySlice, type DirectorySlice } from "@/lib/directory-page";
import { requirePanelSession } from "@/lib/panel-session";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import type { DirectoryMemberDTO } from "@/types/directory";

export type LoadMoreDirectoryResult =
  | { ok: true; members: DirectoryMemberDTO[]; nextCursor: string | null }
  | { ok: false; error: string };

function filtersFrom(input: DirectoryUrlFilters): DirectoryUrlFilters {
  return parseDirectoryFilters({
    status: input.status,
    view: input.view,
    cohort: input.cohort,
    country: input.country,
    q: input.q,
    banned: input.banned,
  });
}

/** Siguiente tanda de 100. La sesión y los filtros se vuelven a leer en el servidor. */
export async function loadMoreDirectoryMembers(input: {
  filters: DirectoryUrlFilters;
  cursor: string;
  lane: DirectoryColumnLane | null;
}): Promise<LoadMoreDirectoryResult> {
  const panel = await requirePanelSession();
  const filters = filtersFrom(input.filters);
  const mode = directoryListMode(filters);
  const lane = mode === "split" ? input.lane : null;
  if (mode === "split" && lane !== "active" && lane !== "inactive" && lane !== "left") {
    return { ok: false, error: "Falta la columna de la lista." };
  }
  const cursor = decodeDirectoryCursor(input.cursor);
  if (!cursor || !directoryCursorMatches(mode, lane, cursor)) {
    return { ok: false, error: "La página ya no es válida. Recarga la lista." };
  }

  try {
    const userId =
      (await resolveDirectoryUserId(await auth())) ?? panel.userId;
    const slice: DirectorySlice = await loadDirectorySlice({
      userId,
      filters,
      lane,
      cursor,
    });
    if (slice.members.length === 0) {
      return {
        ok: false,
        error: "No se pudo avanzar la lista. Recarga la página.",
      };
    }
    return { ok: true, members: slice.members, nextCursor: slice.nextCursor };
  } catch (error) {
    if (isDatabaseUnreachableError(error)) {
      return {
        ok: false,
        error: "No hay conexión con la base. Inténtalo de nuevo.",
      };
    }
    return { ok: false, error: "No se pudo cargar más. Inténtalo de nuevo." };
  }
}
