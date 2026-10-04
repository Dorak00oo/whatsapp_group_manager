import assert from "node:assert/strict";
import { test } from "node:test";
import { DIRECTORY_NEW_MEMBER_DAYS } from "../src/lib/directory-cohort.ts";
import {
  DIRECTORY_PAGE_SIZE,
  decodeDirectoryCursor,
  directoryHomeCountWhere,
  directoryListMode,
  directoryListRedirectQuery,
  encodeDirectoryCursor,
  takeDirectoryPage,
  type DirectoryPageCursor,
  type DirectorySortRow,
} from "../src/lib/directory-query.ts";

function row(
  id: string,
  createdAt: string,
  extra?: { active?: boolean; leftAt?: string | null },
): DirectorySortRow {
  return {
    id,
    createdAt: new Date(createdAt),
    leftAt: extra?.leftAt ? new Date(extra.leftAt) : null,
    active: extra?.active ?? true,
  };
}

test("los filtros de la lista arman la redirección y un inicio vacío no", () => {
  assert.equal(directoryListRedirectQuery({}), null);
  assert.equal(directoryListRedirectQuery({ q: "  " }), null);
  const qs = directoryListRedirectQuery({
    q: "Steve",
    cohort: "new",
    country: ["CO"],
  });
  const params = new URLSearchParams(qs ?? "");
  assert.equal(params.get("q"), "Steve");
  assert.equal(params.get("cohort"), "new");
  assert.equal(params.get("country"), "CO");
});

test("la vista dividida y la lista única eligen modos distintos", () => {
  const base = {
    status: "all" as const,
    view: "split" as const,
    cohort: "all" as const,
    country: "",
    q: "",
    banned: "all" as const,
  };
  assert.equal(directoryListMode(base), "split");
  assert.equal(directoryListMode({ ...base, view: "single" }), "tiered");
  assert.equal(directoryListMode({ ...base, status: "active" }), "created");
});

test("el cursor sobrevive el viaje y rechaza basura", () => {
  const cursor: DirectoryPageCursor = {
    scope: "active",
    at: "2026-10-04T12:00:00.000Z",
    id: "abc",
  };
  assert.deepEqual(decodeDirectoryCursor(encodeDirectoryCursor(cursor)), cursor);
  assert.equal(decodeDirectoryCursor("no-es-json"), null);
  assert.equal(decodeDirectoryCursor(""), null);
});

test("cada tanda es de 100 y el id desempata la misma fecha", () => {
  assert.equal(DIRECTORY_PAGE_SIZE, 100);
  const createdAt = "2026-10-01T00:00:00.000Z";
  const rows = ["a", "c", "b"].map((id) => row(id, createdAt));
  const first = takeDirectoryPage(rows, {
    mode: "created",
    cursor: null,
    take: 2,
  });
  assert.deepEqual(
    first.rows.map((item) => item.id),
    ["c", "b"],
  );
  assert.ok(first.nextCursor);
  const second = takeDirectoryPage(rows, {
    mode: "created",
    cursor: first.nextCursor,
    take: 2,
  });
  assert.deepEqual(
    second.rows.map((item) => item.id),
    ["a"],
  );
  assert.equal(second.nextCursor, null);
});

test("la lista única pone activos, inactivos y salidos, de 100 en 100", () => {
  const rows: DirectorySortRow[] = [];
  for (let i = 0; i < 120; i++) {
    rows.push(row(`a${String(i).padStart(3, "0")}`, `2026-08-01T00:00:${String(i % 60).padStart(2, "0")}.000Z`, { active: true }));
  }
  for (let i = 0; i < 30; i++) {
    rows.push(
      row(`i${String(i).padStart(3, "0")}`, "2026-09-01T00:00:00.000Z", {
        active: false,
      }),
    );
  }
  rows.push(
    row("left-new", "2026-10-01T00:00:00.000Z", {
      active: false,
      leftAt: "2026-01-01T00:00:00.000Z",
    }),
  );
  rows.push(
    row("left-old", "2026-01-01T00:00:00.000Z", {
      active: true,
      leftAt: "2026-07-01T00:00:00.000Z",
    }),
  );

  const seen: string[] = [];
  let cursor: DirectoryPageCursor | null = null;
  for (let page = 0; page < 5; page++) {
    const slice: {
      rows: DirectorySortRow[];
      nextCursor: DirectoryPageCursor | null;
    } = takeDirectoryPage(rows, {
      mode: "tiered",
      cursor,
      take: 100,
    });
    seen.push(...slice.rows.map((item) => item.id));
    cursor = slice.nextCursor;
    if (!cursor) break;
  }
  assert.equal(seen.length, rows.length);
  assert.equal(new Set(seen).size, rows.length);
  assert.equal(cursor, null);
  assert.ok(seen.slice(0, 120).every((id) => id.startsWith("a")));
  assert.ok(seen.slice(120, 150).every((id) => id.startsWith("i")));
  assert.deepEqual(seen.slice(150), ["left-old", "left-new"]);
});

test("en la vista dividida cada columna pagina por su cuenta y los salidos van por alta", () => {
  const rows = [
    row("active", "2026-01-01T00:00:00.000Z", { active: true }),
    row("gone-recent-join", "2026-09-01T00:00:00.000Z", {
      leftAt: "2026-02-01T00:00:00.000Z",
    }),
    row("gone-old-join", "2026-03-01T00:00:00.000Z", {
      leftAt: "2026-08-01T00:00:00.000Z",
    }),
  ];
  const left = takeDirectoryPage(rows, {
    mode: "split",
    lane: "left",
    cursor: null,
    take: 10,
  });
  assert.deepEqual(
    left.rows.map((item) => item.id),
    ["gone-recent-join", "gone-old-join"],
  );
  const active = takeDirectoryPage(rows, {
    mode: "split",
    lane: "active",
    cursor: null,
    take: 10,
  });
  assert.deepEqual(
    active.rows.map((item) => item.id),
    ["active"],
  );
});

test("los conteos de inicio usan las cohortes de la lista", () => {
  const now = new Date("2026-10-04T12:00:00.000Z");
  assert.deepEqual(directoryHomeCountWhere("user-1", "active", now), {
    AND: [{ userId: "user-1" }, { active: true, leftAt: null }],
  });
  assert.deepEqual(directoryHomeCountWhere("user-1", "inactive", now), {
    AND: [{ userId: "user-1" }, { active: false, leftAt: null }],
  });
  assert.deepEqual(directoryHomeCountWhere("user-1", "absent", now), {
    AND: [{ userId: "user-1" }, { absentWithCause: true, leftAt: null }],
  });
  assert.deepEqual(directoryHomeCountWhere("user-1", "left", now), {
    AND: [{ userId: "user-1" }, { leftAt: { not: null } }],
  });
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - DIRECTORY_NEW_MEMBER_DAYS);
  assert.deepEqual(directoryHomeCountWhere("user-1", "new", now), {
    AND: [
      { userId: "user-1" },
      { createdAt: { gte: cutoff }, leftAt: null },
    ],
  });
});
