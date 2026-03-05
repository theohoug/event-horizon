# CYCLE 7 — WHITE-OUT RADIAL + HUD DRAMA + CHROMA HEARTBEAT
**Heure** : 00h57

---

## FIXES APPLIQUÉS CE CYCLE

1. **White-out radial** — Le blanc se propage maintenant depuis le centre vers les bords en cercle, pas en fade uniforme. Edge glow lumineux + flicker subtil sur les bords. L'écran est "mangé" par la lumière.
2. **HUD chapter pulse** — À chaque changement de chapitre, la distance drop brièvement (-30%), la température spike (×5), le time dilation spike (×3.5). Les valeurs HUD scale up visuellement. Le glow intensifie.
3. **Chromatic aberration heartbeat** — Le split chromatique pulse maintenant au rythme du heartbeat (×3.5 multiplicateur). Chaque battement crée un split visible — lien viscéral entre audio et distorsion visuelle.

---

## SCORING SOTY (Awwwards criteria + Émotion)

| Critère | Cycle 6 | Cycle 7 | Max | Détail |
|---------|---------|---------|-----|--------|
| **Design** | 7.5 | 7.7 | 10 | Radial white-out = cinématique. HUD pulse = vivant |
| **Créativité** | 8.5 | 8.7 | 10 | Radial wipe = UNIQUE. Heartbeat chromatic = viscéral |
| **Contenu** | 7.2 | 7.4 | 10 | HUD drama ajoute narration aux transitions |
| **Usabilité** | 6.3 | 6.4 | 10 | HUD feedback = information sensorielle en plus |
| **Développeur** | 8.6 | 8.8 | 10 | Distance-based white-out, heartbeat-synced chromatic split |
| **Émotion** | 8.5 | 8.8 | 10 | HEARTBEAT CHROMA = tu SENS les battements dans tes yeux ✓ |
| **TOTAL** | **46.6/60** | **47.8/60** | 60 | **79.7% — ZONE SOTY PROCHE** |

---

## CE QUI RESTE POUR 85%+

### 1. INTRO TITLE "EVENT HORIZON" — ENCORE TROP BASIQUE
- Letter-spacing morph = classique, pas SOTY-worthy
- **Fix : Particle-to-letter morphing OU letters qui se construisent atome par atome**
- Impact estimé : +1.5 Design, +1.0 Créativité

### 2. MANQUE UN MOMENT "BREATH" ENTRE LES SECTIONS
- Le scroll est intense non-stop
- Les meilleurs SOTY ont des moments de pause narrative
- **Fix : Ajouter des "breathing zones" avec ambiance réduite entre chapitres 4-5 et 6-7**
- Impact estimé : +0.5 Design, +1.0 Émotion

### 3. FINALE / CREDITS TROP STANDARD
- White-out radial est mieux, mais les crédits eux-mêmes manquent d'impact
- **Fix : Lettres des crédits qui s'effritent/se désintègrent en particules**

### 4. PAS DE MICRO-INTERACTION SUR LES TEXTES DE CHAPITRES
- Les textes apparaissent et c'est tout — pas de hover effect, pas de react au mouse
- **Fix : Texte qui réagit au survol (répulsion magnétique douce)**

### 5. STARFIELD STREAKING EN DEEP SCROLL
- Les étoiles devraient devenir des lignes de vitesse comme en hyperspace
- **Fix : Augmenter le streak factor dans le particle shader après 70%**

---

## PLAN CYCLE 8

### Prioritaires :
1. **Texte hover magnetic repulsion** — Les lettres des chapitres fuient le curseur quand on approche
2. **Breathing zones** — Réduire intensité visuelle entre certains chapitres pour créer du rythme
3. **Starfield streaking** — Étoiles → lignes de vitesse en deep scroll (>70%)

### Si temps :
4. Intro title particle morphing
5. Credits désintégration en particules

---

## PROCHAINE ÉTAPE
Implémenter 1-3.
