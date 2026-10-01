import Matter from 'matter-js';

const { Engine, Bodies, Body, Composite, Constraint, Query } = Matter;

/** Hoe ver (px) je mag bewegen voordat een klik als "slepen" telt. */
const DRAG_THRESHOLD = 6;
/** Welk deel van het scherm de thumbnails samen ongeveer innemen. */
const FILL_RATIO = 0.42;
const WALL = 200;

interface Item {
  el: HTMLElement;
  body: Matter.Body;
  w: number;
  h: number;
}

export function initGravityPile(container: HTMLElement) {
  const els = Array.from(container.querySelectorAll<HTMLElement>('.thumb'));
  if (!els.length) return;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const engine = Engine.create();
  engine.gravity.y = 1.1;

  let width = container.clientWidth;
  let height = container.clientHeight;

  // --- Muren: vloer + links + rechts (geen plafond, alles valt van boven in) ---
  const floor = Bodies.rectangle(0, 0, 1, WALL, { isStatic: true });
  const left = Bodies.rectangle(0, 0, WALL, 1, { isStatic: true });
  const right = Bodies.rectangle(0, 0, WALL, 1, { isStatic: true });
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

  // --- Formaat van de thumbnails afhankelijk van scherm en aantal designs ---
  function thumbSize(ratio: number) {
    const area = (width * height * FILL_RATIO) / els.length;
    const min = width < 600 ? 90 : 140;
    const max = width < 600 ? 200 : 340;
    let w = Math.sqrt(area * ratio);
    w = Math.max(min, Math.min(max, w));
    return { w, h: w / ratio };
  }

  // --- Eén physics-body per thumbnail ---
  const items: Item[] = els.map((el, i) => {
    const ratio = parseFloat(el.dataset.ratio || '1') || 1;
    const { w, h } = thumbSize(ratio);
    const x = w / 2 + Math.random() * Math.max(1, width - w);
    // Gespreid boven het scherm zodat ze na elkaar vallen
    const y = -h - (i % 16) * (height * 0.25) - Math.random() * 100;
    const body = Bodies.rectangle(x, y, w, h, {
      angle: (Math.random() - 0.5) * 0.8,
      chamfer: { radius: 4 },
      restitution: 0.15,
      friction: 0.6,
      frictionAir: 0.012,
      density: 0.002,
    });
    Composite.add(engine.world, body);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    return { el, body, w, h };
  });

  const byBody = new Map(items.map((it) => [it.body.id, it]));

  // Bij "minder beweging" meteen tot rust laten komen, zonder animatie
  if (reduceMotion) {
    for (let i = 0; i < 600; i++) Engine.update(engine, 1000 / 60);
  }

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
    // Bovenste body onder de cursor (laatst toegevoegd = bovenaan getekend)
    const hit = Query.point(
      items.map((it) => it.body),
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

  // --- Stapelvolgorde (z-index) ---
  let zCounter = items.length;
  items.forEach((it, i) => (it.el.style.zIndex = String(i + 1)));
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
      for (const it of items) {
        const { x, y } = it.body.position;
        if (x < 0 || x > width || y > height) {
          Body.setPosition(it.body, { x: Math.min(Math.max(x, it.w / 2), width - it.w / 2), y: -it.h });
          Body.setVelocity(it.body, { x: 0, y: 0 });
        }
      }
    }, 150);
  });

  // --- Animatielus: physics doorrekenen en DOM-elementen meebewegen ---
  let last = performance.now();
  function frame(now: number) {
    const dt = Math.min(now - last, 1000 / 60);
    last = now;
    Engine.update(engine, dt);

    for (const it of items) {
      const { x, y } = it.body.position;
      it.el.style.transform = `translate(${x - it.w / 2}px, ${y - it.h / 2}px) rotate(${it.body.angle}rad)`;
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
