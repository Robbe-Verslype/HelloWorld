/*
 * Boem-Patat — gedeelde logica (concept zonder server)
 * Data wordt bewaard in localStorage van de browser. In productie vervang je
 * load()/save() door API-calls naar een echte database.
 */
(function () {
  const KEY = "bp_state_v1";
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.products && s.settings) return s;
      }
    } catch (e) { /* localStorage niet beschikbaar */ }
    const s = clone(window.BP_DEFAULTS);
    s.reservations = demoReservations();
    for (const r of s.reservations) { const q = quote(s, r); r.total = q.total; r.deposit = q.deposit; }
    return s;
  }

  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    return load();
  }

  // ── Datums ─────────────────────────────────────────────────
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const range = (date, days) => Array.from({ length: days }, (_, i) => addDays(date, i));

  const DAYS = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
  function fmtDate(s, withDay = true) {
    const d = parse(s);
    return `${withDay ? DAYS[d.getDay()] + " " : ""}${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  function fmtPeriod(date, days) {
    return days === 2 ? `${fmtDate(date)} + ${fmtDate(addDays(date, 1))}` : fmtDate(date);
  }

  const euro = (n) => "€ " + (Math.round(n * 100) / 100).toLocaleString("nl-BE", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

  // ── Beschikbaarheid ────────────────────────────────────────
  function usedQty(state, productId, date, days, ignoreId) {
    const want = range(date, days);
    let max = 0;
    for (const day of want) {
      let used = 0;
      for (const r of state.reservations) {
        if (r.status === "refused" || r.id === ignoreId) continue;
        if (!range(r.date, r.days).includes(day)) continue;
        for (const it of r.items) if (it.id === productId) used += it.qty;
      }
      max = Math.max(max, used);
    }
    return max;
  }

  function availableQty(state, product, date, days, ignoreId) {
    if (product.active === false) return 0;
    if (days === 2 && product.price2 == null) return 0;
    if (range(date, days).some((d) => state.settings.blockedDates.includes(d))) return 0;
    return Math.max(0, product.stock - usedQty(state, product.id, date, days, ignoreId));
  }

  function isDateBlocked(state, date, days) {
    return range(date, days).some((d) => state.settings.blockedDates.includes(d));
  }

  // ── Prijsberekening ────────────────────────────────────────
  function deliveryCost(settings, km) {
    if (km == null) return null;
    return settings.deliveryBase + Math.max(0, Math.ceil(km) - settings.deliveryFreeKm) * settings.deliveryPerKm;
  }

  function kmFor(state, postcode) {
    const pc = String(postcode || "").trim();
    return Object.prototype.hasOwnProperty.call(state.postcodes, pc) ? state.postcodes[pc] : null;
  }

  /*
   * order = { days, items:[{id,qty}], method:'pickup'|'delivery', postcode, surface:'gras'|'verhard' }
   */
  function quote(state, order) {
    const s = state.settings;
    const lines = [];
    let total = 0;
    let surfaceUnits = 0;

    for (const it of order.items) {
      const p = state.products.find((x) => x.id === it.id);
      if (!p || !it.qty) continue;
      const unit = order.days === 2 ? p.price2 : p.price;
      const amount = unit * it.qty;
      total += amount;
      lines.push({ label: `${it.qty > 1 ? it.qty + " × " : ""}${p.name}`, amount });
      if (p.surface) surfaceUnits += it.qty * (p.parts || 1);
    }

    let deliveryUnknown = false;
    if (order.method === "delivery") {
      const km = kmFor(state, order.postcode);
      const cost = deliveryCost(s, km);
      if (cost == null) {
        deliveryUnknown = true;
        lines.push({ label: "Levering & ophaling", amount: null, note: "op aanvraag" });
      } else {
        total += cost;
        lines.push({ label: `Levering & ophaling (± ${km} km)`, amount: cost });
      }
    } else if (order.method === "pickup") {
      lines.push({ label: "Zelf afhalen in Wiekevorst", amount: 0 });
    }

    if (order.surface === "verhard" && surfaceUnits > 0) {
      const cost = surfaceUnits * s.hardSurface;
      total += cost;
      lines.push({ label: `Verharde ondergrond (${surfaceUnits} × ${euro(s.hardSurface)})`, amount: cost, note: "matten + verankering" });
    }

    const deposit = Math.min(total, Math.max(s.depositMin, Math.round(total * s.depositPct) / 100));
    return { lines, total, deposit, rest: total - deposit, deliveryUnknown, surfaceUnits };
  }

  // ── Afbeeldingen ───────────────────────────────────────────
  const ICON = { springkasteel: "🏰", stormbaan: "🏁", attractie: "🤠", gokart: "🏎️", feest: "🪑" };
  function placeholder(p) {
    const c = p.color || "#4cae4f";
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 260'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#bfe6ff'/><stop offset='1' stop-color='#e8f7ff'/></linearGradient></defs>
      <rect width='400' height='260' fill='url(#g)'/>
      <circle cx='340' cy='50' r='26' fill='#ffd84d'/>
      <path d='M0 210 Q100 185 200 205 T400 200 V260 H0Z' fill='#7cc35a'/>
      <rect x='110' y='110' width='180' height='95' rx='18' fill='${c}'/>
      <rect x='95' y='75' width='38' height='130' rx='14' fill='${c}' opacity='.85'/>
      <rect x='267' y='75' width='38' height='130' rx='14' fill='${c}' opacity='.85'/>
      <circle cx='114' cy='70' r='16' fill='#ffd84d'/><circle cx='286' cy='70' r='16' fill='#ffd84d'/>
      <path d='M170 205 v-40 a30 30 0 0 1 60 0 v40z' fill='#fff' opacity='.85'/>
      <text x='200' y='150' font-size='44' text-anchor='middle'>${ICON[p.type] || "🎉"}</text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg).replace(/'/g, "%27");
  }

  function imgTag(p, cls = "") {
    const ph = placeholder(p);
    return `<img class="${cls}" src="${p.img || ph}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='${ph}'">`;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ── Demo-reservaties (zodat het dashboard iets toont) ──────
  function demoReservations() {
    const t = today();
    const nextSat = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return iso(d); })();
    return [
      { id: "BP-1001", created: t, status: "pending", date: nextSat, days: 1, items: [{ id: "brandweer", qty: 1 }], method: "delivery", postcode: "2220", surface: "gras",
        customer: { name: "Sofie Peeters", email: "sofie@example.com", phone: "0470 12 34 56", street: "Kerkstraat 12", city: "2220 Heist-op-den-Berg", note: "Verjaardag van Lien (6 jaar)" } },
      { id: "BP-1002", created: t, status: "confirmed", date: nextSat, days: 2, items: [{ id: "graffity-run-14", qty: 1 }, { id: "klaptafel", qty: 4 }, { id: "klapstoel-zwart", qty: 30 }], method: "delivery", postcode: "2260", surface: "verhard",
        customer: { name: "Chiro Westerlo", email: "leiding@example.com", phone: "0499 99 88 77", street: "Heuvelstraat 3", city: "2260 Westerlo", note: "" } },
      { id: "BP-1003", created: t, status: "pending", date: addDays(nextSat, 7), days: 1, items: [{ id: "unicorn-box", qty: 1 }], method: "pickup", postcode: "", surface: "gras",
        customer: { name: "Tom Janssens", email: "tom@example.com", phone: "0485 11 22 33", street: "", city: "", note: "Afhalen rond 9u" } }
    ];
  }

  window.BP = { load, save, reset, today, addDays, range, parse, iso, fmtDate, fmtPeriod, euro, usedQty, availableQty, isDateBlocked, quote, kmFor, deliveryCost, imgTag, placeholder, escapeHtml };
})();
