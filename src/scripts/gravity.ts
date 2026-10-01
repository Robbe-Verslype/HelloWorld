import Matter from 'matter-js';
import decomp from 'poly-decomp';

const { Engine, Bodies, Body, Composite, Constraint, Query, Sleeping, Common } = Matter;

// Nodig om holle vormen (zoals een truitje met mouwen) op te delen in botsbare stukken
Common.setDecomp(decomp);

/** Hoe ver (px) je mag bewegen voordat een klik als "slepen" telt. */
const DRAG_THRESHOLD = 6;
/** Welk deel van het scherm de thumbnails samen ongeveer innemen. */
const FILL_RATIO = 0.42;
/** Maximaal aantal thumbnails per hoop. Zijn er meer, dan toont de bom de volgende lading. */
const MAX_PER_PILE_DESKTOP = 14;
const MAX_PER_PILE_MOBILE = 8;
const WALL = 200;

// Botsingscategorieën: thumbnails die wegvliegen botsen niet meer met de nieuwe
const CAT_WALL = 0x0001;
const CAT_THUMB = 0x0002;

type State = 'active' | 'leaving' | 'off';

interface Item {
  el: HTMLElement;
  body: Matter.Body;
  w: number;
  h: number;
  /** Linkerbovenhoek van het element t.o.v. het zwaartepunt (de body kan niet-rechthoekig zijn) */
  dx: number;
  dy: number;
  state: State;
  leftAt: number;
}

export function initGravityPile(container: HTMLElement, bombButton?: HTMLButtonElement | null) {
  const els = Array.from(container.querySelectorAll<HTMLElement>('.thumb'));
  if (!els.length) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Extra iteraties + "slapen" houden de stapel stil zodra alles geland is
  const engine = Engine.create({ enableSleeping: true, positionIterations: 12, velocityIterations: 8 });
  engine.gravity.y = 1.1;

  let width = container.clientWidth;
  let height = container.clientHeight;

  // --- Muren: vloer + links + rechts (geen plafond, alles valt van boven in) ---
  const wallOpts = { isStatic: true, collisionFilter: { category: CAT_WALL, mask: CAT_THUMB } };
  const floor = Bodies.rectangle(0, 0, 1, WALL, wallOpts);
  const left = Bodies.rectangle(0, 0, WALL, 1, wallOpts);
  const right = Bodies.rectangle(0, 0, WALL, 1, wallOpts);
  Composite.add(engine.world, [floor, left, right]);

  function placeWalls() {
    const tall = height * 6;
    // setVertices bepaalt de vorm, setPosition daarna de plek
    Body.setVertices(floor, rectVerts(width + WALL * 2, WALL));
    Body.setPosition(floor, { x: width / 2, y: height + WALL / 2 });
    Body.setVertices(left, rectVerts(WALL, tall));
    Body.setPosition(left, { x: -WALL / 2, y: height - tall / 2 });
    Body.setVertices(right, rectVerts(WALL, tall));
    Body.setPosition(right, { x: width + WALL / 2, y: height - tall / 2 });
  }
  placeWalls();

  // --- Projecten opdelen in ladingen ("hopen") ---
  const perPile = Math.min(els.length, width < 600 ? MAX_PER_PILE_MOBILE : MAX_PER_PILE_DESKTOP);
  const pileCount = Math.ceil(els.length / perPile);
  let currentPile = 0;

  // --- Formaat van de thumbnails afhankelijk van scherm en aantal per hoop ---
  function thumbSize(ratio: number) {
    const area = (width * height * FILL_RATIO) / perPile;
    const min = width < 600 ? 90 : 140;
    const max = width < 600 ? 200 : 340;
    let w = Math.sqrt(area * ratio);
    w = Math.max(min, Math.min(max, w));
    return { w, h: w / ratio };
  }

  // --- Eén physics-body per thumbnail ---
  const items: Item[] = els.map((el) => {
    const ratio = parseFloat(el.dataset.ratio || '1') || 1;
    const { w, h } = thumbSize(ratio);
    const opts = {
      chamfer: { radius: 4 },
      restitution: 0.45, // hoe hard ze stuiteren (0 = niet, 1 = superbal)
      friction: 0.5,
      frictionAir: 0.012,
      density: 0.002,
    };
    let body: Matter.Body | undefined;
    let dx = -w / 2;
    let dy = -h / 2;
    // Eigen vorm (contour van het ontwerp) i.p.v. een rechthoek
    const shape = el.dataset.shape ? (JSON.parse(el.dataset.shape) as [number, number][]) : null;
    if (shape) {
      const verts = shape.map(([px, py]) => ({ x: px * w, y: py * h }));
      const { chamfer, ...rest } = opts;
      body = Bodies.fromVertices(0, 0, [verts], rest, false, 0.01, 4) as Matter.Body | undefined;
      if (body) {
        // Waar ligt de linkerbovenhoek van het element t.o.v. het zwaartepunt?
        dx = body.bounds.min.x - body.position.x;
        dy = body.bounds.min.y - body.position.y;
      }
    }
    if (!body) body = Bodies.rectangle(0, -h, w, h, opts);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    return { el, body, w, h, dx, dy, state: 'off' as State, leftAt: 0 };
  });

  const byBody = new Map(items.map((it) => [it.body.id, it]));
  const pileOf = (pile: number) => items.slice(pile * perPile, (pile + 1) * perPile);

  /** Laat één lading van boven het scherm in vallen. */
  function dropPile(pile: number) {
    pileOf(pile).forEach((it, i) => {
      const { body } = it;
      body.collisionFilter.category = CAT_THUMB;
      body.collisionFilter.mask = CAT_WALL | CAT_THUMB;
      Body.setPosition(body, {
        x: it.w / 2 + Math.random() * Math.max(1, width - it.w),
        // Gespreid boven het scherm zodat ze na elkaar vallen
        y: -it.h - i * (height * 0.2) - Math.random() * 100,
      });
      Body.setAngle(body, (Math.random() - 0.5) * 0.8);
      Body.setAngularVelocity(body, 0);
      // Startsnelheid naar beneden, anders valt een stilhangende body meteen in slaap
      Body.setVelocity(body, { x: 0, y: 6 });
      Sleeping.set(body, false);
      if (it.state === 'off') Composite.add(engine.world, body);
      it.state = 'active';
      bringToFront(it);
    });
    updateBombLabel();
  }

  function removeItem(it: Item) {
    Composite.remove(engine.world, it.body);
    it.state = 'off';
    it.el.style.visibility = 'hidden';
  }

  /** De bom: alles op de hoop vliegt omhoog, daarna valt de volgende lading erin. */
  function explode() {
    if (drag) endDrag();
    const active = items.filter((it) => it.state === 'active');
    const next = (currentPile + 1) % pileCount;

    if (reduceMotion) {
      // Geen animatie: meteen wisselen en tot rust laten komen
      if (pileCount > 1) active.forEach(removeItem);
      currentPile = next;
      dropPile(currentPile);
      for (let i = 0; i < 600; i++) Engine.update(engine, 1000 / 60);
      return;
    }

    // Snelheid die nodig is om (ongeveer) boven het scherm uit te vliegen
    const launch = Math.sqrt(2 * 0.31 * (height + 500)) * 1.35;
    for (const it of active) {
      Sleeping.set(it.body, false);
      const fromCenter = (it.body.position.x - width / 2) / (width / 2);
      Body.setVelocity(it.body, {
        x: fromCenter * 12 + (Math.random() - 0.5) * 10,
        y: -launch * (0.85 + Math.random() * 0.3),
      });
      Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.5);
      if (pileCount > 1) {
        it.state = 'leaving';
        it.leftAt = performance.now();
        it.body.collisionFilter.mask = CAT_WALL;
      }
    }

    container.classList.remove('boom');
    void container.offsetWidth; // animatie opnieuw starten
    container.classList.add('boom');

    if (pileCount > 1) {
      currentPile = next;
      window.setTimeout(() => dropPile(currentPile), 450);
    }
  }

  function updateBombLabel() {
    const counter = bombButton?.querySelector<HTMLElement>('[data-pile]');
    if (!counter) return;
    counter.hidden = pileCount < 2;
    counter.textContent = `${currentPile + 1}/${pileCount}`;
    bombButton!.setAttribute(
      'aria-label',
      pileCount > 1
        ? `Laat de bom afgaan en toon de volgende projecten (hoop ${currentPile + 1} van ${pileCount})`
        : 'Laat de bom afgaan',
    );
  }

  bombButton?.addEventListener('click', explode);

  // --- Slepen met muis en touch ---
  let drag: { item: Item; constraint: Matter.Constraint; startX: number; startY: number; moved: boolean } | null =
    null;
  let suppressClick = false;

  function pointerPos(e: PointerEvent) {
    const r = container.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = pointerPos(e);
    // Bovenste thumbnail onder de cursor
    const hit = Query.point(
      items.filter((it) => it.state === 'active').map((it) => it.body),
      p,
    ).sort((a, b) => zOf(b) - zOf(a))[0];
    if (!hit) return;
    const item = byBody.get(hit.id)!;

    const constraint = Constraint.create({
      pointA: p,
      bodyB: hit,
      pointB: Matter.Vector.rotate(Matter.Vector.sub(p, hit.position), -hit.angle),
      stiffness: 0.2,
      damping: 0.1,
      length: 0,
    });
    Composite.add(engine.world, constraint);
    wakeAll();
    drag = { item, constraint, startX: e.clientX, startY: e.clientY, moved: false };
    bringToFront(item);
  });

  // Op window luisteren zodat slepen buiten de thumbnail blijft werken
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pointerPos(e);
    drag.constraint.pointA = p;
    if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD) {
      drag.moved = true;
      drag.item.el.classList.add('dragging');
    }
  });

  function endDrag() {
    if (!drag) return;
    Composite.remove(engine.world, drag.constraint);
    drag.item.el.classList.remove('dragging');
    suppressClick = drag.moved;
    drag = null;
  }
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  // Een sleepbeweging mag de link niet openen; een gewone klik wel
  container.addEventListener(
    'click',
    (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
      }
      suppressClick = false;
    },
    true,
  );

  function wakeAll() {
    for (const it of items) if (it.state !== 'off') Sleeping.set(it.body, false);
  }

  // --- Stapelvolgorde (z-index) ---
  let zCounter = 0;
  function zOf(body: Matter.Body) {
    return Number(byBody.get(body.id)?.el.style.zIndex || 0);
  }
  function bringToFront(item: Item) {
    item.el.style.zIndex = String(++zCounter);
  }

  // --- Schermgrootte wijzigt: muren verplaatsen, ontsnapte thumbnails terugzetten ---
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      width = container.clientWidth;
      height = container.clientHeight;
      placeWalls();
      wakeAll();
      for (const it of items) {
        if (it.state !== 'active') continue;
        const { x, y } = it.body.position;
        if (x < 0 || x > width || y > height) {
          Body.setPosition(it.body, { x: Math.min(Math.max(x, it.w / 2), width - it.w / 2), y: -it.h });
          Body.setVelocity(it.body, { x: 0, y: 0 });
        }
      }
    }, 150);
  });

  // --- Start: eerste lading laten vallen ---
  dropPile(currentPile);
  if (reduceMotion) {
    for (let i = 0; i < 600; i++) Engine.update(engine, 1000 / 60);
  }

  // --- Animatielus: physics doorrekenen en DOM-elementen meebewegen ---
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(now - last, 1000 / 60);
    last = now;
    Engine.update(engine, dt);

    for (const it of items) {
      if (it.state === 'off') continue;
      const { x, y } = it.body.position;
      // Weggeblazen en boven het scherm verdwenen (of te lang onderweg): opruimen
      if (it.state === 'leaving' && (y < -it.h - 100 || now - it.leftAt > 3000)) {
        removeItem(it);
        continue;
      }
      it.el.style.transform = `translate(${x}px, ${y}px) rotate(${it.body.angle}rad) translate(${it.dx}px, ${it.dy}px)`;
      it.el.style.visibility = 'visible';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function rectVerts(w: number, h: number) {
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ];
}
