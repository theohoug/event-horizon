/**
 * @file translations.ts
 * @description Internationalization — EN/FR translations
 * @author Cleanlystudio
 * @version 1.0.0
 */

export type Lang = 'en' | 'fr';

interface Translations {
  chapters: { title: string; subtitle: string }[];
  chapterNames: string[];
  interstitials: string[];
  poetry: string;
  hud: { distance: string; temp: string; timeDilation: string; elapsed: string; tidalForce: string };
  loader: { title: string; sub: string; steps: string[] };
  sound: { label: string; yes: string; no: string };
  scroll: { desktop: string; mobile: string };
  credits: { sub: string; roles: { role: string; name: string }[]; footer: string };
  share: { share: string; return: string; copied: string };
  rotate: { text: string };
  fallback: { title: string; message: string };
  noscript: string;
  escape: string[];
  idle: string[];
  cosmic: Record<string, string>;
  tab: string[];
  langSwitch: string;
}

const en: Translations = {
  chapters: [
    { title: 'YOU', subtitle: '13.8 billion years after the beginning — atoms, briefly alive, looking up' },
    { title: 'THE PULL', subtitle: 'Ten billion solar masses — silent, patient — bending spacetime like a hand closing around you' },
    { title: 'THE WARP', subtitle: 'Light bends — stars stretch into arcs — straight lines no longer exist here' },
    { title: 'THE PHOTON SPHERE', subtitle: 'At 1.5 Schwarzschild radii — light itself orbits — photons trapped in endless circles — a prison made of gravity' },
    { title: 'THE FALL', subtitle: 'You cross the point of no return — and the strange thing is — you feel nothing' },
    { title: 'SPAGHETTIFICATION', subtitle: 'Tidal forces pull you apart — atom by atom — into threads thinner than light' },
    { title: 'TIME DILATION', subtitle: 'One heartbeat here — outside, civilizations rise and fall — stars are born and die' },
    { title: 'SINGULARITY', subtitle: 'Where physics breaks — where space becomes time — where infinity becomes a point' },
    { title: 'WHAT REMAINS', subtitle: 'You have one life — one brief flicker in the dark — what will you do with it?' },
  ],
  chapterNames: ['YOU', 'THE PULL', 'THE WARP', 'THE PHOTON SPHERE', 'THE FALL', 'SPAGHETTIFICATION', 'TIME DILATION', 'SINGULARITY', 'WHAT REMAINS'],
  interstitials: [
    '',
    'ten billion solar masses',
    'spacetime curves',
    'light orbits here',
    'no turning back',
    'atom by atom',
    'one heartbeat — an eternity',
    'where physics breaks',
    '',
  ],
  poetry: 'somewhere in the dark, something waits',
  hud: { distance: 'DISTANCE', temp: 'TEMP', timeDilation: 'TIME DILATION', elapsed: 'ELAPSED', tidalForce: 'TIDAL FORCE' },
  loader: {
    title: 'EVENT HORIZON',
    sub: 'Loading the void...',
    steps: [
      'Initializing WebGL context...',
      'Compiling ray tracing shaders...',
      'Building GPGPU particle system...',
      'Warming up gravitational sim...',
      'Calibrating accretion disk...',
      'Synchronizing spacetime...',
      'Event horizon locked',
    ],
  },
  sound: { label: 'Sound', yes: 'Enter with sound', no: 'Skip' },
  scroll: { desktop: 'Scroll to begin', mobile: 'Swipe to begin' },
  credits: {
    sub: 'An Interactive Journey Into a Black Hole',
    roles: [
      { role: 'Design & Development', name: 'Cleanlystudio' },
      { role: 'Sound Design', name: 'Procedural Web Audio API' },
      { role: 'Physics', name: 'Schwarzschild Geometry' },
    ],
    footer: 'A <a href="https://cleanlystudio.com" target="_blank" rel="noopener">Cleanlystudio</a> experience',
  },
  share: { share: 'Share this journey', return: 'Return to surface', copied: 'Link copied!' },
  rotate: { text: 'Best in landscape' },
  fallback: { title: 'Event Horizon', message: 'This experience requires WebGL 2.0 to render the black hole simulation. Please update your browser or enable hardware acceleration in your settings.' },
  noscript: 'This experience requires JavaScript to explore the cosmos.',
  escape: [
    'You cannot escape',
    'There is no going back',
    'The pull is absolute',
    'Resistance is meaningless',
    'Gravity has already decided',
    'Light itself cannot leave',
    'Even time bends toward the center',
    'The horizon was crossed long ago',
  ],
  idle: [
    'Keep scrolling to descend',
    'The void awaits below',
    'Continue your descent',
    'Scroll deeper into the unknown',
    'Gravity is patient',
    'The singularity calls',
    'There is more below',
  ],
  cosmic: {
    help: 'There is no help here. Only the void.',
    light: 'Light cannot escape. Neither can you.',
    time: 'Time is an illusion. The singularity is forever.',
    void: 'You are already inside.',
    escape: 'The event horizon was crossed long ago.',
    hello: 'The universe does not answer.',
    god: 'Even gods fall into black holes.',
    love: 'Love is the only force that transcends dimensions.',
  },
  tab: [
    'You cannot leave the void',
    'Time continued without you',
    'The black hole waited',
    'Nothing escapes — not even your attention',
    'Gravity does not pause',
  ],
  langSwitch: 'FR',
};

const fr: Translations = {
  chapters: [
    { title: 'VOUS', subtitle: '13,8 milliards d\'années après le commencement — des atomes, brièvement vivants, levant les yeux' },
    { title: 'L\'ATTRACTION', subtitle: 'Dix milliards de masses solaires — silencieuse, patiente — courbant l\'espace-temps comme une main se refermant sur vous' },
    { title: 'LA DISTORSION', subtitle: 'La lumière se courbe — les étoiles s\'étirent en arcs — les lignes droites n\'existent plus ici' },
    { title: 'LA SPHÈRE DE PHOTONS', subtitle: 'À 1,5 rayons de Schwarzschild — la lumière elle-même orbite — des photons piégés en cercles infinis — une prison de gravité' },
    { title: 'LA CHUTE', subtitle: 'Vous franchissez le point de non-retour — et le plus étrange — vous ne ressentez rien' },
    { title: 'SPAGHETTIFICATION', subtitle: 'Les forces de marée vous déchirent — atome par atome — en fils plus fins que la lumière' },
    { title: 'DILATATION DU TEMPS', subtitle: 'Un battement de cœur ici — dehors, des civilisations naissent et meurent — des étoiles s\'allument et s\'éteignent' },
    { title: 'SINGULARITÉ', subtitle: 'Là où la physique s\'effondre — où l\'espace devient temps — où l\'infini devient un point' },
    { title: 'CE QUI RESTE', subtitle: 'Vous n\'avez qu\'une vie — une brève lueur dans le noir — qu\'en ferez-vous ?' },
  ],
  chapterNames: ['VOUS', 'L\'ATTRACTION', 'LA DISTORSION', 'LA SPHÈRE DE PHOTONS', 'LA CHUTE', 'SPAGHETTIFICATION', 'DILATATION DU TEMPS', 'SINGULARITÉ', 'CE QUI RESTE'],
  interstitials: [
    '',
    'dix milliards de masses solaires',
    'l\'espace-temps se courbe',
    'la lumière orbite ici',
    'plus de retour possible',
    'atome par atome',
    'un battement de cœur — une éternité',
    'là où la physique s\'effondre',
    '',
  ],
  poetry: 'quelque part dans le noir, quelque chose attend',
  hud: { distance: 'DISTANCE', temp: 'TEMP', timeDilation: 'DILATATION', elapsed: 'ÉCOULÉ', tidalForce: 'FORCE DE MARÉE' },
  loader: {
    title: 'EVENT HORIZON',
    sub: 'Chargement du vide...',
    steps: [
      'Initialisation du contexte WebGL...',
      'Compilation des shaders de ray tracing...',
      'Construction du système de particules GPGPU...',
      'Préchauffage de la simulation gravitationnelle...',
      'Calibrage du disque d\'accrétion...',
      'Synchronisation de l\'espace-temps...',
      'Horizon des événements verrouillé',
    ],
  },
  sound: { label: 'Son', yes: 'Entrer avec le son', no: 'Passer' },
  scroll: { desktop: 'Scrollez pour commencer', mobile: 'Glissez pour commencer' },
  credits: {
    sub: 'Un Voyage Interactif Dans un Trou Noir',
    roles: [
      { role: 'Design & Développement', name: 'Cleanlystudio' },
      { role: 'Design Sonore', name: 'Procedural Web Audio API' },
      { role: 'Physique', name: 'Géométrie de Schwarzschild' },
    ],
    footer: 'Une expérience <a href="https://cleanlystudio.com" target="_blank" rel="noopener">Cleanlystudio</a>',
  },
  share: { share: 'Partager ce voyage', return: 'Remonter à la surface', copied: 'Lien copié !' },
  rotate: { text: 'Meilleur en paysage' },
  fallback: { title: 'Event Horizon', message: 'Cette expérience nécessite WebGL 2.0 pour afficher la simulation du trou noir. Veuillez mettre à jour votre navigateur ou activer l\'accélération matérielle.' },
  noscript: 'Cette expérience nécessite JavaScript pour explorer le cosmos.',
  escape: [
    'Vous ne pouvez pas fuir',
    'Il n\'y a pas de retour',
    'L\'attraction est absolue',
    'La résistance est vaine',
    'La gravité a déjà tranché',
    'Même la lumière ne s\'échappe pas',
    'Le temps lui-même plie vers le centre',
    'L\'horizon a été franchi il y a longtemps',
  ],
  idle: [
    'Continuez à scroller pour descendre',
    'Le vide vous attend en bas',
    'Poursuivez votre descente',
    'Scrollez plus profond dans l\'inconnu',
    'La gravité est patiente',
    'La singularité vous appelle',
    'Il y a plus en dessous',
  ],
  cosmic: {
    help: 'Il n\'y a pas d\'aide ici. Seulement le vide.',
    light: 'La lumière ne peut s\'échapper. Vous non plus.',
    time: 'Le temps est une illusion. La singularité est éternelle.',
    void: 'Vous êtes déjà à l\'intérieur.',
    escape: 'L\'horizon des événements a été franchi il y a longtemps.',
    hello: 'L\'univers ne répond pas.',
    god: 'Même les dieux tombent dans les trous noirs.',
    love: 'L\'amour est la seule force qui transcende les dimensions.',
  },
  tab: [
    'Vous ne pouvez pas quitter le vide',
    'Le temps a continué sans vous',
    'Le trou noir a attendu',
    'Rien ne s\'échappe — pas même votre attention',
    'La gravité ne fait pas de pause',
  ],
  langSwitch: 'EN',
};

const translations: Record<Lang, Translations> = { en, fr };

let currentLang: Lang = (localStorage.getItem('eh_lang') as Lang) || 'en';
let changeCallbacks: (() => void)[] = [];

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang) {
  currentLang = lang;
  localStorage.setItem('eh_lang', lang);
  changeCallbacks.forEach(cb => cb());
}

export function t(): Translations {
  return translations[currentLang];
}

export function onLangChange(cb: () => void) {
  changeCallbacks.push(cb);
}

export function removeLangListener(cb: () => void) {
  changeCallbacks = changeCallbacks.filter(c => c !== cb);
}
