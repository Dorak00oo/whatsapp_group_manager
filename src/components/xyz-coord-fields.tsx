"use client";

import type { ClipboardEvent, ChangeEvent } from "react";
import { splitPastedCoords } from "@/lib/xyz-coords";

export type XyzCoordValues = { x: string; y: string; z: string };

const AXES = ["x", "y", "z"] as const;
const AXIS_LABEL: Record<(typeof AXES)[number], string> = {
  x: "X",
  y: "Y",
  z: "Z",
};

type Props = {
  values: XyzCoordValues;
  onChange: (next: XyzCoordValues) => void;
  idPrefix: string;
  placeholders?: XyzCoordValues;
  inputClassName: string;
  disabled?: boolean;
};

export function XyzCoordFields({
  values,
  onChange,
  idPrefix,
  placeholders = { x: "", y: "", z: "" },
  inputClassName,
  disabled,
}: Props) {
  function applyTriplet(text: string): boolean {
    const split = splitPastedCoords(text);
    if (!split) return false;
    onChange({ x: split[0], y: split[1], z: split[2] });
    return true;
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    if (applyTriplet(e.clipboardData.getData("text"))) {
      e.preventDefault();
    }
  }

  function onAxisChange(
    axis: (typeof AXES)[number],
    e: ChangeEvent<HTMLInputElement>,
  ) {
    const next = e.target.value;
    if (axis === "x" && applyTriplet(next)) return;
    onChange({ ...values, [axis]: next });
  }

  return (
    <div className="grid w-full grid-cols-3 gap-3">
      {AXES.map((axis) => (
        <div key={axis} className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor={`${idPrefix}-${axis}`}
            className="text-xs font-medium leading-none text-zinc-700 dark:text-zinc-300"
          >
            {AXIS_LABEL[axis]}
          </label>
          <input
            id={`${idPrefix}-${axis}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            disabled={disabled}
            placeholder={placeholders[axis]}
            value={values[axis]}
            onPaste={onPaste}
            onChange={(e) => onAxisChange(axis, e)}
            className={`w-full min-w-0 ${inputClassName}`}
          />
        </div>
      ))}
    </div>
  );
}
