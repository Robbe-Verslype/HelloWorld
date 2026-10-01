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

1. Maak een map in `src/content/designs/`, bv. `src/content/designs/mijn-nieuw-project/`
   (de mapnaam wordt de URL: `/designs/mijn-nieuw-project/`).
2. Zet je foto's in die map, minstens een `thumbnail.jpg`.
3. Maak een `index.md` in die map:

```md
---
title: "Mijn nieuw project"
year: 2026
client: "Naam klant"        # optioneel
role: "Concept, ontwerp"    # optioneel
tags: ["branding", "print"]
thumbnail: ./thumbnail.jpg
color: "#ff5a36"            # achtergrondkleur van de case
draft: false                # true = verbergen
---

## De vraag
Je tekst...

![Bijschrift](./schets.jpg)
```

Dat is alles: het design valt automatisch mee op de hoop en krijgt een eigen pagina.
Foto's worden automatisch verkleind en omgezet naar webp.

## Waar zit wat

| Bestand | Wat |
| --- | --- |
| `src/content.config.ts` | Welke velden een design heeft |
| `src/content/designs/` | Je "databank": één map per design |
| `src/pages/index.astro` | Homepage met de hoop |
| `src/scripts/gravity.ts` | Zwaartekracht, slepen, klikken |
| `src/pages/designs/[slug].astro` | Template van de case-pagina |
| `src/layouts/Base.astro` | Kleuren, lettertype, gedeelde HTML |
