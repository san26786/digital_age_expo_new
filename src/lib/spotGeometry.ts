/**
 * ---------------------------------------------------------------------------
 * Percentage geometry for one `find_event_lobby_spots` row.
 * ---------------------------------------------------------------------------
 *
 * The legacy renders every spot as an inline percentage style, e.g. the Ted Talk auditorium's
 * two session panels:
 *
 *   left: 13.09817589124%;  top: 2.4074077606201%; width: 35.833334922791%; height: 35.138889595314%
 *   left: 51.484372615814%; top: 2.3133680555556%; width: 35.729165871938%; height: 35.138889595314%
 *
 * Those numbers live in the DATABASE, per spot, and are what the organiser drags around in Lobby
 * Spots. Reproducing them is the only way a hall's screens land where the artwork's frame is —
 * a hardcoded box can only ever be right for one render.
 *
 * Shared rather than copied: the zone scene and the auditorium both need it, and this project has
 * already been bitten twice by a second copy of a resolver drifting from the first.
 */

export interface SpotBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Radians — the legacy writes `transform: rotate(<angle>rad)` straight from this. */
  angle: number;
}

/**
 * @param fallbackWidth  used only when no source supplies a usable width. Callers differ: an
 *                       exhibitor banner is small, an agenda panel fills a third of the wall, so
 *                       a single shared default would be wrong for one of them.
 */
export function spotGeometry(spot: any, fallbackWidth: number, fallbackHeight: number): SpotBox {
  let blob: any = null;
  if (typeof spot?.dimension === "string" && spot.dimension.trim() !== "") {
    try {
      blob = JSON.parse(spot.dimension);
    } catch {
      blob = null;
    }
  } else if (spot?.dimension && typeof spot.dimension === "object") {
    blob = spot.dimension;
  }

  /* Width/height: a 0 means "not set", so it falls through to the next source. The `dimension`
     blob wins because the designer writes both and the blob is the pair it round-trips. */
  const size = (...candidates: unknown[]): number | null => {
    for (const c of candidates) {
      if (c === null || c === undefined || c === "") continue;
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };

  /* x/y: a 0 is LEGITIMATE — a panel flush to the left or top edge — so zero must survive here
     where it is rejected above. Conflating the two is what collapses a flush spot to a default. */
  const coord = (...candidates: unknown[]): number => {
    for (const c of candidates) {
      if (c === null || c === undefined || c === "") continue;
      const n = Number(c);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  };

  const angle = Number(blob?.angle);

  return {
    x: coord(blob?.x, spot?.x_coordinates),
    y: coord(blob?.y, spot?.y_coordinates),
    width: size(blob?.width, spot?.width, spot?.block_width) ?? fallbackWidth,
    height: size(blob?.height, spot?.height, spot?.block_height) ?? fallbackHeight,
    angle: Number.isFinite(angle) ? angle : 0,
  };
}
