"use client";

import { useState } from "react";
import { LABEL_CLASS } from "./styles";

/**
 * Colour swatch + live hex readout for the Theme tab.
 *
 * A client component purely so the hex text tracks the swatch. It was server-rendered next to
 * the input before, which meant the text still showed the old value after picking a colour —
 * and, more importantly, after "Restore Defaults" repopulated the field, leaving the page
 * claiming one colour while the swatch showed another.
 */
export function ColorField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string;
}) {
  const [color, setColor] = useState(value);

  return (
    <div className="space-y-2">
      <label className={LABEL_CLASS} htmlFor={name}>
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={name}
          name={name}
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-11 w-16 cursor-pointer rounded-lg border border-white/10 bg-white/5"
        />
        <span className="font-mono text-xs text-zinc-500">{color}</span>
      </div>
    </div>
  );
}
