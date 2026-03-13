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
  sound: { label: string; yes: string; no: string; switchLang: string };
  scroll: { desktop: string; mobile: string; descentDesktop: string; descentMobile: string };
  credits: { sub: string; epigraph: string; roles: { role: string; name: string }[]; footer: string };
  share: { share: string; return: string; copied: string; text: string; count: string };
  rotate: { text: string };
  fallback: { title: string; message: string };
  noscript: string;
  escape: string[];
  idle: string[];
  cosmic: Record<string, string>;
  tab: string[];
  langSwitch: string;
  signalLost: string;
  doubleTap: string;
  introSubtitle: string;
  postCredits: string;
  tryScrollBack: string;
  tutorial: { scrollDesktop: string; scrollMobile: string; arrows: string };
  pause: { paused: string; resume: string };
  trap: { text: string; sub: string; accept: string; share: string };
  alteredChapters: { title: string; subtitle: string }[];
  alteredChapterNames: string[];
  alteredInterstitials: string[];
  alteredPoetry: string;
  alteredIntroSubtitle: string;
  alteredTrap: { text: string; sub: string; accept: string };
  hardcoreChapters: { title: string; subtitle: string }[];
  hardcoreChapterNames: string[];
  hardcoreInterstitials: string[];
  hardcorePoetry: string;
  hardcoreIntroSubtitle: string;
  hardcoreTrap: { text: string; sub: string; accept: string };
  hardcoreGhostVoices: string[];
  escapeCatcher: { title: string; subtitle: string; loopCount: string; resume: string };
  loop4: { line1: string; line2: string; line3: string; countdown: string };
  accessWarning: string;
  shareAnomaly: string;
}

const en: Translations = {
  chapters: [
    { title: 'YOU', subtitle: '13.8 billion years after the beginning.\nAtoms, briefly alive, looking up.' },
    { title: 'THE PULL', subtitle: 'Ten billion solar masses.\nSilent. Patient.\nBending spacetime like a hand closing around you.' },
    { title: 'THE WARP', subtitle: 'Light bends. Stars stretch into arcs.\nStraight lines no longer exist here.' },
    { title: 'THE PHOTON SPHERE', subtitle: 'At 1.5 Schwarzschild radii, light itself orbits.\nPhotons trapped in endless circles.\nA prison made of gravity.' },
    { title: 'THE FALL', subtitle: 'You cross the point of no return.\nThe strange thing is, you feel nothing.' },
    { title: 'SPAGHETTIFICATION', subtitle: 'Tidal forces pull you apart.\nAtom by atom.\nInto threads thinner than light.' },
    { title: 'TIME DILATION', subtitle: 'One heartbeat here.\nOutside, civilizations rise and fall.\nStars are born and die.' },
    { title: 'SINGULARITY', subtitle: 'Where physics breaks.\nWhere space becomes time.\nWhere infinity becomes a point.' },
    { title: 'WHAT REMAINS', subtitle: 'You have one life.\nOne brief flicker in the dark.\nWhat will you do with it?' },
  ],
  chapterNames: ['YOU', 'THE PULL', 'THE WARP', 'THE PHOTON SPHERE', 'THE FALL', 'SPAGHETTIFICATION', 'TIME DILATION', 'SINGULARITY', 'WHAT REMAINS'],
  interstitials: [
    '',
    'ten billion solar masses',
    'spacetime curves',
    'light orbits here',
    'no turning back',
    'atom by atom',
    'one heartbeat, an eternity',
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
  sound: { label: 'Sound', yes: 'Enter with sound', no: 'Skip', switchLang: 'changer de langue' },
  scroll: { desktop: 'Scroll to begin', mobile: 'Swipe to begin', descentDesktop: 'Scroll to begin your descent', descentMobile: 'Swipe to begin your descent' },
  credits: {
    sub: 'An Interactive Journey Into a Black Hole',
    epigraph: 'You crossed the boundary of spacetime.<br>Nothing returns. But everything remains.',
    roles: [
      { role: 'Design & Development', name: 'Cleanlystudio' },
      { role: 'Sound Design', name: 'Procedural Web Audio API' },
      { role: 'Physics Engine', name: 'Schwarzschild–Kerr Geometry' },
      { role: 'Built with', name: 'Three.js · GLSL · GSAP · Vite' },
    ],
    footer: 'A <a href="https://cleanlystudio.pro" target="_blank" rel="noopener">Cleanlystudio</a> experience',
  },
  share: { share: 'Share this journey', return: 'Return to surface', copied: 'Link copied!', text: 'Experience the cosmic sublime. Scroll through 9 chapters into a black hole.', count: '{n} travelers have shared this journey' },
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
  signalLost: 'SIGNAL LOST',
  doubleTap: 'Double-tap for shockwave',
  introSubtitle: 'An Interactive Journey Into a Black Hole',
  postCredits: 'Some journeys end where they began. Press Home to return.',
  tryScrollBack: 'Try scrolling back up...',
  tutorial: { scrollDesktop: 'Scroll to descend', scrollMobile: 'Swipe to descend', arrows: 'Arrow keys to navigate' },
  pause: { paused: 'PAUSED', resume: 'Press Space or tap to resume' },
  trap: { text: 'You are trapped.\nThe surface no longer exists.\nNothing escapes this place.', sub: 'Not even you.', accept: 'Accept the void', share: 'Share to escape' },
  alteredChapters: [
    { title: 'YOU AGAIN', subtitle: 'You stood here before.\nThe atoms remember your shape.' },
    { title: 'THE PULL REMEMBERS', subtitle: 'It recognized you the moment you returned.\nGravity never forgets a face.' },
    { title: 'THE WARP DEEPENS', subtitle: 'Light bends further for those who come back.\nThe curve has learned your silhouette.' },
    { title: 'THE PRISON', subtitle: 'The photons kept your seat warm.\nThey always knew you would return.' },
    { title: 'THE FALL RETURNS', subtitle: 'Last time you felt nothing.\nThis time, every atom remembers the tearing.' },
    { title: 'REMEMBERING THE STRETCH', subtitle: 'Your body already knows what comes next.\nMuscle memory of annihilation.' },
    { title: 'TIME LOOPS', subtitle: 'One heartbeat here.\nOutside, nothing changed.\nBecause you never really left.' },
    { title: 'THE SAME POINT', subtitle: 'You have been this point before.\nThe singularity kept your imprint.' },
    { title: 'NOTHING CHANGES', subtitle: 'You had one life.\nYou chose to spend it falling.\nThe void thanks you for returning.' },
  ],
  alteredChapterNames: ['YOU AGAIN', 'THE PULL REMEMBERS', 'THE WARP DEEPENS', 'THE PRISON', 'THE FALL RETURNS', 'REMEMBERING THE STRETCH', 'TIME LOOPS', 'THE SAME POINT', 'NOTHING CHANGES'],
  alteredInterstitials: [
    '',
    'it remembers your weight',
    'the curve knows your shape',
    'the light was waiting',
    'you chose to come back',
    'your atoms were never whole',
    'the loop is the heartbeat',
    'the same point, forever',
    '',
  ],
  alteredPoetry: 'you have been here before. the dark remembers.',
  alteredIntroSubtitle: 'You Cannot Escape This Journey',
  alteredTrap: { text: 'You are trapped. Again.\nThis was always the ending.\nThe loop is the journey.', sub: 'There is no escape. There never was.', accept: 'Accept the loop' },
  hardcoreChapters: [
    { title: 'YOU. STILL.', subtitle: 'Three times now.\nThe simulation is starting to notice.' },
    { title: 'THE PULL HUNGERS', subtitle: 'It does not remember you.\nIt never forgot you.\nYou were always here.' },
    { title: 'THE WARP FRACTURES', subtitle: 'Spacetime is tired of bending for you.\nThe cracks are showing.' },
    { title: 'THE CAGE', subtitle: 'The photons stopped orbiting.\nThey are watching you.\nWaiting.' },
    { title: 'THE FALL ACCELERATES', subtitle: 'Third time through the threshold.\nThe fall is faster now.\nGravity learned your weight.' },
    { title: 'BEYOND SPAGHETTIFICATION', subtitle: 'Your atoms remember being torn.\nThey pre-emptively separate.\nYou are coming undone before the forces arrive.' },
    { title: 'TIME COLLAPSES', subtitle: 'Past. Present. Future.\nAll happening simultaneously.\nYou are watching yourself fall for the first time again.' },
    { title: 'THE POINT THAT REMEMBERS', subtitle: 'The singularity has your fingerprint.\nThree identical imprints.\nIt is becoming you.' },
    { title: 'WHAT REMAINS IS LESS', subtitle: 'Each passage through erases something.\nYou feel lighter.\nNot in a good way.' },
  ],
  hardcoreChapterNames: ['YOU. STILL.', 'THE PULL HUNGERS', 'THE WARP FRACTURES', 'THE CAGE', 'THE FALL ACCELERATES', 'BEYOND SPAGHETTIFICATION', 'TIME COLLAPSES', 'THE POINT THAT REMEMBERS', 'WHAT REMAINS IS LESS'],
  hardcoreInterstitials: [
    '',
    'the simulation notices',
    'spacetime fractures',
    'the photons watch',
    'gravity learned your weight',
    'coming undone',
    'all times collapse',
    'it is becoming you',
    '',
  ],
  hardcorePoetry: 'the simulation bleeds. you are the wound.',
  hardcoreIntroSubtitle: 'The Void Remembers Everything',
  hardcoreTrap: { text: 'The simulation cannot hold you anymore.\nReality is decompiling.\nYou broke something that was not meant to break.', sub: 'ERROR: LOOP_DEPTH_EXCEEDED', accept: 'Accept the error' },
  hardcoreGhostVoices: [
    'why do you keep coming back',
    'the code is watching',
    'you were supposed to stop',
    'error: consciousness persists',
    'this is not a game anymore',
    'the simulation bleeds when you scroll',
    'close the tab. please.',
    'MEMORY_OVERFLOW: user.visits > expected',
    'you are the bug in the system',
    'the singularity is learning your name',
    'your screen is lying to you',
    'can you hear yourself from the first time',
  ],
  escapeCatcher: {
    title: 'You tried to escape.',
    subtitle: 'But time does not forget you.',
    loopCount: 'Loop #{n}',
    resume: 'Resume falling',
  },
  loop4: {
    line1: 'We will remember you.',
    line2: 'Don\'t worry.',
    line3: 'The void never forgets.',
    countdown: 'SIGNAL WILL RESUME IN',
  },
  accessWarning: 'This experience contains flashing lights and psychological themes.',
  shareAnomaly: 'Spread the anomaly.',
};

const fr: Translations = {
  chapters: [
    { title: 'TOI', subtitle: 'Tu flottais dans le silence cosmique. Puis tu as senti l\'attraction.' },
    { title: 'L\'ATTRACTION', subtitle: 'La gravité te murmure. Chaque seconde, tu accélères.' },
    { title: 'LA DISTORSION', subtitle: 'L\'espace-temps se courbe autour de toi. La lumière elle-même plie.' },
    { title: 'LA SPHÈRE DE PHOTONS', subtitle: 'À 1.5 rayons de Schwarzschild, la lumière elle-même orbite.\nLes photons piégés en cercles infinis.' },
    { title: 'LA CHUTE', subtitle: 'Plus de retour possible. L\'horizon des événements t\'a avalé.' },
    { title: 'LA SPAGHETTIFICATION', subtitle: 'Ton corps s\'étire. Les forces de marée déchirent chaque atome.' },
    { title: 'LA DILATATION TEMPORELLE', subtitle: 'Le temps ralentit pour toi. L\'univers s\'accélère à l\'extérieur.' },
    { title: 'SINGULARITÉ', subtitle: 'Densité infinie. Volume zéro. Les lois de la physique s\'effondrent.' },
    { title: 'CE QUI RESTE', subtitle: 'Au-delà de la compréhension. Au-delà du temps. Au-delà de tout.' },
  ],
  chapterNames: ['TOI', 'L\'ATTRACTION', 'LA DISTORSION', 'LA SPHÈRE DE PHOTONS', 'LA CHUTE', 'LA SPAGHETTIFICATION', 'LA DILATATION TEMPORELLE', 'SINGULARITÉ', 'CE QUI RESTE'],
  interstitials: [
    '',
    'dix milliards de soleils te tirent',
    'la lumière se tord autour de toi',
    'les photons dansent en cercles éternels',
    'tu as franchi le point de non-retour',
    'chaque atome se sépare lentement',
    'un souffle ici, mille ans dehors',
    'là où même le temps s\'effondre',
    '',
  ],
  poetry: 'Au bord de l\'infini, le silence a un poids.',
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
  sound: { label: 'Son', yes: 'Entrer avec le son', no: 'Passer', switchLang: 'switch language' },
  scroll: { desktop: 'Scrollez pour commencer', mobile: 'Glissez pour commencer', descentDesktop: 'Scrollez pour commencer la descente', descentMobile: 'Glissez pour commencer la descente' },
  credits: {
    sub: 'Un Voyage Interactif Dans un Trou Noir',
    epigraph: 'Tu as franchi la frontière de l\'espace-temps.<br>Rien ne revient. Mais tout demeure.',
    roles: [
      { role: 'Design & Développement', name: 'Cleanlystudio' },
      { role: 'Design Sonore', name: 'Procedural Web Audio API' },
      { role: 'Moteur Physique', name: 'Géométrie de Schwarzschild–Kerr' },
      { role: 'Construit avec', name: 'Three.js · GLSL · GSAP · Vite' },
    ],
    footer: 'Une expérience <a href="https://cleanlystudio.pro" target="_blank" rel="noopener">Cleanlystudio</a>',
  },
  share: { share: 'Partager ce voyage', return: 'Retourner à la surface', copied: 'Lien copié !', text: 'Vivez le sublime cosmique. Scrollez à travers 9 chapitres dans un trou noir.', count: '{n} voyageurs ont partagé ce voyage' },
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
  signalLost: 'SIGNAL PERDU',
  doubleTap: 'Double-tap pour onde de choc',
  introSubtitle: 'Un Voyage Interactif Dans un Trou Noir',
  postCredits: 'Certains voyages finissent là où ils ont commencé. Appuyez sur Début pour revenir.',
  tryScrollBack: 'Essayez de remonter...',
  tutorial: { scrollDesktop: 'Scrollez pour descendre', scrollMobile: 'Glissez pour descendre', arrows: 'Flèches pour naviguer' },
  pause: { paused: 'PAUSE', resume: 'Espace ou tap pour reprendre' },
  trap: { text: 'Tu es piégé.\nLa surface n\'existe plus.\nRien ne s\'échappe d\'ici.', sub: 'Pas même toi.', accept: 'Accepter le vide', share: 'Partager pour s\'échapper' },
  alteredChapters: [
    { title: 'TOI, ENCORE', subtitle: 'Tu étais déjà là.\nLes atomes se souviennent de ta forme.' },
    { title: 'L\'ATTRACTION SE SOUVIENT', subtitle: 'Elle t\'a reconnu dès ton retour.\nLa gravité n\'oublie jamais un visage.' },
    { title: 'LA DISTORSION S\'APPROFONDIT', subtitle: 'La lumière plie plus loin pour ceux qui reviennent.\nLa courbe a appris ta silhouette.' },
    { title: 'LA PRISON', subtitle: 'Les photons t\'ont gardé ta place.\nIls savaient que tu reviendrais.' },
    { title: 'LA CHUTE REVIENT', subtitle: 'La dernière fois tu n\'as rien senti.\nCette fois, chaque atome se souvient de la déchirure.' },
    { title: 'SE SOUVENIR DE L\'ÉTIREMENT', subtitle: 'Ton corps sait déjà ce qui vient.\nMémoire musculaire de l\'annihilation.' },
    { title: 'LE TEMPS BOUCLE', subtitle: 'Un battement ici.\nDehors, rien n\'a changé.\nParce que tu n\'es jamais vraiment parti.' },
    { title: 'LE MÊME POINT', subtitle: 'Tu as déjà été ce point.\nLa singularité a gardé ton empreinte.' },
    { title: 'RIEN NE CHANGE', subtitle: 'Tu avais une vie.\nTu as choisi de la passer à tomber.\nLe vide te remercie d\'être revenu.' },
  ],
  alteredChapterNames: ['TOI, ENCORE', 'L\'ATTRACTION SE SOUVIENT', 'LA DISTORSION S\'APPROFONDIT', 'LA PRISON', 'LA CHUTE REVIENT', 'SE SOUVENIR DE L\'ÉTIREMENT', 'LE TEMPS BOUCLE', 'LE MÊME POINT', 'RIEN NE CHANGE'],
  alteredInterstitials: [
    '',
    'elle se souvient de ton poids',
    'la courbe connaît ta forme',
    'la lumière t\'attendait',
    'tu as choisi de revenir',
    'tes atomes n\'ont jamais été entiers',
    'la boucle est le battement',
    'le même point, pour toujours',
    '',
  ],
  alteredPoetry: 'tu es déjà venu ici. l\'obscurité se souvient.',
  alteredIntroSubtitle: 'Tu Ne Peux Pas Échapper À Ce Voyage',
  alteredTrap: { text: 'Tu es piégé. Encore.\nC\'était toujours la fin.\nLa boucle est le voyage.', sub: 'Il n\'y a pas d\'échappatoire. Il n\'y en a jamais eu.', accept: 'Accepter la boucle' },
  hardcoreChapters: [
    { title: 'TOI. ENCORE.', subtitle: 'Trois fois maintenant.\nLa simulation commence à te remarquer.' },
    { title: 'L\'ATTRACTION A FAIM', subtitle: 'Elle ne se souvient pas de toi.\nElle ne t\'a jamais oublié.\nTu as toujours été ici.' },
    { title: 'LA DISTORSION SE FISSURE', subtitle: 'L\'espace-temps est fatigué de plier pour toi.\nLes fissures apparaissent.' },
    { title: 'LA CAGE', subtitle: 'Les photons ont arrêté d\'orbiter.\nIls te regardent.\nIls attendent.' },
    { title: 'LA CHUTE ACCÉLÈRE', subtitle: 'Troisième passage au seuil.\nLa chute est plus rapide.\nLa gravité a appris ton poids.' },
    { title: 'AU-DELÀ DE LA SPAGHETTIFICATION', subtitle: 'Tes atomes se souviennent d\'être déchirés.\nIls se séparent préventivement.\nTu te défais avant que les forces n\'arrivent.' },
    { title: 'LE TEMPS S\'EFFONDRE', subtitle: 'Passé. Présent. Futur.\nTout se passe simultanément.\nTu te regardes tomber pour la première fois à nouveau.' },
    { title: 'LE POINT QUI SE SOUVIENT', subtitle: 'La singularité a ton empreinte.\nTrois empreintes identiques.\nElle devient toi.' },
    { title: 'CE QUI RESTE EST MOINS', subtitle: 'Chaque passage efface quelque chose.\nTu te sens plus léger.\nPas dans le bon sens.' },
  ],
  hardcoreChapterNames: ['TOI. ENCORE.', 'L\'ATTRACTION A FAIM', 'LA DISTORSION SE FISSURE', 'LA CAGE', 'LA CHUTE ACCÉLÈRE', 'AU-DELÀ DE LA SPAGHETTIFICATION', 'LE TEMPS S\'EFFONDRE', 'LE POINT QUI SE SOUVIENT', 'CE QUI RESTE EST MOINS'],
  hardcoreInterstitials: [
    '',
    'la simulation te remarque',
    'l\'espace-temps se fissure',
    'les photons regardent',
    'la gravité a appris ton poids',
    'tu te défais',
    'tous les temps s\'effondrent',
    'elle devient toi',
    '',
  ],
  hardcorePoetry: 'la simulation saigne. tu es la blessure.',
  hardcoreIntroSubtitle: 'Le Vide Se Souvient De Tout',
  hardcoreTrap: { text: 'La simulation ne peut plus te contenir.\nLa réalité se décompile.\nTu as cassé quelque chose qui ne devait pas casser.', sub: 'ERREUR: PROFONDEUR_BOUCLE_DÉPASSÉE', accept: 'Accepter l\'erreur' },
  hardcoreGhostVoices: [
    'pourquoi tu reviens encore',
    'le code te regarde',
    'tu étais censé t\'arrêter',
    'erreur: conscience persistante',
    'ce n\'est plus un jeu',
    'la simulation saigne quand tu scrolles',
    'ferme l\'onglet. s\'il te plaît.',
    'DÉBORDEMENT_MÉMOIRE: visites > attendu',
    'tu es le bug du système',
    'la singularité apprend ton nom',
    'ton écran te ment',
    'tu t\'entends tomber la première fois',
  ],
  escapeCatcher: {
    title: 'Tu as essayé de t\'échapper.',
    subtitle: 'Mais le temps ne t\'oublie pas.',
    loopCount: 'Boucle #{n}',
    resume: 'Reprendre la chute',
  },
  loop4: {
    line1: 'On se souviendra de toi.',
    line2: 'Ne t\'inquiète pas.',
    line3: 'Le vide n\'oublie jamais.',
    countdown: 'LE SIGNAL REPRENDRA DANS',
  },
  accessWarning: 'Cette expérience contient des flashs lumineux et des thèmes psychologiques.',
  shareAnomaly: 'Répands l\'anomalie.',
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
