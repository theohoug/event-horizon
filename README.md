# Event Horizon — Immersive WebGL Experience

A scroll-driven journey into a black hole. 9 chapters, real-time WebGL, procedural shaders.

[![Awwwards Honorable Mention](https://img.shields.io/badge/Awwwards-Honorable%20Mention-black?style=flat-square)](https://www.awwwards.com)

**Live:** [event-horizon-blond.vercel.app](https://event-horizon-blond.vercel.app)

---

## Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite + TypeScript |
| 3D / WebGL | Three.js |
| Shaders | GLSL (via vite-plugin-glsl) |
| Animation | GSAP |
| Scroll | Lenis |

---

## Features

- **9-chapter scroll narrative** — each chapter is a distinct cinematic scene driven by scroll progress
- **Procedural shaders** — custom GLSL for accretion disk, gravitational lensing, nebula, and particle fields
- **Companion phone sync** — secondary screen synchronised in real time via QR code pairing (Supabase Realtime)
- **Cinematic auto-scroll** — automated cinematic sequences triggered at key story beats
- **Physics research** — gravitational lensing approximated from real Schwarzschild metric equations
- **Honorable Mention** — recognised by Awwwards jury for Design, Creativity, and Usability

---

## Development

```bash
npm install
npm run dev        # dev server on localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

---

## Project structure

```
src/
  core/            # Three.js scene, camera, renderer
  chapters/        # One file per chapter (ch1–ch9)
  shaders/         # GLSL vertex + fragment shaders
  systems/         # Scroll, audio, companion sync
static/            # OG image, touch icons
```

---

*Crafted by [Cleanlystudio](https://cleanlystudio.com)*
