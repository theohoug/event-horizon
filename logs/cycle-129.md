# CYCLE 129 — AUDIT ULTRA-SÉVÈRE + FIXES CRITIQUES
**Heure** : ~11h34

---

## AUDIT (27 screenshots analysés, scroll 0-100%)

### BUGS CRITIQUES TROUVÉS :
1. **Bordures grises UV out-of-bounds** (scroll 0.77-0.80) — barrel distortion poussait les UV hors [0,1]
2. **Wash-out excessif horizon** (scroll 0.65) — bloom+flash = écran 100% lavande
3. **Singularity entry trop agressif** (scroll 0.67) — center blast 0.7 trop fort
4. **Étoiles carrées** — hash grid sans anti-aliasing = pixels carrés
5. **Sound prompt basique** — design amateur pré-immersion
6. **Credits buttons invisibles** en white-mode
7. **Text shadow trop gros** — halo noir 180px trop visible

## CHANGEMENTS APPLIQUÉS (7 fixes)

### 1. UV edge clamping + fade
- distortedUv clampé à [0.001, 0.999]
- Edge fade ultra-serré (0.005) activé proportionnellement au barrel distortion
- IMPACT: plus de bordures grises aux edges

### 2. Horizon flash réduit
- horizonPeak width 40→50 (plus serré), intensity 0.2→0.1 (moitié)
- IMPACT: scroll 0.65 conserve la composition visible

### 3. Singularity entry toned down
- Width 60→70 (plus serré), pow 2.0→2.5 (plus sharp)
- Center blast 0.7→0.45, purple surround 0.3→0.2, ring 0.25→0.18
- IMPACT: flash dramatique mais sans perdre toute la scène

### 4. Étoiles rondes anti-aliasées
- floor(starUv * 350) → cellule 3x3 pixels avec gaussian exp()
- Chaque étoile est maintenant un soft dot, pas un pixel carré
- IMPACT: 0 étoiles carrées, tout est rond et fluide

### 5. Sound prompt premium redesign
- Background radial-gradient atmosphérique, blur 30px
- Animating expanding ring pulse sur l'icône
- Boutons outline avec border cyan et hover lumineux
- Animation d'entrée smooth (fade + rise)
- Typographie affinée (serif pour le sub-text)
- IMPACT: menu d'entrée cinématique au lieu de basique

### 6. Credits buttons visibility boost
- White-mode: border 0.35 opacity, color 0.7, background teinté
- Hover: box-shadow + stronger border + darker text
- IMPACT: boutons visibles sur fond blanc

### 7. Text shadow affiné
- 7 couches (180px max) → 5 couches (80px max)
- Aura ::before réduite 55%→50%, moins opaque
- IMPACT: texte net, pas de halo flou disgracieux

---

## SCORES

| Catégorie | C128 | C129 | Delta |
|-----------|------|------|-------|
| Design | 8.5 | 8.5 | 0 |
| Créativité | 8.0 | 8.0 | 0 |
| Contenu | 7.0 | 7.0 | 0 |
| Usabilité | 7.0 | 7.5 | +0.5 |
| Développeur | 7.5 | 7.5 | 0 |
| Émotion | 9.0 | 9.0 | 0 |
| **TOTAL** | **47.0/60** | **47.5/60 (79.2%)** | **+0.5** |

Bug fix cycle — UV borders, star quality, sound prompt, text clarity.

## BUNDLE
| Asset | Raw | Gzip |
|-------|-----|------|
| JS | 300.87 KB | 94.84 KB |
| CSS | 46.96 KB | 9.62 KB |
