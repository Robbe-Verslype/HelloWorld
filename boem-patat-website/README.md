# Boem-Patat: website concept

Klikbaar concept van de nieuwe website van **Boem-Patat Springkastelen** (Wiekevorst), met een online reservatiesysteem en een beheerdashboard.

> **Concept zonder server.** Alle gegevens (producten, prijzen, reservaties) worden in de browser bewaard (`localStorage`). Zo kan je alles uittesten zonder backend. Voor livegang moet de opslag naar een echte database. Zie "Naar productie" hieronder.

## Pagina's

| Pagina | Wat |
|---|---|
| `index.html` | Homepage: hero met datumcheck, aanbod per categorie, werkwijze, prijzen, FAQ |
| `reserveren.html` | Reservatie in 5 stappen: datum → product → afhalen/levering + postcode → ondergrond → gegevens. Toont live de totaalprijs. |
| `dashboard.html` | Beheer: reservaties bevestigen, weigeren of aanpassen (met mailvoorbeeld), planning, producten en prijzen, instellingen |
| `privacy.html` | GDPR-privacyverklaring (concept) |

## Lokaal bekijken

Open `index.html` in je browser, of start een server:

```bash
npx serve .        # of: python3 -m http.server
```

Je kan het ook gratis online zetten via **GitHub Pages**: Settings → Pages → Deploy from branch → `main` / root.

## Wat de briefing vraagt en wat er gebouwd is

- ✅ Datumselectie. Enkel beschikbare producten zijn zichtbaar.
- ✅ Geen dubbele boekingen: voorraad per product en per dag, met een extra controle bij verzenden en bij bevestigen.
- ✅ Basisprijs = afhaalprijs. Afhalen ja/nee per product.
- ✅ Type springkasteel / stormbaan. Aantal delen per stormbaan.
- ✅ Afmetingen, gewicht en vrije ruimte per product (aanvullen via het dashboard).
- ✅ Levering: € 40 tot 10 km, daarna + € 2/km (afstand per postcode, aanpasbaar).
- ✅ Ondergrond verplicht kiezen. Verhard: + € 40 per springkasteel of per deel stormbaan.
- ✅ Reservaties komen binnen als *in afwachting*. Bevestigen, weigeren of aanpassen kan in het dashboard.
- ✅ Voorbeeld van de bevestigingsmail. Voorschot 30% (min. € 50), de rest bij levering of afhaling.
- ✅ Alle prijsregels aanpasbaar in het dashboard. Dagen blokkeren.
- ✅ Mobielvriendelijk, geen frameworks, snel.
- ⏳ Online betaling (Bancontact/Payconiq): bewust nog niet. Het voorschot gaat voorlopig via overschrijving.

## Foto's toevoegen

Plaats foto's in `img/` met de bestandsnamen uit `assets/data.js` (bv. `img/brandweer.jpg`, `img/hero.jpg`). Zolang een foto ontbreekt, toont de site automatisch een illustratie.

## Naar productie

1. Vervang `load()` / `save()` in `assets/store.js` door API-calls (bv. Supabase of een kleine Node-API).
2. Zet `dashboard.html` achter een login.
3. Verstuur de bevestigingsmail echt (bv. Resend / Postmark).
4. Optioneel: Mollie voor een online voorschot via Bancontact en Payconiq.
