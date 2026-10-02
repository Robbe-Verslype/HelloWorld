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
  image: ImageMetadata;
}

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'photo'; photo: Photo }
  | { type: 'video'; embed: string; vertical: boolean; kind: 'reel' | 'post' | 'video' };

/**
 * Link naar een video (Google Drive, YouTube of Vimeo) → adres om in de pagina te tonen.
 * Geeft undefined terug als het geen herkende videolink is.
 */
function videoEmbed(url: string): string | undefined {
  let m = url.match(/instagram\.com\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/);
  if (m) return `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed`;
  m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
  if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
  m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return undefined;
}

/** Foto's en video's samen: alles wat in de beeldkolom komt. */
export const isMedia = (b: Block): b is Extract<Block, { type: 'photo' | 'video' }> =>
  b.type === 'photo' || b.type === 'video';

export interface Section {
  title: string;
  blocks: Block[];
}

export interface Design {
  slug: string;
  title: string;
  year?: number;
  client?: string;
  role?: string;
  tags: string[];
  color: string;
  thumbnail: Photo;
  /** Tekst vóór de eerste dropdown (optioneel) */
  blocks: Block[];
  /** Dropdowns: elke "--- Titel"-regel start er een */
  sections: Section[];
  /** Foto's die niet in de tekst geplaatst zijn: komen onderaan */
  gallery: Photo[];
}

// Woorden die je bovenaan het .txt-bestand mag gebruiken
const KEYS: Record<string, 'year' | 'client' | 'role' | 'tags' | 'color'> = {
  jaar: 'year',
  year: 'year',
  klant: 'client',
  client: 'client',
  rol: 'role',
  role: 'role',
  tags: 'tags',
  kleur: 'color',
  color: 'color',
};

const folderOf = (path: string) => path.split('/').at(-2)!;
const fileOf = (path: string) => path.split('/').at(-1)!;
const sortNatural = (a: string, b: string) =>
  a.localeCompare(b, 'nl', { numeric: true, sensitivity: 'base' });

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
    .map(([path, image]) => ({ name: fileOf(path), image }))
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
  const meta: Partial<Record<'year' | 'client' | 'role' | 'tags' | 'color', string>> = {};
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
  const sections: Section[] = [];
  // Blokken komen in de laatst geopende dropdown, of vóór de dropdowns
  const target = () => sections.at(-1)?.blocks ?? blocks;
  const chunks = lines.slice(i).join('\n').split(/\n\s*\n/);
  for (const chunk of chunks) {
    let text = chunk.trim();
    if (!text) continue;
    // "--- Titel" start een nieuwe dropdown (tekst mag er meteen onder staan)
    if (text.startsWith('---')) {
      const [first, ...rest] = text.split('\n');
      sections.push({ title: first.replace(/^-+\s*/, '').trim(), blocks: [] });
      text = rest.join('\n').trim();
      if (!text) continue;
    }
    // "# Titel" mag meteen gevolgd worden door tekst, zonder witregel
    if (text.startsWith('#')) {
      const [first, ...rest] = text.split('\n');
      target().push({ type: 'heading', text: first.replace(/^#+\s*/, '') });
      text = rest.join('\n').trim();
      if (!text) continue;
    }
    const photoRef = text.match(/^\[(.+)\]$/);
    const photo = photoRef && byName.get(photoRef[1].trim().toLowerCase());
    // [https://videolink] of [https://videolink staand] (voor reels / verticale video's)
    const videoRef = photoRef && photoRef[1].trim().match(/^(https?:\/\/\S+)(?:\s+(staand|liggend))?$/i);
    const embed = videoRef && videoEmbed(videoRef[1]);
    if (embed) {
      const url = videoRef![1];
      const kind = /instagram\.com\/(?:[\w.]+\/)?p\//.test(url) ? 'post' : /instagram\.com\/(?:[\w.]+\/)?(reels?|tv)\//.test(url) ? 'reel' : 'video';
      // Een Instagram-link met /p/ kan ook een reel zijn: met "staand" tonen we hem als reel
      const kindFinal = kind === 'post' && videoRef![2]?.toLowerCase() === 'staand' ? 'reel' : kind;
      const vertical =
        kindFinal === 'reel' || videoRef![2]?.toLowerCase() === 'staand' || /youtube\.com\/shorts\//.test(url);
      target().push({ type: 'video', embed, vertical, kind: kindFinal });
    } else if (photo) {
      target().push({ type: 'photo', photo });
      used.add(photo);
    } else {
      target().push({ type: 'paragraph', lines: text.split('\n').map((l) => l.trim()) });
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
    color: meta.color && /^#?[0-9a-f]{3,8}$/i.test(meta.color)
      ? (meta.color.startsWith('#') ? meta.color : `#${meta.color}`)
      : '#f1efe9',
    thumbnail,
    blocks,
    sections,
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
