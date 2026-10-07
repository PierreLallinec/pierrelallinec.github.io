import { sortKey } from './format';

export interface Box {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Position d'une date sur un axe en années : 2020.5 pour le 2 juillet 2020. */
export function decimalYear(date: string): number {
  const [year, month, day] = sortKey(date).split('-').map(Number);
  const start = Date.UTC(year, 0, 1);
  const length = Date.UTC(year + 1, 0, 1) - start;
  return year + (Date.UTC(year, month - 1, day) - start) / length;
}

/**
 * Place des points dans un cadre SVG. `x` croît vers la droite.
 * Le plus petit `y` (le temps le plus rapide) est en haut : progresser, c'est monter.
 */
export function plot(points: { x: number; y: number }[], box: Box): { px: number; py: number }[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const [left, right, top, bottom] = [box.left, box.width - box.right, box.top, box.height - box.bottom];
  const round = (n: number) => Math.round(n * 10) / 10;
  return points.map((p) => ({
    px: round(x1 === x0 ? (left + right) / 2 : left + ((p.x - x0) / (x1 - x0)) * (right - left)),
    py: round(y1 === y0 ? (top + bottom) / 2 : top + ((p.y - y0) / (y1 - y0)) * (bottom - top)),
  }));
}
