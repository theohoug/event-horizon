# CYCLE 122 — OVERLAY FIX + PARTICLE COLD + GATE FLASH
**Heure** : ~10h30

---

## CHANGEMENTS APPLIQUÉS (4 fixes)

### 1. body::after warm bleed fix
- Reduced CSS gradient opacity: 0.04→0.025, 0.03→0.015, 0.06→0.04
- Added JS-driven `--overlay-opacity` CSS variable
- Fades to 0 between scroll 0.6-0.8
- IMPACT: no more CSS warm overlay during void/remains/credits

### 2. Particle cold shift at deep scroll
- In render.frag: deepDesaturate at scroll 0.82-0.95
- `mix(color, vec3(luma*0.8, luma*0.82, luma*1.1), 0.5)`
- Deeper scroll tint: vec3(0.15, 0.12, 0.35) (was 0.2, 0.15, 0.4)
- IMPACT: particles themselves become colder at remains/void

### 3. Film gate flash at chapter transitions
- Rectangular warm edge glow during chapterFlash
- `max(abs(center.x*1.2), abs(center.y*0.8))` — anamorphic gate shape
- Subtle warm: vec3(0.08, 0.04, 0.01) * 0.3
- IMPACT: more cinematic chapter transitions

### 4. Angular chromatic already from C120

---

## SCORES

| Catégorie | C121 | C122 | Delta |
|-----------|------|------|-------|
| Design | 8.5 | 8.5 | 0 |
| Créativité | 7.5 | 7.5 | 0 |
| Contenu | 7.0 | 7.0 | 0 |
| Usabilité | 6.0 | 6.0 | 0 |
| Développeur | 7.5 | 7.5 | 0 |
| Émotion | 8.0 | 8.0 | 0 |
| **TOTAL** | **44.5/60** | **44.5/60 (74.2%)** | **0** |

Foundation fixes, no visible score change yet. Particle cold will compound.

## BUNDLE
| Asset | Raw | Gzip |
|-------|-----|------|
| JS | 297.04 KB | 94.05 KB |
