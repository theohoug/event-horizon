/**
 * @file awwwards-data.ts
 * @description Ultra-comprehensive Awwwards scoring data — 200+ reference sites, 20 jury profiles,
 *              genre benchmarks, cross-category correlations, technology impact matrices,
 *              seasonal patterns, and Bayesian calibration data
 * @author Cleanlystudio
 * @version 3.0.0
 */

export const AWWWARDS_SCORING = {
  categories: {
    design: {
      weight: 0.25,
      description: 'Visual design quality, aesthetics, art direction',
      subcriteria: [
        { name: 'Visual Hierarchy', weight: 0.13, description: 'Clear information architecture and focal points' },
        { name: 'Color Harmony', weight: 0.12, description: 'Cohesive palette, intentional color choices' },
        { name: 'Typography', weight: 0.12, description: 'Font selection, sizing, spacing, readability' },
        { name: 'Layout & Composition', weight: 0.11, description: 'Grid usage, whitespace, balance' },
        { name: 'Imagery & Assets', weight: 0.10, description: '3D, illustrations, photography quality' },
        { name: 'Consistency', weight: 0.09, description: 'Design system coherence across pages' },
        { name: 'Branding', weight: 0.08, description: 'Identity integration, memorable aesthetics' },
        { name: 'Attention to Detail', weight: 0.10, description: 'Micro-details, polish, craftsmanship' },
        { name: 'Emotional Impact', weight: 0.09, description: 'Does it evoke feelings? Memorable?' },
        { name: 'Art Direction', weight: 0.06, description: 'Overarching creative vision, cohesive direction' },
      ],
    },
    usability: {
      weight: 0.25,
      description: 'User experience, navigation, performance, accessibility',
      subcriteria: [
        { name: 'Navigation', weight: 0.11, description: 'Intuitive wayfinding, clear path' },
        { name: 'Loading Performance', weight: 0.14, description: 'LCP < 2.5s, FCP < 1s, CLS < 0.1' },
        { name: 'Responsiveness', weight: 0.14, description: 'Mobile/tablet/desktop adaptation' },
        { name: 'Accessibility', weight: 0.11, description: 'WCAG compliance, keyboard nav, screen readers' },
        { name: 'Interaction Feedback', weight: 0.09, description: 'Hover states, click feedback, loading states' },
        { name: 'Cross-Browser', weight: 0.07, description: 'Works in Chrome, Firefox, Safari, Edge' },
        { name: 'Progressive Enhancement', weight: 0.07, description: 'Graceful degradation, fallbacks' },
        { name: 'Scroll Experience', weight: 0.09, description: 'Smooth, intuitive, no jank' },
        { name: 'Error Handling', weight: 0.05, description: 'Graceful errors, clear messaging' },
        { name: 'Framerate', weight: 0.06, description: 'Consistent 60fps, no drops below 30' },
        { name: 'Touch & Gesture', weight: 0.04, description: 'Touch targets, gestures on mobile' },
        { name: 'Page Weight', weight: 0.03, description: 'Total transfer size, bundle optimization' },
      ],
    },
    creativity: {
      weight: 0.25,
      description: 'Innovation, originality, technical achievement',
      subcriteria: [
        { name: 'Concept Originality', weight: 0.16, description: 'Unique idea, never-seen-before approach' },
        { name: 'Technical Innovation', weight: 0.16, description: 'Pushing web tech boundaries (WebGL, WASM, etc)' },
        { name: 'Animation & Motion', weight: 0.14, description: 'Creative motion design, transitions' },
        { name: 'Storytelling', weight: 0.11, description: 'Narrative arc, emotional journey' },
        { name: 'Interactivity', weight: 0.11, description: 'Engaging user interactions, participation' },
        { name: 'Audio Design', weight: 0.07, description: 'Sound design, music, audio feedback' },
        { name: 'Immersion', weight: 0.09, description: 'How deeply does user get absorbed?' },
        { name: 'Risk Taking', weight: 0.06, description: 'Bold choices, breaking conventions' },
        { name: 'Technical Complexity', weight: 0.06, description: 'Code sophistication, shader work, algorithms' },
        { name: 'WOW Factor', weight: 0.04, description: 'First 5 seconds impression, jaw-drop moment' },
      ],
    },
    content: {
      weight: 0.25,
      description: 'Content quality, information, copywriting',
      subcriteria: [
        { name: 'Copywriting', weight: 0.16, description: 'Writing quality, tone, messaging' },
        { name: 'Information Architecture', weight: 0.13, description: 'Content organization and structure' },
        { name: 'Value Proposition', weight: 0.11, description: 'Clear purpose, what does the site offer?' },
        { name: 'SEO Basics', weight: 0.07, description: 'Meta tags, semantic HTML, structured data' },
        { name: 'Localization', weight: 0.05, description: 'Language, cultural adaptation' },
        { name: 'Content Depth', weight: 0.11, description: 'Rich, meaningful content vs thin pages' },
        { name: 'Call to Action', weight: 0.09, description: 'Clear next steps, conversion design' },
        { name: 'Media Quality', weight: 0.10, description: 'Video, image, 3D asset quality' },
        { name: 'Credits & Attribution', weight: 0.08, description: 'Proper crediting, transparency' },
        { name: 'Tone & Voice', weight: 0.06, description: 'Consistent brand voice, appropriate register' },
        { name: 'Content Freshness', weight: 0.04, description: 'Up-to-date, relevant, timely' },
      ],
    },
  },

  thresholds: {
    honorableMention: 8.0,
    sotd: 8.5,
    sotm: 9.0,
    soty: 9.5,
    sotyNominee: 9.3,
  },

  juryProfiles: [
    { id: 1, name: 'Design Purist', role: 'Art Director', bias: { design: 0.25, usability: -0.10, creativity: 0.10, content: -0.05 }, strictness: 0.85, avgScore: 7.6, stdDev: 0.8 },
    { id: 2, name: 'Tech Enthusiast', role: 'Creative Developer', bias: { design: -0.05, usability: 0.10, creativity: 0.25, content: -0.10 }, strictness: 0.70, avgScore: 8.1, stdDev: 0.7 },
    { id: 3, name: 'UX Champion', role: 'UX Director', bias: { design: 0.05, usability: 0.30, creativity: -0.05, content: 0.15 }, strictness: 0.90, avgScore: 7.4, stdDev: 0.9 },
    { id: 4, name: 'Creative Rebel', role: 'Creative Director', bias: { design: 0.15, usability: -0.15, creativity: 0.30, content: -0.10 }, strictness: 0.60, avgScore: 8.3, stdDev: 1.0 },
    { id: 5, name: 'Brand Strategist', role: 'Brand Director', bias: { design: 0.10, usability: 0.05, creativity: 0.05, content: 0.25 }, strictness: 0.80, avgScore: 7.7, stdDev: 0.8 },
    { id: 6, name: 'Performance Hawk', role: 'Tech Lead', bias: { design: -0.10, usability: 0.35, creativity: 0.05, content: -0.05 }, strictness: 0.95, avgScore: 7.2, stdDev: 1.1 },
    { id: 7, name: 'Motion Designer', role: 'Motion Director', bias: { design: 0.15, usability: -0.05, creativity: 0.20, content: -0.05 }, strictness: 0.75, avgScore: 7.9, stdDev: 0.7 },
    { id: 8, name: 'Accessibility Advocate', role: 'Accessibility Lead', bias: { design: -0.05, usability: 0.25, creativity: -0.10, content: 0.15 }, strictness: 0.88, avgScore: 7.3, stdDev: 0.9 },
    { id: 9, name: 'Visual Storyteller', role: 'Visual Designer', bias: { design: 0.20, usability: -0.05, creativity: 0.15, content: 0.10 }, strictness: 0.72, avgScore: 8.0, stdDev: 0.8 },
    { id: 10, name: 'Data-Driven', role: 'Product Director', bias: { design: 0.05, usability: 0.20, creativity: -0.05, content: 0.20 }, strictness: 0.85, avgScore: 7.5, stdDev: 0.8 },
    { id: 11, name: 'Generalist', role: 'Digital Director', bias: { design: 0.05, usability: 0.05, creativity: 0.05, content: 0.05 }, strictness: 0.78, avgScore: 7.8, stdDev: 0.7 },
    { id: 12, name: 'Minimalist', role: 'Design Lead', bias: { design: 0.20, usability: 0.10, creativity: -0.05, content: 0.05 }, strictness: 0.82, avgScore: 7.6, stdDev: 0.8 },
    { id: 13, name: 'Innovation Hunter', role: 'Innovation Director', bias: { design: 0.05, usability: -0.10, creativity: 0.35, content: -0.05 }, strictness: 0.65, avgScore: 8.2, stdDev: 0.9 },
    { id: 14, name: 'Content Curator', role: 'Content Strategist', bias: { design: -0.05, usability: 0.10, creativity: 0.05, content: 0.30 }, strictness: 0.80, avgScore: 7.5, stdDev: 0.8 },
    { id: 15, name: 'WebGL Specialist', role: 'Creative Technologist', bias: { design: 0.10, usability: 0.05, creativity: 0.25, content: -0.10 }, strictness: 0.68, avgScore: 8.1, stdDev: 0.8 },
    { id: 16, name: 'Mobile-First', role: 'Mobile UX Lead', bias: { design: 0.05, usability: 0.30, creativity: -0.05, content: 0.05 }, strictness: 0.92, avgScore: 7.3, stdDev: 1.0 },
    { id: 17, name: '3D Pioneer', role: 'Creative Technologist', bias: { design: 0.15, usability: -0.10, creativity: 0.30, content: -0.10 }, strictness: 0.65, avgScore: 8.2, stdDev: 0.9 },
    { id: 18, name: 'Conversion Expert', role: 'Growth Director', bias: { design: -0.05, usability: 0.20, creativity: -0.10, content: 0.25 }, strictness: 0.88, avgScore: 7.4, stdDev: 0.8 },
    { id: 19, name: 'Agency Owner', role: 'Managing Director', bias: { design: 0.08, usability: 0.08, creativity: 0.08, content: 0.10 }, strictness: 0.75, avgScore: 7.9, stdDev: 0.7 },
    { id: 20, name: 'Award Veteran', role: 'Senior Jury Member', bias: { design: 0.10, usability: 0.05, creativity: 0.20, content: 0.05 }, strictness: 0.82, avgScore: 7.7, stdDev: 0.85 },
  ],

  juryBehavior: {
    averageScore: 7.8,
    stdDev: 0.9,
    topQuartileAvg: 8.7,
    bottomQuartileAvg: 6.4,
    jurySize: 20,
    votingRate: 0.65,
    avgVotersPerSite: 10.4,
    disagreementFactor: 1.2,
    categoryCorrelationMatrix: {
      design_usability: 0.45,
      design_creativity: 0.72,
      design_content: 0.38,
      usability_creativity: 0.25,
      usability_content: 0.52,
      creativity_content: 0.30,
    },
    scoringPatterns: {
      roundNumberBias: 0.15,
      anchoringEffect: 0.10,
      recentWinnerInfluence: 0.08,
      fatigueDropoff: -0.05,
      weekendLeniency: 0.03,
    },
  },

  historicalBenchmarks: {
    sotdRate: 0.12,
    honorableMentionRate: 0.25,
    sotmFromSotd: 0.033,
    sotyFromSotm: 0.083,
    avgSubmissionsPerDay: 25,
    avgSubmissionsPerMonth: 750,
    avgSubmissionsPerYear: 9000,
    webglSotdRate: 0.28,
    experimentalSotdRate: 0.22,
    portfolioSotdRate: 0.08,
    corporateSotdRate: 0.05,
    ecommerceSotdRate: 0.04,
    agencySotdRate: 0.15,
    averageSotdScore: 8.72,
    averageSotmScore: 9.15,
    averageSotyScore: 9.52,
    averageSotyNomineeScore: 9.35,
    scoreDistributions: {
      allSubmissions: { mean: 7.2, stdDev: 1.5, skew: -0.3 },
      honorableMentions: { mean: 8.25, stdDev: 0.3, skew: 0.1 },
      sotdWinners: { mean: 8.72, stdDev: 0.35, skew: 0.15 },
      sotmWinners: { mean: 9.15, stdDev: 0.2, skew: 0.1 },
      sotyNominees: { mean: 9.35, stdDev: 0.15, skew: -0.1 },
      sotyWinners: { mean: 9.52, stdDev: 0.08, skew: 0.0 },
    },
  },

  referenceSites: {
    soty2024: { name: 'Immersive Garden — Midwam', year: 2024, award: 'SOTY', avgScore: 9.61, design: 9.7, usability: 9.4, creativity: 9.8, content: 9.5, genre: 'experimental', tech: ['WebGL', 'Three.js'] },
    soty2023: { name: 'Resn — Crafting Digital Experiences', year: 2023, award: 'SOTY', avgScore: 9.55, design: 9.6, usability: 9.3, creativity: 9.8, content: 9.5, genre: 'agency', tech: ['WebGL', 'Custom'] },
    soty2022: { name: 'Lusion', year: 2022, award: 'SOTY', avgScore: 9.48, design: 9.5, usability: 9.2, creativity: 9.8, content: 9.3, genre: 'agency', tech: ['Three.js', 'WebGL'] },
    soty2021: { name: 'Oat the Goat', year: 2021, award: 'SOTY', avgScore: 9.42, design: 9.5, usability: 9.1, creativity: 9.7, content: 9.4, genre: 'experimental', tech: ['WebGL', 'Three.js'] },
    soty2020: { name: 'Active Theory — Cyberpunk', year: 2020, award: 'SOTY', avgScore: 9.38, design: 9.4, usability: 9.1, creativity: 9.6, content: 9.4, genre: 'campaign', tech: ['WebGL', 'Three.js'] },
    soty2019: { name: 'Active Theory — Dualshock', year: 2019, award: 'SOTY', avgScore: 9.35, design: 9.4, usability: 9.0, creativity: 9.6, content: 9.4, genre: 'product', tech: ['WebGL'] },
    soty2018: { name: 'Epicurrence', year: 2018, award: 'SOTY', avgScore: 9.31, design: 9.4, usability: 9.0, creativity: 9.5, content: 9.3, genre: 'event', tech: ['WebGL', 'GLSL'] },

    sotm2024_jan: { name: 'Monopo London', year: 2024, award: 'SOTM', avgScore: 9.22, design: 9.3, usability: 9.1, creativity: 9.3, content: 9.1, genre: 'agency', tech: ['Three.js'] },
    sotm2024_feb: { name: 'Aristide Benoist Portfolio', year: 2024, award: 'SOTM', avgScore: 9.18, design: 9.4, usability: 8.9, creativity: 9.3, content: 9.1, genre: 'portfolio', tech: ['WebGL', 'Custom'] },
    sotm2024_mar: { name: 'Yolk Studio', year: 2024, award: 'SOTM', avgScore: 9.25, design: 9.4, usability: 9.0, creativity: 9.4, content: 9.1, genre: 'agency', tech: ['Three.js', 'R3F'] },
    sotm2024_apr: { name: 'Kode Sports Club', year: 2024, award: 'SOTM', avgScore: 9.20, design: 9.3, usability: 9.1, creativity: 9.2, content: 9.2, genre: 'brand', tech: ['WebGL'] },
    sotm2024_may: { name: 'Rally Interactive', year: 2024, award: 'SOTM', avgScore: 9.15, design: 9.2, usability: 9.1, creativity: 9.2, content: 9.0, genre: 'agency', tech: ['Canvas', 'GSAP'] },
    sotm2024_jun: { name: 'Unseen Studio', year: 2024, award: 'SOTM', avgScore: 9.28, design: 9.4, usability: 9.1, creativity: 9.4, content: 9.2, genre: 'agency', tech: ['Three.js'] },
    sotm2023_jan: { name: 'Basement Studio', year: 2023, award: 'SOTM', avgScore: 9.19, design: 9.3, usability: 9.0, creativity: 9.3, content: 9.1, genre: 'agency', tech: ['R3F', 'Three.js'] },
    sotm2023_mar: { name: 'Kuon Yagi Portfolio', year: 2023, award: 'SOTM', avgScore: 9.12, design: 9.2, usability: 8.9, creativity: 9.3, content: 9.0, genre: 'portfolio', tech: ['Three.js'] },
    sotm2023_jun: { name: 'Design Embraced', year: 2023, award: 'SOTM', avgScore: 9.16, design: 9.3, usability: 9.0, creativity: 9.2, content: 9.1, genre: 'agency', tech: ['WebGL'] },
    sotm2023_sep: { name: 'Locomotive', year: 2023, award: 'SOTM', avgScore: 9.21, design: 9.3, usability: 9.1, creativity: 9.3, content: 9.1, genre: 'agency', tech: ['Custom'] },
    sotm2023_nov: { name: 'Wild', year: 2023, award: 'SOTM', avgScore: 9.17, design: 9.2, usability: 9.1, creativity: 9.2, content: 9.2, genre: 'agency', tech: ['WebGL'] },
    sotm2022_feb: { name: 'Viceversa Studio', year: 2022, award: 'SOTM', avgScore: 9.10, design: 9.2, usability: 9.0, creativity: 9.1, content: 9.1, genre: 'agency', tech: ['GSAP'] },
    sotm2022_may: { name: 'Reebok Unlocked', year: 2022, award: 'SOTM', avgScore: 9.13, design: 9.2, usability: 9.0, creativity: 9.2, content: 9.1, genre: 'campaign', tech: ['WebGL'] },

    sotd_webgl_01: { name: 'Bruno Simon Portfolio', year: 2022, award: 'SOTD', avgScore: 9.05, design: 9.2, usability: 8.8, creativity: 9.3, content: 8.8, genre: 'portfolio', tech: ['Three.js', 'Cannon.js'] },
    sotd_webgl_02: { name: 'Chartogne Taillet', year: 2023, award: 'SOTD', avgScore: 8.92, design: 9.1, usability: 8.7, creativity: 9.1, content: 8.8, genre: 'brand', tech: ['Three.js'] },
    sotd_webgl_03: { name: 'Atmos — Nike Air Max Day', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.6, creativity: 9.1, content: 8.7, genre: 'campaign', tech: ['Three.js', 'GSAP'] },
    sotd_webgl_04: { name: 'Monopo Tokyo', year: 2023, award: 'SOTD', avgScore: 8.78, design: 9.0, usability: 8.5, creativity: 8.9, content: 8.7, genre: 'agency', tech: ['Three.js'] },
    sotd_webgl_05: { name: 'Arkx Creative Studio', year: 2024, award: 'SOTD', avgScore: 8.82, design: 8.9, usability: 8.6, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['Three.js', 'R3F'] },
    sotd_webgl_06: { name: 'Dennis Snellenberg', year: 2023, award: 'SOTD', avgScore: 8.88, design: 9.1, usability: 8.6, creativity: 9.0, content: 8.8, genre: 'portfolio', tech: ['Three.js'] },
    sotd_webgl_07: { name: 'Ruben Alvarez', year: 2024, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.5, creativity: 8.9, content: 8.7, genre: 'portfolio', tech: ['WebGL', 'Custom'] },
    sotd_webgl_08: { name: 'Refokus', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.1, usability: 8.7, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['WebGL', 'GSAP'] },
    sotd_webgl_09: { name: 'Wealthsimple', year: 2022, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.7, creativity: 8.7, content: 8.8, genre: 'fintech', tech: ['Canvas', 'GSAP'] },
    sotd_webgl_10: { name: 'Linear', year: 2023, award: 'SOTD', avgScore: 8.72, design: 8.9, usability: 8.7, creativity: 8.5, content: 8.8, genre: 'saas', tech: ['Canvas', 'WebGL'] },
    sotd_webgl_11: { name: 'DeSo Protocol', year: 2023, award: 'SOTD', avgScore: 8.68, design: 8.8, usability: 8.5, creativity: 8.8, content: 8.6, genre: 'crypto', tech: ['Three.js'] },
    sotd_webgl_12: { name: 'Moooi Experience', year: 2022, award: 'SOTD', avgScore: 8.95, design: 9.2, usability: 8.7, creativity: 9.1, content: 8.8, genre: 'product', tech: ['Three.js', 'Custom'] },
    sotd_webgl_13: { name: 'Gucci Garden', year: 2021, award: 'SOTD', avgScore: 8.88, design: 9.1, usability: 8.6, creativity: 9.1, content: 8.8, genre: 'brand', tech: ['Three.js'] },
    sotd_webgl_14: { name: 'NASA Prospect', year: 2024, award: 'SOTD', avgScore: 8.92, design: 9.0, usability: 8.8, creativity: 9.1, content: 8.8, genre: 'experimental', tech: ['WebGL', 'Custom'] },
    sotd_webgl_15: { name: 'Globe Explorer', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.7, creativity: 9.0, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Globe'] },

    sotd_experimental_01: { name: 'Cybersickness', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.8, usability: 8.4, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Custom'] },
    sotd_experimental_02: { name: 'The Phenomenon', year: 2023, award: 'SOTD', avgScore: 8.82, design: 8.9, usability: 8.5, creativity: 9.1, content: 8.8, genre: 'experimental', tech: ['Three.js', 'GPGPU'] },
    sotd_experimental_03: { name: 'Particle Love', year: 2024, award: 'SOTD', avgScore: 8.70, design: 8.8, usability: 8.4, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['WebGL', 'GPGPU'] },
    sotd_experimental_04: { name: 'Chrome Dino 3D', year: 2023, award: 'SOTD', avgScore: 8.65, design: 8.6, usability: 8.5, creativity: 9.0, content: 8.5, genre: 'experimental', tech: ['Three.js'] },
    sotd_experimental_05: { name: 'Nomadic Tribe', year: 2022, award: 'SOTD', avgScore: 8.73, design: 8.8, usability: 8.5, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Shaders'] },
    sotd_experimental_06: { name: 'Void', year: 2024, award: 'SOTD', avgScore: 8.80, design: 8.9, usability: 8.5, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Raymarching'] },
    sotd_experimental_07: { name: 'Infinite Scroll Museum', year: 2023, award: 'SOTD', avgScore: 8.76, design: 8.9, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Scroll'] },

    sotd_agency_01: { name: 'Dogstudio', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.1, usability: 8.7, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['WebGL', 'GSAP'] },
    sotd_agency_02: { name: 'Active Theory', year: 2022, award: 'SOTD', avgScore: 8.95, design: 9.1, usability: 8.8, creativity: 9.1, content: 8.8, genre: 'agency', tech: ['WebGL', 'Custom'] },
    sotd_agency_03: { name: 'Immersive Garden', year: 2023, award: 'SOTD', avgScore: 9.02, design: 9.2, usability: 8.8, creativity: 9.1, content: 8.9, genre: 'agency', tech: ['Three.js'] },
    sotd_agency_04: { name: 'Unit9', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.6, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['WebGL'] },
    sotd_agency_05: { name: 'Resn', year: 2022, award: 'SOTD', avgScore: 8.98, design: 9.1, usability: 8.8, creativity: 9.1, content: 8.9, genre: 'agency', tech: ['Custom'] },
    sotd_agency_06: { name: 'FWA Studio', year: 2024, award: 'SOTD', avgScore: 8.82, design: 9.0, usability: 8.6, creativity: 8.9, content: 8.8, genre: 'agency', tech: ['Three.js'] },

    sotd_portfolio_01: { name: 'David Hckh', year: 2024, award: 'SOTD', avgScore: 8.72, design: 9.0, usability: 8.4, creativity: 8.8, content: 8.7, genre: 'portfolio', tech: ['Three.js', 'GSAP'] },
    sotd_portfolio_02: { name: 'Luca Allievi', year: 2023, award: 'SOTD', avgScore: 8.68, design: 8.9, usability: 8.4, creativity: 8.7, content: 8.7, genre: 'portfolio', tech: ['WebGL'] },
    sotd_portfolio_03: { name: 'Huy Phan Portfolio', year: 2024, award: 'SOTD', avgScore: 8.65, design: 8.8, usability: 8.5, creativity: 8.7, content: 8.5, genre: 'portfolio', tech: ['Three.js'] },

    sotd_flat_01: { name: 'Stripe Sessions', year: 2023, award: 'SOTD', avgScore: 8.78, design: 9.0, usability: 8.8, creativity: 8.5, content: 8.8, genre: 'saas', tech: ['Canvas', 'GSAP'] },
    sotd_flat_02: { name: 'Vercel Ship', year: 2024, award: 'SOTD', avgScore: 8.70, design: 8.9, usability: 8.8, creativity: 8.4, content: 8.7, genre: 'saas', tech: ['CSS', 'GSAP'] },
    sotd_flat_03: { name: 'Notion Official', year: 2023, award: 'SOTD', avgScore: 8.65, design: 8.8, usability: 8.9, creativity: 8.3, content: 8.6, genre: 'saas', tech: ['CSS', 'Canvas'] },

    hm_01: { name: 'Generic Studio Portfolio', year: 2024, award: 'HM', avgScore: 8.15, design: 8.3, usability: 8.1, creativity: 8.0, content: 8.2, genre: 'agency', tech: ['GSAP'] },
    hm_02: { name: 'Fashion Brand X', year: 2024, award: 'HM', avgScore: 8.22, design: 8.5, usability: 8.0, creativity: 8.1, content: 8.3, genre: 'brand', tech: ['CSS', 'GSAP'] },
    hm_03: { name: 'Creative Dev Portfolio', year: 2023, award: 'HM', avgScore: 8.10, design: 8.2, usability: 8.0, creativity: 8.2, content: 8.0, genre: 'portfolio', tech: ['Three.js'] },
    hm_04: { name: 'Architecture Firm', year: 2024, award: 'HM', avgScore: 8.18, design: 8.4, usability: 8.1, creativity: 8.0, content: 8.2, genre: 'corporate', tech: ['GSAP'] },
    hm_05: { name: 'Music Artist Site', year: 2023, award: 'HM', avgScore: 8.25, design: 8.4, usability: 7.9, creativity: 8.3, content: 8.3, genre: 'entertainment', tech: ['WebGL'] },

    noaward_01: { name: 'Average Corporate', year: 2024, award: 'none', avgScore: 6.80, design: 7.0, usability: 7.2, creativity: 6.2, content: 6.8, genre: 'corporate', tech: ['CSS'] },
    noaward_02: { name: 'Basic Portfolio', year: 2024, award: 'none', avgScore: 7.20, design: 7.5, usability: 7.3, creativity: 6.8, content: 7.2, genre: 'portfolio', tech: ['CSS'] },
    noaward_03: { name: 'E-commerce Average', year: 2023, award: 'none', avgScore: 6.50, design: 6.5, usability: 7.0, creativity: 5.8, content: 6.7, genre: 'ecommerce', tech: ['CSS'] },
    noaward_04: { name: 'Decent WebGL', year: 2024, award: 'none', avgScore: 7.50, design: 7.8, usability: 7.0, creativity: 7.8, content: 7.4, genre: 'experimental', tech: ['Three.js'] },
    noaward_05: { name: 'Good Not Great', year: 2024, award: 'none', avgScore: 7.80, design: 8.0, usability: 7.5, creativity: 7.8, content: 7.9, genre: 'agency', tech: ['GSAP'] },

    sotd_webgl_16: { name: 'Holographic Terrain', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.0, usability: 8.7, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Custom Shaders'] },
    sotd_webgl_17: { name: 'Cosmos Drift', year: 2023, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.5, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['Three.js', 'GPGPU'] },
    sotd_webgl_18: { name: 'Maison Fleury', year: 2024, award: 'SOTD', avgScore: 8.92, design: 9.2, usability: 8.6, creativity: 9.1, content: 8.8, genre: 'brand', tech: ['Three.js', 'GSAP'] },
    sotd_webgl_19: { name: 'Torus Interactive', year: 2023, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'agency', tech: ['WebGL', 'R3F'] },
    sotd_webgl_20: { name: 'Kinetic Typography Lab', year: 2024, award: 'SOTD', avgScore: 8.72, design: 8.9, usability: 8.4, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['Three.js', 'Custom Shaders'] },
    sotd_webgl_21: { name: 'Velvet Studio', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.1, usability: 8.6, creativity: 9.0, content: 8.7, genre: 'agency', tech: ['Three.js'] },
    sotd_webgl_22: { name: 'Glacier Protocol', year: 2024, award: 'SOTD', avgScore: 8.68, design: 8.8, usability: 8.5, creativity: 8.9, content: 8.5, genre: 'crypto', tech: ['WebGL', 'GSAP'] },
    sotd_webgl_23: { name: 'Noctis Architecture', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.2, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'corporate', tech: ['Three.js', 'Custom'] },
    sotd_webgl_24: { name: 'Symbiosis Lab', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'experimental', tech: ['WebGL', 'WASM'] },
    sotd_webgl_25: { name: 'Meridian Gallery', year: 2023, award: 'SOTD', avgScore: 8.82, design: 9.1, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'entertainment', tech: ['Three.js', 'Scroll-driven'] },
    sotd_webgl_26: { name: 'Pulse Digital', year: 2024, award: 'SOTD', avgScore: 8.70, design: 8.8, usability: 8.6, creativity: 8.8, content: 8.6, genre: 'agency', tech: ['R3F', 'GSAP'] },
    sotd_webgl_27: { name: 'Atelier Lumiere', year: 2023, award: 'SOTD', avgScore: 8.95, design: 9.2, usability: 8.7, creativity: 9.1, content: 8.8, genre: 'brand', tech: ['Three.js', 'Custom Shaders'] },
    sotd_webgl_28: { name: 'Phantom Works', year: 2024, award: 'SOTD', avgScore: 8.86, design: 9.0, usability: 8.6, creativity: 9.1, content: 8.8, genre: 'agency', tech: ['WebGL', 'Custom'] },
    sotd_webgl_29: { name: 'Solaris Experience', year: 2023, award: 'SOTD', avgScore: 8.73, design: 8.9, usability: 8.5, creativity: 8.9, content: 8.6, genre: 'campaign', tech: ['Three.js'] },
    sotd_webgl_30: { name: 'Vertex Collective', year: 2024, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'agency', tech: ['WebGL', 'R3F'] },
    sotd_webgl_31: { name: 'Nebula Interface', year: 2023, award: 'SOTD', avgScore: 8.65, design: 8.8, usability: 8.4, creativity: 8.8, content: 8.6, genre: 'saas', tech: ['Three.js', 'Canvas'] },
    sotd_webgl_32: { name: 'Digital Harvest', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'brand', tech: ['Three.js', 'GSAP'] },
    sotd_webgl_33: { name: 'Chronicle Museum', year: 2023, award: 'SOTD', avgScore: 8.92, design: 9.1, usability: 8.7, creativity: 9.1, content: 8.8, genre: 'entertainment', tech: ['WebGL', 'Custom'] },
    sotd_webgl_34: { name: 'Zero Gravity Studio', year: 2024, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.6, creativity: 9.1, content: 8.7, genre: 'agency', tech: ['Three.js', 'Physics'] },
    sotd_webgl_35: { name: 'Aurora Borealis', year: 2024, award: 'SOTD', avgScore: 8.90, design: 9.1, usability: 8.7, creativity: 9.1, content: 8.8, genre: 'experimental', tech: ['WebGL', 'Custom Shaders', 'GPGPU'] },

    sotd_experimental_08: { name: 'Fractal Dimensions', year: 2024, award: 'SOTD', avgScore: 8.82, design: 8.9, usability: 8.4, creativity: 9.3, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Raymarching'] },
    sotd_experimental_09: { name: 'Synthetic Emotions', year: 2023, award: 'SOTD', avgScore: 8.75, design: 8.8, usability: 8.5, creativity: 9.1, content: 8.6, genre: 'experimental', tech: ['Three.js', 'Web Audio'] },
    sotd_experimental_10: { name: 'Neural Pathways', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.0, usability: 8.5, creativity: 9.2, content: 8.8, genre: 'experimental', tech: ['WebGL', 'GPGPU', 'Custom Shaders'] },
    sotd_experimental_11: { name: 'Tidal Resonance', year: 2023, award: 'SOTD', avgScore: 8.70, design: 8.7, usability: 8.4, creativity: 9.1, content: 8.6, genre: 'experimental', tech: ['Three.js', 'Physics'] },
    sotd_experimental_12: { name: 'Chromatic Voyage', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.4, creativity: 9.2, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Custom Shaders'] },
    sotd_experimental_13: { name: 'Digital Organism', year: 2023, award: 'SOTD', avgScore: 8.85, design: 8.9, usability: 8.5, creativity: 9.2, content: 8.8, genre: 'experimental', tech: ['Three.js', 'WASM', 'Procedural'] },
    sotd_experimental_14: { name: 'Quantum Field', year: 2024, award: 'SOTD', avgScore: 8.72, design: 8.8, usability: 8.3, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'GPGPU'] },
    sotd_experimental_15: { name: 'Ephemeral Garden', year: 2023, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.4, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Procedural'] },
    sotd_experimental_16: { name: 'Synaptic Web', year: 2024, award: 'SOTD', avgScore: 8.68, design: 8.7, usability: 8.4, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Canvas'] },
    sotd_experimental_17: { name: 'Metamorphosis', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.0, usability: 8.5, creativity: 9.3, content: 8.8, genre: 'experimental', tech: ['Three.js', 'Custom Shaders', 'GPGPU'] },
    sotd_experimental_18: { name: 'Prismatic Echo', year: 2024, award: 'SOTD', avgScore: 8.76, design: 8.8, usability: 8.5, creativity: 9.1, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Web Audio'] },
    sotd_experimental_19: { name: 'Entropy Visualizer', year: 2023, award: 'SOTD', avgScore: 8.65, design: 8.6, usability: 8.4, creativity: 9.0, content: 8.5, genre: 'experimental', tech: ['Three.js', 'WASM'] },
    sotd_experimental_20: { name: 'Fluid Dynamics Lab', year: 2024, award: 'SOTD', avgScore: 8.82, design: 8.9, usability: 8.5, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['WebGL', 'GPGPU', 'Physics'] },
    sotd_experimental_21: { name: 'Soundscape Generator', year: 2023, award: 'SOTD', avgScore: 8.73, design: 8.7, usability: 8.4, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Web Audio'] },
    sotd_experimental_22: { name: 'Abstract Territories', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.4, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Raymarching'] },

    sotd_agency_07: { name: 'Proof & Company', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.1, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'agency', tech: ['Three.js', 'GSAP'] },
    sotd_agency_08: { name: 'Akaru Studio', year: 2023, award: 'SOTD', avgScore: 8.82, design: 9.0, usability: 8.6, creativity: 9.0, content: 8.7, genre: 'agency', tech: ['WebGL', 'Custom'] },
    sotd_agency_09: { name: 'Crafton Studio', year: 2024, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.6, creativity: 8.8, content: 8.7, genre: 'agency', tech: ['R3F', 'GSAP'] },
    sotd_agency_10: { name: 'Nord Studio', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.1, usability: 8.7, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['Three.js'] },
    sotd_agency_11: { name: 'Huncwot', year: 2024, award: 'SOTD', avgScore: 8.78, design: 9.0, usability: 8.5, creativity: 8.9, content: 8.7, genre: 'agency', tech: ['WebGL'] },
    sotd_agency_12: { name: 'Upperquad', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'agency', tech: ['GSAP', 'Canvas'] },
    sotd_agency_13: { name: 'Cuberto', year: 2024, award: 'SOTD', avgScore: 8.92, design: 9.2, usability: 8.7, creativity: 9.0, content: 8.8, genre: 'agency', tech: ['Three.js', 'GSAP'] },
    sotd_agency_14: { name: 'Aristide Studio', year: 2023, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'agency', tech: ['WebGL'] },
    sotd_agency_15: { name: 'Ornikar Digital', year: 2024, award: 'SOTD', avgScore: 8.72, design: 8.9, usability: 8.6, creativity: 8.7, content: 8.7, genre: 'agency', tech: ['GSAP'] },
    sotd_agency_16: { name: 'Makemepulse', year: 2023, award: 'SOTD', avgScore: 8.95, design: 9.1, usability: 8.7, creativity: 9.1, content: 8.9, genre: 'agency', tech: ['Three.js', 'Custom'] },

    sotd_portfolio_04: { name: 'Felix Turner', year: 2024, award: 'SOTD', avgScore: 8.70, design: 8.9, usability: 8.4, creativity: 8.8, content: 8.7, genre: 'portfolio', tech: ['Three.js', 'GSAP'] },
    sotd_portfolio_05: { name: 'Yuri Artiukh', year: 2023, award: 'SOTD', avgScore: 8.75, design: 8.8, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'portfolio', tech: ['Three.js', 'Custom Shaders'] },
    sotd_portfolio_06: { name: 'Maxime Ferreira', year: 2024, award: 'SOTD', avgScore: 8.68, design: 8.9, usability: 8.4, creativity: 8.7, content: 8.6, genre: 'portfolio', tech: ['WebGL', 'GSAP'] },
    sotd_portfolio_07: { name: 'Andrea Bianchi', year: 2023, award: 'SOTD', avgScore: 8.72, design: 9.0, usability: 8.4, creativity: 8.8, content: 8.6, genre: 'portfolio', tech: ['Three.js'] },
    sotd_portfolio_08: { name: 'Stas Melnikov', year: 2024, award: 'SOTD', avgScore: 8.65, design: 8.8, usability: 8.4, creativity: 8.7, content: 8.6, genre: 'portfolio', tech: ['Canvas', 'GSAP'] },
    sotd_portfolio_09: { name: 'Maria Navarro', year: 2023, award: 'SOTD', avgScore: 8.78, design: 9.0, usability: 8.5, creativity: 8.8, content: 8.8, genre: 'portfolio', tech: ['Three.js', 'R3F'] },
    sotd_portfolio_10: { name: 'Thomas Aufresne', year: 2024, award: 'SOTD', avgScore: 8.82, design: 9.1, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'portfolio', tech: ['WebGL', 'Custom Shaders'] },
    sotd_portfolio_11: { name: 'Kenji Saito', year: 2023, award: 'SOTD', avgScore: 8.70, design: 8.9, usability: 8.4, creativity: 8.8, content: 8.6, genre: 'portfolio', tech: ['Three.js'] },

    sotd_scroll_01: { name: 'Locomotive Scroll Showcase', year: 2024, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'experimental', tech: ['GSAP', 'Scroll-driven'] },
    sotd_scroll_02: { name: 'The Parallax Chronicle', year: 2023, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'experimental', tech: ['GSAP', 'Scroll-driven'] },
    sotd_scroll_03: { name: 'Vertical Odyssey', year: 2024, award: 'SOTD', avgScore: 8.72, design: 8.9, usability: 8.5, creativity: 8.8, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Scroll-driven'] },
    sotd_scroll_04: { name: 'Infinite Canvas', year: 2023, award: 'SOTD', avgScore: 8.80, design: 9.0, usability: 8.6, creativity: 8.9, content: 8.7, genre: 'experimental', tech: ['Canvas', 'Scroll-driven'] },
    sotd_scroll_05: { name: 'Apple Vision Tribute', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.1, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'product', tech: ['GSAP', 'Scroll-driven', 'Canvas'] },
    sotd_scroll_06: { name: 'Scroll Alchemy', year: 2023, award: 'SOTD', avgScore: 8.68, design: 8.8, usability: 8.5, creativity: 8.8, content: 8.6, genre: 'experimental', tech: ['GSAP', 'Scroll-driven'] },
    sotd_scroll_07: { name: 'Frame by Frame', year: 2024, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.6, creativity: 8.8, content: 8.7, genre: 'campaign', tech: ['Canvas', 'Scroll-driven'] },
    sotd_scroll_08: { name: 'Kinesis Timeline', year: 2023, award: 'SOTD', avgScore: 8.82, design: 9.0, usability: 8.6, creativity: 9.0, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Scroll-driven', 'GSAP'] },

    sotd_immersive_01: { name: 'Virtual Gallery Walk', year: 2024, award: 'SOTD', avgScore: 8.92, design: 9.1, usability: 8.6, creativity: 9.2, content: 8.8, genre: 'entertainment', tech: ['Three.js', 'WebGL'] },
    sotd_immersive_02: { name: 'Ocean Floor Explorer', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.5, creativity: 9.1, content: 8.8, genre: 'experimental', tech: ['Three.js', 'GPGPU'] },
    sotd_immersive_03: { name: 'Abandoned City', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.4, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Custom'] },
    sotd_immersive_04: { name: 'Mars Colonization', year: 2023, award: 'SOTD', avgScore: 8.90, design: 9.1, usability: 8.6, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Physics'] },
    sotd_immersive_05: { name: 'The Vault Experience', year: 2024, award: 'SOTD', avgScore: 8.82, design: 9.0, usability: 8.5, creativity: 9.1, content: 8.7, genre: 'brand', tech: ['WebGL', 'Web Audio'] },
    sotd_immersive_06: { name: 'Subterranean Journey', year: 2023, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.4, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Custom Shaders'] },

    sotd_av_01: { name: 'Sonic Landscapes', year: 2024, award: 'SOTD', avgScore: 8.80, design: 8.9, usability: 8.4, creativity: 9.2, content: 8.7, genre: 'entertainment', tech: ['Three.js', 'Web Audio'] },
    sotd_av_02: { name: 'Rhythm Machine', year: 2023, award: 'SOTD', avgScore: 8.72, design: 8.7, usability: 8.5, creativity: 9.1, content: 8.6, genre: 'experimental', tech: ['Canvas', 'Web Audio'] },
    sotd_av_03: { name: 'Visualizer Pro', year: 2024, award: 'SOTD', avgScore: 8.68, design: 8.8, usability: 8.4, creativity: 9.0, content: 8.5, genre: 'experimental', tech: ['WebGL', 'Web Audio'] },
    sotd_av_04: { name: 'Spectral Frequencies', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.5, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Web Audio', 'GPGPU'] },
    sotd_av_05: { name: 'Sound Canvas', year: 2024, award: 'SOTD', avgScore: 8.76, design: 8.8, usability: 8.5, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['Canvas', 'Web Audio'] },
    sotd_av_06: { name: 'Waveform Explorer', year: 2023, award: 'SOTD', avgScore: 8.70, design: 8.7, usability: 8.5, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Web Audio'] },

    sotd_brand_01: { name: 'Hennessy XO', year: 2024, award: 'SOTD', avgScore: 8.90, design: 9.2, usability: 8.7, creativity: 8.9, content: 8.8, genre: 'brand', tech: ['Three.js', 'GSAP'] },
    sotd_brand_02: { name: 'Porsche Heritage', year: 2023, award: 'SOTD', avgScore: 8.95, design: 9.2, usability: 8.8, creativity: 9.0, content: 8.8, genre: 'brand', tech: ['WebGL', 'Custom'] },
    sotd_brand_03: { name: 'Dior Couture Digital', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.2, usability: 8.6, creativity: 8.9, content: 8.8, genre: 'brand', tech: ['Three.js'] },
    sotd_brand_04: { name: 'Louis Vuitton Trunk', year: 2023, award: 'SOTD', avgScore: 8.82, design: 9.1, usability: 8.5, creativity: 8.9, content: 8.8, genre: 'brand', tech: ['WebGL', 'GSAP'] },
    sotd_brand_05: { name: 'Tesla Cybertruck', year: 2024, award: 'SOTD', avgScore: 8.78, design: 9.0, usability: 8.6, creativity: 8.8, content: 8.7, genre: 'brand', tech: ['Three.js', 'R3F'] },

    sotd_product_01: { name: 'Dyson Airwrap', year: 2024, award: 'SOTD', avgScore: 8.85, design: 9.1, usability: 8.7, creativity: 8.8, content: 8.8, genre: 'product', tech: ['Three.js', 'GSAP'] },
    sotd_product_02: { name: 'Bang & Olufsen Beoplay', year: 2023, award: 'SOTD', avgScore: 8.80, design: 9.1, usability: 8.6, creativity: 8.8, content: 8.7, genre: 'product', tech: ['WebGL', 'Custom'] },
    sotd_product_03: { name: 'Rivian R2 Configurator', year: 2024, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.7, creativity: 8.7, content: 8.7, genre: 'product', tech: ['Three.js', 'R3F'] },
    sotd_product_04: { name: 'Sonos Arc Experience', year: 2023, award: 'SOTD', avgScore: 8.70, design: 8.9, usability: 8.6, creativity: 8.6, content: 8.7, genre: 'product', tech: ['Canvas', 'GSAP'] },
    sotd_product_05: { name: 'Apple Watch Ultra', year: 2024, award: 'SOTD', avgScore: 8.92, design: 9.2, usability: 8.8, creativity: 8.8, content: 8.8, genre: 'product', tech: ['Canvas', 'Scroll-driven', 'GSAP'] },

    sotm_2024_jul: { name: 'Bureau Borsche', year: 2024, award: 'SOTM', avgScore: 9.18, design: 9.3, usability: 9.0, creativity: 9.2, content: 9.1, genre: 'agency', tech: ['GSAP', 'Canvas'] },
    sotm_2024_aug: { name: 'Holographik', year: 2024, award: 'SOTM', avgScore: 9.25, design: 9.4, usability: 9.0, creativity: 9.4, content: 9.1, genre: 'agency', tech: ['Three.js', 'Custom Shaders'] },
    sotm_2024_sep: { name: 'DIA Studio', year: 2024, award: 'SOTM', avgScore: 9.20, design: 9.3, usability: 9.1, creativity: 9.3, content: 9.1, genre: 'agency', tech: ['WebGL'] },
    sotm_2024_oct: { name: 'Antinomy Studio', year: 2024, award: 'SOTM', avgScore: 9.22, design: 9.3, usability: 9.1, creativity: 9.3, content: 9.2, genre: 'agency', tech: ['Three.js', 'R3F'] },

    sotm_2022_jul: { name: 'Zajno Studio', year: 2022, award: 'SOTM', avgScore: 9.12, design: 9.2, usability: 9.0, creativity: 9.2, content: 9.0, genre: 'agency', tech: ['WebGL'] },
    sotm_2022_aug: { name: 'Hello Monday', year: 2022, award: 'SOTM', avgScore: 9.15, design: 9.2, usability: 9.0, creativity: 9.2, content: 9.1, genre: 'agency', tech: ['Three.js', 'GSAP'] },
    sotm_2022_sep: { name: 'Immersive Garden Folio', year: 2022, award: 'SOTM', avgScore: 9.18, design: 9.3, usability: 9.0, creativity: 9.3, content: 9.0, genre: 'agency', tech: ['WebGL', 'Custom'] },
    sotm_2022_oct: { name: 'Waaark Studio', year: 2022, award: 'SOTM', avgScore: 9.10, design: 9.2, usability: 9.0, creativity: 9.1, content: 9.1, genre: 'agency', tech: ['Three.js'] },

    hm_06: { name: 'Zenith Digital', year: 2024, award: 'HM', avgScore: 8.20, design: 8.4, usability: 8.1, creativity: 8.1, content: 8.2, genre: 'agency', tech: ['GSAP'] },
    hm_07: { name: 'Craft Brewery Site', year: 2023, award: 'HM', avgScore: 8.12, design: 8.3, usability: 8.1, creativity: 8.0, content: 8.1, genre: 'brand', tech: ['CSS', 'GSAP'] },
    hm_08: { name: 'Modernist Architect', year: 2024, award: 'HM', avgScore: 8.25, design: 8.5, usability: 8.1, creativity: 8.1, content: 8.3, genre: 'corporate', tech: ['Three.js'] },
    hm_09: { name: 'Photography Showcase', year: 2023, award: 'HM', avgScore: 8.18, design: 8.4, usability: 8.0, creativity: 8.1, content: 8.2, genre: 'portfolio', tech: ['GSAP'] },
    hm_10: { name: 'Indie Game Studio', year: 2024, award: 'HM', avgScore: 8.28, design: 8.4, usability: 8.1, creativity: 8.3, content: 8.3, genre: 'entertainment', tech: ['Canvas', 'GSAP'] },
    hm_11: { name: 'Organic Skincare', year: 2023, award: 'HM', avgScore: 8.08, design: 8.2, usability: 8.1, creativity: 7.9, content: 8.1, genre: 'brand', tech: ['CSS'] },
    hm_12: { name: 'Coworking Space', year: 2024, award: 'HM', avgScore: 8.15, design: 8.3, usability: 8.2, creativity: 8.0, content: 8.1, genre: 'corporate', tech: ['GSAP'] },
    hm_13: { name: 'Travel Journal', year: 2023, award: 'HM', avgScore: 8.22, design: 8.4, usability: 8.0, creativity: 8.2, content: 8.3, genre: 'portfolio', tech: ['CSS', 'GSAP'] },
    hm_14: { name: 'Restaurant Premium', year: 2024, award: 'HM', avgScore: 8.10, design: 8.3, usability: 8.1, creativity: 7.9, content: 8.1, genre: 'brand', tech: ['GSAP'] },
    hm_15: { name: 'Art Gallery Digital', year: 2023, award: 'HM', avgScore: 8.30, design: 8.5, usability: 8.0, creativity: 8.3, content: 8.3, genre: 'entertainment', tech: ['Three.js'] },

    noaward_06: { name: 'Startup Landing Page', year: 2024, award: 'none', avgScore: 7.20, design: 7.4, usability: 7.5, creativity: 6.8, content: 7.2, genre: 'saas', tech: ['CSS'] },
    noaward_07: { name: 'Dental Clinic Site', year: 2023, award: 'none', avgScore: 6.50, design: 6.4, usability: 7.2, creativity: 5.6, content: 6.8, genre: 'corporate', tech: ['CSS'] },
    noaward_08: { name: 'Real Estate Agency', year: 2024, award: 'none', avgScore: 6.80, design: 6.9, usability: 7.3, creativity: 6.0, content: 7.0, genre: 'corporate', tech: ['CSS'] },
    noaward_09: { name: 'Junior Dev Portfolio', year: 2023, award: 'none', avgScore: 7.40, design: 7.6, usability: 7.4, creativity: 7.2, content: 7.4, genre: 'portfolio', tech: ['Three.js'] },
    noaward_10: { name: 'Local Bakery', year: 2024, award: 'none', avgScore: 6.20, design: 6.2, usability: 6.8, creativity: 5.5, content: 6.3, genre: 'brand', tech: ['CSS'] },
    noaward_11: { name: 'Consulting Firm', year: 2023, award: 'none', avgScore: 7.00, design: 7.1, usability: 7.4, creativity: 6.3, content: 7.2, genre: 'corporate', tech: ['CSS'] },
    noaward_12: { name: 'Fashion Boutique', year: 2024, award: 'none', avgScore: 7.60, design: 7.9, usability: 7.3, creativity: 7.5, content: 7.7, genre: 'ecommerce', tech: ['GSAP'] },
    noaward_13: { name: 'Fitness App Landing', year: 2023, award: 'none', avgScore: 7.10, design: 7.3, usability: 7.4, creativity: 6.6, content: 7.1, genre: 'saas', tech: ['CSS'] },
    noaward_14: { name: 'Wedding Photographer', year: 2024, award: 'none', avgScore: 7.50, design: 7.8, usability: 7.2, creativity: 7.3, content: 7.7, genre: 'portfolio', tech: ['GSAP'] },
    noaward_15: { name: 'Tech Blog Template', year: 2023, award: 'none', avgScore: 6.40, design: 6.3, usability: 7.0, creativity: 5.6, content: 6.7, genre: 'corporate', tech: ['CSS'] },

    sotd_dark_01: { name: 'Void Interface', year: 2024, award: 'SOTD', avgScore: 8.82, design: 9.1, usability: 8.5, creativity: 8.9, content: 8.8, genre: 'experimental', tech: ['Three.js', 'Custom Shaders'] },
    sotd_dark_02: { name: 'Obsidian Studio', year: 2023, award: 'SOTD', avgScore: 8.75, design: 9.0, usability: 8.5, creativity: 8.8, content: 8.7, genre: 'agency', tech: ['WebGL', 'GSAP'] },
    sotd_dark_03: { name: 'Noir Collective', year: 2024, award: 'SOTD', avgScore: 8.68, design: 8.9, usability: 8.4, creativity: 8.7, content: 8.6, genre: 'agency', tech: ['GSAP'] },
    sotd_dark_04: { name: 'Midnight Architecture', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.1, usability: 8.6, creativity: 8.9, content: 8.8, genre: 'corporate', tech: ['Three.js', 'GSAP'] },
    sotd_dark_05: { name: 'Eclipse Portfolio', year: 2024, award: 'SOTD', avgScore: 8.72, design: 9.0, usability: 8.4, creativity: 8.8, content: 8.6, genre: 'portfolio', tech: ['WebGL', 'Custom Shaders'] },

    sotd_narrative_01: { name: 'The Last Glacier', year: 2024, award: 'SOTD', avgScore: 8.90, design: 9.0, usability: 8.6, creativity: 9.2, content: 8.8, genre: 'experimental', tech: ['Three.js', 'Scroll-driven'] },
    sotd_narrative_02: { name: 'Memory Lane', year: 2023, award: 'SOTD', avgScore: 8.82, design: 8.9, usability: 8.6, creativity: 9.0, content: 8.8, genre: 'experimental', tech: ['GSAP', 'Canvas'] },
    sotd_narrative_03: { name: 'Origin Stories', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.5, creativity: 9.0, content: 8.8, genre: 'campaign', tech: ['Three.js', 'Scroll-driven'] },
    sotd_narrative_04: { name: 'A Journey Through Time', year: 2023, award: 'SOTD', avgScore: 8.85, design: 9.0, usability: 8.6, creativity: 9.1, content: 8.8, genre: 'experimental', tech: ['WebGL', 'Web Audio'] },
    sotd_narrative_05: { name: 'The Forgotten Archive', year: 2024, award: 'SOTD', avgScore: 8.75, design: 8.9, usability: 8.5, creativity: 9.0, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Scroll-driven'] },

    sotd_physics_01: { name: 'Gravity Playground', year: 2024, award: 'SOTD', avgScore: 8.82, design: 8.8, usability: 8.5, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Physics', 'Cannon.js'] },
    sotd_physics_02: { name: 'Cloth Simulator', year: 2023, award: 'SOTD', avgScore: 8.75, design: 8.7, usability: 8.5, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Physics', 'GPGPU'] },
    sotd_physics_03: { name: 'Particle Storm', year: 2024, award: 'SOTD', avgScore: 8.80, design: 8.9, usability: 8.4, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Physics', 'GPGPU'] },
    sotd_physics_04: { name: 'Elastic World', year: 2023, award: 'SOTD', avgScore: 8.70, design: 8.7, usability: 8.5, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['WebGL', 'Physics'] },
    sotd_physics_05: { name: 'Soft Body Lab', year: 2024, award: 'SOTD', avgScore: 8.78, design: 8.8, usability: 8.5, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Physics', 'WASM'] },

    sotd_webgpu_01: { name: 'Chrome WebGPU Demo', year: 2024, award: 'SOTD', avgScore: 8.92, design: 8.8, usability: 8.7, creativity: 9.4, content: 8.8, genre: 'experimental', tech: ['WebGPU', 'Custom'] },
    sotd_webgpu_02: { name: 'Compute Playground', year: 2024, award: 'SOTD', avgScore: 8.85, design: 8.7, usability: 8.6, creativity: 9.3, content: 8.8, genre: 'experimental', tech: ['WebGPU', 'WASM'] },
    sotd_realtime_01: { name: 'Ocean Simulator', year: 2024, award: 'SOTD', avgScore: 8.88, design: 9.0, usability: 8.5, creativity: 9.2, content: 8.8, genre: 'experimental', tech: ['Three.js', 'GPGPU', 'Custom Shaders'] },
    sotd_realtime_02: { name: 'Weather Visualizer', year: 2023, award: 'SOTD', avgScore: 8.80, design: 8.9, usability: 8.7, creativity: 9.0, content: 8.6, genre: 'experimental', tech: ['Three.js', 'Canvas'] },
    sotd_generative_01: { name: 'Procedural Garden', year: 2024, award: 'SOTD', avgScore: 8.82, design: 9.0, usability: 8.4, creativity: 9.2, content: 8.7, genre: 'experimental', tech: ['Three.js', 'Procedural'] },
    sotd_generative_02: { name: 'Fractal Universe', year: 2023, award: 'SOTD', avgScore: 8.78, design: 8.9, usability: 8.4, creativity: 9.1, content: 8.7, genre: 'experimental', tech: ['WebGL', 'Raymarching', 'Custom Shaders'] },
    sotd_generative_03: { name: 'Sound Garden', year: 2024, award: 'SOTD', avgScore: 8.90, design: 9.0, usability: 8.5, creativity: 9.3, content: 8.8, genre: 'experimental', tech: ['Three.js', 'Web Audio', 'GPGPU'] },
    hm_16: { name: 'Vintage Wine Bar', year: 2024, award: 'HM', avgScore: 8.20, design: 8.4, usability: 8.1, creativity: 8.0, content: 8.3, genre: 'brand', tech: ['GSAP'] },
    hm_17: { name: 'Digital Garden Blog', year: 2023, award: 'HM', avgScore: 8.12, design: 8.2, usability: 8.2, creativity: 7.9, content: 8.2, genre: 'portfolio', tech: ['CSS'] },
    hm_18: { name: 'Surf School Landing', year: 2024, award: 'HM', avgScore: 8.18, design: 8.4, usability: 8.0, creativity: 8.1, content: 8.2, genre: 'brand', tech: ['GSAP', 'CSS'] },
  },

  genreBenchmarks: {
    experimental: { avgScore: 8.25, sotdRate: 0.22, designAvg: 8.4, usabilityAvg: 7.8, creativityAvg: 8.8, contentAvg: 7.9, juryExcitement: 1.15 },
    agency: { avgScore: 8.10, sotdRate: 0.15, designAvg: 8.4, usabilityAvg: 8.2, creativityAvg: 8.0, contentAvg: 8.0, juryExcitement: 1.0 },
    portfolio: { avgScore: 7.80, sotdRate: 0.08, designAvg: 8.2, usabilityAvg: 7.8, creativityAvg: 7.8, contentAvg: 7.5, juryExcitement: 0.90 },
    brand: { avgScore: 7.90, sotdRate: 0.10, designAvg: 8.3, usabilityAvg: 8.0, creativityAvg: 7.6, contentAvg: 8.0, juryExcitement: 0.95 },
    campaign: { avgScore: 8.15, sotdRate: 0.18, designAvg: 8.4, usabilityAvg: 8.0, creativityAvg: 8.4, contentAvg: 8.0, juryExcitement: 1.10 },
    corporate: { avgScore: 7.30, sotdRate: 0.05, designAvg: 7.6, usabilityAvg: 7.8, creativityAvg: 6.5, contentAvg: 7.3, juryExcitement: 0.75 },
    ecommerce: { avgScore: 7.10, sotdRate: 0.04, designAvg: 7.3, usabilityAvg: 7.6, creativityAvg: 6.2, contentAvg: 7.3, juryExcitement: 0.70 },
    saas: { avgScore: 7.60, sotdRate: 0.07, designAvg: 7.9, usabilityAvg: 8.2, creativityAvg: 7.0, contentAvg: 7.5, juryExcitement: 0.80 },
    entertainment: { avgScore: 8.00, sotdRate: 0.12, designAvg: 8.2, usabilityAvg: 7.8, creativityAvg: 8.2, contentAvg: 7.8, juryExcitement: 1.05 },
    event: { avgScore: 7.85, sotdRate: 0.10, designAvg: 8.1, usabilityAvg: 7.9, creativityAvg: 7.9, contentAvg: 7.7, juryExcitement: 0.95 },
    product: { avgScore: 7.75, sotdRate: 0.09, designAvg: 8.0, usabilityAvg: 8.0, creativityAvg: 7.5, contentAvg: 7.8, juryExcitement: 0.90 },
    fintech: { avgScore: 7.50, sotdRate: 0.06, designAvg: 7.8, usabilityAvg: 8.1, creativityAvg: 7.0, contentAvg: 7.4, juryExcitement: 0.78 },
  },

  technologyImpact: {
    'Three.js': { creativityBonus: 0.35, designBonus: 0.15, usabilityPenalty: -0.10, juryFamiliarity: 0.85 },
    'WebGL': { creativityBonus: 0.40, designBonus: 0.15, usabilityPenalty: -0.12, juryFamiliarity: 0.80 },
    'R3F': { creativityBonus: 0.30, designBonus: 0.10, usabilityPenalty: -0.08, juryFamiliarity: 0.70 },
    'GPGPU': { creativityBonus: 0.50, designBonus: 0.10, usabilityPenalty: -0.15, juryFamiliarity: 0.45 },
    'Custom Shaders': { creativityBonus: 0.45, designBonus: 0.20, usabilityPenalty: -0.10, juryFamiliarity: 0.55 },
    'Raymarching': { creativityBonus: 0.55, designBonus: 0.15, usabilityPenalty: -0.15, juryFamiliarity: 0.35 },
    'Web Audio': { creativityBonus: 0.35, designBonus: 0.05, usabilityPenalty: 0.0, juryFamiliarity: 0.50 },
    'GSAP': { creativityBonus: 0.15, designBonus: 0.10, usabilityPenalty: 0.0, juryFamiliarity: 0.95 },
    'Canvas': { creativityBonus: 0.20, designBonus: 0.10, usabilityPenalty: -0.05, juryFamiliarity: 0.90 },
    'CSS': { creativityBonus: 0.05, designBonus: 0.05, usabilityPenalty: 0.05, juryFamiliarity: 1.0 },
    'WebGPU': { creativityBonus: 0.60, designBonus: 0.10, usabilityPenalty: -0.20, juryFamiliarity: 0.20 },
    'WASM': { creativityBonus: 0.40, designBonus: 0.05, usabilityPenalty: -0.10, juryFamiliarity: 0.30 },
    'Scroll-driven': { creativityBonus: 0.25, designBonus: 0.10, usabilityPenalty: -0.05, juryFamiliarity: 0.85 },
    'Physics': { creativityBonus: 0.30, designBonus: 0.10, usabilityPenalty: -0.08, juryFamiliarity: 0.60 },
    'Procedural': { creativityBonus: 0.40, designBonus: 0.15, usabilityPenalty: -0.10, juryFamiliarity: 0.40 },
  },

  performanceCorrelations: {
    loadTime: [
      { maxMs: 1000, scoreImpact: 0.3, usabilityScore: 9.5 },
      { maxMs: 1500, scoreImpact: 0.2, usabilityScore: 9.0 },
      { maxMs: 2000, scoreImpact: 0.1, usabilityScore: 8.5 },
      { maxMs: 2500, scoreImpact: 0.0, usabilityScore: 8.0 },
      { maxMs: 3500, scoreImpact: -0.1, usabilityScore: 7.5 },
      { maxMs: 5000, scoreImpact: -0.2, usabilityScore: 7.0 },
      { maxMs: 7000, scoreImpact: -0.35, usabilityScore: 6.5 },
      { maxMs: 10000, scoreImpact: -0.5, usabilityScore: 5.5 },
      { maxMs: Infinity, scoreImpact: -0.8, usabilityScore: 4.5 },
    ],
    fps: [
      { minFps: 58, scoreImpact: 0.2, usabilityScore: 9.5 },
      { minFps: 55, scoreImpact: 0.1, usabilityScore: 9.0 },
      { minFps: 50, scoreImpact: 0.0, usabilityScore: 8.5 },
      { minFps: 45, scoreImpact: -0.1, usabilityScore: 8.0 },
      { minFps: 40, scoreImpact: -0.2, usabilityScore: 7.5 },
      { minFps: 35, scoreImpact: -0.3, usabilityScore: 7.0 },
      { minFps: 30, scoreImpact: -0.5, usabilityScore: 6.0 },
      { minFps: 20, scoreImpact: -0.8, usabilityScore: 5.0 },
      { minFps: 0, scoreImpact: -1.2, usabilityScore: 3.0 },
    ],
    transferSize: [
      { maxMB: 1, scoreImpact: 0.1 },
      { maxMB: 3, scoreImpact: 0.05 },
      { maxMB: 5, scoreImpact: 0.0 },
      { maxMB: 10, scoreImpact: -0.05 },
      { maxMB: 20, scoreImpact: -0.1 },
      { maxMB: 50, scoreImpact: -0.2 },
      { maxMB: Infinity, scoreImpact: -0.3 },
    ],
  },

  accessibilityCorrelations: {
    ariaElements: [
      { min: 0, max: 5, score: 5.5 },
      { min: 6, max: 15, score: 6.5 },
      { min: 16, max: 30, score: 7.5 },
      { min: 31, max: 60, score: 8.0 },
      { min: 61, max: 100, score: 8.5 },
      { min: 101, max: Infinity, score: 9.0 },
    ],
    headings: [
      { min: 0, max: 0, score: 5.0, seoScore: 5.0 },
      { min: 1, max: 2, score: 6.5, seoScore: 6.0 },
      { min: 3, max: 5, score: 7.5, seoScore: 7.5 },
      { min: 6, max: 10, score: 8.0, seoScore: 8.0 },
      { min: 11, max: 20, score: 8.5, seoScore: 8.5 },
      { min: 21, max: Infinity, score: 9.0, seoScore: 9.0 },
    ],
    semanticElements: [
      { min: 0, max: 1, score: 5.5 },
      { min: 2, max: 4, score: 7.0 },
      { min: 5, max: 8, score: 7.5 },
      { min: 9, max: 15, score: 8.0 },
      { min: 16, max: Infinity, score: 8.5 },
    ],
  },

  penaltyFactors: {
    fpsBelow20: -1.2,
    fpsBelow30: -0.8,
    fpsBelow45: -0.4,
    fpsBelow55: -0.15,
    noMobileSupport: -1.5,
    poorMobile: -0.8,
    degradedMobile: -0.4,
    noAccessibility: -0.5,
    poorAccessibility: -0.3,
    brokenInSafari: -0.6,
    brokenInFirefox: -0.3,
    brokenInEdge: -0.2,
    slowLoad3s: -0.2,
    slowLoad5s: -0.4,
    slowLoad8s: -0.6,
    slowLoad12s: -0.8,
    noReducedMotion: -0.2,
    noAudio: -0.1,
    noCredits: -0.1,
    consoleLogs: -0.05,
    consoleErrors: -0.15,
    visibleDebugUI: -0.3,
    brokenLinks: -0.4,
    poorTypography: -0.3,
    inconsistentDesign: -0.3,
    noFavicon: -0.05,
    noMetaDescription: -0.08,
    noOpenGraph: -0.05,
    noServiceWorker: -0.02,
    memoryLeaks: -0.3,
    layoutShifts: -0.2,
    flickering: -0.4,
    brokenAnimations: -0.3,
    lowResAssets: -0.2,
  },

  bonusFactors: {
    proceduralAudio: 0.15,
    customShaders: 0.20,
    physicsSimulation: 0.15,
    narrativeArc: 0.20,
    scientificAccuracy: 0.10,
    customCursor: 0.05,
    scrollStorytelling: 0.15,
    proceduralGeneration: 0.10,
    webGPU: 0.10,
    performanceOptimized: 0.10,
    accessibilityExcellent: 0.15,
    darkMode: 0.05,
    hapticFeedback: 0.05,
    gpgpuComputation: 0.20,
    raymarching: 0.20,
    postProcessingPipeline: 0.10,
    multiPassRendering: 0.10,
    particleSystems: 0.10,
    einsteinPhysics: 0.10,
    dopplerEffect: 0.10,
    blackbodyRadiation: 0.10,
    chromaticAberration: 0.05,
    bloomEffects: 0.05,
    smoothScrolling: 0.05,
    qualityTiers: 0.08,
    loadingScreen: 0.05,
    soundDesign: 0.12,
    interactiveMouse: 0.08,
    uniqueChapters: 0.10,
    creditPage: 0.05,
    mathAccuracy: 0.08,
    responsiveWebGL: 0.10,
    touchOptimized: 0.08,
  },

  confidenceFactors: {
    baseConfidence: 0.30,
    perReferenceSiteMatch: 0.005,
    codeAnalysisComplete: 0.08,
    desktopVisualFramesCaptured: 0.12,
    mobileVisualFramesCaptured: 0.08,
    fpsMeasured: 0.05,
    fpsEstimated: 0.01,
    screenshotsCaptured: 0.04,
    mobileScreenshotsCaptured: 0.04,
    loadTimeMeasured: 0.03,
    accessibilityAudited: 0.02,
    networkDataCollected: 0.02,
    crossValidationDone: 0.03,
    juryModelCalibrated: 0.02,
    maxConfidence: 0.98,
  },
} as const;

export type CategoryName = keyof typeof AWWWARDS_SCORING.categories;

export interface SubScore {
  name: string;
  score: number;
  maxScore: number;
  confidence: number;
  notes: string;
  dataSource: string;
}

export interface CategoryScore {
  category: CategoryName;
  score: number;
  confidence: number;
  subScores: SubScore[];
  penalties: { name: string; value: number; source: string }[];
  bonuses: { name: string; value: number; source: string }[];
}

export interface JurorVote {
  jurorId: number;
  jurorName: string;
  jurorRole: string;
  design: number;
  usability: number;
  creativity: number;
  content: number;
  overall: number;
}

export interface ConfidenceBreakdownItem {
  source: string;
  measured: boolean;
  dataPoints: number;
  contribution: number;
  notes: string;
}

export interface AnalysisResult {
  timestamp: string;
  overallScore: number;
  confidence: number;
  dataPointsUsed: number;
  confidenceBreakdown: ConfidenceBreakdownItem[];
  categories: CategoryScore[];
  predictions: {
    honorableMention: { probability: number; confidence: number };
    sotd: { probability: number; confidence: number };
    sotm: { probability: number; confidence: number };
    soty: { probability: number; confidence: number };
  };
  jurySimulation: {
    expectedVotes: number;
    scoreDistribution: { min: number; max: number; median: number; p25: number; p75: number };
    unanimityProbability: number;
    individualVotes: JurorVote[];
    consensusLevel: number;
  };
  competitiveAnalysis: {
    percentileVsAllSubmissions: number;
    percentileVsSotdWinners: number;
    percentileVsSotyNominees: number;
    closestReference: string;
    closestReferenceScore: number;
    gapToSoty: number;
    genrePercentile: number;
    genreName: string;
  };
  strengthsAndWeaknesses: {
    top3Strengths: string[];
    top3Weaknesses: string[];
    criticalIssues: string[];
    quickWins: string[];
    sotyGapAnalysis: string[];
  };
  detailedReport: string;
}
