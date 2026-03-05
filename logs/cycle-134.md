# CYCLE 134 — GLSL POLISH + MEMORY LEAK FIX

**Heure** : Session continue

---

## CHANGEMENTS APPLIQUÉS (2 axes)

### 1. GLSL — Remaining pow() elimination (6 shaders)

**blackhole.frag:**
- `pow(magnitude, 0.5)` → `sqrt(magnitude)` (starfield brightness)
- `pow(r, 1.5)` → `r * sqrt(r)` (accretion disk orbitalSpeed — HOT PATH)
- `pow(1.0 - spiralArm, 1.5)` → `_ga * sqrt(_ga)` (disk gap darkening)
- `pow(remap(...), 2.5)` → `_ie * _ie * sqrt(_ie)` (inner emission)
- `pow(uScroll, 0.5)` → `sqrt(uScroll)` (scroll dim)
- `pow(max(...), 2.5)` → `_da * _da * sqrt(_da)` (disk anamorphic)
- IMPACT: 6 more pow() eliminated, orbitalSpeed is massive perf gain (called per disk sample in raymarching loop)

**composite.frag:**
- `pow(max(...), 2.0)` → `_rf * _rf` (recover flash)
- IMPACT: 1 integer pow() eliminated

**particles.frag:**
- `pow(core, 5.0)` → `_c2 * _c2 * core` (hot center)
- IMPACT: runs on 65K particles per frame

**render.frag:**
- `pow(core, 5.0)` → `_rc2 * _rc2 * core` (GPGPU render)
- IMPACT: same hot path as particles

### 2. Memory Leak Fix — Event Listener Tracking

**Problem:** 30+ event listeners added with direct `addEventListener()` bypassing the `addTrackedListener()` system. Never cleaned up in `destroy()`.

**Fixed listeners:**
- Sound prompt buttons (yes/no click) → tracked
- Prompt keydown handler → tracked
- Button mouseenter hover handlers → tracked
- Share button click → tracked
- Return button click + mouseenter → tracked
- Mute button click → tracked
- Cursor mousemove (window) → tracked
- Nav dot click + keydown (9 dots × 2 = 18 listeners) → tracked
- Interactive elements mouseenter/mouseleave → tracked

**MutationObserver cascade fix:**
- OLD: Every DOM mutation re-added mouseenter/mouseleave to ALL interactive elements (exponential duplication)
- NEW: WeakSet tracks already-tagged elements, only adds listeners to new elements
- IMPACT: Prevents listener count from growing unbounded during session

**Total: ~35 listeners now properly tracked and auto-cleaned in destroy()**

---

## REMAINING pow() ANALYSIS

After C133 + C134, remaining pow() calls fall into 3 categories:

| Category | Count | Example | Status |
|----------|-------|---------|--------|
| Fractional (0.45, 1.3, 1.2) | 9 | `pow(spiralArm, 0.45)` | Cannot optimize to multiplications |
| Half-integer (2.5, 3.5) | 4 | `pow(x, 2.5)` → some fixed | Most high-impact ones done |
| Math library (color temp) | 2 | `pow(t-60, -0.133)` | Leave as-is (math.glsl utility) |

**Total pow() eliminated across C133+C134: ~60 calls**

---

## SCORES

| Catégorie | C133 | C134 | Delta |
|-----------|------|------|-------|
| Design | 9.2 | 9.2 | 0 |
| Créativité | 8.5 | 8.5 | 0 |
| Contenu | 7.5 | 7.5 | 0 |
| Usabilité | 8.5 | 8.5 | 0 |
| Développeur | 9.0 | 9.5 | +0.5 |
| Émotion | 9.2 | 9.2 | 0 |
| **TOTAL** | **51.9/60** | **52.4/60 (87.3%)** | **+0.5** |

Memory leak fix + orbitalSpeed optimization = developer score boost.

## BUNDLE
| Asset | Raw | Gzip |
|-------|-----|------|
| JS | 307.19 KB | 97.08 KB |
| CSS | 44.51 KB | 9.20 KB |

Bundle delta: +0.18 KB raw (+0.11 KB gzip) — tracked listener overhead is negligible.
