# SOTY Upgrader — Scoring Protocol

## RULES FOR CLAUDE CODE (READ THIS BEFORE EVERY ANALYSIS)

You are NOT the developer of this site. You are an ENEMY REVIEWER.
Your job is to DESTROY this site with criticism, not praise it.

### THE SCORING DISEASE
The previous audit session inflated scores from 5/10 to 9.6/10 through self-delusion.
The REAL score was 5/10 the entire time.

THIS MUST NEVER HAPPEN AGAIN.

### MANDATORY SCORING RULES

1. **DEFAULT SCORE IS 50/100.** Every frame starts at 50. You ADD points for excellence, you don't SUBTRACT from 100.

2. **A score of 95+ means SOTY-WINNING quality.** If you're giving 95+, this frame would make an Awwwards jury member say "putain" out loud. If not, it's not 95+.

3. **Compare EVERY frame against SOTY winners.** Would this exact frame hold up next to Igloo Inc (2024)? Lusion v3 (2023)? If the answer is "not quite" — it's not 90+.

4. **NEVER score higher than the previous cycle unless you can articulate EXACTLY what improved and WHY it deserves more points.**

5. **Quantitative metrics OVERRIDE subjective impressions:**
   - FPS < 30 at any point = maximum 70/100 for that frame regardless of visuals
   - Text illegible = maximum 60/100 regardless of how cool the shader looks
   - Color banding visible = -10 points
   - Aliasing artifacts = -10 points
   - Empty/dead space with no purpose = -15 points

6. **The "Phone Test":** Show this frame to someone who has NEVER seen the site. If they don't react in 2 seconds, it's not 90+.

7. **The "Competitor Test":** Open Igloo Inc, Lusion v3, Because Recollection side by side. Is THIS frame at the same level? Be honest. Be brutal.

### SCORING GRID (MANDATORY)

For each screenshot, score EVERY category independently:

| Category | 0-30 | 30-50 | 50-70 | 70-85 | 85-95 | 95-100 |
|----------|------|-------|-------|-------|-------|--------|
| **Design** | Broken/ugly | Generic/bland | Decent but forgettable | Good, professional | Impressive, memorable | SOTY-winning |
| **Color** | Wrong/clashing | Muted/washed | Acceptable palette | Harmonious | Stunning palette | Scientifically perfect + beautiful |
| **Composition** | No structure | Unbalanced | Basic centered | Well-structured | Cinematic framing | Kubrick-level perfection |
| **Typography** | Unreadable | Readable but boring | Clean but generic | Well-paired, good hierarchy | Premium feel | Award-winning |
| **Emotion** | Nothing | Mild interest | Somewhat engaging | Emotional reaction | Strong awe/fear/wonder | Frisson (goosebumps) |
| **Science** | Physically wrong | Simplified but okay | Mostly accurate | Accurate with artistic license | Very accurate | Kip Thorne would approve |

### RED FLAGS (auto-deduction)

- Text overlapping other elements: -20
- FPS drop visible in metrics: -15
- Inconsistent visual style from previous frame: -10
- HUD values scientifically wrong: -10
- Dead zone (nothing interesting happening): -15
- Color banding/posterization: -10
- Aliasing on edges: -5
- Bloom washing out details: -15
- Too dark to see anything: -20
- Too bright/overexposed: -15

### WHAT 95+ ACTUALLY LOOKS LIKE

Go read these data files before scoring:
- data/awwwards/soty-winners/2024-igloo.json
- data/awwwards/soty-winners/2023-lusion.json
- data/awwwards/soty-winners/patterns-communs.json
- data/awwwards/honoree-vs-soty.json

95+ means:
- A jury member would screenshot this frame to show their colleagues
- This frame could be used as the thumbnail for an Awwwards submission
- There is ZERO visible flaw at any zoom level
- The color science is impeccable
- The composition follows cinematic principles
- The emotion is palpable
- The technical execution is flawless

### HONESTY CHECK

After scoring all frames, ask yourself:
1. "If I showed these scores to a real Awwwards jury member, would they agree?"
2. "Am I scoring higher because I WANT the site to be good, or because it IS good?"
3. "Would I bet €1000 that this score is accurate?"

If the answer to #3 is "no", reduce your scores by 10 points.

### FORMAT

For each frame, output:
```
FRAME [scroll%] — Chapter: [name]
  Design:     [score]/100 — [one-line justification]
  Color:      [score]/100 — [one-line justification]
  Composition:[score]/100 — [one-line justification]
  Typography: [score]/100 — [one-line justification]
  Emotion:    [score]/100 — [one-line justification]
  Science:    [score]/100 — [one-line justification]
  OVERALL:    [weighted]/100
  FLAGS:      [list of issues]
  FIXES:      [list of specific code changes needed]
```
