import type { ImageMetadata } from 'astro';

/*
 * De "databank": elke map in src/content/designs/ is één design.
 * In die map staat één .txt-bestand met de tekst, de rest zijn foto's.
 * Mappen die met "_" beginnen worden overgeslagen (handig voor concepten).
 */

const imageFiles = import.meta.glob<ImageMetadata>(
  '/src/content/designs/*/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,avif,AVIF,gif,GIF}',
  { eager: true, import: 'default' },
);
const textFiles = import.meta.glob<string>('/src/content/designs/*/*.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
});

export interface Photo {
  name: string;
  /** Pad in het project, bv. /src/content/designs/x/cover.jpg */
  path: string;
  image: ImageMetadata;
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'photo'; photo: Photo };

export interface Design {
  slug: string;
  title: string;
  year?: number;
  client?: string;
  role?: string;
  tags: string[];
  color: string;
  /** Optioneel: vaste kleur voor het titelstrookje op de hoop */
  captionColor?: string;
  thumbnail: Photo;
  /** Tekst met eventueel foto's ertussen ([naam.jpg]) */
  blocks: Block[];
  /** Foto's die niet in de tekst geplaatst zijn: komen onderaan */
  gallery: Photo[];
}

// Woorden die je bovenaan het .txt-bestand mag gebruiken
type Key = 'year' | 'client' | 'role' | 'tags' | 'color' | 'captionColor';
const KEYS: Record<string, Key> = {
  jaar: 'year',
  year: 'year',
  klant: 'client',
  client: 'client',
  rol: 'role',
  role: 'role',
  tags: 'tags',
  kleur: 'color',
  color: 'color',
  titelkleur: 'captionColor',
};

const folderOf = (path: string) => path.split('/').at(-2)!;
const fileOf = (path: string) => path.split('/').at(-1)!;
const sortNatural = (a: string, b: string) =>
  a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' });

function hex(value?: string) {
  if (!value || !/^#?[0-9a-f]{3,8}$/i.test(value)) return undefined;
  return value.startsWith('#') ? value : `#${value}`;
}

function prettify(slug: string) {
  const s = slug.replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Mapnaam → nette URL, bv. "Bloom Festival 2026" → "bloom-festival-2026" */
function slugify(folder: string) {
  return folder
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildDesign(folder: string): Design | null {
  const slug = slugify(folder);
  const photos: Photo[] = Object.entries(imageFiles)
    .filter(([path]) => folderOf(path) === folder)
    .map(([path, image]) => ({ name: fileOf(path), path, image }))
    .sort((a, b) => sortNatural(a.name, b.name));
  if (!photos.length) return null;

  const txtPath = Object.keys(textFiles)
    .filter((path) => folderOf(path) === folder)
    .sort(sortNatural)[0];
  const raw = (txtPath ? textFiles[txtPath] : '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = raw.split('\n');

  // 1. Eerste niet-lege regel = titel
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  const title = lines[i]?.trim() || prettify(folder);
  i++;

  // 2. Daarna "Sleutel: waarde"-regels (Jaar, Klant, Rol, Tags, Kleur)
  const meta: Partial<Record<Key, string>> = {};
  for (; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const m = line.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
    const key = m && KEYS[m[1].toLowerCase()];
    if (!key) break;
    meta[key] = m![2].trim();
  }

  // 3. De rest is het verhaal
  const byName = new Map(photos.map((p) => [p.name.toLowerCase(), p]));
  const thumbnail =
    photos.find((p) => /^(thumbnail|thumb|cover)\./i.test(p.name)) ?? photos[0];
  const used = new Set<Photo>([thumbnail]);

  const blocks: Block[] = [];
  const chunks = lines.slice(i).join('\n').split(/\n\s*\n/);
  for (const chunk of chunks) {
    let text = chunk.trim();
    if (!text) continue;
    // "# Titel" mag meteen gevolgd worden door tekst, zonder witregel
    if (text.startsWith('#')) {
      const [first, ...rest] = text.split('\n');
      blocks.push({ type: 'heading', text: first.replace(/^#+\s*/, '') });
      text = rest.join('\n').trim();
      if (!text) continue;
    }
    const photoRef = text.match(/^\[(.+)\]$/);
    const photo = photoRef && byName.get(photoRef[1].trim().toLowerCase());
    if (photo) {
      blocks.push({ type: 'photo', photo });
      used.add(photo);
    } else {
      blocks.push({ type: 'paragraph', lines: text.split('\n').map((l) => l.trim()) });
    }
  }

  const year = meta.year ? parseInt(meta.year, 10) : undefined;
  return {
    slug,
    title,
    year: Number.isFinite(year) ? year : undefined,
    client: meta.client,
    role: meta.role,
    tags: meta.tags ? meta.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    color: hex(meta.color) ?? '#f1efe9',
    captionColor: hex(meta.captionColor),
    thumbnail,
    blocks,
    gallery: photos.filter((p) => !used.has(p)),
  };
}

export function getDesigns(): Design[] {
  const folders = new Set(Object.keys(imageFiles).map(folderOf));
  return [...folders]
    .filter((folder) => !folder.startsWith('_'))
    .map(buildDesign)
    .filter((d): d is Design => d !== null)
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || sortNatural(a.title, b.title));
}
