# CYCLE 120 — VOID OVERRIDE + CHROMATIC ANGULAR + SCREENSHOT FIX
**Heure** : ~10h00

---

## CHANGEMENTS APPLIQUÉS (4 fixes)

### 1. Void override post-inversion
- Second void desaturation pass AFTER singularity inversion block
- `smoothstep(0.78, 0.83, uScroll)` — kicks in after inversion dies
- 70% cold desaturation + 40% global darkening
- IMPACT: void now truly dark even when singularity residual still active

### 2. Chromatic angular variation
- `1.0 + sin(chrAngle * 3.0 + uTime * 0.2) * 0.15`
- Chromatic aberration varies with angle for organic lens feel
- Active from 0.3+ scroll

### 3. Screenshot void timing
- Void screenshot now at 0.83 (was 0.80)
- Captures true void state after singularity has faded

### 4. White-out improvements
- Starts at 0.93, radius 1.4 (larger spread)
- Global white blend: `pow(whiteOutPhase, 3) * 0.5`

---

## SCORES: 44.0/60 (73.3%) — same as C119

## BUNDLE
| Asset | Raw | Gzip |
|-------|-----|------|
| JS | 295.32 KB | 93.74 KB |
