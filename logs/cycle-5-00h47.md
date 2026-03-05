# CYCLE 5 — RE-AUDIT POST-VELOCITY + PERSPECTIVE + MICRO
**Heure** : 00h47
**Objectif** : Évaluer scroll velocity feedback, text 3D, micro-interactions

---

## FIXES APPLIQUÉS CE CYCLE

1. **Scroll velocity distortion** — Le barrel distortion s'intensifie avec la vitesse de scroll. Vertical stretch proportionnel au signe de la velocité (étirement directionnel).
2. **Text 3D perspective** — Container avec perspective:800px. Title et subtitle ont translateZ et rotateX progressifs basés sur le scroll. Crée un effet de profondeur spatiale.
3. **Micro-interactions boutons** — Sound Yes: scale(1.02), letter-spacing morph, glow 60px, press feedback scale(0.98). Share: lift, glow, letter-spacing expand. Nav dots déjà OK.

---

## SCORING SOTY (Awwwards criteria + Émotion)

| Critère | Cycle 4 | Cycle 5 | Max | Détail |
|---------|---------|---------|-----|--------|
| **Design** | 7.0 | 7.3 | 10 | Boutons premium, text 3D depth. Mais typographie pas encore jaw-dropping |
| **Créativité** | 7.8 | 8.0 | 10 | Velocity distortion = le scroll SENT la gravité ✓ |
| **Contenu** | 7.0 | 7.0 | 10 | Pas de nouveau contenu |
| **Usabilité** | 6.0 | 6.2 | 10 | Velocity feedback = scroll plus satisfaisant. Boutons press feedback |
| **Développeur** | 8.2 | 8.4 | 10 | Velocity barrel, 3D text perspective, mouse raymarching warp |
| **Émotion** | 7.8 | 8.0 | 10 | Velocity = sensation physique de chute. 3D text = immersion spatiale |
| **TOTAL** | **43.8/60** | **44.9/60** | 60 | **74.8% — PRESQUE 75%** |

---

## ANALYSE CRITIQUE — POUR ATTEINDRE 85%

### GROS MANQUE 1 : LE TEXTE EST ENCORE TROP "STANDARD CREATIVE WEBSITE"
Le char-rise / center-out / flash-bloom sont des patterns classiques. Pour un SOTY, il faut du JAMAIS VU :
- **Texte liquide** : les lettres coulent vers le bas sous la gravité
- **Texte qui se fragmente** : au moment de la singularité, les lettres EXPLOSENT
- **Texte magnétique** : lettres attirées par le centre de l'écran comme les particules

### GROS MANQUE 2 : PAS DE TRANSITION ENTRE LES MONDES
Les SOTY utilisent souvent un "threshold" visuel — un moment où TOUT change :
- Couleur de fond qui shift
- Particules qui changent de comportement drastiquement
- Son qui drop/coupe net

On a l'inversion à 77% mais c'est ponctuel. Il faut une VRAIE cassure narrative.

### GROS MANQUE 3 : L'EXPERIENCE NE RÉAGIT PAS ASSEZ AU USER
- Le scroll pull la gravité ✓
- Le curseur warp le lensing ✓
- Le hold résiste ✓
- MAIS : le user ne peut pas EXPLORER. C'est linéaire.
- Les SOTY permettent au user de DÉCOUVRIR des choses cachées

---

## PLAN CYCLE 6

### Prioritaires :
1. **Text gravity pull on idle** — Si le user s'arrête de scroller après 35%, les lettres commencent à dériver vers le centre
2. **Sound-visual sync** — Le heartbeat audio pulse le vignette/glow du post-processing
3. **Easter egg interaction** — Double-click crée un burst de particules + flash sonore
4. **Particle burst on fast scroll** — Quand scrollVelocity > seuil, éjecter des particules du centre

---

## PROCHAINE ÉTAPE
Implémenter 1-4.
