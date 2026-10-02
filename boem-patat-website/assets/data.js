/*
 * Boem-Patat — standaarddata (concept)
 * Alles hieronder is aanpasbaar via het dashboard (dashboard.html).
 * Prijzen komen van de huidige website (boem-patat.be). Velden met `null`
 * zijn nog niet gekend en worden op de site gewoon verborgen.
 *
 * Foto's: plaats een foto in /img met exact de bestandsnaam uit `img`.
 * Zolang die ontbreekt, toont de site automatisch een illustratie.
 */
window.BP_DEFAULTS = {
  business: {
    name: "Boem-Patat",
    owners: "Jo & Ina",
    street: "Advokatestraat 5",
    city: "2222 Wiekevorst",
    phone: "0476 89 43 58",
    phoneHref: "+32476894358",
    email: "info@boem-patat.be",
    vat: "BE 0507.976.726",
    regions: ["Wiekevorst", "Heist-op-den-Berg", "Herentals", "Schilde", "Westerlo", "Nijlen", "Lier", "Herenthout"]
  },

  // Prijsregels uit de briefing
  settings: {
    deliveryBase: 40,      // € voor 0 – 10 km
    deliveryFreeKm: 10,    // km inbegrepen in de basisprijs
    deliveryPerKm: 2,      // € per km vanaf km 11
    hardSurface: 40,       // € per springkasteel of per deel stormbaan
    depositPct: 30,        // % voorschot
    depositMin: 50,        // minimum voorschot in €
    blockedDates: []       // "YYYY-MM-DD" — dagen dat er niet verhuurd wordt
  },

  categories: [
    { id: "springkasteel", label: "Springkastelen", icon: "🏰" },
    { id: "stormbaan", label: "Stormbanen", icon: "🏁" },
    { id: "attractie", label: "Attracties", icon: "🤠" },
    { id: "gokart", label: "Go-karts", icon: "🏎️" },
    { id: "feest", label: "Feestmateriaal", icon: "🪑" }
  ],

  /*
   * type:      springkasteel | stormbaan | attractie | gokart | feest
   * price:     dagprijs = AFHAALPRIJS (basisprijs)
   * price2:    prijs weekend / 2 dagen (null = niet mogelijk)
   * pickup:    afhalen toegestaan?
   * parts:     aantal delen (stormbanen) → toeslag verharde ondergrond per deel
   * surface:   ondergrond-keuze nodig (opblaasbare attracties)
   * stock:     aantal stuks beschikbaar (feestmateriaal / losse go-karts)
   */
  products: [
    // ── Springkastelen ──────────────────────────────────────────
    { id: "slide-flamingo", name: "Slide Flamingo", type: "springkasteel", price: 100, price2: 140, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 8 jaar", size: null, weight: null, space: null, img: "img/slide-flamingo.jpg", color: "#ff7eb6", popular: false, desc: "Vrolijk roze springkasteel met glijbaan. Ideaal voor een kleine tuin." },
    { id: "unicorn-box", name: "Unicorn Box", type: "springkasteel", price: 100, price2: 140, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 8 jaar", size: null, weight: null, space: null, img: "img/unicorn-box.jpg", color: "#b18cff", popular: true, desc: "Een magisch eenhoorn-springkasteel. Altijd een hit op verjaardagsfeestjes." },
    { id: "jurassic-world", name: "Jurassic World Bounce", type: "springkasteel", price: 105, price2: 145, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 10 jaar", size: null, weight: null, space: null, img: "img/jurassic-world.jpg", color: "#4cae4f", popular: false, desc: "Springen tussen de dinosaurussen." },
    { id: "kidspark-circus", name: "Kidspark Circus + ballen", type: "springkasteel", price: 120, price2: 170, pickup: true, surface: true, parts: 1, stock: 1, age: "2 – 8 jaar", size: null, weight: null, space: null, img: "img/kidspark-circus.jpg", color: "#ff5a4e", popular: false, desc: "Circus-speelpark met ballenbad. Ook leuk voor de allerkleinsten." },
    { id: "combifun-flamingo", name: "Combifun Flamingo", type: "springkasteel", price: 120, price2: 170, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 10 jaar", size: null, weight: null, space: null, img: "img/combifun-flamingo.jpg", color: "#ff8fa3", popular: false, desc: "Springen, klimmen en glijden in één." },
    { id: "krokodil", name: "Krokodil", type: "springkasteel", price: 130, price2: 180, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 12 jaar", size: null, weight: null, space: null, img: "img/krokodil.jpg", color: "#2e9e5b", popular: false, desc: "Durf jij in de bek van de krokodil te springen?" },
    { id: "dino-world", name: "Dino World", type: "springkasteel", price: 135, price2: 190, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 12 jaar", size: null, weight: null, space: null, img: "img/dino-world.jpg", color: "#7cb342", popular: true, desc: "Een volledige dinowereld om in rond te springen." },
    { id: "brandweer", name: "Brandweer", type: "springkasteel", price: 145, price2: 205, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 12 jaar", size: null, weight: null, space: null, img: "img/brandweer.jpg", color: "#e53935", popular: true, desc: "Voor kleine brandweerhelden. Springen, klimmen en glijden." },
    { id: "legerbasis", name: "Legerbasis", type: "springkasteel", price: 150, price2: 210, pickup: true, surface: true, parts: 1, stock: 1, age: "4 – 12 jaar", size: null, weight: null, space: null, img: "img/legerbasis.jpg", color: "#6d7c3a", popular: false, desc: "Avontuurlijk springkasteel in legerthema." },
    { id: "boerderij", name: "Boerderij", type: "springkasteel", price: 155, price2: 215, pickup: true, surface: true, parts: 1, stock: 1, age: "3 – 10 jaar", size: null, weight: null, space: null, img: "img/boerderij.jpg", color: "#f4a623", popular: false, desc: "Springplezier op de boerderij, met dieren en een glijbaan." },
    { id: "super-dino", name: "Super Dino", type: "springkasteel", price: 170, price2: 240, pickup: true, surface: true, parts: 1, stock: 1, age: "4 – 14 jaar", size: null, weight: null, space: null, img: "img/super-dino.jpg", color: "#43a047", popular: false, desc: "Ons grootste dino-springkasteel." },

    // ── Stormbanen ──────────────────────────────────────────────
    { id: "dino-run-14", name: "Dino Run 14 m", type: "stormbaan", price: 280, price2: 390, pickup: false, surface: true, parts: 2, stock: 1, age: "5 – 99 jaar", size: "14 m lang", weight: null, space: null, img: "img/dino-run-14.jpg", color: "#689f38", popular: false, desc: "Stormbaan van 14 meter vol hindernissen." },
    { id: "graffity-run-14", name: "Graffity Run 14 m", type: "stormbaan", price: 290, price2: 405, pickup: false, surface: true, parts: 2, stock: 1, age: "5 – 99 jaar", size: "14 m lang", weight: null, space: null, img: "img/graffity-run-14.jpg", color: "#ffb300", popular: true, desc: "Kleurrijke graffiti-stormbaan. Wie is het snelst?" },
    { id: "dino-extreme-18", name: "Dino Extreme Run 18 m", type: "stormbaan", price: 350, price2: 490, pickup: false, surface: true, parts: 3, stock: 1, age: "6 – 99 jaar", size: "18 m lang", weight: null, space: null, img: "img/dino-extreme-18.jpg", color: "#558b2f", popular: false, desc: "Extreme versie met extra hindernissen." },
    { id: "dino-run-20", name: "Dino Run 20 m", type: "stormbaan", price: 400, price2: 560, pickup: false, surface: true, parts: 3, stock: 1, age: "6 – 99 jaar", size: "20 m lang", weight: null, space: null, img: "img/dino-run-20.jpg", color: "#33691e", popular: false, desc: "Onze langste stormbaan. Ideaal voor jeugdbewegingen en evenementen." },

    // ── Attracties ──────────────────────────────────────────────
    { id: "rodeostier", name: "Rodeostier", type: "attractie", price: 395, price2: null, pickup: false, surface: true, parts: 1, stock: 1, age: "6 – 99 jaar", size: null, weight: null, space: null, img: "img/rodeostier.jpg", color: "#8d5524", popular: false, desc: "Mechanische rodeostier met opblaasbare valmat. Hoe lang blijf jij zitten?" },

    // ── Go-karts ────────────────────────────────────────────────
    { id: "gokart-racebaan", name: "Racebaan + 5 go-karts", type: "gokart", price: 300, price2: 420, pickup: false, surface: false, parts: 1, stock: 1, age: "3 – 99 jaar", size: null, weight: null, space: null, img: "img/gokart-racebaan.jpg", color: "#1e88e5", popular: true, desc: "Compleet circuit met 5 trap-go-karts." },
    { id: "gokart-klein", name: "Go-kart klein", type: "gokart", price: 30, price2: 50, pickup: true, surface: false, parts: 1, stock: 5, age: "3 – 8 jaar", size: null, weight: null, space: null, img: "img/gokart-klein.jpg", color: "#29b6f6", popular: false, desc: "Losse trap-go-kart voor kinderen. Woensdagnamiddag €20." },
    { id: "gokart-groot", name: "Go-kart groot", type: "gokart", price: 60, price2: 80, pickup: true, surface: false, parts: 1, stock: 5, age: "7 – 99 jaar", size: null, weight: null, space: null, img: "img/gokart-groot.jpg", color: "#1565c0", popular: false, desc: "Losse trap-go-kart, ook voor volwassenen. Woensdagnamiddag €40." },

    // ── Feestmateriaal ──────────────────────────────────────────
    { id: "klaptafel", name: "Klaptafel 122 cm", type: "feest", price: 5, price2: 7, pickup: true, surface: false, parts: 1, stock: 30, age: null, size: "122 cm", weight: null, space: null, img: "img/klaptafel.jpg", color: "#8d6e63", popular: false, desc: "Stevige klaptafel." },
    { id: "klapstoel-comfort", name: "Klapstoel comfort wit", type: "feest", price: 3.5, price2: 5, pickup: true, surface: false, parts: 1, stock: 100, age: null, size: null, weight: null, space: null, img: "img/klapstoel-comfort.jpg", color: "#90a4ae", popular: false, desc: "Comfortabele witte klapstoel." },
    { id: "klapstoel-zwart", name: "Klapstoel standaard zwart", type: "feest", price: 1, price2: 1.3, pickup: true, surface: false, parts: 1, stock: 100, age: null, size: null, weight: null, space: null, img: "img/klapstoel-zwart.jpg", color: "#455a64", popular: false, desc: "Eenvoudige zwarte klapstoel." }
  ],

  /*
   * Geschatte rijafstand (km) vanaf Wiekevorst per postcode.
   * Aanpasbaar in het dashboard. Onbekende postcode → prijs op aanvraag.
   */
  postcodes: {
    "2222": 0, "2220": 5, "2221": 9, "2223": 6, "2260": 10, "2270": 8, "2560": 10,
    "2288": 10, "2230": 12, "2250": 13, "2280": 13, "2590": 12, "2200": 14,
    "2290": 14, "2240": 15, "2580": 16, "3130": 15, "3128": 16, "2500": 18,
    "3140": 19, "2275": 17, "2980": 22, "2440": 22, "3200": 24, "2570": 23,
    "2160": 27, "2970": 26, "3150": 26, "2400": 32, "2800": 28, "2390": 26
  }
};
