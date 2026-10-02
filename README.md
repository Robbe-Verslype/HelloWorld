# Design-hoop

Portfolio waarop al je designs als thumbnails op één hoop vallen (met zwaartekracht).
Klik op een thumbnail om de case te lezen, sleep om ze rond te gooien.

Gebouwd met [Astro](https://astro.build) (website) en [Matter.js](https://brm.io/matter-js/) (physics).

## Lokaal draaien

```bash
npm install
npm run dev      # open http://localhost:4321
```

## Een nieuw design toevoegen

Maak een mapje in `src/content/designs/` en zet er je foto's in + (optioneel) één `.txt`-bestand.

```
src/content/designs/
  Bloom Festival/
    tekst.txt        ← je tekst (naam maakt niet uit, zolang het .txt is)
    cover.jpg        ← thumbnail op de hoop
    schets.jpg
    eindresultaat.png
```

- **Thumbnail:** de foto die `cover`, `thumbnail` of `thumb` heet. Anders de eerste foto op naam (tip: `01.jpg`, `02.jpg`, …).
- **URL:** komt uit de mapnaam: `Bloom Festival` → `/designs/bloom-festival/`.
- **Verbergen:** zet een `_` voor de mapnaam (`_Bloom Festival`).
- **Geen .txt?** Dan wordt de mapnaam de titel en verschijnen enkel de foto's.

### Het .txt-bestand

```
Bloom Festival
Jaar: 2026
Klant: Bloom vzw
Rol: Concept, ontwerp
Tags: branding, poster
Kleur: #ff5a36

--- De klant + opdracht
Uitleg over de klant en de vraag.

--- Manier van aanpak
Hoe je het aangepakt hebt.

# Een tussentitel
Meer tekst.

[schets.jpg]

--- Het resultaat
Het eindresultaat en wat je ervan geleerd hebt.

[eindresultaat.png]
```

- **Eerste regel** = titel.
- **Daarna** optioneel `Jaar:`, `Klant:`, `Rol:`, `Tags:` (komma's) en `Kleur:` (achtergrond van de case).
- `--- Titel` = start een **dropdown** op de case-pagina. Alles eronder (tot de volgende `---`) zit in die dropdown.
- `# Tekst` = tussentitel binnen een dropdown.
- `[foto.jpg]` op een eigen regel = die foto hoort bij die dropdown. Op een groot scherm staan de dropdowns links en alle foto's rechts (in dezelfde volgorde); op gsm staan de foto's onder de dropdowns.
- **Video's:** zet een link naar Google Drive, YouTube of Vimeo tussen haakjes op een eigen regel, bv. `[https://drive.google.com/file/d/…/view]`. Voor staande video's (reels) zet je er ` staand` achter: `[https://… staand]`. Bij Google Drive moet het bestand gedeeld zijn met **Iedereen met de link**.
- Foto's die je nergens plaatst, komen automatisch bij de andere foto's. De thumbnail (cover) staat enkel bovenaan, nooit nog eens in de lijst.

Foto's worden bij het bouwen automatisch verkleind en omgezet naar webp.

## Online zetten op Hostinger

De site is na `npm run build` gewoon een map met HTML, CSS en foto's (`dist/`). Die kan op elk Hostinger-webhostingpakket.

**Automatisch (aangeraden):** de workflow `.github/workflows/deploy-hostinger.yml` bouwt de site en uploadt ze via FTP naar `public_html` bij elke push naar `main`.
1. hPanel → **Bestanden → FTP-accounts**: noteer server, gebruikersnaam en wachtwoord.
2. GitHub repo → **Settings → Secrets and variables → Actions** → voeg `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` toe.
3. Push naar `main` (of start de workflow manueel bij **Actions**).

**Manueel:** `npm run build` en upload de *inhoud* van `dist/` naar `public_html` via hPanel → Bestandsbeheer.

## Waar zit wat

| Bestand | Wat |
| --- | --- |
| `src/content/designs/` | Je "databank": één map per design |
| `src/lib/designs.ts` | Leest de mapjes en .txt-bestanden in |
| `src/pages/index.astro` | Homepage met de hoop |
| `src/scripts/gravity.ts` | Zwaartekracht, slepen, klikken |
| `src/pages/designs/[slug].astro` | Template van de case-pagina |
| `src/layouts/Base.astro` | Kleuren, lettertype, gedeelde HTML |
