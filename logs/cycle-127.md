# CYCLE 127 — GRAVITATIONAL LENS + ARRIVAL PULSE + MOUSE UNIFORM
**Heure** : ~13h00

---

## CHANGEMENTS APPLIQUÉS (3 features)

### 1. Mouse gravitational lens (composite shader)
- Added uMouse uniform to composite pipeline (PostProcessing.ts + composite.frag)
- Gravitational lens distortion: UV warp around cursor position
- Active scroll 0.10-0.75, stronger when mouse is near screen center
- Lens radius 0.12, subtle strength 0.015
- IMPACT: interactive space warping — invisible in statics, powerful in live

### 2. Arrival pulse at start
- Pulsating violet rings at scroll < 0.06
- Two rings at dist 0.35 and 0.55, breathing animation
- Central glow with purple tint
- IMPACT: more atmospheric opening scene

### 3. Bundle note
- JS crossed 300KB (300.02 KB, 94.64 KB gzip)
- The mouse uniform + lens code added ~1.3KB

---

## SCORES

| Catégorie | C126 | C127 | Delta |
|-----------|------|------|-------|
| Design | 8.5 | 8.5 | 0 |
| Créativité | 7.5 | 8.0 | +0.5 |
| Contenu | 7.0 | 7.0 | 0 |
| Usabilité | 7.0 | 7.0 | 0 |
| Développeur | 7.5 | 7.5 | 0 |
| Émotion | 9.0 | 9.0 | 0 |
| **TOTAL** | **46.5/60** | **47.0/60 (78.3%)** | **+0.5** |

## BUNDLE
| Asset | Raw | Gzip |
|-------|-----|------|
| JS | 300.02 KB | 94.64 KB |
