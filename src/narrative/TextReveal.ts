/**
 * @file TextReveal.ts
 * @description Letter-by-letter text reveal + scroll-driven spaghettification
 * @author Cleanlystudio
 * @version 2.0.0
 */

import gsap from 'gsap';

export class TextReveal {
  private started = false;
  private currentReveal: gsap.core.Timeline | null = null;
  private chars: HTMLElement[] = [];
  private lastScroll = 0;
  private charPositions: { cx: number; cy: number }[] = [];
  private positionsDirty = true;
  private frameCount = 0;
  private idleTime = 0;
  private lastScrollChange = 0;
  private mouseX = 0;
  private mouseY = 0;
  private cachedSpaghettiTitle: HTMLElement | null = null;
  private cachedTitleLine: HTMLElement | null = null;
  private cachedSubtitleLine: HTMLElement | null = null;

  start() {
    this.started = true;
  }

  revealText(element: HTMLElement, text: string, options: { delay?: number; stagger?: number; duration?: number } = {}) {
    if (!this.started) return;

    const { delay = 0, stagger = 0.025, duration = 0.5 } = options;

    element.innerHTML = '';
    this.chars = [];
    const characters = text.split('');

    characters.forEach((char) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char === ' ' ? '\u00A0' : char;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, opacity, filter';
      element.appendChild(span);
      this.chars.push(span);
    });

    this.positionsDirty = true;
    this.cachedSpaghettiTitle = null;
    this.cachedTitleLine = null;
    this.cachedSubtitleLine = null;

    if (this.currentReveal) {
      this.currentReveal.kill();
    }

    this.currentReveal = gsap.timeline({ delay });

    this.currentReveal.fromTo(
      element.querySelectorAll('.char'),
      {
        opacity: 0,
        y: 12,
        filter: 'blur(6px)',
        scale: 0.8,
      },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        scale: 1,
        duration,
        stagger,
        ease: 'power3.out',
      }
    );

    return this.currentReveal;
  }

  setMouse(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
  }

  update(scroll: number) {
    if (!this.started) return;
    this.lastScroll = scroll;

    const container = document.getElementById('chapter-text');
    if (!container) return;

    const tintOpacity = Math.min(0.45, 0.2 + scroll * 0.25);
    container.style.background = `radial-gradient(ellipse 80% 70% at center, rgba(2,2,8,${tintOpacity.toFixed(2)}) 0%, rgba(2,2,6,${(tintOpacity * 0.5).toFixed(2)}) 40%, transparent 75%)`;
    container.style.padding = `${(3.0 + scroll * 2.0).toFixed(1)}em ${(4.0 + scroll * 3.0).toFixed(1)}em`;

    const breatheTime = performance.now() * 0.001;
    const baseTransform = container.dataset.baseTransform || '';
    if (scroll > 0.33) {
      const hbBpm = 50 + Math.max(scroll - 0.35, 0) * 200;
      const hbPhase = breatheTime * hbBpm / 60 * Math.PI;
      const hbSinTR = Math.max(Math.sin(hbPhase), 0);
      const hbS2 = hbSinTR * hbSinTR; const hbS4 = hbS2 * hbS2; const hbS8 = hbS4 * hbS4;
      const hbPulse = hbS8 * hbS4 * 0.008 * Math.min((scroll - 0.33) * 5, 1);
      const breathe = Math.sin(breatheTime * 0.6) * 0.003 * scroll;
      const totalScale = 1 + hbPulse + breathe;
      container.style.transform = `${baseTransform} scale(${totalScale.toFixed(5)})`;
    } else {
      container.style.transform = baseTransform;
    }

    const r = Math.round(232 + scroll * 23);
    const g = Math.round(232 - scroll * 50);
    const b = Math.round(255 - scroll * 80);
    container.style.setProperty('--text-color', `rgba(${r}, ${g}, ${b}, 0.9)`);
    const deepScroll = Math.max(0, (scroll - 0.5) * 2.0);
    const glowR = Math.round(scroll * 80 + deepScroll * 175);
    const glowG = Math.round(245 * (1 - scroll * 0.6) - deepScroll * 80);
    const glowB = Math.round(212 * (1 - scroll * 0.3) - deepScroll * 140);
    const glowRadius = 20 + scroll * 25 + deepScroll * 20;
    const glowAlpha = 0.1 + scroll * 0.15 + deepScroll * 0.12;
    container.style.setProperty('--text-glow', `0 0 ${glowRadius.toFixed(0)}px rgba(${Math.min(255, glowR)}, ${Math.max(0, glowG)}, ${Math.max(0, glowB)}, ${glowAlpha.toFixed(2)})`);

    container.style.perspective = '800px';

    if (scroll > 0.22 && scroll < 0.33) {
      const time = performance.now() * 0.001;
      this.chars.forEach((char, i) => {
        const wave = Math.sin(time * 2.0 + i * 0.4) * 3 * ((scroll - 0.22) / 0.11);
        const skew = Math.sin(time * 1.5 + i * 0.3) * 4 * ((scroll - 0.22) / 0.11);
        char.style.transform = `translateY(${wave.toFixed(1)}px) skewX(${skew.toFixed(1)}deg)`;
      });
    }

    if (scroll > 0.11 && scroll < 0.22) {
      const pullProgress = (scroll - 0.11) / 0.11;
      const containerRect = container.getBoundingClientRect();
      const containerCx = containerRect.left + containerRect.width * 0.5;
      const containerCy = containerRect.top + containerRect.height * 0.5;
      if (this.positionsDirty || this.charPositions.length !== this.chars.length) {
        this.charPositions = [];
        this.chars.forEach((char) => {
          const rect = char.getBoundingClientRect();
          this.charPositions.push({ cx: rect.left + rect.width * 0.5, cy: rect.top + rect.height * 0.5 });
        });
        this.positionsDirty = false;
      }
      const pull = pullProgress * 0.08;
      this.chars.forEach((char, i) => {
        const pos = this.charPositions[i];
        if (!pos) return;
        const dx = containerCx - pos.cx;
        const dy = containerCy - pos.cy;
        char.style.transform = `translate(${(dx * pull).toFixed(1)}px, ${(dy * pull).toFixed(1)}px)`;
      });
    }

    if (!this.cachedSpaghettiTitle) this.cachedSpaghettiTitle = container.querySelector<HTMLElement>('.line.chapter-wide');
    if (this.cachedSpaghettiTitle) {
      const chapterScroll = (scroll - 0.44) / 0.11;
      const stretchProgress = Math.max(0, Math.min(1, chapterScroll));
      const letterSpacing = 0.25 + stretchProgress * 0.6;
      const scaleX = 1 + stretchProgress * 0.15;
      this.cachedSpaghettiTitle.style.letterSpacing = `${letterSpacing.toFixed(2)}em`;
      this.cachedSpaghettiTitle.style.transform = `scaleX(${scaleX.toFixed(3)})`;
    }
    if (!this.cachedTitleLine) this.cachedTitleLine = container.querySelector<HTMLElement>('.line:not(.data):not(.emotional)');
    if (!this.cachedSubtitleLine) this.cachedSubtitleLine = container.querySelector<HTMLElement>('.line.data, .line.emotional');
    if (this.cachedTitleLine && this.cachedSubtitleLine) {
      const mx = (this.mouseX - 0.5) * 2;
      const my = (this.mouseY - 0.5) * 2;
      const mouseDepth = Math.min(scroll * 2, 1);
      const parallaxOffset = Math.sin(scroll * Math.PI * 0.5) * 2;
      const rotX = scroll * 2 + my * 1.5 * mouseDepth;
      const rotY = mx * 2.0 * mouseDepth;
      const titleZ = scroll * -5;
      const subZ = scroll * -2.5;
      const titleShiftX = mx * 3 * mouseDepth;
      const titleShiftY = my * 2 * mouseDepth;
      const subShiftX = mx * 1.5 * mouseDepth;
      const subShiftY = my * 1 * mouseDepth;
      this.cachedTitleLine.style.transform = `translateX(${titleShiftX}px) translateY(${-parallaxOffset + titleShiftY}px) translateZ(${titleZ}px) rotateX(${(rotX * 0.3).toFixed(2)}deg) rotateY(${(rotY * 0.4).toFixed(2)}deg)`;
      this.cachedSubtitleLine.style.transform = `translateX(${subShiftX}px) translateY(${parallaxOffset * 0.6 + subShiftY}px) translateZ(${subZ}px) rotateX(${(-rotX * 0.15).toFixed(2)}deg) rotateY(${(rotY * 0.2).toFixed(2)}deg)`;
    }

    if (this.chars.length === 0) return;

    const gravityStart = 0.42;
    const gravityFactor = Math.max(0, (scroll - gravityStart) / (1.0 - gravityStart));

    if (Math.abs(scroll - this.lastScrollChange) > 0.001) {
      this.lastScrollChange = scroll;
      this.idleTime = 0;
    } else {
      this.idleTime += 0.016;
    }

    const idleDrift = scroll > 0.25 && this.idleTime > 2.0 ? Math.min((this.idleTime - 2.0) * 0.15, 0.3) : 0;

    if (gravityFactor <= 0 && idleDrift <= 0) {
      if (scroll > 0.05) {
        const mxPx = this.mouseX * window.innerWidth;
        const myPx = this.mouseY * window.innerHeight;
        this.frameCount++;
        if (this.positionsDirty || this.frameCount % 30 === 0) {
          this.charPositions = [];
          this.chars.forEach((char) => {
            const rect = char.getBoundingClientRect();
            this.charPositions.push({ cx: rect.left + rect.width * 0.5, cy: rect.top + rect.height * 0.5 });
          });
          this.positionsDirty = false;
        }
        this.chars.forEach((char, i) => {
          const pos = this.charPositions[i];
          if (!pos) { char.style.transform = ''; return; }
          const mdx = pos.cx - mxPx;
          const mdy = pos.cy - myPx;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          const repR = 100;
          if (mDist < repR && mDist > 1) {
            const repT = 1 - mDist / repR;
            const str = repT * repT * 8 * Math.min(scroll * 4, 1);
            char.style.transform = `translate(${(mdx / mDist * str).toFixed(1)}px, ${(mdy / mDist * str).toFixed(1)}px)`;
          } else {
            char.style.transform = '';
          }
          char.style.filter = '';
          char.style.opacity = '';
        });
      } else {
        this.chars.forEach((char) => {
          char.style.transform = '';
          char.style.filter = '';
          char.style.opacity = '';
        });
      }
      return;
    }

    const screenCx = window.innerWidth * 0.5;
    const screenCy = window.innerHeight * 0.42;
    const time = performance.now() * 0.001;

    this.frameCount++;
    if (this.positionsDirty || this.frameCount % 30 === 0) {
      this.charPositions = [];
      this.chars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        this.charPositions.push({ cx: rect.left + rect.width * 0.5, cy: rect.top + rect.height * 0.5 });
      });
      this.positionsDirty = false;
    }

    const effectiveGravity = Math.max(gravityFactor, idleDrift);
    const gentlePhase = Math.min(effectiveGravity / 0.4, 1.0);
    const intensePhase = Math.max(0, (effectiveGravity - 0.4) / 0.6);

    const maxDist = Math.sqrt(screenCx * screenCx + screenCy * screenCy);
    const invMaxDist = 1 / maxDist;
    const pullStrength = gentlePhase * 0.3 + intensePhase * intensePhase * 0.5;
    const pullFactor = pullStrength * 0.08;
    const mxPx = this.mouseX * window.innerWidth;
    const myPx = this.mouseY * window.innerHeight;
    const repulseRadius = 120;
    const repulseScrollFactor = Math.min(scroll * 3, 1);
    const rotDegFactor = pullStrength * 0.06 * (180 / Math.PI);

    this.chars.forEach((char, i) => {
      const pos = this.charPositions[i];
      if (!pos) return;

      const dx = screenCx - pos.cx;
      const dy = screenCy - pos.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist * invMaxDist;

      const pullX = dx * pullFactor;
      const pullY = dy * pullFactor;

      const angle = Math.atan2(dy, dx);
      const distFactor = 1.0 - normalizedDist;
      const stretchRadial = 1 + pullStrength * distFactor * 1.2;
      const stretchPerp = Math.max(0.5, 1 - pullStrength * distFactor * 0.3);

      const wobbleX = Math.sin(time * 2.5 + i * 0.4) * pullStrength * 2;
      const wobbleY = Math.cos(time * 3.0 + i * 0.3) * pullStrength * 1.5;

      const mdx = pos.cx - mxPx;
      const mdy = pos.cy - myPx;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      let repulseX = 0, repulseY = 0;
      if (mDist < repulseRadius && mDist > 1) {
        const t = 1 - mDist / repulseRadius;
        const repulseStrength = t * t * 15 * repulseScrollFactor;
        const invMDist = 1 / mDist;
        repulseX = mdx * invMDist * repulseStrength;
        repulseY = mdy * invMDist * repulseStrength;
      }

      const blur = pullStrength * (1.0 - normalizedDist * 0.5) * 2;
      const opacity = Math.max(0.25, 1 - pullStrength * 0.6 * (1.0 - normalizedDist * 0.4));
      const rotation = angle * rotDegFactor;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const absCos = Math.abs(cosA);
      const absSin = Math.abs(sinA);
      const sx = absCos * stretchRadial + absSin * stretchPerp;
      const sy = absSin * stretchRadial + absCos * stretchPerp;

      char.style.transform = `translate(${pullX + wobbleX + repulseX}px, ${pullY + wobbleY + repulseY}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`;
      char.style.filter = `blur(${blur.toFixed(1)}px)`;
      char.style.opacity = `${opacity.toFixed(3)}`;
    });
  }
}
