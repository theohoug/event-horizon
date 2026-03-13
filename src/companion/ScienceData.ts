/**
 * @file ScienceData.ts
 * @description Per-chapter scientific documentation for the companion experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

export interface ScienceSection {
  heading: string;
  body: string;
}

export interface ScienceMetric {
  label: string;
  value: string;
  unit?: string;
}

export interface ChapterScience {
  whatYouSee: string;
  sections: ScienceSection[];
  metrics: ScienceMetric[];
  funFact: string;
}

const en: ChapterScience[] = [
  {
    whatYouSee: 'From a safe distance, you observe a supermassive black hole. Its shadow, a perfect circle of absolute darkness, is surrounded by the warped light of distant stars and a glowing accretion disk.',
    sections: [
      {
        heading: 'What Is a Black Hole?',
        body: 'A region of spacetime where gravity is so extreme that nothing can escape, not even light. Predicted by Einstein\u2019s General Relativity in 1915, the term \u201Cblack hole\u201D was coined by John Wheeler in 1967. They form when massive stars collapse at the end of their lives, compressing their mass into an infinitely small point.',
      },
      {
        heading: 'First Ever Photograph',
        body: 'On April 10, 2019, the Event Horizon Telescope captured the first-ever image of a black hole: M87*, a 6.5 billion solar mass giant 54.7 million light-years away. In 2022, they imaged Sgr A*, our own galaxy\u2019s 4.3 million solar mass black hole. Both shadows match Einstein\u2019s predictions within 17%.',
      },
      {
        heading: 'The Black Hole in This Experience',
        body: 'This simulation models a 10 billion solar mass Schwarzschild (non-rotating) black hole. Its event horizon spans 197 AU, larger than our entire solar system. The accretion disk reaches temperatures of 85,000 K near its inner edge, glowing blue-white.',
      },
    ],
    metrics: [
      { label: 'MASS', value: '10\u00B9\u2070', unit: 'solar masses' },
      { label: 'EVENT HORIZON', value: '197', unit: 'AU (astronomical units)' },
      { label: 'SHADOW RADIUS', value: '2.598', unit: '\u00D7 Schwarzschild radius' },
      { label: 'DISK PEAK TEMP', value: '85,000', unit: 'Kelvin' },
    ],
    funFact: 'If you replaced our Sun with this black hole, its event horizon would extend past the orbit of Pluto and then some. Its shadow would be 2.6\u00D7 larger still.',
  },
  {
    whatYouSee: 'Spacetime begins to curve. The stars in the background shift and stretch as the black hole\u2019s gravity bends their light. You feel the invisible pull.',
    sections: [
      {
        heading: 'Schwarzschild Geometry',
        body: 'Karl Schwarzschild solved Einstein\u2019s field equations in 1916, just months after General Relativity was published, while serving on the WWI front. His solution describes the geometry of spacetime around a non-rotating, uncharged mass. The metric: ds\u00B2 = -(1 - Rs/r)c\u00B2dt\u00B2 + (1 - Rs/r)\u207B\u00B9dr\u00B2 + r\u00B2d\u03A9\u00B2.',
      },
      {
        heading: 'The Schwarzschild Radius',
        body: 'Rs = 2GM/c\u00B2. For our black hole: Rs = 29.5 billion km (197 AU). This defines the event horizon, the point of no return. Any closer, and even light cannot escape the gravitational pull.',
      },
      {
        heading: 'Critical Boundaries',
        body: 'Several key radii define the black hole\u2019s structure. The ISCO (Innermost Stable Circular Orbit) at 3.0 Rs is where the accretion disk\u2019s inner edge lies. The photon sphere at 1.5 Rs traps light. The event horizon at 1.0 Rs is the boundary from which nothing returns.',
      },
    ],
    metrics: [
      { label: 'SCHWARZSCHILD RADIUS', value: '29.5B', unit: 'km' },
      { label: 'ISCO', value: '3.0', unit: 'Rs (inner disk edge)' },
      { label: 'PHOTON SPHERE', value: '1.5', unit: 'Rs' },
      { label: 'EVENT HORIZON', value: '1.0', unit: 'Rs' },
    ],
    funFact: 'The Schwarzschild radius grows linearly with mass. Double the mass, double the radius. A black hole with Earth\u2019s mass would be just 9mm across, the size of a marble.',
  },
  {
    whatYouSee: 'Light bends dramatically around the black hole. Stars that should be hidden behind it become visible as their light curves around the gravitational well. The Einstein ring shimmers.',
    sections: [
      {
        heading: 'Gravitational Lensing',
        body: 'Einstein predicted that mass bends light. Near a black hole, this bending is extreme. A photon\u2019s deflection depends on its impact parameter b (closest approach). At b = 1.2\u00D7 the critical value, light bends 90\u00B0. At b = 1.01\u00D7, it completes a full 360\u00B0 orbit.',
      },
      {
        heading: 'The Einstein Ring',
        body: 'When a light source is perfectly aligned behind the black hole, its light bends equally in all directions, forming a perfect circle known as the Einstein ring. This effect has been observed hundreds of times using galaxies as gravitational lenses.',
      },
      {
        heading: 'The Shadow',
        body: 'The shadow is not the event horizon. It\u2019s the photon capture cross-section: r_shadow = (3\u221A3/2) \u00D7 Rs \u2248 2.598 Rs. The EHT confirmed this with M87*, measuring 42 \u00B1 3 microarcseconds, matching General Relativity within 17%.',
      },
    ],
    metrics: [
      { label: 'CRITICAL IMPACT', value: '2.598', unit: 'Rs' },
      { label: 'M87* SHADOW', value: '42 \u00B1 3', unit: '\u03BCas (microarcseconds)' },
      { label: 'GR AGREEMENT', value: '17%', unit: 'accuracy' },
      { label: 'LENSING AT ISCO', value: '~90\u00B0', unit: 'deflection' },
    ],
    funFact: 'Gravitational lensing lets you see the BACK of the accretion disk above AND below the black hole simultaneously. Light wraps around from behind, creating a surreal doubled image.',
  },
  {
    whatYouSee: 'At 1.5 Schwarzschild radii, you reach the photon sphere. Light itself orbits the black hole here. A thin, bright photon ring marks this impossible boundary.',
    sections: [
      {
        heading: 'The Photon Sphere',
        body: 'At r = 1.5 Rs (= 3GM/c\u00B2), spacetime geometry creates a surface where photons orbit the black hole on circular paths. These orbits are unstable: the slightest perturbation sends a photon spiraling inward to capture or outward to escape.',
      },
      {
        heading: 'The Photon Ring',
        body: 'Light that nearly orbits creates the photon ring, a thin, bright feature. Each additional half-orbit produces an exponentially thinner sub-ring. The n=1 ring is brightest. The n=2 is ~500\u00D7 fainter. A proposed space mission (BHEX) aims to be the first to resolve this ring.',
      },
      {
        heading: 'Extreme Orbital Velocities',
        body: 'At the ISCO (3.0 Rs), matter orbits at 40.8% the speed of light with a Lorentz factor \u03B3 = 1.091. This extreme velocity causes the approaching side of the accretion disk to appear up to 32\u00D7 brighter than the receding side, a phenomenon called relativistic Doppler beaming, confirmed by EHT\u2019s observation of M87*\u2019s brightness asymmetry.',
      },
    ],
    metrics: [
      { label: 'PHOTON SPHERE', value: '1.5 Rs', unit: '= 44.25 billion km' },
      { label: 'ISCO VELOCITY', value: '0.408c', unit: '(122,400 km/s)' },
      { label: 'DOPPLER RATIO', value: '32:1', unit: 'brightness asymmetry' },
      { label: 'RING WIDTH RATIO', value: '500:1', unit: 'per orbit' },
    ],
    funFact: 'If you stood at the photon sphere and looked straight ahead, you would see the back of your own head. Your light would complete a full orbit around the black hole and return to your eyes.',
  },
  {
    whatYouSee: 'You cross the event horizon. There is no barrier, no wall, no sign. For a supermassive black hole this large, the crossing is perfectly smooth. You feel nothing.',
    sections: [
      {
        heading: 'Crossing the Event Horizon',
        body: 'For our 10\u00B9\u2070 M\u2609 black hole, crossing the event horizon is uneventful. Tidal forces here are only 4.6 \u00D7 10\u207B\u00B9\u00B9 m/s\u00B2 across a human body, completely imperceptible. You have 15.5 hours of proper time before reaching the singularity.',
      },
      {
        heading: 'The Outside Observer\u2019s View',
        body: 'From outside, you would appear to freeze at the horizon. Your light becomes infinitely redshifted. You fade from view, becoming dimmer and redder, asymptotically approaching the boundary. For them, you never cross. For you, it takes a finite moment.',
      },
      {
        heading: 'Inside the Horizon',
        body: 'Once inside, the singularity is in your FUTURE, not in a direction. You cannot avoid it any more than you can avoid tomorrow. The sky above becomes a shrinking bright circle, the entire outside universe compressed into an ever-narrowing window of blueshifted light.',
      },
    ],
    metrics: [
      { label: 'TIDAL FORCE AT EH', value: '4.6\u00D710\u207B\u00B9\u00B9', unit: 'm/s\u00B2' },
      { label: 'TIME TO SINGULARITY', value: '15.5', unit: 'hours (proper time)' },
      { label: 'OUTSIDE OBSERVER', value: '\u221E', unit: 'time dilation' },
      { label: 'REDSHIFT AT EH', value: '\u221E', unit: '(invisible)' },
    ],
    funFact: 'For a stellar-mass black hole (10 M\u2609), the tidal force at the event horizon is 4.7 billion g, meaning instant spaghettification. Our supermassive black hole is gentle: you get 15.5 hours of peaceful existence inside before tidal forces become fatal.',
  },
  {
    whatYouSee: 'Tidal forces intensify. The differential gravity between your head and feet stretches you into infinitely thin threads. Your atoms separate, pulled apart by the curvature of spacetime.',
    sections: [
      {
        heading: 'Tidal Forces',
        body: 'Spaghettification is caused by the gradient of gravity. The formula: a_tidal = 2GML/r\u00B3. For our black hole, this force becomes lethal only 210 km from the singularity, deep inside, far from the event horizon.',
      },
      {
        heading: 'The Kretschner Scalar',
        body: 'K = 12Rs\u00B2/r\u2076 is the invariant measure of spacetime curvature. At 10 Rs: barely noticeable (K = 10\u207B\u2075). At the photon sphere: significant (K = 1.05). At the event horizon: extreme (K = 12). At r = 0: infinite. This progression drives the visual distortion you see.',
      },
      {
        heading: 'Size Matters',
        body: 'Larger black holes are paradoxically gentler at their event horizon. A solar-mass black hole tears you apart before you even reach the horizon (4.7 billion g). Our 10-billion-solar-mass black hole? Imperceptible tidal forces at the horizon. The spaghettification threshold: only 210 km from the singularity.',
      },
    ],
    metrics: [
      { label: 'SPAGHETTIFICATION ZONE', value: '210', unit: 'km from singularity' },
      { label: 'TIDAL AT EH (1 M\u2609)', value: '4.7\u00D710\u2079', unit: 'g (instant death)' },
      { label: 'TIDAL AT EH (10\u00B9\u2070 M\u2609)', value: '~0', unit: 'g (imperceptible)' },
      { label: 'CURVATURE AT PS', value: '1.05', unit: 'K (Kretschner)' },
    ],
    funFact: 'Inside our black hole, you could comfortably live for 15.5 hours. Read a book. Have lunch. Contemplate existence. All while inevitably, inescapably falling toward the singularity.',
  },
  {
    whatYouSee: 'Time dilates to extremes. Your single heartbeat stretches across eons of external time. Civilizations rise and fall in the blink of your eye.',
    sections: [
      {
        heading: 'Gravitational Time Dilation',
        body: 'Einstein\u2019s GR predicts: d\u03C4/dt = \u221A(1 - Rs/r). At the ISCO (3.0 Rs), 1 hour for you = 1h 13min outside. At 1.01 Rs: 1 second for you = 10 seconds. At 1.001 Rs: 1 second = 31.6 seconds. At the event horizon: 1 second = eternity.',
      },
      {
        heading: 'Proof in Everyday Life',
        body: 'GPS satellites must correct for this effect. Their clocks gain 45 microseconds per day from gravitational time dilation and lose 7 \u03BCs from velocity effects = net 38 \u03BCs/day. Without correction, GPS would drift 10 km per day. Near a black hole, this effect is amplified by a factor of billions.',
      },
      {
        heading: 'The Frozen Observer',
        body: 'From outside, a falling object appears to freeze at the event horizon. Its light is infinitely redshifted: frequency drops to zero, energy drops to zero. The object fades from existence over an asymptotically infinite time. The black hole collects these \u201Cfrozen\u201D images on its surface.',
      },
    ],
    metrics: [
      { label: 'AT ISCO (3.0 Rs)', value: '1h \u2192 1h13m', unit: 'time dilation' },
      { label: 'AT 1.01 Rs', value: '1s \u2192 10s', unit: 'time dilation' },
      { label: 'AT EVENT HORIZON', value: '1s \u2192 \u221E', unit: 'time dilation' },
      { label: 'GPS CORRECTION', value: '38', unit: '\u03BCs/day' },
    ],
    funFact: 'If you hovered at 1.0001 Rs and spent 1 minute there, over 100 minutes would pass for a distant observer. Spend an hour, and 100 hours pass outside. The event horizon is a gateway to the end of time.',
  },
  {
    whatYouSee: 'The singularity. Density becomes infinite. Volume becomes zero. Spacetime curvature diverges. Every physical law you know breaks down at this point.',
    sections: [
      {
        heading: 'What Is the Singularity?',
        body: 'At r = 0, the Kretschner scalar K \u2192 \u221E. Spacetime curvature becomes infinite. Neither General Relativity nor Quantum Mechanics can describe what happens here. This is a fundamental limit of known physics. Not ignorance, but a signal that a deeper theory is needed.',
      },
      {
        heading: 'Penrose\u2019s Theorem',
        body: 'Roger Penrose proved in 1965 (Nobel Prize 2020) that singularities are inevitable once an event horizon forms. This was revolutionary: singularities aren\u2019t mathematical curiosities but physical predictions of General Relativity. Every black hole necessarily contains one.',
      },
      {
        heading: 'The Information Paradox',
        body: 'If information falls into a black hole and reaches the singularity, is it destroyed? Quantum mechanics says information cannot be destroyed. This contradiction has driven theoretical physics for 50 years. Stephen Hawking initially said information is lost; he later conceded it might be preserved, encoded on the horizon.',
      },
    ],
    metrics: [
      { label: 'CURVATURE', value: '\u221E', unit: '(Kretschner scalar)' },
      { label: 'DENSITY', value: '\u221E', unit: 'kg/m\u00B3' },
      { label: 'VOLUME', value: '0', unit: 'all mass in zero space' },
      { label: 'PENROSE PRIZE', value: '2020', unit: 'Nobel Physics' },
    ],
    funFact: 'Kip Thorne and Roger Penrose debated for decades whether singularities can be \u201Cnaked\u201D (visible without a horizon). Penrose\u2019s Cosmic Censorship Conjecture says they\u2019re always hidden. After 60 years, this conjecture remains unproven.',
  },
  {
    whatYouSee: 'Beyond the singularity. The journey ends... or does it? Even the darkest objects in the universe are not truly eternal. Something remains.',
    sections: [
      {
        heading: 'Hawking Radiation',
        body: 'In 1974, Stephen Hawking predicted that black holes emit radiation. Quantum fluctuations near the event horizon create particle pairs: one escapes, one falls in. The escaping particles carry energy away, causing the black hole to slowly shrink. Black holes are not forever.',
      },
      {
        heading: 'Temperature of Our Black Hole',
        body: 'T_H = 6.17 \u00D7 10\u207B\u00B9\u2078 K, which is 10\u00B9\u2078 times colder than the cosmic microwave background (2.725 K). Evaporation time: 10\u2079\u2077 years. For comparison, the universe is only 1.38 \u00D7 10\u00B9\u2070 years old. Our black hole is essentially eternal.',
      },
      {
        heading: 'Gravitational Waves',
        body: 'LIGO/Virgo/KAGRA have detected ~300 black hole mergers since 2015. The first (GW150914): two black holes (36 + 29 M\u2609) merging into one (62 M\u2609), radiating 3 solar masses of pure energy as gravitational waves in 0.2 seconds. The most massive merger (GW231123): 225 M\u2609, masses that shouldn\u2019t exist by stellar physics.',
      },
    ],
    metrics: [
      { label: 'HAWKING TEMP', value: '6.17\u00D710\u207B\u00B9\u2078', unit: 'Kelvin' },
      { label: 'EVAPORATION TIME', value: '10\u2079\u2077', unit: 'years' },
      { label: 'LIGO DETECTIONS', value: '~300', unit: 'mergers' },
      { label: 'GW150914 ENERGY', value: '3 M\u2609', unit: 'in 0.2 seconds' },
    ],
    funFact: 'Hawking radiation means black holes have temperature, entropy, and eventually die. The entropy of a black hole is proportional to its surface area, not its volume. This hints at the holographic principle: our 3D universe might be encoded on a 2D surface.',
  },
];

const fr: ChapterScience[] = [
  {
    whatYouSee: 'Depuis une distance s\u00FBre, vous observez un trou noir supermassif. Son ombre, un cercle parfait de noir absolu, est entour\u00E9e par la lumi\u00E8re d\u00E9form\u00E9e d\u2019\u00E9toiles lointaines et un disque d\u2019accr\u00E9tion lumineux.',
    sections: [
      {
        heading: 'Qu\u2019est-ce qu\u2019un trou noir ?',
        body: 'Une r\u00E9gion de l\u2019espace-temps o\u00F9 la gravit\u00E9 est si extr\u00EAme que rien ne peut s\u2019\u00E9chapper, pas m\u00EAme la lumi\u00E8re. Pr\u00E9dit par la Relativit\u00E9 G\u00E9n\u00E9rale d\u2019Einstein en 1915, le terme \u00AB trou noir \u00BB a \u00E9t\u00E9 invent\u00E9 par John Wheeler en 1967. Ils se forment quand des \u00E9toiles massives s\u2019effondrent, comprimant leur masse en un point infiniment petit.',
      },
      {
        heading: 'Premi\u00E8re photographie',
        body: 'Le 10 avril 2019, le t\u00E9lescope Event Horizon a captur\u00E9 la toute premi\u00E8re image d\u2019un trou noir : M87*, un g\u00E9ant de 6,5 milliards de masses solaires \u00E0 54,7 millions d\u2019ann\u00E9es-lumi\u00E8re. En 2022, ils ont imag\u00E9 Sgr A*, le trou noir de 4,3 millions de masses solaires au centre de notre galaxie. Les deux ombres correspondent aux pr\u00E9dictions d\u2019Einstein.',
      },
      {
        heading: 'Le trou noir de cette exp\u00E9rience',
        body: 'Cette simulation mod\u00E9lise un trou noir de Schwarzschild (non rotatif) de 10 milliards de masses solaires. Son horizon des \u00E9v\u00E9nements s\u2019\u00E9tend sur 197 UA, plus grand que notre syst\u00E8me solaire. Le disque d\u2019accr\u00E9tion atteint 85 000 K pr\u00E8s de son bord interne.',
      },
    ],
    metrics: [
      { label: 'MASSE', value: '10\u00B9\u2070', unit: 'masses solaires' },
      { label: 'HORIZON', value: '197', unit: 'UA (unit\u00E9s astronomiques)' },
      { label: 'RAYON D\u2019OMBRE', value: '2,598', unit: '\u00D7 rayon de Schwarzschild' },
      { label: 'TEMP. DISQUE MAX', value: '85 000', unit: 'Kelvin' },
    ],
    funFact: 'Si vous remplaciez le Soleil par ce trou noir, son horizon s\u2019\u00E9tendrait au-del\u00E0 de l\u2019orbite de Pluton. Et son ombre serait encore 2,6\u00D7 plus grande.',
  },
  {
    whatYouSee: 'L\u2019espace-temps commence \u00E0 se courber. Les \u00E9toiles en arri\u00E8re-plan se d\u00E9placent alors que la gravit\u00E9 du trou noir d\u00E9vie leur lumi\u00E8re. Vous sentez l\u2019attraction invisible.',
    sections: [
      {
        heading: 'G\u00E9om\u00E9trie de Schwarzschild',
        body: 'Karl Schwarzschild a r\u00E9solu les \u00E9quations d\u2019Einstein en 1916, quelques mois apr\u00E8s la publication de la Relativit\u00E9 G\u00E9n\u00E9rale, alors qu\u2019il servait sur le front. Sa solution d\u00E9crit la g\u00E9om\u00E9trie de l\u2019espace-temps autour d\u2019une masse non-rotative.',
      },
      {
        heading: 'Le rayon de Schwarzschild',
        body: 'Rs = 2GM/c\u00B2. Pour notre trou noir : Rs = 29,5 milliards de km (197 UA). Cela d\u00E9finit l\u2019horizon des \u00E9v\u00E9nements, le point de non-retour. Au-del\u00E0, m\u00EAme la lumi\u00E8re ne peut \u00E9chapper \u00E0 l\u2019attraction gravitationnelle.',
      },
      {
        heading: 'Les fronti\u00E8res critiques',
        body: 'L\u2019ISCO (\u00E0 3,0 Rs) est l\u2019orbite circulaire stable la plus proche : c\u2019est le bord interne du disque d\u2019accr\u00E9tion. La sph\u00E8re de photons (\u00E0 1,5 Rs) pi\u00E8ge la lumi\u00E8re. L\u2019horizon des \u00E9v\u00E9nements (\u00E0 1,0 Rs) est la fronti\u00E8re d\u2019o\u00F9 rien ne revient.',
      },
    ],
    metrics: [
      { label: 'RAYON DE SCHWARZSCHILD', value: '29,5 Mrd', unit: 'km' },
      { label: 'ISCO', value: '3,0', unit: 'Rs (bord du disque)' },
      { label: 'SPH\u00C8RE DE PHOTONS', value: '1,5', unit: 'Rs' },
      { label: 'HORIZON', value: '1,0', unit: 'Rs' },
    ],
    funFact: 'Le rayon de Schwarzschild cro\u00EEt lin\u00E9airement avec la masse. Un trou noir de la masse de la Terre ferait 9 mm de diam\u00E8tre, la taille d\u2019une bille.',
  },
  {
    whatYouSee: 'La lumi\u00E8re se courbe dramatiquement. Des \u00E9toiles cach\u00E9es derri\u00E8re le trou noir deviennent visibles, leur lumi\u00E8re contournant le puits gravitationnel. L\u2019anneau d\u2019Einstein scintille.',
    sections: [
      {
        heading: 'Lentille gravitationnelle',
        body: 'Einstein a pr\u00E9dit que la masse courbe la lumi\u00E8re. Pr\u00E8s d\u2019un trou noir, cette courbure est extr\u00EAme. La d\u00E9flexion d\u00E9pend du param\u00E8tre d\u2019impact b : \u00E0 1,2\u00D7 la valeur critique, la lumi\u00E8re d\u00E9vie de 90\u00B0. \u00C0 1,01\u00D7, elle fait un tour complet de 360\u00B0.',
      },
      {
        heading: 'L\u2019anneau d\u2019Einstein',
        body: 'Quand une source lumineuse est parfaitement align\u00E9e derri\u00E8re le trou noir, sa lumi\u00E8re se courbe \u00E9galement dans toutes les directions, formant un cercle parfait. Cet effet a \u00E9t\u00E9 observ\u00E9 des centaines de fois avec des galaxies comme lentilles.',
      },
      {
        heading: 'L\u2019ombre',
        body: 'L\u2019ombre n\u2019est pas l\u2019horizon. C\u2019est la section de capture des photons : r_ombre = (3\u221A3/2) \u00D7 Rs \u2248 2,598 Rs. L\u2019EHT a confirm\u00E9 cela avec M87*, mesurant 42 \u00B1 3 microarcsecondes, conform\u00E9ment \u00E0 la Relativit\u00E9 G\u00E9n\u00E9rale.',
      },
    ],
    metrics: [
      { label: 'PARAM\u00C8TRE CRITIQUE', value: '2,598', unit: 'Rs' },
      { label: 'OMBRE M87*', value: '42 \u00B1 3', unit: '\u03BCas (microarcsecondes)' },
      { label: 'ACCORD RG', value: '17%', unit: 'de pr\u00E9cision' },
      { label: 'D\u00C9FLEXION \u00C0 L\u2019ISCO', value: '~90\u00B0', unit: '' },
    ],
    funFact: 'La lentille gravitationnelle permet de voir le DOS du disque d\u2019accr\u00E9tion au-dessus ET en dessous du trou noir simultan\u00E9ment. La lumi\u00E8re contourne par derri\u00E8re.',
  },
  {
    whatYouSee: '\u00C0 1,5 rayon de Schwarzschild, vous atteignez la sph\u00E8re de photons. La lumi\u00E8re elle-m\u00EAme orbite ici. Un anneau fin et brillant marque cette fronti\u00E8re impossible.',
    sections: [
      {
        heading: 'La sph\u00E8re de photons',
        body: '\u00C0 r = 1,5 Rs, la g\u00E9om\u00E9trie de l\u2019espace-temps cr\u00E9e une surface o\u00F9 les photons orbitent sur des trajectoires circulaires. Ces orbites sont instables : la moindre perturbation envoie le photon vers l\u2019int\u00E9rieur ou vers l\u2019ext\u00E9rieur.',
      },
      {
        heading: 'L\u2019anneau de photons',
        body: 'La lumi\u00E8re qui orbite presque compl\u00E8tement cr\u00E9e l\u2019anneau de photons. Chaque demi-orbite suppl\u00E9mentaire produit un sous-anneau exponentiellement plus fin. L\u2019anneau n=1 est le plus brillant. Le n=2 est ~500\u00D7 plus faible. La mission spatiale BHEX vise \u00E0 r\u00E9soudre cet anneau pour la premi\u00E8re fois.',
      },
      {
        heading: 'Vitesses orbitales extr\u00EAmes',
        body: '\u00C0 l\u2019ISCO (3,0 Rs), la mati\u00E8re orbite \u00E0 40,8% de la vitesse de la lumi\u00E8re. Cette vitesse extr\u00EAme fait appara\u00EEtre le c\u00F4t\u00E9 approchant du disque jusqu\u2019\u00E0 32\u00D7 plus brillant que le c\u00F4t\u00E9 fuyant. C\u2019est le beaming Doppler relativiste, confirm\u00E9 par l\u2019EHT sur M87*.',
      },
    ],
    metrics: [
      { label: 'SPH\u00C8RE DE PHOTONS', value: '1,5 Rs', unit: '= 44,25 Mrd km' },
      { label: 'VITESSE \u00C0 L\u2019ISCO', value: '0,408c', unit: '(122 400 km/s)' },
      { label: 'RATIO DOPPLER', value: '32:1', unit: 'asym\u00E9trie' },
      { label: 'RATIO ANNEAUX', value: '500:1', unit: 'par orbite' },
    ],
    funFact: 'Si vous vous teniez sur la sph\u00E8re de photons et regardiez droit devant, vous verriez l\u2019arri\u00E8re de votre propre t\u00EAte. Votre lumi\u00E8re aurait fait le tour complet du trou noir.',
  },
  {
    whatYouSee: 'Vous franchissez l\u2019horizon des \u00E9v\u00E9nements. Il n\u2019y a aucune barri\u00E8re, aucun mur. Pour un trou noir aussi massif, la travers\u00E9e est parfaitement douce. Vous ne sentez rien.',
    sections: [
      {
        heading: 'Franchir l\u2019horizon',
        body: 'Pour notre trou noir de 10\u00B9\u2070 M\u2609, la travers\u00E9e est un non-\u00E9v\u00E9nement. Les forces de mar\u00E9e n\u2019y sont que de 4,6 \u00D7 10\u207B\u00B9\u00B9 m/s\u00B2, totalement imperceptibles. Il vous reste 15,5 heures de temps propre avant d\u2019atteindre la singularit\u00E9.',
      },
      {
        heading: 'Vue de l\u2019observateur ext\u00E9rieur',
        body: 'Depuis l\u2019ext\u00E9rieur, vous para\u00EEtriez gel\u00E9 \u00E0 l\u2019horizon. Votre lumi\u00E8re est infiniment d\u00E9cal\u00E9e vers le rouge. Vous disparaissez progressivement, devenant de plus en plus sombre, approchant asymptotiquement la fronti\u00E8re sans jamais la franchir \u00E0 leurs yeux.',
      },
      {
        heading: '\u00C0 l\u2019int\u00E9rieur',
        body: 'Une fois \u00E0 l\u2019int\u00E9rieur, la singularit\u00E9 est dans votre FUTUR, pas dans une direction. Vous ne pouvez pas plus l\u2019\u00E9viter que vous ne pouvez \u00E9viter demain. Le ciel au-dessus se r\u00E9tr\u00E9cit en un cercle lumineux, l\u2019univers ext\u00E9rieur compress\u00E9 dans une fen\u00EAtre toujours plus \u00E9troite.',
      },
    ],
    metrics: [
      { label: 'FORCE DE MAR\u00C9E', value: '4,6\u00D710\u207B\u00B9\u00B9', unit: 'm/s\u00B2' },
      { label: 'TEMPS JUSQU\u2019\u00C0 LA SINGULARIT\u00C9', value: '15,5', unit: 'heures' },
      { label: 'OBSERVATEUR EXT\u00C9RIEUR', value: '\u221E', unit: 'dilatation temporelle' },
      { label: 'REDSHIFT \u00C0 L\u2019HORIZON', value: '\u221E', unit: '(invisible)' },
    ],
    funFact: 'Pour un trou noir stellaire (10 M\u2609), la force de mar\u00E9e \u00E0 l\u2019horizon est de 4,7 milliards de g. Notre trou noir supermassif est doux : 15,5 heures d\u2019existence paisible \u00E0 l\u2019int\u00E9rieur avant que les forces deviennent fatales.',
  },
  {
    whatYouSee: 'Les forces de mar\u00E9e s\u2019intensifient. La gravit\u00E9 diff\u00E9rentielle entre votre t\u00EAte et vos pieds vous \u00E9tire en fils infiniment fins. Vos atomes se s\u00E9parent.',
    sections: [
      {
        heading: 'Forces de mar\u00E9e',
        body: 'La spaghettification est caus\u00E9e par le gradient de gravit\u00E9. La formule : a = 2GML/r\u00B3. Pour notre trou noir, cette force ne devient l\u00E9tale qu\u2019\u00E0 210 km de la singularit\u00E9, loin de l\u2019horizon.',
      },
      {
        heading: 'Le scalaire de Kretschner',
        body: 'K = 12Rs\u00B2/r\u2076 mesure la courbure de l\u2019espace-temps. \u00C0 10 Rs : quasi invisible. \u00C0 la sph\u00E8re de photons : significatif (K = 1,05). \u00C0 l\u2019horizon : extr\u00EAme (K = 12). En r = 0 : infini. Cette progression guide la distorsion visuelle.',
      },
      {
        heading: 'La taille compte',
        body: 'Les plus gros trous noirs sont paradoxalement les plus doux \u00E0 leur horizon. Un trou noir solaire vous d\u00E9chiquette avant m\u00EAme d\u2019y arriver (4,7 milliards de g). Le n\u00F4tre ? Forces imperceptibles \u00E0 l\u2019horizon. La spaghettification : seulement \u00E0 210 km de la singularit\u00E9.',
      },
    ],
    metrics: [
      { label: 'ZONE DE SPAGHETTIFICATION', value: '210', unit: 'km de la singularit\u00E9' },
      { label: 'MAR\u00C9E \u00C0 L\u2019EH (1 M\u2609)', value: '4,7\u00D710\u2079', unit: 'g (mort instantan\u00E9e)' },
      { label: 'MAR\u00C9E \u00C0 L\u2019EH (10\u00B9\u2070 M\u2609)', value: '~0', unit: 'g (imperceptible)' },
      { label: 'COURBURE \u00C0 LA SP', value: '1,05', unit: 'K (Kretschner)' },
    ],
    funFact: '\u00C0 l\u2019int\u00E9rieur de notre trou noir, vous pourriez vivre confortablement pendant 15,5 heures. Lire un livre. D\u00E9jeuner. Contempler l\u2019existence. Tout en tombant in\u00E9luctablement vers la singularit\u00E9.',
  },
  {
    whatYouSee: 'Le temps se dilate \u00E0 l\u2019extr\u00EAme. Un seul battement de c\u0153ur s\u2019\u00E9tire sur des \u00E9ons de temps ext\u00E9rieur. Des civilisations naissent et meurent en un clin d\u2019\u0153il.',
    sections: [
      {
        heading: 'Dilatation temporelle gravitationnelle',
        body: 'La RG d\u2019Einstein pr\u00E9dit : d\u03C4/dt = \u221A(1 - Rs/r). \u00C0 l\u2019ISCO (3,0 Rs) : 1h pour vous = 1h13min dehors. \u00C0 1,01 Rs : 1 seconde = 10 secondes. \u00C0 1,001 Rs : 1 seconde = 31,6 secondes. \u00C0 l\u2019horizon : 1 seconde = l\u2019\u00E9ternit\u00E9.',
      },
      {
        heading: 'La preuve au quotidien',
        body: 'Les satellites GPS doivent corriger cet effet. Leurs horloges avancent de 45 microsecondes par jour par dilatation gravitationnelle et reculent de 7 \u03BCs par effet de vitesse = net 38 \u03BCs/jour. Sans correction, le GPS d\u00E9riverait de 10 km par jour.',
      },
      {
        heading: 'L\u2019observateur gel\u00E9',
        body: 'Depuis l\u2019ext\u00E9rieur, un objet en chute semble se figer \u00E0 l\u2019horizon. Sa lumi\u00E8re est infiniment d\u00E9cal\u00E9e vers le rouge : fr\u00E9quence z\u00E9ro, \u00E9nergie z\u00E9ro. L\u2019objet s\u2019efface sur un temps asymptotiquement infini.',
      },
    ],
    metrics: [
      { label: '\u00C0 L\u2019ISCO (3,0 Rs)', value: '1h \u2192 1h13m', unit: 'dilatation' },
      { label: '\u00C0 1,01 Rs', value: '1s \u2192 10s', unit: 'dilatation' },
      { label: '\u00C0 L\u2019HORIZON', value: '1s \u2192 \u221E', unit: 'dilatation' },
      { label: 'CORRECTION GPS', value: '38', unit: '\u03BCs/jour' },
    ],
    funFact: 'Si vous restiez \u00E0 1,0001 Rs pendant 1 minute, plus de 100 minutes s\u2019\u00E9couleraient pour un observateur distant. L\u2019horizon des \u00E9v\u00E9nements est une porte vers la fin du temps.',
  },
  {
    whatYouSee: 'La singularit\u00E9. La densit\u00E9 devient infinie. Le volume devient z\u00E9ro. La courbure de l\u2019espace-temps diverge. Toutes les lois physiques s\u2019effondrent en ce point.',
    sections: [
      {
        heading: 'Qu\u2019est-ce que la singularit\u00E9 ?',
        body: 'En r = 0, le scalaire de Kretschner K \u2192 \u221E. La courbure devient infinie. Ni la Relativit\u00E9 G\u00E9n\u00E9rale ni la M\u00E9canique Quantique ne peuvent d\u00E9crire ce qui se passe ici. Ce n\u2019est pas de l\u2019ignorance, c\u2019est le signal qu\u2019une th\u00E9orie plus profonde est n\u00E9cessaire.',
      },
      {
        heading: 'Le th\u00E9or\u00E8me de Penrose',
        body: 'Roger Penrose a prouv\u00E9 en 1965 (Prix Nobel 2020) que les singularit\u00E9s sont in\u00E9vitables d\u00E8s qu\u2019un horizon se forme. R\u00E9volutionnaire : les singularit\u00E9s ne sont pas des curiosit\u00E9s math\u00E9matiques, ce sont des pr\u00E9dictions physiques de la Relativit\u00E9 G\u00E9n\u00E9rale.',
      },
      {
        heading: 'Le paradoxe de l\u2019information',
        body: 'Si l\u2019information tombe dans un trou noir et atteint la singularit\u00E9, est-elle d\u00E9truite ? La m\u00E9canique quantique dit que l\u2019information ne peut \u00EAtre d\u00E9truite. Cette contradiction anime la physique th\u00E9orique depuis 50 ans. Hawking a d\u2019abord dit que l\u2019information est perdue, puis a conc\u00E9d\u00E9 qu\u2019elle pourrait \u00EAtre encod\u00E9e sur l\u2019horizon.',
      },
    ],
    metrics: [
      { label: 'COURBURE', value: '\u221E', unit: '(scalaire de Kretschner)' },
      { label: 'DENSIT\u00C9', value: '\u221E', unit: 'kg/m\u00B3' },
      { label: 'VOLUME', value: '0', unit: 'toute la masse en z\u00E9ro espace' },
      { label: 'PRIX PENROSE', value: '2020', unit: 'Nobel de Physique' },
    ],
    funFact: 'Thorne et Penrose ont d\u00E9battu pendant des d\u00E9cennies si les singularit\u00E9s peuvent \u00EAtre \u00AB nues \u00BB (visibles sans horizon). La Conjecture de Censure Cosmique de Penrose dit qu\u2019elles sont toujours cach\u00E9es. Apr\u00E8s 60 ans, cette conjecture reste non prouv\u00E9e.',
  },
  {
    whatYouSee: 'Au-del\u00E0 de la singularit\u00E9. Le voyage se termine... ou pas ? M\u00EAme les objets les plus sombres de l\u2019univers ne sont pas \u00E9ternels. Quelque chose subsiste.',
    sections: [
      {
        heading: 'Rayonnement de Hawking',
        body: 'En 1974, Stephen Hawking a pr\u00E9dit que les trous noirs \u00E9mettent du rayonnement. Les fluctuations quantiques pr\u00E8s de l\u2019horizon cr\u00E9ent des paires de particules : l\u2019une s\u2019\u00E9chappe, l\u2019autre tombe. Les particules qui s\u2019\u00E9chappent emportent de l\u2019\u00E9nergie, causant le r\u00E9tr\u00E9cissement lent du trou noir. Les trous noirs ne sont pas \u00E9ternels.',
      },
      {
        heading: 'Temp\u00E9rature de notre trou noir',
        body: 'T_H = 6,17 \u00D7 10\u207B\u00B9\u2078 K, soit 10\u00B9\u2078 fois plus froid que le fond diffus cosmologique (2,725 K). Temps d\u2019\u00E9vaporation : 10\u2079\u2077 ans. L\u2019univers n\u2019a que 1,38 \u00D7 10\u00B9\u2070 ans. Notre trou noir est essentiellement \u00E9ternel.',
      },
      {
        heading: 'Ondes gravitationnelles',
        body: 'LIGO/Virgo/KAGRA ont d\u00E9tect\u00E9 ~300 fusions de trous noirs depuis 2015. La premi\u00E8re (GW150914) : deux trous noirs (36 + 29 M\u2609) fusionnant en un (62 M\u2609), lib\u00E9rant 3 masses solaires d\u2019\u00E9nergie pure en ondes gravitationnelles en 0,2 seconde.',
      },
    ],
    metrics: [
      { label: 'TEMP\u00C9RATURE HAWKING', value: '6,17\u00D710\u207B\u00B9\u2078', unit: 'Kelvin' },
      { label: '\u00C9VAPORATION', value: '10\u2079\u2077', unit: 'ans' },
      { label: 'D\u00C9TECTIONS LIGO', value: '~300', unit: 'fusions' },
      { label: '\u00C9NERGIE GW150914', value: '3 M\u2609', unit: 'en 0,2 seconde' },
    ],
    funFact: 'Le rayonnement de Hawking signifie que les trous noirs ont une temp\u00E9rature, une entropie, et finissent par mourir. Leur entropie est proportionnelle \u00E0 leur surface, pas leur volume. Cela sugg\u00E8re le principe holographique : notre univers 3D pourrait \u00EAtre encod\u00E9 sur une surface 2D.',
  },
];

export function getScienceData(lang: 'en' | 'fr'): ChapterScience[] {
  return lang === 'fr' ? fr : en;
}
