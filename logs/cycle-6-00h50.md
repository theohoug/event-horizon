# CYCLE 6 — RE-AUDIT POST-IDLE DRIFT + SOUND SYNC + EASTER EGG + GLITCH
**Heure** : 00h50

---

## FIXES APPLIQUÉS CE CYCLE

1. **Text idle drift** — Après 2s d'inactivité à scroll >25%, les lettres commencent à dériver vers le centre (simulation de gravité textuelle). Intensity progressive, max 30%.
2. **Heartbeat visual sync** — Le vignette pulse au rythme du heartbeat audio (même BPM). Crée un lien audio-visuel viscéral.
3. **Double-click easter egg** — 2 shockwaves simultanées (fast + slow) + flash + son de transition chapitre. Récompense l'exploration.
4. **Deep space glitch** — Entre 60-80% scroll, glitch aléatoire toutes les ~1.5s : tear horizontal avec chromatic split sur des bandes aléatoires. Reality is breaking.

---

## SCORING SOTY (Awwwards criteria + Émotion)

| Critère | Cycle 5 | Cycle 6 | Max | Détail |
|---------|---------|---------|-----|--------|
| **Design** | 7.3 | 7.5 | 10 | Glitch adds visual depth. Mais typographie title encore basic |
| **Créativité** | 8.0 | 8.5 | 10 | Idle drift = UNIQUE. Double-click easter egg = découverte. Deep glitch = tension |
| **Contenu** | 7.0 | 7.2 | 10 | L'idle drift ajoute de la narration passive |
| **Usabilité** | 6.2 | 6.3 | 10 | Easter egg = engagement. Heartbeat vignette = feedback sensoriel |
| **Développeur** | 8.4 | 8.6 | 10 | Block glitch shader, idle gravity text, audio-visual sync |
| **Émotion** | 8.0 | 8.5 | 10 | HEARTBEAT VIGNETTE = sensation physique ✓. Idle drift = angoisse de l'attente |
| **TOTAL** | **44.9/60** | **46.6/60** | 60 | **77.7% — ZONE SOTY APPROCHÉE** |

---

## CE QUI RESTE POUR 85%+

### 1. LA TYPOGRAPHIE DU TITRE "EVENT HORIZON" DANS L'INTRO
- C'est du letter-spacing morph basique
- Les SOTY winners ont des titres qui se construisent de façon inoubliable
- **Fix : particles → letters morphing, ou letters qui tombent une par une en gravité**

### 2. LES CHAPITRES ONT ENCORE DU VIDE ENTRE EUX
- Même réduits à 250vh, il y a du scroll vide
- **Fix : ajouter des données HUD dynamiques qui changent entre les chapitres**
- **Fix : micro-animations dans le background entre les textes**

### 3. PAS DE SON SPATIAL / 3D
- L'audio est mono/stéréo
- Les SOTY avec audio ont souvent du spatial audio
- **Fix : pan audio basé sur la position mouse**

### 4. LE WHITE-OUT FINAL EST TROP SIMPLE
- C'est un mix vers blanc
- **Fix : le blanc devrait "manger" l'écran depuis le centre, pas fade uniforme**

### 5. PERFORMANCE CHECK
- 28 modules, 248 kB JS
- Pas de lazy loading
- Le black hole shader est 600 lignes — potentiellement lourd sur GPU moyen
- **Devrait être OK pour la plupart des machines mais à monitorer**

---

## PLAN CYCLE 7

### Prioritaires :
1. **White-out radial** — Le blanc se propage depuis le centre, pas un fade uniforme
2. **HUD data animation entre chapitres** — Température qui spike, distance qui chute rapidement
3. **Chroma split intensification** — Le chromatic aberration devrait spike plus fort au heartbeat

### Si temps :
4. Améliorer le starfield streaking en deep scroll
5. Audio pan basé sur mouse position

---

## PROCHAINE ÉTAPE
Implémenter 1-3.
