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

  update(scroll: number) {
    if (!this.started) return;
    this.lastScroll = scroll;

    const container = document.getElementById('chapter-text');
    if (!container) return;

    const tintOpacity = Math.min(0.45, 0.2 + scroll * 0.25);
    container.style.background = `radial-gradient(ellipse 80% 70% at center, rgba(2,2,8,${tintOpacity.toFixed(2)}) 0%, rgba(2,2,6,${(tintOpacity * 0.5).toFixed(2)}) 40%, transparent 75%)`;
    const blurAmount = Math.min(16, 8 + scroll * 8);
    container.style.setProperty('-webkit-backdrop-filter', `blur(${blurAmount.toFixed(0)}px) saturate(0.8)`);
    container.style.setProperty('backdrop-filter', `blur(${blurAmount.toFixed(0)}px) saturate(0.8)`);
    container.style.padding = `${(3.0 + scroll * 2.0).toFixed(1)}em ${(4.0 + scroll * 3.0).toFixed(1)}em`;

    const titleLine = container.querySelector<HTMLElement>('.line:not(.data):not(.emotional)');
    const subtitleLine = container.querySelector<HTMLElement>('.line.data, .line.emotional');
    if (titleLine && subtitleLine) {
      const parallaxOffset = Math.sin(scroll * Math.PI * 0.5) * 3;
      titleLine.style.transform = `translateY(${-parallaxOffset}px)`;
      subtitleLine.style.transform = `translateY(${parallaxOffset * 0.6}px)`;
    }

    const allChars = container.querySelectorAll<HTMLElement>('.char');
    if (allChars.length === 0) return;

    const gravityStart = 0.68;
    const gravityFactor = Math.max(0, (scroll - gravityStart) / (1.0 - gravityStart));

    if (gravityFactor <= 0) {
      allChars.forEach((char) => {
        char.style.transform = '';
        char.style.filter = '';
        char.style.opacity = '';
      });
      return;
    }

    const screenCx = window.innerWidth * 0.5;
    const screenCy = window.innerHeight * 0.42;
    const time = performance.now() * 0.001;

    this.frameCount++;
    if (this.positionsDirty || this.frameCount % 30 === 0) {
      this.charPositions = [];
      allChars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        this.charPositions.push({ cx: rect.left + rect.width * 0.5, cy: rect.top + rect.height * 0.5 });
      });
      this.positionsDirty = false;
    }

    const gentlePhase = Math.min(gravityFactor / 0.4, 1.0);
    const intensePhase = Math.max(0, (gravityFactor - 0.4) / 0.6);

    allChars.forEach((char, i) => {
      const pos = this.charPositions[i];
      if (!pos) return;
      const charCx = pos.cx;
      const charCy = pos.cy;

      const dx = screenCx - charCx;
      const dy = screenCy - charCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(screenCx * screenCx + screenCy * screenCy);
      const normalizedDist = dist / maxDist;

      const pullStrength = gentlePhase * 0.3 + intensePhase * intensePhase * 0.5;
      const pullX = dx * pullStrength * 0.08;
      const pullY = dy * pullStrength * 0.08;

      const angle = Math.atan2(dy, dx);
      const stretchRadial = 1 + pullStrength * (1.0 - normalizedDist) * 1.2;
      const stretchPerp = Math.max(0.5, 1 - pullStrength * (1.0 - normalizedDist) * 0.3);

      const wobbleX = Math.sin(time * 2.5 + i * 0.4) * pullStrength * 2;
      const wobbleY = Math.cos(time * 3.0 + i * 0.3) * pullStrength * 1.5;

      const blur = pullStrength * (1.0 - normalizedDist * 0.5) * 2;
      const opacity = Math.max(0.25, 1 - pullStrength * 0.6 * (1.0 - normalizedDist * 0.4));

      const rotation = angle * (180 / Math.PI) * pullStrength * 0.06;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const sx = Math.abs(cosA) * stretchRadial + Math.abs(sinA) * stretchPerp;
      const sy = Math.abs(sinA) * stretchRadial + Math.abs(cosA) * stretchPerp;

      char.style.transform = `translate(${pullX + wobbleX}px, ${pullY + wobbleY}px) scale(${sx.toFixed(3)}, ${sy.toFixed(3)}) rotate(${rotation.toFixed(1)}deg)`;
      char.style.filter = `blur(${blur.toFixed(1)}px)`;
      char.style.opacity = `${opacity.toFixed(3)}`;
    });
  }
}
