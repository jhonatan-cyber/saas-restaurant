#!/usr/bin/env node
// Script to generate the entire spectacular landing page
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = join(__dirname, '..', 'apps', 'landing', 'src');

function write(rel, content) {
  const full = join(base, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  console.log(`  ✅ ${rel}`);
}

console.log('🏗️  Generating landing page files...\n');

// ─── global.css ─────────────────────────────────────────────────────────────
write('styles/global.css', `@import "tailwindcss";

@theme {
  --color-brand-50: #fff7ed;
  --color-brand-100: #ffedd5;
  --color-brand-200: #fed7aa;
  --color-brand-300: #fdba74;
  --color-brand-400: #fb923c;
  --color-brand-500: #f97316;
  --color-brand-600: #ea580c;
  --color-brand-700: #c2410c;
  --color-brand-800: #9a3412;
  --color-brand-900: #7c2d12;

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ═══ Theme Variables ═══════════════════════════════════════════════════════ */

:root {
  --page-bg: #faf8f5;
  --page-bg-deep: #f0ece6;
  --surface: rgba(255, 255, 255, 0.72);
  --surface-solid: rgba(255, 255, 255, 0.95);
  --surface-elevated: rgba(255, 255, 255, 0.88);
  --surface-muted: #ede8e0;
  --surface-border: rgba(15, 23, 42, 0.07);
  --surface-border-strong: rgba(15, 23, 42, 0.12);
  --text-primary: #0c0f1a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --text-inverse: #f8fafc;
  --accent: #ea580c;
  --accent-light: #f97316;
  --accent-glow: rgba(249, 115, 22, 0.2);
  --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.04);
  --shadow-md: 0 12px 40px rgba(15, 23, 42, 0.08);
  --shadow-lg: 0 32px 80px rgba(15, 23, 42, 0.12);
  --shadow-glow: 0 0 80px rgba(249, 115, 22, 0.15);
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.5);
  --gradient-mesh-1: rgba(249, 115, 22, 0.12);
  --gradient-mesh-2: rgba(251, 146, 60, 0.08);
}

html[data-theme="dark"] {
  color-scheme: dark;
  --page-bg: #070b14;
  --page-bg-deep: #040710;
  --surface: rgba(15, 23, 42, 0.6);
  --surface-solid: rgba(15, 23, 42, 0.92);
  --surface-elevated: rgba(30, 41, 59, 0.7);
  --surface-muted: #111827;
  --surface-border: rgba(255, 255, 255, 0.06);
  --surface-border-strong: rgba(255, 255, 255, 0.1);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-tertiary: #64748b;
  --text-inverse: #0c0f1a;
  --accent: #f97316;
  --accent-light: #fb923c;
  --accent-glow: rgba(249, 115, 22, 0.25);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 12px 40px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 32px 80px rgba(0, 0, 0, 0.45);
  --shadow-glow: 0 0 100px rgba(249, 115, 22, 0.2);
  --glass-bg: rgba(15, 23, 42, 0.5);
  --glass-border: rgba(255, 255, 255, 0.08);
  --gradient-mesh-1: rgba(249, 115, 22, 0.08);
  --gradient-mesh-2: rgba(251, 146, 60, 0.05);
}

/* ═══ Base ══════════════════════════════════════════════════════════════════ */

html { scroll-behavior: smooth; }
body { color: var(--text-primary); background: var(--page-bg); overflow-x: hidden; }
.font-body { font-family: "Plus Jakarta Sans", system-ui, sans-serif; }
.font-display { font-family: "Instrument Serif", Georgia, serif; }
.font-mono { font-family: "JetBrains Mono", "SF Mono", monospace; }

/* ═══ Layout ════════════════════════════════════════════════════════════════ */

.section-shell { @apply mx-auto max-w-7xl px-5 sm:px-8; }
.section-gap { @apply py-20 sm:py-28 lg:py-36; }

/* ═══ Glass Effects ═════════════════════════════════════════════════════════ */

.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

html[data-theme="dark"] .glass-card {
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

/* ═══ Typography ════════════════════════════════════════════════════════════ */

.eyebrow {
  @apply inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase;
  letter-spacing: 0.2em;
  background: var(--accent-glow);
  color: var(--accent);
  border: 1px solid rgba(249, 115, 22, 0.15);
}

.section-title {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(2.2rem, 5vw, 4.2rem);
  line-height: 1.05;
  font-weight: 400;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  text-wrap: balance;
}

.section-subtitle {
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  line-height: 1.7;
  color: var(--text-secondary);
  max-width: 52ch;
}

/* ═══ Hero ══════════════════════════════════════════════════════════════════ */

.hero-mesh {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
}

.hero-mesh::before,
.hero-mesh::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  animation: meshFloat 20s ease-in-out infinite;
}

.hero-mesh::before {
  width: 600px;
  height: 600px;
  top: -15%;
  left: -10%;
  background: radial-gradient(circle, var(--gradient-mesh-1), transparent 70%);
}

.hero-mesh::after {
  width: 500px;
  height: 500px;
  bottom: -10%;
  right: -5%;
  background: radial-gradient(circle, var(--gradient-mesh-2), transparent 70%);
  animation-delay: -7s;
}

@keyframes meshFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(40px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(30px, 10px) scale(1.02); }
}

.hero-grain {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.035;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

html[data-theme="dark"] .hero-grain { opacity: 0.06; }

.hero-grid-pattern {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.04) 1px, transparent 1px);
  background-size: 80px 80px;
  mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.5), transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.5), transparent 70%);
}

.hero-headline {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(3rem, 7.5vw, 6.5rem);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.035em;
  color: var(--text-primary);
  text-wrap: balance;
}

.hero-headline em {
  font-style: italic;
  color: var(--accent);
}

/* ═══ Dashboard Mock ════════════════════════════════════════════════════════ */

.dashboard-shell {
  position: relative;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--surface-solid) 0%, var(--surface-elevated) 100%);
  border: 1px solid var(--surface-border-strong);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  overflow: hidden;
}

html[data-theme="dark"] .dashboard-shell {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%);
  border-color: rgba(255, 255, 255, 0.06);
}

.dashboard-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--surface-border);
}

.dashboard-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dashboard-body {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

/* ═══ Stat Cards ════════════════════════════════════════════════════════════ */

.stat-card {
  border-radius: 20px;
  background: var(--surface-solid);
  border: 1px solid var(--surface-border);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.4s var(--ease-out-expo);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent-glow);
}

html[data-theme="dark"] .stat-card {
  background: var(--surface-elevated);
}

.stat-number {
  font-family: "Instrument Serif", Georgia, serif;
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  line-height: 1;
  font-weight: 400;
  letter-spacing: -0.03em;
  color: var(--accent);
}

/* ═══ Bento Grid ════════════════════════════════════════════════════════════ */

.bento-item {
  position: relative;
  border-radius: 24px;
  background: var(--surface-solid);
  border: 1px solid var(--surface-border);
  padding: 2rem;
  overflow: hidden;
  transition: all 0.5s var(--ease-out-expo);
}

html[data-theme="dark"] .bento-item {
  background: var(--surface-elevated);
}

.bento-item::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 24px;
  background: linear-gradient(135deg, var(--accent-glow), transparent 60%);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.bento-item:hover::before {
  opacity: 1;
}

.bento-item:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  border-color: rgba(249, 115, 22, 0.2);
}

.bento-icon {
  position: relative;
  z-index: 1;
  width: 3.25rem;
  height: 3.25rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.05));
  color: var(--accent);
  margin-bottom: 1.25rem;
}

.bento-content {
  position: relative;
  z-index: 1;
}

/* ═══ Showcase Tabs ═════════════════════════════════════════════════════════ */

.showcase-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.35rem;
  border-radius: 16px;
  background: var(--surface-muted);
  border: 1px solid var(--surface-border);
}

.showcase-tab {
  flex: 1;
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-tertiary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s var(--ease-out-expo);
  text-align: center;
}

.showcase-tab:hover { color: var(--text-secondary); }

.showcase-tab.active {
  background: var(--surface-solid);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

html[data-theme="dark"] .showcase-tab.active {
  background: var(--surface-elevated);
}

/* ═══ Ecosystem Orb ═════════════════════════════════════════════════════════ */

.ecosystem-hub {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-light));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 60px var(--accent-glow), 0 0 120px rgba(249, 115, 22, 0.1);
  animation: hubPulse 4s ease-in-out infinite;
}

@keyframes hubPulse {
  0%, 100% { box-shadow: 0 0 60px var(--accent-glow), 0 0 120px rgba(249, 115, 22, 0.1); }
  50% { box-shadow: 0 0 80px var(--accent-glow), 0 0 160px rgba(249, 115, 22, 0.15); }
}

.ecosystem-node {
  position: absolute;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--surface-solid);
  border: 2px solid var(--surface-border-strong);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
  transition: all 0.4s var(--ease-spring);
}

html[data-theme="dark"] .ecosystem-node {
  background: var(--surface-elevated);
}

.ecosystem-node:hover {
  transform: scale(1.15);
  border-color: var(--accent);
  box-shadow: var(--shadow-lg), 0 0 30px var(--accent-glow);
}

.ecosystem-line {
  position: absolute;
  height: 1px;
  background: linear-gradient(90deg, var(--accent-glow), var(--surface-border), var(--accent-glow));
  transform-origin: left center;
  opacity: 0.5;
}

/* ═══ CTA Gradient ══════════════════════════════════════════════════════════ */

.cta-gradient {
  position: relative;
  border-radius: 32px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent) 0%, #c2410c 50%, #9a3412 100%);
}

.cta-gradient::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.15), transparent 50%),
    radial-gradient(circle at 80% 30%, rgba(255, 255, 255, 0.1), transparent 40%);
}

.cta-gradient::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.06;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}

/* ═══ Scroll Reveal ═════════════════════════════════════════════════════════ */

.reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo); }
.reveal.visible { opacity: 1; transform: translateY(0); }

.reveal-left { opacity: 0; transform: translateX(-50px); transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo); }
.reveal-left.visible { opacity: 1; transform: translateX(0); }

.reveal-right { opacity: 0; transform: translateX(50px); transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo); }
.reveal-right.visible { opacity: 1; transform: translateX(0); }

.reveal-scale { opacity: 0; transform: scale(0.92); transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo); }
.reveal-scale.visible { opacity: 1; transform: scale(1); }

.stagger > *:nth-child(1) { transition-delay: 0ms; }
.stagger > *:nth-child(2) { transition-delay: 80ms; }
.stagger > *:nth-child(3) { transition-delay: 160ms; }
.stagger > *:nth-child(4) { transition-delay: 240ms; }
.stagger > *:nth-child(5) { transition-delay: 320ms; }
.stagger > *:nth-child(6) { transition-delay: 400ms; }
.stagger > *:nth-child(7) { transition-delay: 480ms; }
.stagger > *:nth-child(8) { transition-delay: 560ms; }
.stagger > *:nth-child(9) { transition-delay: 640ms; }

/* ═══ Animations ════════════════════════════════════════════════════════════ */

@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
.animate-float { animation: float 6s ease-in-out infinite; }
.animate-float-delayed { animation: float 6s ease-in-out infinite; animation-delay: -3s; }

@keyframes typewriter { from { width: 0; } to { width: 100%; } }
@keyframes blink { 50% { border-color: transparent; } }

/* ═══ Responsive ════════════════════════════════════════════════════════════ */

@media (max-width: 640px) {
  .hero-headline { font-size: clamp(2.4rem, 10vw, 3.5rem); }
  .dashboard-body { padding: 0.85rem; gap: 0.75rem; }
  .bento-item { padding: 1.5rem; }
}
`);

// ─── Base.astro ─────────────────────────────────────────────────────────────
write('layouts/Base.astro', `---
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
}

const {
  title = 'SaaS Restaurant',
  description = 'Plataforma todo-en-uno para tu restaurante',
} = Astro.props;
---
<!DOCTYPE html>
<html lang="es" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
    <script is:inline>
      (() => {
        const stored = localStorage.getItem('sr-theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored ?? (systemDark ? 'dark' : 'light');
        document.documentElement.dataset.theme = theme;
      })();
    </script>
  </head>
  <body class="min-h-screen font-body antialiased">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-white">
      Saltar al contenido
    </a>
    <slot />
    <script is:inline>
      // Theme toggle
      (() => {
        const root = document.documentElement;
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
          button.addEventListener('click', () => {
            const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
            root.dataset.theme = next;
            localStorage.setItem('sr-theme', next);
          });
        });
      })();

      // Scroll reveal via Intersection Observer
      (() => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
              }
            });
          },
          { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
        );
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => observer.observe(el));
      })();

      // Counter animation for stat numbers
      (() => {
        const animated = new Set();
        const obs = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && !animated.has(entry.target)) {
                animated.add(entry.target);
                const el = entry.target;
                const target = parseFloat(el.dataset.count || '0');
                const suffix = el.dataset.suffix || '';
                const prefix = el.dataset.prefix || '';
                const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
                const duration = 2000;
                const start = performance.now();
                const animate = (now) => {
                  const progress = Math.min((now - start) / duration, 1);
                  const eased = 1 - Math.pow(1 - progress, 4);
                  const current = eased * target;
                  el.textContent = prefix + (decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('es-AR')) + suffix;
                  if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
              }
            });
          },
          { threshold: 0.5 }
        );
        document.querySelectorAll('[data-count]').forEach((el) => obs.observe(el));
      })();
    </script>
  </body>
</html>
`);

// ─── Hero.astro ─────────────────────────────────────────────────────────────
write('components/Hero.astro', `---
const signals = [
  { label: 'Salón en vivo', color: '#10b981' },
  { label: 'Cocina sincronizada', color: '#f97316' },
  { label: 'Caja sin fricción', color: '#8b5cf6' },
];
---
<section class="relative min-h-screen flex flex-col">
  <!-- Background effects -->
  <div class="hero-mesh"></div>
  <div class="hero-grain"></div>
  <div class="hero-grid-pattern"></div>

  <!-- Navigation -->
  <nav class="relative z-10 section-shell flex items-center justify-between gap-4 py-6">
    <a href="#inicio" class="flex items-center gap-3">
      <img src="/favicon.svg" alt="SaaS Restaurant" width="40" height="40" class="h-10 w-auto rounded-xl" loading="eager" />
      <div>
        <span class="text-sm font-bold tracking-[0.2em] uppercase" style="color: var(--accent);">SaaS Restaurant</span>
      </div>
    </a>

    <div class="hidden items-center gap-8 md:flex">
      <a href="#producto" class="text-sm font-medium transition hover:text-[var(--text-primary)]" style="color: var(--text-secondary);">Producto</a>
      <a href="#funciones" class="text-sm font-medium transition hover:text-[var(--text-primary)]" style="color: var(--text-secondary);">Funciones</a>
      <a href="#ecosistema" class="text-sm font-medium transition hover:text-[var(--text-primary)]" style="color: var(--text-secondary);">Ecosistema</a>
    </div>

    <div class="flex items-center gap-3">
      <button type="button" class="rounded-full px-4 py-2 text-sm font-semibold transition" style="background: var(--surface-solid); border: 1px solid var(--surface-border); color: var(--text-secondary);" data-theme-toggle aria-label="Cambiar tema">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 inline">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </button>
      <a href="/app/login" class="hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white transition opacity-100 hover:opacity-90 sm:inline-flex" style="background: var(--accent);">
        Probar ahora
      </a>
    </div>
  </nav>

  <!-- Hero Content -->
  <main id="main-content" class="relative z-10 flex-1 section-shell grid gap-12 lg:grid-cols-[1fr_1.1fr] items-center pb-16 lg:pb-24">
    <!-- Left: Copy -->
    <div id="inicio" class="reveal">
      <span class="eyebrow">Tecnología operativa para restaurantes que no improvisan</span>
      <h1 class="hero-headline mt-8">
        Convertí el caos del servicio en una <em>máquina de venta</em> coordinada en tiempo real.
      </h1>
      <p class="mt-7 text-lg leading-8 sm:text-xl" style="color: var(--text-secondary); max-width: 42ch;">
        Pedidos, cocina, caja, delivery y reportes conectados en un sistema que se siente rápido, sólido y profesional desde el primer turno.
      </p>

      <div class="mt-9 flex flex-col gap-4 sm:flex-row">
        <a href="/app/login" class="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-glow)]" style="background: var(--accent);">
          Solicitar demo
          <svg viewBox="0 0 20 20" fill="currentColor" class="ml-2 h-4 w-4">
            <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
          </svg>
        </a>
        <a href="#producto" class="inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold transition glass-card" style="color: var(--text-secondary);">
          Explorar producto
        </a>
      </div>

      <!-- Signal pills -->
      <div class="mt-10 flex flex-wrap gap-3">
        {signals.map((s) => (
          <div class="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium glass-card" style="color: var(--text-secondary);">
            <span class="h-2 w-2 rounded-full" style={\`background: \${s.color}; box-shadow: 0 0 8px \${s.color}40;\`}></span>
            {s.label}
          </div>
        ))}
      </div>
    </div>

    <!-- Right: Dashboard mock -->
    <div class="reveal-right" style="animation-delay: 200ms;">
      <div class="dashboard-shell" style="animation: fadeInScale 1s var(--ease-out-expo) 0.3s both, float 8s ease-in-out 2s infinite;">
        <div class="dashboard-topbar">
          <div class="flex gap-2">
            <span class="dashboard-dot" style="background: #ef4444;"></span>
            <span class="dashboard-dot" style="background: #f59e0b;"></span>
            <span class="dashboard-dot" style="background: #22c55e;"></span>
          </div>
          <span class="font-mono text-xs font-semibold" style="color: var(--text-tertiary); letter-spacing: 0.08em;">
            TURNO ONLINE &bull; 18:42
          </span>
        </div>

        <div class="dashboard-body">
          <!-- Top stats row -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-2xl p-3" style="background: linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.03)); border: 1px solid rgba(249,115,22,0.12);">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Ventas</span>
              <p class="mt-1 text-2xl font-display font-normal" style="color: var(--accent);">$3.8M</p>
              <span class="text-xs font-semibold" style="color: #10b981;">+18%</span>
            </div>
            <div class="rounded-2xl p-3" style="background: var(--surface-elevated); border: 1px solid var(--surface-border);">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Tickets</span>
              <p class="mt-1 text-2xl font-display font-normal" style="color: var(--text-primary);">124</p>
              <span class="text-xs font-semibold" style="color: var(--text-tertiary);">activos</span>
            </div>
            <div class="rounded-2xl p-3" style="background: var(--surface-elevated); border: 1px solid var(--surface-border);">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Tiempo</span>
              <p class="mt-1 text-2xl font-display font-normal" style="color: var(--text-primary);">8:42</p>
              <span class="text-xs font-semibold" style="color: var(--text-tertiary);">promedio</span>
            </div>
          </div>

          <!-- Progress bars -->
          <div class="space-y-3 rounded-2xl p-4" style="background: var(--surface-elevated); border: 1px solid var(--surface-border);">
            <div>
              <div class="flex justify-between mb-1.5 text-xs font-semibold" style="color: var(--text-tertiary);">
                <span>Órdenes servidas</span><span>356 / 480</span>
              </div>
              <div class="h-2 rounded-full" style="background: rgba(148,163,184,0.15);">
                <div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style="width: 74%;"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between mb-1.5 text-xs font-semibold" style="color: var(--text-tertiary);">
                <span>Control de stock</span><span>91%</span>
              </div>
              <div class="h-2 rounded-full" style="background: rgba(148,163,184,0.15);">
                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style="width: 91%;"></div>
              </div>
            </div>
          </div>

          <!-- Bottom cards -->
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl p-3" style="background: var(--surface-elevated); border: 1px solid var(--surface-border);">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Salón</span>
              <p class="mt-1 text-lg font-semibold" style="color: var(--text-primary);">24 cubiertos</p>
            </div>
            <div class="rounded-2xl p-3" style="background: var(--surface-elevated); border: 1px solid var(--surface-border);">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Delivery</span>
              <p class="mt-1 text-lg font-semibold" style="color: var(--text-primary);">16 en ruta</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</section>
`);

// ─── TrustBar.astro ─────────────────────────────────────────────────────────
write('components/TrustBar.astro', `---
const stats = [
  { value: 847, suffix: '+', label: 'Restaurantes activos', prefix: '' },
  { value: 2.4, suffix: 'M', label: 'Órdenes procesadas', prefix: '', decimals: 1 },
  { value: 34, suffix: '%', label: 'Más rapidez en servicio', prefix: '+', decimals: 0 },
  { value: 99.8, suffix: '%', label: 'Uptime garantizado', prefix: '', decimals: 1 },
];
---
<section class="section-gap relative" style="background: var(--surface-muted);">
  <div class="section-shell">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-6 stagger">
      {stats.map((stat) => (
        <div class="stat-card text-center reveal">
          <span class="stat-number" data-count={stat.value} data-suffix={stat.suffix} data-prefix={stat.prefix} data-decimals={stat.decimals}>
            {stat.prefix}0{stat.suffix}
          </span>
          <p class="mt-3 text-sm font-semibold" style="color: var(--text-secondary);">{stat.label}</p>
        </div>
      ))}
    </div>
  </div>
</section>
`);

// ─── Features.astro ─────────────────────────────────────────────────────────
write('components/Features.astro', `---
const features = [
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="7" y1="8" x2="17" y2="8" /><line x1="7" y1="12" x2="13" y2="12" /><circle cx="17" cy="16" r="1" /><circle cx="13" cy="16" r="1" /></svg>',
    title: 'Punto de venta intuitivo',
    description: 'Interfaz diseñada para velocidad. Tomar órdenes, agregar notas y procesar pagos en segundos.',
    span: 'lg:col-span-2',
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6"><path d="M3 11h18M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M6 11v6a2 2 0 002 2h8a2 2 0 002-2v-6M9 16h6" /></svg>',
    title: 'Cocina sincronizada',
    description: 'KDS por estación con prioridades, notas visibles y flujo continuo.',
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>',
    title: 'Reportes en tiempo real',
    description: 'Métricas de ventas, costos y performance del equipo al instante.',
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" /></svg>',
    title: 'Pagos flexibles',
    description: 'Efectivo, tarjeta, cuentas divididas, propinas y pagos sin conexión.',
  },
  {
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-6 w-6"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>',
    title: 'Planos de salón',
    description: 'Mapas vivos con estados de mesa, ocupación y alertas para coordinar el servicio.',
    span: 'lg:col-span-2',
  },
];
---
<section id="funciones" class="section-gap">
  <div class="section-shell">
    <div class="max-w-3xl reveal">
      <span class="eyebrow">Funciones clave</span>
      <h2 class="section-title mt-6">Todo lo que tu restaurante necesita, bien resuelto.</h2>
      <p class="section-subtitle mt-5">
        No dependemos de una sola promesa: combinamos caja, salón, cocina, cobro y seguimiento con herramientas concretas que el equipo realmente usa.
      </p>
    </div>

    <div class="mt-14 grid gap-5 md:grid-cols-3 stagger">
      {features.map((f) => (
        <article class={\`bento-item reveal \${f.span || ''}\`}>
          <div class="bento-content">
            <div class="bento-icon" set:html={f.icon} />
            <h3 class="text-xl font-semibold" style="color: var(--text-primary);">{f.title}</h3>
            <p class="mt-3 text-sm leading-7" style="color: var(--text-secondary);">{f.description}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
</section>
`);

// ─── HowItWorks.astro ───────────────────────────────────────────────────────
write('components/HowItWorks.astro', `---
const tabs = [
  {
    id: 'pos',
    label: 'Punto de Venta',
    kicker: 'Interfaz de venta',
    title: 'Un POS que se siente tan rápido como pensar.',
    copy: 'Categorías por colores, productos con fotos, notas por ítem y cierre de cuenta en un toque. Diseñado para que cualquier mesero lo domine en minutos.',
  },
  {
    id: 'kds',
    label: 'Cocina (KDS)',
    kicker: 'Preparación',
    title: 'La cocina ve exactamente qué preparar, en orden.',
    copy: 'Pantallas de preparación con prioridad, tiempo transcurrido, notas del cliente y flujo continuo. Sin tickets de papel perdidos.',
  },
  {
    id: 'reportes',
    label: 'Reportes',
    kicker: 'Inteligencia',
    title: 'Los números de tu restaurante, en tiempo real.',
    copy: 'Ventas por turno, productos más vendidos, rendimiento por empleado y alertas de stock. Decisiones con datos, no con intuición.',
  },
];
---
<section id="producto" class="section-gap" style="background: var(--surface-muted);">
  <div class="section-shell">
    <div class="text-center max-w-3xl mx-auto reveal">
      <span class="eyebrow">El producto</span>
      <h2 class="section-title mt-6">Diseñado para fluir con tu operación.</h2>
      <p class="section-subtitle mt-5 mx-auto">
        Cada pantalla fue pensada para resolver un momento real del servicio. Sin pantallas de más, sin clics de más.
      </p>
    </div>

    <!-- Tabs -->
    <div class="mt-12 flex justify-center reveal">
      <div class="showcase-tabs" id="showcase-tabs">
        {tabs.map((tab, i) => (
          <button class={\`showcase-tab \${i === 0 ? 'active' : ''}\`} data-tab={tab.id}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>

    <!-- Tab Content -->
    <div class="mt-12 grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center reveal-scale" id="showcase-content">
      <!-- Text -->
      <div>
        <span class="eyebrow">{tabs[0].kicker}</span>
        <h3 class="section-title mt-5">{tabs[0].title}</h3>
        <p class="section-subtitle mt-4">{tabs[0].copy}</p>
        <div class="mt-8 flex flex-wrap gap-2" id="showcase-tags">
          <span class="rounded-full px-4 py-2 text-xs font-bold" style="background: var(--accent-glow); color: var(--accent);">Rápido</span>
          <span class="rounded-full px-4 py-2 text-xs font-bold" style="background: var(--accent-glow); color: var(--accent);">Intuitivo</span>
          <span class="rounded-full px-4 py-2 text-xs font-bold" style="background: var(--accent-glow); color: var(--accent);">Profesional</span>
        </div>
      </div>

      <!-- Mock Screen -->
      <div class="rounded-3xl p-5" style="background: linear-gradient(135deg, var(--surface-solid), var(--surface-elevated)); border: 1px solid var(--surface-border-strong); box-shadow: var(--shadow-lg);">
        <div class="flex gap-2 mb-4">
          <span class="h-3 w-3 rounded-full" style="background: #ef4444;"></span>
          <span class="h-3 w-3 rounded-full" style="background: #f59e0b;"></span>
          <span class="h-3 w-3 rounded-full" style="background: #22c55e;"></span>
        </div>
        <div class="rounded-2xl p-4" id="showcase-mock" style="background: var(--surface-elevated); border: 1px solid var(--surface-border); min-height: 320px;">
          <!-- POS Mock -->
          <div id="mock-pos">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Mesa 12 &bull; Salón</span>
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background: rgba(16,185,129,0.15); color: #10b981;">Activa</span>
            </div>
            <div class="grid grid-cols-4 gap-2 mb-4">
              <div class="rounded-xl p-3 text-center text-xs font-semibold" style="background: var(--accent-glow); color: var(--accent);">Bebidas</div>
              <div class="rounded-xl p-3 text-center text-xs font-semibold" style="background: var(--surface-muted); color: var(--text-secondary);">Entradas</div>
              <div class="rounded-xl p-3 text-center text-xs font-semibold" style="background: var(--surface-muted); color: var(--text-secondary);">Platos</div>
              <div class="rounded-xl p-3 text-center text-xs font-semibold" style="background: var(--surface-muted); color: var(--text-secondary);">Postres</div>
            </div>
            <div class="space-y-2">
              <div class="flex items-center justify-between rounded-xl p-3" style="background: var(--surface-muted);">
                <span class="text-sm font-medium" style="color: var(--text-primary);">Coca-Cola</span>
                <span class="text-sm font-semibold" style="color: var(--accent);">$2.500</span>
              </div>
              <div class="flex items-center justify-between rounded-xl p-3" style="background: var(--surface-muted);">
                <span class="text-sm font-medium" style="color: var(--text-primary);">Milanesa Napolitana</span>
                <span class="text-sm font-semibold" style="color: var(--accent);">$12.800</span>
              </div>
              <div class="flex items-center justify-between rounded-xl p-3" style="background: var(--surface-muted);">
                <span class="text-sm font-medium" style="color: var(--text-primary);">Empanadas x6</span>
                <span class="text-sm font-semibold" style="color: var(--accent);">$7.200</span>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between rounded-xl p-3" style="background: linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04)); border: 1px solid rgba(249,115,22,0.15);">
              <span class="text-sm font-bold" style="color: var(--text-primary);">Total</span>
              <span class="text-lg font-display font-normal" style="color: var(--accent);">$22.500</span>
            </div>
          </div>

          <!-- KDS Mock (hidden by default) -->
          <div id="mock-kds" style="display: none;">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Estación: Parrilla</span>
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background: rgba(249,115,22,0.15); color: var(--accent);">3 pendientes</span>
            </div>
            <div class="space-y-3">
              <div class="rounded-xl p-3" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.15);">
                <div class="flex justify-between">
                  <span class="text-sm font-bold" style="color: var(--text-primary);">Mesa 5 &bull; #1247</span>
                  <span class="text-xs font-mono font-bold" style="color: #ef4444;">12:34</span>
                </div>
                <p class="mt-1 text-sm" style="color: var(--text-secondary);">2x Lomo al paso + sin cebolla</p>
              </div>
              <div class="rounded-xl p-3" style="background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.15);">
                <div class="flex justify-between">
                  <span class="text-sm font-bold" style="color: var(--text-primary);">Mesa 12 &bull; #1248</span>
                  <span class="text-xs font-mono font-bold" style="color: var(--accent);">08:12</span>
                </div>
                <p class="mt-1 text-sm" style="color: var(--text-secondary);">1x Milanesa napolitana + extra huevo</p>
              </div>
              <div class="rounded-xl p-3" style="background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15);">
                <div class="flex justify-between">
                  <span class="text-sm font-bold" style="color: var(--text-primary);">Mesa 8 &bull; #1246</span>
                  <span class="text-xs font-mono font-bold" style="color: #22c55e;">04:20</span>
                </div>
                <p class="mt-1 text-sm" style="color: var(--text-secondary);">3x Hamburguesa clásica</p>
              </div>
            </div>
          </div>

          <!-- Reports Mock (hidden by default) -->
          <div id="mock-reportes" style="display: none;">
            <div class="flex items-center justify-between mb-4">
              <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary); letter-spacing: 0.1em;">Turno noche &bull; Hoy</span>
              <span class="text-xs font-bold px-2 py-1 rounded-full" style="background: rgba(139,92,246,0.15); color: #8b5cf6;">En vivo</span>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div class="rounded-xl p-3" style="background: var(--surface-muted);">
                <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary);">Ingresos</span>
                <p class="text-xl font-display" style="color: var(--accent);">$3.850.000</p>
              </div>
              <div class="rounded-xl p-3" style="background: var(--surface-muted);">
                <span class="text-xs font-bold uppercase" style="color: var(--text-tertiary);">Órdenes</span>
                <p class="text-xl font-display" style="color: var(--text-primary);">356</p>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-sm" style="color: var(--text-secondary);">
                <span>⭐ Milanesa Napolitana</span><span class="font-semibold" style="color: var(--text-primary);">87 u.</span>
              </div>
              <div class="flex justify-between text-sm" style="color: var(--text-secondary);">
                <span>⭐ Lomo al paso</span><span class="font-semibold" style="color: var(--text-primary);">64 u.</span>
              </div>
              <div class="flex justify-between text-sm" style="color: var(--text-secondary);">
                <span>⭐ Empanadas x6</span><span class="font-semibold" style="color: var(--text-primary);">52 u.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<script is:inline>
  (() => {
    const tabData = {
      pos: {
        kicker: 'Interfaz de venta',
        title: 'Un POS que se siente tan rápido como pensar.',
        copy: 'Categorías por colores, productos con fotos, notas por ítem y cierre de cuenta en un toque. Diseñado para que cualquier mesero lo domine en minutos.',
        tags: ['Rápido', 'Intuitivo', 'Profesional'],
      },
      kds: {
        kicker: 'Preparación',
        title: 'La cocina ve exactamente qué preparar, en orden.',
        copy: 'Pantallas de preparación con prioridad, tiempo transcurrido, notas del cliente y flujo continuo. Sin tickets de papel perdidos.',
        tags: ['Priorizado', 'En tiempo real', 'Sin errores'],
      },
      reportes: {
        kicker: 'Inteligencia',
        title: 'Los números de tu restaurante, en tiempo real.',
        copy: 'Ventas por turno, productos más vendidos, rendimiento por empleado y alertas de stock. Decisiones con datos, no con intuición.',
        tags: ['Live', 'Accionable', 'Automático'],
      },
    };

    document.getElementById('showcase-tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab]');
      if (!btn) return;
      const id = btn.dataset.tab;

      // Update active tab
      document.querySelectorAll('.showcase-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');

      // Update mock
      document.querySelectorAll('[id^="mock-"]').forEach((m) => m.style.display = 'none');
      const mock = document.getElementById('mock-' + id);
      if (mock) mock.style.display = 'block';

      // Update text
      const data = tabData[id];
      if (!data) return;
      const kickerEl = document.querySelector('#showcase-content .eyebrow');
      const titleEl = document.querySelector('#showcase-content .section-title');
      const copyEl = document.querySelector('#showcase-content .section-subtitle');
      if (kickerEl) kickerEl.textContent = data.kicker;
      if (titleEl) titleEl.textContent = data.title;
      if (copyEl) copyEl.textContent = data.copy;

      // Update tags
      const tagsEl = document.getElementById('showcase-tags');
      if (tagsEl) {
        tagsEl.innerHTML = data.tags.map((t) =>
          '<span class="rounded-full px-4 py-2 text-xs font-bold" style="background: var(--accent-glow); color: var(--accent);">' + t + '</span>'
        ).join('');
      }
    });
  })();
</script>
`);

// ─── Roles.astro ────────────────────────────────────────────────────────────
write('components/Roles.astro', `---
const modules = [
  { name: 'POS', icon: '💳' },
  { name: 'Cocina', icon: '🔥' },
  { name: 'Caja', icon: '💰' },
  { name: 'Delivery', icon: '🚗' },
  { name: 'Stock', icon: '📦' },
  { name: 'Clientes', icon: '👥' },
  { name: 'Reportes', icon: '📊' },
  { name: 'Compras', icon: '🛒' },
];
---
<section id="ecosistema" class="section-gap">
  <div class="section-shell">
    <div class="text-center max-w-3xl mx-auto reveal">
      <span class="eyebrow">Ecosistema operativo</span>
      <h2 class="section-title mt-6">Una plataforma para cada parte del negocio.</h2>
      <p class="section-subtitle mt-5 mx-auto">
        No se trata solo del punto de venta. Pedidos, stock, compras, clientes y crecimiento comparten la misma lógica.
      </p>
    </div>

    <!-- Orbital visualization -->
    <div class="mt-16 flex justify-center reveal-scale">
      <div class="relative" style="width: 380px; height: 380px;">
        <!-- Central hub -->
        <div class="ecosystem-hub absolute" style="left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 2;">
          <span class="text-white text-sm font-bold text-center leading-tight">SaaS<br/>Restaurant</span>
        </div>

        <!-- Orbital ring -->
        <div class="absolute rounded-full" style="left: 50%; top: 50%; transform: translate(-50%, -50%); width: 300px; height: 300px; border: 1px dashed; border-color: var(--accent-glow); opacity: 0.4;"></div>

        <!-- Module nodes arranged in circle -->
        {modules.map((mod, i) => {
          const angle = (i / modules.length) * 2 * Math.PI - Math.PI / 2;
          const radius = 150;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <div
              class="ecosystem-node absolute"
              style={\`left: calc(50% + \${x}px - 36px); top: calc(50% + \${y}px - 36px); z-index: 3;\`}
            >
              <span class="text-center leading-tight">{mod.icon}<br/><span class="text-[0.6rem]">{mod.name}</span></span>
            </div>
          );
        })}
      </div>
    </div>

    <!-- Result callout -->
    <div class="mt-16 glass-card rounded-3xl p-8 lg:p-10 reveal" style="border-color: var(--surface-border);">
      <div class="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <span class="eyebrow">Resultado</span>
          <h3 class="mt-5 text-2xl lg:text-3xl font-display font-normal" style="color: var(--text-primary);">
            Más velocidad en el servicio, más control en la caja y más visibilidad para crecer.
          </h3>
        </div>
        <blockquote class="rounded-2xl p-6 text-base leading-8" style="background: var(--surface-muted); border: 1px solid var(--surface-border); color: var(--text-secondary);">
          "Cuando la operación se entiende de un vistazo, el equipo deja de apagar incendios y empieza a trabajar con orden."
        </blockquote>
      </div>
    </div>
  </div>
</section>
`);

// ─── CTA.astro ──────────────────────────────────────────────────────────────
write('components/CTA.astro', `---
---
<section class="section-gap">
  <div class="section-shell">
    <div class="cta-gradient relative z-10 px-8 py-16 sm:px-12 lg:px-20 text-center reveal">
      <span class="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] mb-8" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.25);">
        Empieza hoy
      </span>
      <h2 class="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-white leading-tight max-w-3xl mx-auto" style="text-wrap: balance;">
        Tu restaurante merece una operación que se sienta profesional en cada turno.
      </h2>
      <p class="mt-6 text-base sm:text-lg leading-7 max-w-2xl mx-auto" style="color: rgba(255,255,255,0.8);">
        Unificá salón, cocina, caja y delivery en una sola plataforma. Sin complejidad, sin demoras.
      </p>
      <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/app/login" class="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold transition" style="background: white; color: #c2410c;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 16px 40px rgba(0,0,0,0.2)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
          Solicitar demo gratis
          <svg viewBox="0 0 20 20" fill="currentColor" class="ml-2 h-4 w-4">
            <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
          </svg>
        </a>
        <a href="#inicio" class="inline-flex items-center justify-center rounded-full px-8 py-4 text-base font-bold transition" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.25);" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
          Volver arriba
        </a>
      </div>
    </div>
  </div>
</section>
`);

// ─── Footer.astro ───────────────────────────────────────────────────────────
write('components/Footer.astro', `---
const year = new Date().getFullYear();
---
<footer class="py-10">
  <div class="section-shell">
    <div class="flex flex-col gap-8 border-t pt-8 lg:flex-row lg:items-center lg:justify-between" style="border-color: var(--surface-border);">
      <div class="flex items-center gap-4">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" class="h-5 w-5">
            <path d="M3 11h18M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M6 11v6a2 2 0 002 2h8a2 2 0 002-2v-6M9 16h6" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold tracking-[0.2em] uppercase" style="color: var(--accent);">SaaS Restaurant</p>
          <p class="text-sm" style="color: var(--text-tertiary);">POS y operación moderna para restaurantes</p>
        </div>
      </div>

      <nav class="flex flex-wrap gap-5 text-sm" style="color: var(--text-secondary);">
        <a href="#producto" class="transition hover:opacity-80">Producto</a>
        <a href="#funciones" class="transition hover:opacity-80">Funciones</a>
        <a href="#ecosistema" class="transition hover:opacity-80">Ecosistema</a>
        <a href="/app/login" class="transition hover:opacity-80">Ingresar</a>
      </nav>

      <p class="text-sm" style="color: var(--text-tertiary);">&copy; \{year} SaaS Restaurant. Todos los derechos reservados.</p>
    </div>
  </div>
</footer>
`);

// ─── index.astro ────────────────────────────────────────────────────────────
write('pages/index.astro', `---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import TrustBar from '../components/TrustBar.astro';
import Features from '../components/Features.astro';
import HowItWorks from '../components/HowItWorks.astro';
import Roles from '../components/Roles.astro';
import CTA from '../components/CTA.astro';
import Footer from '../components/Footer.astro';
---
<Base
  title="SaaS Restaurant | POS moderno para restaurantes"
  description="Gestioná salón, cocina, inventario y reportes desde una sola plataforma moderna para restaurantes."
>
  <Hero />
  <TrustBar />
  <Features />
  <HowItWorks />
  <Roles />
  <CTA />
  <Footer />
</Base>
`);

console.log('\n🎉 All landing page files generated successfully!');
