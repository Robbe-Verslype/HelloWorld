import path from 'node:path';
import sharp from 'sharp';

/*
 * Haalt bij het bouwen de contour uit een foto met transparante achtergrond.
 * Zo kan een thumbnail (zoals het truitje) de vorm van het ontwerp volgen
 * in plaats van een rechthoek te zijn.
 */

/** Resolutie waarop de contour gezocht wordt (in px, langste zijde). */
const GRID = 140;
/** Hoe sterk de contour vereenvoudigd wordt (in rasterpixels). */
const SIMPLIFY = 1.2;

export interface Outline {
  /** Deel van de foto dat het ontwerp bevat (0–1): links, boven, breedte, hoogte */
  crop: { x: number; y: number; w: number; h: number };
  /** Breedte / hoogte van dat deel */
  ratio: number;
  /** Contourpunten, 0–1 binnen het bijgesneden deel */
  points: [number, number][];
}

export async function getOutline(file: string): Promise<Outline | null> {
  const src = sharp(path.join(process.cwd(), file));
  const meta = await src.metadata();
  if (!meta.hasAlpha || !meta.width || !meta.height) return null;

  // Alfakanaal op lage resolutie
  const scale = GRID / Math.max(meta.width, meta.height);
  const gw = Math.max(1, Math.round(meta.width * scale));
  const gh = Math.max(1, Math.round(meta.height * scale));
  const { data } = await sharp(path.join(process.cwd(), file))
    .extractChannel(3)
    .resize(gw, gh, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < gw && y < gh && data[y * gw + x] > 127;

  // Pas de moeite waard als een flink deel transparant is
  let count = 0;
  for (const v of data) if (v > 127) count++;
  if (count === 0 || count / data.length > 0.9) return null;

  const contour = traceLargest(filled, gw, gh);
  if (contour.length < 8) return null;
  const simple = simplify(contour, SIMPLIFY);

  // Kaderen op de contour zelf, zodat contour en element exact samenvallen
  const xs = simple.map((p) => p[0]);
  const ys = simple.map((p) => p[1]);
  const minX = Math.min(...xs) - 0.5;
  const maxX = Math.max(...xs) + 0.5;
  const minY = Math.min(...ys) - 0.5;
  const maxY = Math.max(...ys) + 0.5;
  const bw = maxX - minX;
  const bh = maxY - minY;

  return {
    crop: { x: minX / gw, y: minY / gh, w: bw / gw, h: bh / gh },
    ratio: (bw / gw) * meta.width / ((bh / gh) * meta.height),
    points: simple.map(([x, y]) => [round((x - minX) / bw), round((y - minY) / bh)]),
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Buitenrand van de grootste gevulde vorm (Moore-neighbour tracing), als pixelcentra. */
function traceLargest(filled: (x: number, y: number) => boolean, gw: number, gh: number) {
  // Grootste aaneengesloten vorm zoeken
  const label = new Int32Array(gw * gh);
  let best = { id: 0, size: 0, start: [0, 0] as [number, number] };
  let id = 0;
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (!filled(x, y) || label[y * gw + x]) continue;
      id++;
      let size = 0;
      const stack = [[x, y]];
      label[y * gw + x] = id;
      while (stack.length) {
        const [cx, cy] = stack.pop()!;
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (filled(nx, ny) && !label[ny * gw + nx]) {
            label[ny * gw + nx] = id;
            stack.push([nx, ny]);
          }
        }
      }
      // Eerste pixel (bovenaan, links) van deze vorm is het startpunt
      if (size > best.size) best = { id, size, start: [x, y] };
    }
  }
  const inShape = (x: number, y: number) => x >= 0 && y >= 0 && x < gw && y < gh && label[y * gw + x] === best.id;

  // Buren met de klok mee, beginnend links
  const dirs = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
  const start = best.start;
  const out: [number, number][] = [start];
  let cur = start;
  let back = 0; // we kwamen "van links" binnen
  for (let guard = 0; guard < gw * gh * 4; guard++) {
    let found = -1;
    for (let i = 1; i <= 8; i++) {
      const d = (back + i) % 8;
      if (inShape(cur[0] + dirs[d][0], cur[1] + dirs[d][1])) {
        found = d;
        break;
      }
    }
    if (found < 0) break; // losse pixel
    const next: [number, number] = [cur[0] + dirs[found][0], cur[1] + dirs[found][1]];
    // Terug bij de start: klaar
    if (next[0] === start[0] && next[1] === start[1] && out.length > 2) break;
    out.push(next);
    cur = next;
    back = (found + 4) % 8; // richting van de pixel waar we vandaan kwamen; daarvandaan verder zoeken
  }
  return out;
}

/** Ramer–Douglas–Peucker op een gesloten vorm. */
function simplify(points: [number, number][], eps: number): [number, number][] {
  const rdp = (pts: [number, number][]): [number, number][] => {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    let maxD = 0;
    let idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distToSegment(pts[i], a, b);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD <= eps) return [a, b];
    return [...rdp(pts.slice(0, idx + 1)).slice(0, -1), ...rdp(pts.slice(idx))];
  };
  // Gesloten vorm: splitsen op het verste punt van de start
  let far = 0;
  let farD = 0;
  points.forEach((p, i) => {
    const d = Math.hypot(p[0] - points[0][0], p[1] - points[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  });
  const first = rdp(points.slice(0, far + 1));
  const second = rdp([...points.slice(far), points[0]]);
  return [...first.slice(0, -1), ...second.slice(0, -1)];
}

function distToSegment(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
