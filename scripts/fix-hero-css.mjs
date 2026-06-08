#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(__dirname, '..', 'apps', 'landing', 'src', 'styles', 'global.css');

let css = readFileSync(cssPath, 'utf8');

// Find hero section boundaries
const heroStart = css.indexOf('/* ═══ Hero ═══');
const statCardsComment = css.indexOf('/* ═══ Stat Cards ═══');

if (heroStart === -1 || statCardsComment === -1) {
  console.error('Could not find hero section boundaries');
  process.exit(1);
}

const newHeroCSS = `/* ═══ Hero ══════════════════════════════════════════════════════════════════ */

.hero-section {
  background: #0c0f1a;
  color: white;
}

html[data-theme="light"] .hero-section {
  background: #1a1a2e;
}

/* ── Animated POS Background ────────────────────────────────────────────── */

.hero-pos-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem 4rem;
  opacity: 0.35;
  animation: posFadeIn 1.5s var(--ease-out-expo) 0.3s both;
}

@keyframes posFadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 0.35; transform: scale(1); }
}

.pos-frame {
  width: 100%;
  max-width: 1100px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 40px 120px rgba(0, 0, 0, 0.5);
}

.pos-chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pos-chrome-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.pos-chrome-title {
  margin-left: 12px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.pos-body {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 420px;
  background: rgba(15, 23, 42, 0.88);
}

.pos-categories {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 16px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.pos-cat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s ease;
}

.pos-cat.active {
  background: rgba(249, 115, 22, 0.15);
  border-color: rgba(249, 115, 22, 0.3);
  color: #f97316;
}

.pos-cat-icon {
  font-size: 1.3rem;
}

.pos-order {
  display: flex;
  flex-direction: column;
}

.pos-order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pos-order-mesa {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}

.pos-order-status {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #22c55e;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
}

.pos-order-list {
  flex: 1;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.pos-order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.pos-order-item-enter {
  opacity: 0;
  transform: translateX(20px);
}

.pos-order-item-exit {
  opacity: 0;
  transform: translateX(-20px);
}

.pos-order-item-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.pos-order-item-price {
  font-size: 0.78rem;
  font-weight: 700;
  font-family: "JetBrains Mono", monospace;
  color: #f97316;
}

.pos-order-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pos-order-total {
  display: flex;
  flex-direction: column;
}

.pos-order-total span:first-child {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.4);
}

.pos-order-total span:last-child {
  font-size: 1.3rem;
  font-weight: 400;
  font-family: "Instrument Serif", Georgia, serif;
  color: #f97316;
}

.pos-order-btn {
  padding: 8px 24px;
  border-radius: 999px;
  border: none;
  background: #f97316;
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

/* ── Dark overlay for text readability ──────────────────────────────────── */

.hero-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    135deg,
    rgba(12, 15, 26, 0.92) 0%,
    rgba(12, 15, 26, 0.78) 40%,
    rgba(12, 15, 26, 0.55) 100%
  );
}

html[data-theme="light"] .hero-overlay {
  background: linear-gradient(
    135deg,
    rgba(26, 26, 46, 0.92) 0%,
    rgba(26, 26, 46, 0.78) 40%,
    rgba(26, 26, 46, 0.55) 100%
  );
}

.hero-grain {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0.05;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* ── Hero text ──────────────────────────────────────────────────────────── */

.hero-text-block {
  max-width: 640px;
  animation: heroTextIn 1s var(--ease-out-expo) 0.4s both;
}

@keyframes heroTextIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #f97316;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.hero-headline {
  margin-top: 1.5rem;
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(3rem, 7vw, 5.5rem);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.035em;
  color: white;
}

.hero-headline em {
  font-style: italic;
  color: #f97316;
}

.hero-sub {
  margin-top: 1.5rem;
  font-size: clamp(1rem, 1.8vw, 1.2rem);
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
  max-width: 44ch;
}

.hero-actions {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.hero-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 2rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: var(--accent);
  transition: all 0.3s var(--ease-out-expo);
}

.hero-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
  opacity: 0.92;
}

.hero-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 2rem;
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s var(--ease-out-expo);
}

.hero-btn-ghost:hover {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

/* ── Hero ticker ────────────────────────────────────────────────────────── */

.hero-ticker {
  position: relative;
  z-index: 10;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(12, 15, 26, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow: hidden;
}

.ticker-track {
  display: flex;
  animation: tickerScroll 45s linear infinite;
  width: max-content;
}

.ticker-item {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.8rem 2rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.ticker-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #f97316;
  opacity: 0.4;
}

@keyframes tickerScroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (max-width: 768px) {
  .pos-body { grid-template-columns: 1fr; }
  .pos-categories { display: none; }
  .hero-pos-backdrop { padding: 4rem 1rem 3rem; opacity: 0.2; }
  .hero-text-block { max-width: 100%; }
}

`;

// Replace from heroStart to statCardsComment
css = css.substring(0, heroStart) + newHeroCSS + css.substring(statCardsComment);

writeFileSync(cssPath, css, 'utf8');
console.log('Hero CSS section replaced successfully!');
