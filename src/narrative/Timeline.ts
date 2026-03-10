/**
 * @file Timeline.ts
 * @description GSAP ScrollTrigger narrative timeline controller
 * @author Cleanlystudio
 * @version 2.0.0
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type RevealPattern = 'char-rise' | 'center-out' | 'word-cascade' | 'flash-bloom' | 'typewriter';

interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  triggerStart: string;
  triggerEnd: string;
  reveal: RevealPattern;
}

const CHAPTERS: Chapter[] = [
  {
    id: 0,
    title: 'YOU',
    subtitle: '13.8 billion years after the beginning — atoms, briefly alive, looking up',
    triggerStart: 'top top',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 1,
    title: 'THE PULL',
    subtitle: 'Ten billion solar masses — silent, patient — bending spacetime like a hand closing around you',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'char-rise',
  },
  {
    id: 2,
    title: 'THE WARP',
    subtitle: 'Light bends — stars stretch into arcs — straight lines no longer exist here',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'char-rise',
  },
  {
    id: 3,
    title: 'THE PHOTON SPHERE',
    subtitle: 'At 1.5 Schwarzschild radii — light itself orbits — photons trapped in endless circles — a prison made of gravity',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'word-cascade',
  },
  {
    id: 4,
    title: 'THE FALL',
    subtitle: 'You cross the point of no return — and the strange thing is — you feel nothing',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'flash-bloom',
  },
  {
    id: 5,
    title: 'SPAGHETTIFICATION',
    subtitle: 'Tidal forces pull you apart — atom by atom — into threads thinner than light',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 6,
    title: 'TIME DILATION',
    subtitle: 'One heartbeat here — outside, civilizations rise and fall — stars are born and die',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'flash-bloom',
  },
  {
    id: 7,
    title: 'SINGULARITY',
    subtitle: 'Where physics breaks — where space becomes time — where infinity becomes a point',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 8,
    title: 'WHAT REMAINS',
    subtitle: 'You have one life — one brief flicker in the dark — what will you do with it?',
    triggerStart: 'top center',
    triggerEnd: 'bottom bottom',
    reveal: 'center-out',
  },
];

export class Timeline {
  private started = false;
  private activeChapter = -1;
  private transitioning = false;
  private creditsVisible = false;
  private pendingChapter: Chapter | null = null;
  private currentPattern: RevealPattern = 'char-rise';
  private creditsTl: gsap.core.Timeline | null = null;

  start(withSound: boolean) {
    if (this.started) return;
    this.started = true;

    CHAPTERS.forEach((chapter) => {
      const section = document.querySelector(`[data-chapter="${chapter.id}"]`);
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: chapter.triggerStart,
        end: chapter.triggerEnd,
        onEnter: () => this.showChapter(chapter),
        onLeaveBack: () => {
          if (chapter.id > 0) {
            this.showChapter(CHAPTERS[chapter.id - 1]);
          }
        },
      });
    });

    const lastSection = document.querySelector('[data-chapter="8"]');
    if (lastSection) {
      ScrollTrigger.create({
        trigger: lastSection,
        start: 'top+=25% center',
        end: 'bottom bottom',
        onEnter: () => this.showCredits(),
        onLeaveBack: () => this.hideCredits(),
      });
    }

    setTimeout(() => this.showChapter(CHAPTERS[0]), 300);
  }

  private showCredits() {
    const credits = document.getElementById('credits');
    const chapterText = document.getElementById('chapter-text');
    if (!credits) return;

    this.creditsVisible = true;
    this.transitioning = false;

    if (chapterText) {
      gsap.killTweensOf(chapterText);
      gsap.killTweensOf(chapterText.querySelectorAll('.char'));
      gsap.killTweensOf(chapterText.querySelectorAll('.line'));
      gsap.killTweensOf(chapterText.querySelectorAll('.word'));
      chapterText.innerHTML = '';
      gsap.set(chapterText, { opacity: 0 });
    }

    const dataHud = document.getElementById('data-hud');
    if (dataHud) dataHud.classList.add('hidden');

    credits.classList.add('visible');

    if (this.creditsTl) this.creditsTl.kill();
    this.creditsTl = gsap.timeline();

    this.creditsTl.fromTo(credits, { opacity: 0 }, { opacity: 1, duration: 2.0, ease: 'power2.out' });

    const lines = credits.querySelectorAll('.credits-line');
    lines.forEach((line, i) => {
      const isSpacer = line.classList.contains('credits-spacer');
      const isTitle = line.classList.contains('credits-title');
      const isSub = line.classList.contains('credits-sub');
      const isFooter = line.classList.contains('credits-footer');

      if (isTitle) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, scale: 1.4, filter: 'blur(25px)', letterSpacing: '0.8em' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.3em', duration: 2.5, ease: 'power4.out' },
          0.5
        );
      } else if (isSub) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 15, filter: 'blur(10px)', letterSpacing: '0.06em' },
          { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.04em', duration: 1.5, ease: 'power3.out' },
          2.5
        );
      } else if (isSpacer) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, scaleX: 0 },
          { opacity: 1, scaleX: 1, duration: 1.2, ease: 'power2.out' },
          3.0 + i * 0.25
        );
      } else if (isFooter) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 20, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, ease: 'power3.out' },
          4.5 + i * 0.3
        );
      } else {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 20, filter: 'blur(8px)', letterSpacing: '0.05em' },
          { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.02em', duration: 1.2, ease: 'power3.out' },
          3.0 + i * 0.3
        );
      }
    });
  }

  private hideCredits() {
    const credits = document.getElementById('credits');
    const chapterText = document.getElementById('chapter-text');
    if (!credits) return;
    this.creditsVisible = false;
    this.activeChapter = -1;
    this.transitioning = false;
    if (this.creditsTl) { this.creditsTl.kill(); this.creditsTl = null; }
    credits.classList.remove('visible');
    gsap.set(credits.querySelectorAll('.credits-line'), { opacity: 0, y: 20 });
    if (chapterText) {
      gsap.set(chapterText, { opacity: 1 });
    }
    const dataHud = document.getElementById('data-hud');
    if (dataHud) dataHud.classList.remove('hidden');
  }

  private showChapter(chapter: Chapter) {
    if (this.activeChapter === chapter.id || this.creditsVisible) return;

    if (this.transitioning) {
      this.pendingChapter = chapter;
      return;
    }

    this.activeChapter = chapter.id;
    this.transitioning = true;

    const container = document.getElementById('chapter-text');
    if (!container) {
      this.transitioning = false;
      return;
    }

    const finishTransition = () => {
      this.createChapterContent(container, chapter);
      this.transitioning = false;
      if (this.pendingChapter && this.pendingChapter.id !== chapter.id) {
        const next = this.pendingChapter;
        this.pendingChapter = null;
        this.showChapter(next);
      } else {
        this.pendingChapter = null;
      }
    };

    const existingLines = container.querySelectorAll('.line');

    if (existingLines.length === 0) {
      finishTransition();
      return;
    }

    const existingChars = container.querySelectorAll('.char');
    gsap.killTweensOf(existingChars);
    gsap.killTweensOf(existingLines);

    if (existingChars.length > 0) {
      this.exitChars(existingChars, finishTransition);
    } else {
      gsap.to(existingLines, {
        opacity: 0,
        y: -15,
        filter: 'blur(4px)',
        duration: 0.35,
        stagger: 0.03,
        ease: 'power2.in',
        onComplete: finishTransition,
      });
    }
  }

  private splitTextToChars(parent: HTMLElement, text: string) {
    let charIndex = 0;
    const words = text.split(' ');
    words.forEach((word, wi) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word';
      word.split('').forEach((char) => {
        const charSpan = document.createElement('span');
        charSpan.className = 'char';
        charSpan.textContent = char;
        charSpan.style.setProperty('--char-index', String(charIndex));
        charIndex++;
        wordSpan.appendChild(charSpan);
      });
      parent.appendChild(wordSpan);
      if (wi < words.length - 1) {
        const space = document.createElement('span');
        space.className = 'char';
        space.textContent = '\u00A0';
        space.style.setProperty('--char-index', String(charIndex));
        charIndex++;
        parent.appendChild(space);
      }
    });
  }

  private exitChars(chars: NodeListOf<Element>, onComplete: () => void) {
    switch (this.currentPattern) {
      case 'center-out': {
        const mid = Math.floor(chars.length / 2);
        gsap.to(chars, {
          opacity: 0,
          scaleX: 0,
          scaleY: 1.3,
          filter: 'blur(6px)',
          duration: 0.35,
          stagger: { each: 0.008, from: mid },
          ease: 'power3.in',
          onComplete,
        });
        break;
      }
      case 'flash-bloom':
        gsap.to(chars, {
          opacity: 0,
          scale: 0.6,
          filter: 'blur(4px) brightness(2)',
          duration: 0.25,
          stagger: 0.002,
          ease: 'power2.in',
          onComplete,
        });
        break;
      case 'typewriter':
        gsap.to(Array.from(chars).reverse(), {
          opacity: 0,
          duration: 0.015,
          stagger: 0.02,
          ease: 'none',
          onComplete,
        });
        break;
      case 'word-cascade':
        gsap.to(chars, {
          opacity: 0,
          y: 20,
          rotateX: 60,
          duration: 0.3,
          stagger: 0.004,
          ease: 'power2.in',
          onComplete,
        });
        break;
      default:
        gsap.to(chars, {
          opacity: 0,
          y: -10,
          filter: 'blur(4px)',
          duration: 0.3,
          stagger: 0.006,
          ease: 'power2.in',
          onComplete,
        });
        break;
    }
  }

  private markRevealed(chars: NodeListOf<Element>) {
    chars.forEach((c) => c.classList.add('revealed'));
  }

  private revealCenterOut(chars: NodeListOf<Element>, tl: gsap.core.Timeline, delay: number, parent?: HTMLElement, isOpening?: boolean) {
    if (parent) {
      const startScale = isOpening ? 1.6 : 1.15;
      const startBlur = isOpening ? 30 : 12;
      const duration = isOpening ? 2.0 : 1.0;
      tl.fromTo(
        parent,
        { opacity: 0, scale: startScale, filter: `blur(${startBlur}px)` },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration,
          ease: isOpening ? 'power4.out' : 'power3.out',
          delay,
        }
      );
    }
    tl.set(chars, { opacity: 1 }, delay);
    tl.add(() => this.markRevealed(chars), delay + 0.1);
  }

  private revealWordCascade(parent: HTMLElement, tl: gsap.core.Timeline, delay: number) {
    const allChars = parent.querySelectorAll('.char');
    tl.fromTo(
      parent,
      { opacity: 0, y: 25, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power2.out',
        delay,
      }
    );
    tl.set(allChars, { opacity: 1 }, delay);
    tl.add(() => this.markRevealed(allChars), delay + 0.1);
  }

  private revealFlashBloom(chars: NodeListOf<Element>, tl: gsap.core.Timeline, delay: number, parent?: HTMLElement) {
    if (parent) {
      tl.fromTo(
        parent,
        { opacity: 0, scale: 1.3, filter: 'blur(6px) brightness(2)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px) brightness(1)',
          duration: 0.7,
          ease: 'expo.out',
          delay,
        }
      );
    }
    tl.set(chars, { opacity: 1 }, delay);
    tl.add(() => this.markRevealed(chars), delay + 0.1);
  }

  private revealTypewriter(chars: NodeListOf<Element>, tl: gsap.core.Timeline, delay: number, parent?: HTMLElement) {
    if (parent) {
      tl.fromTo(
        parent,
        { opacity: 0, filter: 'blur(10px)' },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          ease: 'power2.out',
          delay,
        }
      );
    }
    tl.set(chars, { opacity: 1 }, delay);
    tl.add(() => this.markRevealed(chars), delay + 0.1);
  }

  private static TEXT_OFFSETS: Record<number, { x: number; y: number; align: string }> = {
    0: { x: 0, y: 0, align: 'center' },
    1: { x: 0, y: 0, align: 'center' },
    2: { x: -6, y: 0, align: 'left' },
    3: { x: 0, y: 0, align: 'center' },
    4: { x: 0, y: 8, align: 'center' },
    5: { x: 0, y: 0, align: 'center' },
    6: { x: 5, y: -6, align: 'right' },
    7: { x: 0, y: 0, align: 'center' },
    8: { x: 0, y: 0, align: 'center' },
  };

  private createChapterContent(container: HTMLElement, chapter: Chapter) {
    container.innerHTML = '';
    const pattern = chapter.reveal;
    this.currentPattern = pattern;

    const offset = Timeline.TEXT_OFFSETS[chapter.id] || { x: 0, y: 0, align: 'center' };
    const baseTransform = offset.x !== 0 || offset.y !== 0
      ? `translate(${offset.x}vw, ${offset.y}vh)`
      : '';
    container.dataset.baseTransform = baseTransform;
    container.style.transform = baseTransform;
    container.style.textAlign = offset.align;

    const tl = gsap.timeline();

    if (chapter.id === 0) {
      const poetryLine = document.createElement('div');
      poetryLine.className = 'line chapter-poetry';
      poetryLine.textContent = 'somewhere in the dark, something waits';
      container.appendChild(poetryLine);
      tl.fromTo(poetryLine,
        { opacity: 0, filter: 'blur(12px)', y: 5 },
        { opacity: 0.35, filter: 'blur(0px)', y: 0, duration: 2.5, ease: 'power2.out' },
        0
      );
      tl.to(poetryLine,
        { opacity: 0, filter: 'blur(6px)', y: -8, duration: 1.5, ease: 'power2.in' },
        3.5
      );
    }

    const chapterNum = document.createElement('div');
    chapterNum.className = 'chapter-num-filigrane';
    chapterNum.setAttribute('aria-hidden', 'true');
    chapterNum.textContent = String(chapter.id + 1).padStart(2, '0');
    container.appendChild(chapterNum);
    const numDelay = chapter.id === 0 ? 1.5 : 0;
    tl.fromTo(chapterNum,
      { opacity: 0, scale: 1.5, filter: 'blur(8px)' },
      { opacity: 0.06, scale: 1, filter: 'blur(0px)', duration: 1.5, ease: 'power2.out' },
      numDelay
    );

    const titleLine = document.createElement('div');
    let titleClass = 'line';
    if (chapter.id === 0) titleClass = 'line chapter-opening';
    else if (chapter.id === 5) titleClass = 'line chapter-wide';
    else if (chapter.id === 7) titleClass = 'line chapter-impact';
    else if (chapter.id === 8) titleClass = 'line chapter-final';
    titleLine.className = titleClass;
    container.appendChild(titleLine);
    this.splitTextToChars(titleLine, chapter.title);

    const titleChars = titleLine.querySelectorAll('.char');
    const openingDelay = chapter.id === 0 ? 2.0 : 0;

    if (chapter.id === 6) {
      titleLine.className = 'line chapter-vertical';
      tl.fromTo(
        titleLine,
        { opacity: 0, filter: 'blur(12px)', y: 30 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.5, ease: 'power3.out' }
      );
      tl.set(titleChars, { opacity: 1 }, 0);
      tl.add(() => this.markRevealed(titleChars), 0.1);
    } else if (chapter.id === 8) {
      tl.fromTo(
        titleLine,
        { opacity: 0, filter: 'blur(0px) brightness(3)', scale: 0.9 },
        { opacity: 1, filter: 'blur(0px) brightness(1)', scale: 1, duration: 3.0, ease: 'power2.out' }
      );
      tl.set(titleChars, { opacity: 1 }, 0);
      tl.add(() => this.markRevealed(titleChars), 0.1);
    } else if (chapter.id === 7) {
      tl.fromTo(
        titleLine,
        { opacity: 0, scale: 2.5, filter: 'blur(20px)', letterSpacing: '0.8em' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.35em', duration: 2.0, ease: 'power4.out' }
      );
      tl.set(titleChars, { opacity: 1 }, 0);
      tl.add(() => this.markRevealed(titleChars), 0.1);
    } else switch (pattern) {
      case 'center-out':
        this.revealCenterOut(titleChars, tl, openingDelay, titleLine, chapter.id === 0);
        break;
      case 'flash-bloom':
        this.revealFlashBloom(titleChars, tl, 0, titleLine);
        break;
      default:
        tl.fromTo(
          titleLine,
          { opacity: 0, y: 15, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power3.out',
          }
        );
        tl.set(titleChars, { opacity: 1 }, 0);
        tl.add(() => this.markRevealed(titleChars), 0.1);
        break;
    }

    {
      const subtitleLine = document.createElement('div');
      subtitleLine.className = chapter.id === 0 ? 'line data chapter-opening-sub' : chapter.id === 8 ? 'line data chapter-final-sub' : 'line data';
      container.appendChild(subtitleLine);
      this.splitTextToChars(subtitleLine, chapter.subtitle);

      const subChars = subtitleLine.querySelectorAll('.char');
      const subDelay = 0.6;

      switch (pattern) {
        case 'center-out':
          this.revealCenterOut(subChars, tl, subDelay, subtitleLine);
          break;
        case 'word-cascade':
          this.revealWordCascade(subtitleLine, tl, subDelay);
          break;
        case 'flash-bloom':
          this.revealFlashBloom(subChars, tl, subDelay, subtitleLine);
          break;
        case 'typewriter':
          this.revealTypewriter(subChars, tl, subDelay, subtitleLine);
          break;
        default:
          tl.fromTo(
            subtitleLine,
            { opacity: 0, y: 12, filter: 'blur(6px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.9,
              ease: 'power2.out',
              delay: subDelay,
            }
          );
          tl.set(subChars, { opacity: 1 }, subDelay);
          tl.add(() => this.markRevealed(subChars), subDelay + 0.1);
          break;
      }
    }
  }
}
