/**
 * @file test-profiler-sim.cjs
 * @description Simulate GPU profiler scoring across hardware configs
 * @author Cleanlystudio
 */

function simulateScore({ gpu, cores, ram, screenW, screenH, dpr, benchMs512, benchMs1024 }) {
  const gpuRenderer = gpu.toLowerCase();
  const screenPx = screenW * screenH;

  const isIntelIGPU = gpuRenderer.includes('intel') && !gpuRenderer.includes('arc');
  const isKnownWeak = isIntelIGPU
    || gpuRenderer.includes('mali')
    || gpuRenderer.includes('adreno')
    || gpuRenderer.includes('powervr')
    || (gpuRenderer.includes('radeon') && (gpuRenderer.includes('vega') || gpuRenderer.includes('r5') || gpuRenderer.includes('r7 graphics')));

  let gpuCap = null;
  if (gpuRenderer.includes('rtx 40') || gpuRenderer.includes('rtx 50') || gpuRenderer.includes('rx 9') || gpuRenderer.includes('apple m3') || gpuRenderer.includes('apple m4')) gpuCap = 'ultra';
  else if (gpuRenderer.includes('rtx 30') || gpuRenderer.includes('rtx 20') || gpuRenderer.includes('rx 7') || gpuRenderer.includes('rx 6') || gpuRenderer.includes('apple m2') || gpuRenderer.includes('apple m1') || gpuRenderer.includes('arc')) gpuCap = 'high';
  else if (gpuRenderer.includes('gtx 16') || gpuRenderer.includes('gtx 1080') || gpuRenderer.includes('gtx 1070') || gpuRenderer.includes('rx 56') || gpuRenderer.includes('rx 57')) gpuCap = 'high';
  else if (gpuRenderer.includes('gtx 10') || gpuRenderer.includes('gtx 9') || gpuRenderer.includes('rx 580') || gpuRenderer.includes('rx 570') || gpuRenderer.includes('rx 480')) gpuCap = 'medium';
  else if (isIntelIGPU) gpuCap = 'medium';

  const scalingRatio = benchMs1024 / Math.max(benchMs512, 0.01);
  const benchSuspicious = benchMs512 < 0.3 || benchMs1024 < 0.8 || scalingRatio < 1.5;

  const nativeDpr = Math.min(dpr, 2);
  const dprCap = Math.min(nativeDpr, 1.5, Math.sqrt(3_500_000 / Math.max(screenPx, 1)));
  const estimatedDpr = Math.max(1.0, dprCap);
  const screenFactor = (screenPx * estimatedDpr * estimatedDpr) / 2_073_600;

  let gpuScore;
  let method;
  if (benchSuspicious) {
    method = 'SUSPICIOUS';
    if (gpuCap === 'ultra') gpuScore = 65;
    else if (gpuCap === 'high') gpuScore = 48;
    else if (isKnownWeak) gpuScore = 20;
    else gpuScore = 35;
  } else {
    method = 'BENCHMARK';
    const adjustedMs = benchMs1024 * screenFactor;
    gpuScore = 100 - Math.sqrt(adjustedMs) * 12;
    if (isIntelIGPU) gpuScore = Math.min(gpuScore, 40);
    if (isKnownWeak) gpuScore = Math.min(gpuScore, 45);
  }

  if (cores <= 2 || ram <= 2) gpuScore = Math.min(gpuScore, 25);
  gpuScore = Math.max(0, Math.min(100, gpuScore));

  const isPotato = gpuScore < 8;
  const isLow = gpuScore < 20;
  const isMed = gpuScore < 50;
  const isHigh = gpuScore < 75;
  const quality = isPotato ? 'low' : (isLow || isMed) ? 'medium' : isHigh ? 'high' : 'ultra';

  const gpgpu = isPotato ? 0 : isLow ? 96 : isMed ? 128 : isHigh ? 160 : 192;
  const stars = isPotato ? 1000 : isLow ? 3000 : isMed ? 6000 : 8000;
  const steps = isPotato ? 24 : isLow ? 48 : isMed ? 80 : isHigh ? 100 : 128;

  return { gpuScore: Math.round(gpuScore), quality, method, gpuCap, gpgpu, stars, steps, screenFactor: screenFactor.toFixed(2), benchSuspicious };
}

const configs = [
  { name: 'RTX 4080 @ 1080p',          gpu: 'NVIDIA GeForce RTX 4080', cores: 16, ram: 32, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 0.8, benchMs1024: 2.5 },
  { name: 'RTX 4080 @ 4K',             gpu: 'NVIDIA GeForce RTX 4080', cores: 16, ram: 32, screenW: 3840, screenH: 2160, dpr: 1.0, benchMs512: 0.8, benchMs1024: 2.5 },
  { name: 'RTX 3060 @ 1080p',          gpu: 'NVIDIA GeForce RTX 3060', cores: 12, ram: 16, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 1.2, benchMs1024: 4.0 },
  { name: 'RTX 3060 @ 1440p',          gpu: 'NVIDIA GeForce RTX 3060', cores: 12, ram: 16, screenW: 2560, screenH: 1440, dpr: 1.0, benchMs512: 1.2, benchMs1024: 4.0 },
  { name: 'RTX 3060 @ 4K',             gpu: 'NVIDIA GeForce RTX 3060', cores: 12, ram: 16, screenW: 3840, screenH: 2160, dpr: 1.0, benchMs512: 1.2, benchMs1024: 4.0 },
  { name: 'GTX 1650 @ 1080p (Théo)',   gpu: 'NVIDIA GeForce GTX 1650', cores: 8, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 2.0, benchMs1024: 7.0 },
  { name: 'GTX 1650 @ 1080p SUSPICIOUS', gpu: 'NVIDIA GeForce GTX 1650', cores: 8, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 0.1, benchMs1024: 0.1 },
  { name: 'GTX 1060 @ 1080p',          gpu: 'NVIDIA GeForce GTX 1060', cores: 8, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 3.0, benchMs1024: 10.0 },
  { name: 'GTX 1050 Ti @ 1080p',       gpu: 'NVIDIA GeForce GTX 1050 Ti', cores: 4, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 4.0, benchMs1024: 14.0 },
  { name: 'RX 580 @ 1080p',            gpu: 'AMD Radeon RX 580', cores: 8, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 2.5, benchMs1024: 8.0 },
  { name: 'RX 6700 XT @ 1440p',        gpu: 'AMD Radeon RX 6700 XT', cores: 12, ram: 16, screenW: 2560, screenH: 1440, dpr: 1.0, benchMs512: 1.0, benchMs1024: 3.5 },
  { name: 'MacBook Air M1',            gpu: 'Apple M1', cores: 8, ram: 8, screenW: 2560, screenH: 1600, dpr: 2.0, benchMs512: 1.5, benchMs1024: 5.0 },
  { name: 'MacBook Pro M3',            gpu: 'Apple M3 Pro', cores: 12, ram: 18, screenW: 3024, screenH: 1964, dpr: 2.0, benchMs512: 0.8, benchMs1024: 2.5 },
  { name: 'Intel UHD 630 @ 1080p',     gpu: 'Intel(R) UHD Graphics 630', cores: 8, ram: 16, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 12.0, benchMs1024: 40.0 },
  { name: 'Intel UHD 630 SUSPICIOUS',  gpu: 'Intel(R) UHD Graphics 630', cores: 8, ram: 16, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 0.2, benchMs1024: 0.2 },
  { name: 'Intel UHD @ 720p',          gpu: 'Intel(R) UHD Graphics', cores: 4, ram: 4, screenW: 1280, screenH: 720, dpr: 1.0, benchMs512: 15.0, benchMs1024: 50.0 },
  { name: 'Potato (2 cores, 2GB)',      gpu: 'Unknown GPU', cores: 2, ram: 2, screenW: 1366, screenH: 768, dpr: 1.0, benchMs512: 30.0, benchMs1024: 100.0 },
  { name: 'Radeon Vega 8 (laptop)',     gpu: 'AMD Radeon Vega 8 Graphics', cores: 4, ram: 8, screenW: 1920, screenH: 1080, dpr: 1.0, benchMs512: 8.0, benchMs1024: 28.0 },
  { name: 'Intel Arc A770 @ 1440p',     gpu: 'Intel Arc A770', cores: 16, ram: 16, screenW: 2560, screenH: 1440, dpr: 1.0, benchMs512: 1.0, benchMs1024: 3.0 },
  { name: 'Mali-G78 (Android)',         gpu: 'Mali-G78', cores: 8, ram: 6, screenW: 1080, screenH: 2400, dpr: 2.5, benchMs512: 10.0, benchMs1024: 35.0 },
  { name: 'Surface Laptop (Intel Iris)', gpu: 'Intel Iris Xe Graphics', cores: 8, ram: 16, screenW: 2256, screenH: 1504, dpr: 1.5, benchMs512: 5.0, benchMs1024: 18.0 },
  { name: 'Chromebook (weak)',          gpu: 'Intel UHD Graphics 600', cores: 2, ram: 2, screenW: 1366, screenH: 768, dpr: 1.0, benchMs512: 20.0, benchMs1024: 70.0 },
];

console.log('\n🔬 GPU Profiler Simulation — 22 hardware configs\n');
console.log('┌─────────────────────────────────────┬───────┬─────────┬──────────────┬───────┬───────┬───────┬────────────┐');
console.log('│ Config                              │ Score │ Quality │ Method       │ GPGPU │ Stars │ Steps │ ScreenFact │');
console.log('├─────────────────────────────────────┼───────┼─────────┼──────────────┼───────┼───────┼───────┼────────────┤');

for (const cfg of configs) {
  const r = simulateScore(cfg);
  const name = cfg.name.padEnd(35);
  const score = String(r.gpuScore).padStart(5);
  const qual = r.quality.padEnd(7);
  const method = (r.method + (r.gpuCap ? `(${r.gpuCap})` : '')).padEnd(12);
  const gpgpu = String(r.gpgpu).padStart(5);
  const stars = String(r.stars).padStart(5);
  const steps = String(r.steps).padStart(5);
  const sf = r.screenFactor.padStart(10);
  console.log(`│ ${name} │ ${score} │ ${qual} │ ${method} │ ${gpgpu} │ ${stars} │ ${steps} │ ${sf} │`);
}

console.log('└─────────────────────────────────────┴───────┴─────────┴──────────────┴───────┴───────┴───────┴────────────┘');

const issues = [];
const expected = {
  'RTX 4080 @ 1080p': 'ultra',
  'RTX 3060 @ 1080p': { min: 'high' },
  'GTX 1650 @ 1080p (Théo)': { min: 'medium' },
  'Intel UHD 630 @ 1080p': 'medium',
  'Intel UHD 630 SUSPICIOUS': 'medium',
  'Potato (2 cores, 2GB)': 'medium',
};

for (const cfg of configs) {
  const r = simulateScore(cfg);
  const exp = expected[cfg.name];
  if (exp) {
    const expQuality = typeof exp === 'string' ? exp : null;
    if (expQuality && r.quality !== expQuality) {
      issues.push(`❌ ${cfg.name}: expected ${expQuality}, got ${r.quality} (score ${r.gpuScore})`);
    }
  }
}

if (issues.length > 0) {
  console.log('\n⚠️  Issues:');
  issues.forEach(i => console.log(`  ${i}`));
} else {
  console.log('\n✅ All expected tiers match!');
}
console.log('');
