#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = join(__dirname, '..', 'apps', 'landing', 'src');

// ─── 1. Fix CSS overlay and add new animation classes ───────────────────────
const cssPath = join(base, 'styles', 'global.css');
let css = readFileSync(cssPath, 'utf8');

// Fix overlay to directional gradient: dark on left (text side), transparent on right (POS visible)
css = css.replace(
  'background: linear-gradient(\n    135deg,\n    rgba(12, 15, 26, 0.7) 0%,\n    rgba(12, 15, 26, 0.55) 40%,\n    rgba(12, 15, 26, 0.35) 100%\n  );',
  'background: linear-gradient(to right, rgba(12, 15, 26, 0.88) 0%, rgba(12, 15, 26, 0.6) 35%, rgba(12, 15, 26, 0.1) 100%);'
);

css = css.replace(
  'background: linear-gradient(\n    135deg,\n    rgba(26, 26, 46, 0.7) 0%,\n    rgba(26, 26, 46, 0.55) 40%,\n    rgba(26, 26, 46, 0.35) 100%\n  );',
  'background: linear-gradient(to right, rgba(26, 26, 46, 0.88) 0%, rgba(26, 26, 46, 0.6) 35%, rgba(26, 26, 46, 0.1) 100%);'
);

// Add new CSS classes before Stat Cards section
const statIdx = css.indexOf('/* \u2550\u2550\u2550 Stat Cards');
const newCSS = `
/* \u2500\u2500 POS Flash effect \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.pos-order-list {
  position: relative;
}

.pos-flash {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: rgba(249, 115, 22, 0.12);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.pos-flash.active {
  opacity: 1;
}

/* \u2500\u2500 POS Clock \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.pos-clock {
  font-size: 0.72rem;
  font-weight: 700;
  font-family: "JetBrains Mono", monospace;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.08em;
  margin-left: auto;
}

/* \u2500\u2500 Kitchen notification toast \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.pos-kitchen-toast {
  position: absolute;
  top: 55px;
  right: 16px;
  z-index: 5;
  padding: 8px 14px;
  border-radius: 10px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
  white-space: nowrap;
}

.pos-kitchen-toast.visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.pos-kitchen-toast.success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.pos-kitchen-toast.pending {
  background: rgba(249, 115, 22, 0.15);
  border: 1px solid rgba(249, 115, 22, 0.3);
  color: #f97316;
}

.pos-kitchen-toast.alert {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

`;
css = css.substring(0, statIdx) + newCSS + css.substring(statIdx);
writeFileSync(cssPath, css, 'utf8');
console.log('CSS: overlay fixed to directional gradient, flash/clock/toast classes added');

// ─── 2. Update Hero.astro with clock, flash, kitchen toasts ─────────────────
const heroPath = join(base, 'components', 'Hero.astro');
let hero = readFileSync(heroPath, 'utf8');

// Add clock element to chrome bar (after the title)
hero = hero.replace(
  '<span class="pos-chrome-title">SaaS Restaurant &mdash; Turno Noche</span>',
  '<span class="pos-chrome-title">SaaS Restaurant &mdash; Turno Noche</span>\n        <span class="pos-clock" id="pos-clock">18:42</span>'
);

// Add flash element and kitchen toast to pos-order
hero = hero.replace(
  '<div class="pos-order-list" id="pos-order-list">',
  '<div class="pos-order-list" id="pos-order-list">\n            <div class="pos-flash" id="pos-flash"></div>'
);

// Add kitchen toast container to pos-frame
hero = hero.replace(
  '</div>\n    </div>\n  </div>\n\n  <!-- Dark gradient overlay',
  '</div>\n    <div class="pos-kitchen-toast" id="pos-kitchen-toast"></div>\n  </div>\n\n  <!-- Dark gradient overlay'
);

// Replace the entire JS animation script with enhanced version
const oldScript = `<script is:inline>
(() => {
  const menuItems = [
    { name: 'Coca-Cola', price: 2500 },
    { name: 'Milanesa Napolitana', price: 12800 },
    { name: 'Empanadas x6', price: 7200 },
    { name: 'Lomo al paso', price: 15500 },
    { name: 'Hamburguesa Cl\u00e1sica', price: 9800 },
    { name: 'Ensalada Caesar', price: 6500 },
    { name: 'Pizza Margarita', price: 8900 },
    { name: 'Papas Fritas', price: 4200 },
  ];

  const list = document.getElementById('pos-order-list');
  const totalEl = document.getElementById('pos-total');
  if (!list || !totalEl) return;

  let currentTotal = 0;
  let itemIndex = 0;

  function addItem() {
    const item = menuItems[itemIndex % menuItems.length];
    itemIndex++;

    // Create item element
    const el = document.createElement('div');
    el.className = 'pos-order-item pos-order-item-enter';
    el.innerHTML = '<span class="pos-order-item-name">' + item.name + '</span><span class="pos-order-item-price">$' + item.price.toLocaleString('es-AR') + '</span>';
    list.appendChild(el);

    // Update total
    currentTotal += item.price;
    totalEl.textContent = '$' + currentTotal.toLocaleString('es-AR');

    // Remove enter class after animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('pos-order-item-enter');
      });
    });

    // Remove oldest item if too many
    if (list.children.length > 5) {
      const first = list.children[0];
      first.classList.add('pos-order-item-exit');
      setTimeout(() => first.remove(), 400);
    }

    // Schedule next item
    const delay = 1800 + Math.random() * 1200;
    setTimeout(addItem, delay);
  }

  // Start animation quickly
  setTimeout(addItem, 400);

  // Cycle active category
  const cats = document.querySelectorAll('.pos-cat');
  let catIdx = 0;
  setInterval(() => {
    cats.forEach(c => c.classList.remove('active'));
    cats[catIdx % cats.length].classList.add('active');
    catIdx++;
  }, 3000);
})();
</script>`;

const newScript = `<script is:inline>
(() => {
  const menuItems = [
    { name: 'Coca-Cola', price: 2500 },
    { name: 'Milanesa Napolitana', price: 12800 },
    { name: 'Empanadas x6', price: 7200 },
    { name: 'Lomo al paso', price: 15500 },
    { name: 'Hamburguesa Cl\u00e1sica', price: 9800 },
    { name: 'Ensalada Caesar', price: 6500 },
    { name: 'Pizza Margarita', price: 8900 },
    { name: 'Papas Fritas', price: 4200 },
  ];

  const kitchenMessages = [
    { text: '\u2714 Mesa 5 \u2014 Lomo listo', type: 'success' },
    { text: '\u23f3 Mesa 12 \u2014 Cocinando...', type: 'pending' },
    { text: '\u26a0\ufe0f Mesa 8 \u2014 Tiempo excedido', type: 'alert' },
    { text: '\u2714 Mesa 3 \u2014 Ensalada servida', type: 'success' },
    { text: '\u23f3 Mesa 15 \u2014 Pizza en horno', type: 'pending' },
    { text: '\u2714 Mesa 1 \u2014 Pedidos completados', type: 'success' },
    { text: '\u26a0\ufe0f Barra \u2014 Stock bajo cerveza', type: 'alert' },
  ];

  const list = document.getElementById('pos-order-list');
  const totalEl = document.getElementById('pos-total');
  const flash = document.getElementById('pos-flash');
  const clock = document.getElementById('pos-clock');
  const toast = document.getElementById('pos-kitchen-toast');
  if (!list || !totalEl) return;

  let currentTotal = 0;
  let itemIndex = 0;
  let msgIndex = 0;

  // Clock ticking
  if (clock) {
    let h = 18, m = 42;
    setInterval(() => {
      m++;
      if (m >= 60) { m = 0; h = (h + 1) % 24; }
      clock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }, 800);
  }

  function triggerFlash() {
    if (!flash) return;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 200);
  }

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg.text;
    toast.className = 'pos-kitchen-toast visible ' + msg.type;
    setTimeout(() => { toast.classList.remove('visible'); }, 2800);
  }

  function addItem() {
    const item = menuItems[itemIndex % menuItems.length];
    itemIndex++;

    const el = document.createElement('div');
    el.className = 'pos-order-item pos-order-item-enter';
    el.innerHTML = '<span class="pos-order-item-name">' + item.name + '</span><span class="pos-order-item-price">$' + item.price.toLocaleString('es-AR') + '</span>';
    list.appendChild(el);

    currentTotal += item.price;
    totalEl.textContent = '$' + currentTotal.toLocaleString('es-AR');

    // Flash effect on new item
    triggerFlash();

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('pos-order-item-enter');
      });
    });

    if (list.children.length > 5) {
      const children = list.querySelectorAll('.pos-order-item:not(.pos-order-item-enter)');
      const first = children[0];
      if (first) {
        first.classList.add('pos-order-item-exit');
        setTimeout(() => first.remove(), 400);
      }
    }

    const delay = 1800 + Math.random() * 1200;
    setTimeout(addItem, delay);
  }

  function showKitchenToast() {
    const msg = kitchenMessages[msgIndex % kitchenMessages.length];
    msgIndex++;
    showToast(msg);
    setTimeout(showKitchenToast, 3000 + Math.random() * 2000);
  }

  // Start everything
  setTimeout(addItem, 400);
  setTimeout(showKitchenToast, 1500);

  // Cycle active category
  const cats = document.querySelectorAll('.pos-cat');
  let catIdx = 0;
  setInterval(() => {
    cats.forEach(c => c.classList.remove('active'));
    cats[catIdx % cats.length].classList.add('active');
    catIdx++;
  }, 3000);
})();
</script>`;

hero = hero.replace(oldScript, newScript);
writeFileSync(heroPath, hero, 'utf8');
console.log('Hero.astro: clock added to chrome bar, flash effect on item add, kitchen toast notifications');
