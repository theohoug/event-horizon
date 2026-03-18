/**
 * @file Timeline.ts
 * @description GSAP ScrollTrigger narrative timeline controller
 * @author Cleanlystudio
 * @version 2.0.0
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { t } from '../i18n/translations';

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

const CHAPTER_REVEALS: { triggerStart: string; triggerEnd: string; reveal: RevealPattern }[] = [
  { triggerStart: 'top top', triggerEnd: 'bottom center', reveal: 'center-out' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'char-rise' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'char-rise' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'word-cascade' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'flash-bloom' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'center-out' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'flash-bloom' },
  { triggerStart: 'top 65%', triggerEnd: 'bottom center', reveal: 'center-out' },
  { triggerStart: 'top center', triggerEnd: 'bottom bottom', reveal: 'center-out' },
];

function getChapters(isAltered = false, isHardcore = false): Chapter[] {
  const tr = t();
  const src = isHardcore ? tr.hardcoreChapters : isAltered ? tr.alteredChapters : tr.chapters;
  return src.map((ch, i) => ({
    id: i,
    title: ch.title,
    subtitle: ch.subtitle,
    ...CHAPTER_REVEALS[i],
  }));
}

export class Timeline {
  private started = false;
  activeChapter = -1;
  private transitioning = false;
  private creditsVisible = false;
  private pendingChapter: Chapter | null = null;
  private currentPattern: RevealPattern = 'char-rise';
  private creditsTl: gsap.core.Timeline | null = null;
  private lastLeaveBackTime = 0;
  isAlteredMode = false;
  isHardcoreMode = false;

  resetCredits() {
    this.creditsVisible = false;
    this.activeChapter = -1;
    this.transitioning = false;
    if (this.creditsTl) { this.creditsTl.kill(); this.creditsTl = null; }
  }

  refreshCurrentChapter(scroll: number, chapterIndex?: number) {
    if (!this.started || this.creditsVisible) return;
    if (chapterIndex === undefined) chapterIndex = Math.min(8, Math.floor(scroll * 9));
    const chapters = getChapters(this.isAlteredMode, this.isHardcoreMode);
    const chapter = chapters[chapterIndex];
    if (!chapter) return;
    this.activeChapter = -1;
    this.transitioning = false;
    this.showChapter(chapter);
  }

  start(withSound: boolean) {
    if (this.started) return;
    this.started = true;

    const chapters = getChapters(this.isAlteredMode, this.isHardcoreMode);
    chapters.forEach((chapter) => {
      const section = document.querySelector(`[data-chapter="${chapter.id}"]`);
      if (!section) return;

      ScrollTrigger.create({
        trigger: section,
        start: chapter.triggerStart,
        end: chapter.triggerEnd,
        onEnter: () => this.showChapter(chapter),
        onLeaveBack: () => {
          const now = performance.now();
          if (chapter.id > 0 && now - this.lastLeaveBackTime > 400) {
            this.lastLeaveBackTime = now;
            this.showChapter(getChapters(this.isAlteredMode, this.isHardcoreMode)[chapter.id - 1]);
          }
        },
      });
    });

    const lastSection = document.querySelector('[data-chapter="8"]');
    if (lastSection) {
      ScrollTrigger.create({
        trigger: lastSection,
        start: 'top+=55% center',
        end: 'bottom bottom',
        onEnter: () => this.showCredits(),
        onLeaveBack: () => this.hideCredits(),
      });
    }

    setTimeout(() => this.showChapter(getChapters(this.isAlteredMode, this.isHardcoreMode)[0]), 300);
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

    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.add('hidden');

    credits.classList.add('visible');

    if (this.creditsTl) this.creditsTl.kill();
    this.creditsTl = gsap.timeline();

    this.creditsTl.fromTo(credits, { opacity: 0 }, { opacity: 1, duration: 2.0, ease: 'power2.out' });

    const lines = credits.querySelectorAll('.credits-line');
    lines.forEach((line, i) => {
      const isEpigraph = line.classList.contains('credits-epigraph');
      const isSpacer = line.classList.contains('credits-spacer');
      const isTitle = line.classList.contains('credits-title');
      const isSub = line.classList.contains('credits-sub');
      const isFooter = line.classList.contains('credits-footer');

      if (isEpigraph) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 10, filter: 'blur(12px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 3.0, ease: 'power2.out' },
          0.3
        );
      } else if (isTitle) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, scale: 1.4, filter: 'blur(25px)', letterSpacing: '0.8em' },
          { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.3em', duration: 2.5, ease: 'power4.out' },
          2.0
        );
      } else if (isSub) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 15, filter: 'blur(10px)', letterSpacing: '0.06em' },
          { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.04em', duration: 1.5, ease: 'power3.out' },
          4.0
        );
      } else if (isSpacer) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, scaleX: 0 },
          { opacity: 1, scaleX: 1, duration: 1.2, ease: 'power2.out' },
          4.5 + i * 0.2
        );
      } else if (isFooter) {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 20, filter: 'blur(8px)' },
          { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.5, ease: 'power3.out' },
          6.0 + i * 0.2
        );
      } else {
        this.creditsTl!.fromTo(line,
          { opacity: 0, y: 20, filter: 'blur(8px)', letterSpacing: '0.05em' },
          { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.02em', duration: 1.2, ease: 'power3.out' },
          4.5 + i * 0.25
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

    const overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  private showChapter(chapter: Chapter) {
    if (this.activeChapter === chapter.id || this.creditsVisible) return;

    const container = document.getElementById('chapter-text');
    if (!container) return;

    if (this.transitioning) {
      const existingChars = container.querySelectorAll('.char');
      const existingLines = container.querySelectorAll('.line');
      gsap.killTweensOf(existingChars);
      gsap.killTweensOf(existingLines);
      container.innerHTML = '';
      this.transitioning = false;
      this.pendingChapter = null;
    }

    this.activeChapter = chapter.id;
    this.transitioning = true;

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

  private clearInlineFilter(el: HTMLElement) {
    el.style.removeProperty('filter');
    el.style.removeProperty('-webkit-filter');
  }

  private revealCenterOut(chars: NodeListOf<Element>, tl: gsap.core.Timeline, pos: number, parent?: HTMLElement, isOpening?: boolean) {
    if (parent) {
      const startScale = isOpening ? 1.6 : 1.15;
      const startBlur = isOpening ? 30 : 12;
      const duration = isOpening ? 2.0 : 1.0;
      const el = parent;
      tl.fromTo(
        parent,
        { opacity: 0, scale: startScale, filter: `blur(${startBlur}px)`, y: 0 },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          y: 0,
          duration,
          ease: isOpening ? 'power4.out' : 'power3.out',
          onComplete: () => this.clearInlineFilter(el),
        },
        pos
      );
    }
    tl.set(chars, { opacity: 1 }, pos);
    tl.add(() => this.markRevealed(chars), pos + 0.1);
  }

  private revealWordCascade(parent: HTMLElement, tl: gsap.core.Timeline, pos: number) {
    const allChars = parent.querySelectorAll('.char');
    const el = parent;
    tl.fromTo(
      parent,
      { opacity: 0, y: 25, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power2.out',
        onComplete: () => this.clearInlineFilter(el),
      },
      pos
    );
    tl.set(allChars, { opacity: 1 }, pos);
    tl.add(() => this.markRevealed(allChars), pos + 0.1);
  }

  private revealFlashBloom(chars: NodeListOf<Element>, tl: gsap.core.Timeline, pos: number, parent?: HTMLElement) {
    if (parent) {
      const el = parent;
      tl.fromTo(
        parent,
        { opacity: 0, scale: 1.3, filter: 'blur(6px) brightness(2)', y: 0 },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px) brightness(1)',
          y: 0,
          duration: 0.7,
          ease: 'expo.out',
          onComplete: () => this.clearInlineFilter(el),
        },
        pos
      );
    }
    tl.set(chars, { opacity: 1 }, pos);
    tl.add(() => this.markRevealed(chars), pos + 0.1);
  }

  private revealTypewriter(chars: NodeListOf<Element>, tl: gsap.core.Timeline, pos: number, parent?: HTMLElement) {
    if (parent) {
      const el = parent;
      tl.fromTo(
        parent,
        { opacity: 0, filter: 'blur(10px)', y: 0 },
        {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          duration: 1.2,
          ease: 'power2.out',
          onComplete: () => this.clearInlineFilter(el),
        },
        pos
      );
    }
    tl.set(chars, { opacity: 1 }, pos);
    tl.add(() => this.markRevealed(chars), pos + 0.1);
  }

  private static TEXT_OFFSETS: Record<number, { x: number; y: number; align: string }> = {
    0: { x: 0, y: 0, align: 'center' },
    1: { x: 0, y: 0, align: 'center' },
    2: { x: 0, y: 0, align: 'center' },
    3: { x: 0, y: 0, align: 'center' },
    4: { x: 0, y: 0, align: 'center' },
    5: { x: 0, y: 0, align: 'center' },
    6: { x: 0, y: 0, align: 'center' },
    7: { x: 0, y: 0, align: 'center' },
    8: { x: 0, y: 0, align: 'center' },
  };

  private corruptText(text: string): string {
    const glitchChars = ['\u0336', '\u0337', '\u0338'];
    return text.split('').map(c => {
      if (c === ' ' || c === '\n') return c;
      if (Math.random() < 0.08) return c + glitchChars[Math.floor(Math.random() * glitchChars.length)];
      return c;
    }).join('');
  }

  private createChapterContent(container: HTMLElement, chapter: Chapter) {
    container.innerHTML = '';
    const pattern = chapter.reveal;
    this.currentPattern = pattern;
    if (this.isHardcoreMode) container.classList.add('hardcore-text');
    else if (this.isAlteredMode) container.classList.add('altered-text');

    const offset = Timeline.TEXT_OFFSETS[chapter.id] || { x: 0, y: 0, align: 'center' };
    const centerTransform = 'translateX(-50%)';
    const baseTransform = offset.x !== 0 || offset.y !== 0
      ? `${centerTransform} translate(${offset.x}vw, ${offset.y}vh)`
      : centerTransform;
    container.dataset.baseTransform = baseTransform;
    container.style.transform = baseTransform;
    container.style.textAlign = offset.align;

    const tl = gsap.timeline();

    if (chapter.id === 0) {
      const poetryLine = document.createElement('div');
      poetryLine.className = 'line chapter-poetry';
      poetryLine.textContent = this.isHardcoreMode ? t().hardcorePoetry : this.isAlteredMode ? t().alteredPoetry : t().poetry;
      container.appendChild(poetryLine);
      tl.fromTo(poetryLine,
        { opacity: 0, filter: 'blur(12px)', y: 5 },
        { opacity: 0.35, filter: 'blur(0px)', y: 0, duration: 1.5, ease: 'power2.out' },
        0
      );
      tl.to(poetryLine,
        { opacity: 0, filter: 'blur(6px)', y: -8, duration: 1.0, ease: 'power2.in' },
        2.0
      );
    }

    const chapterNum = document.createElement('div');
    chapterNum.className = 'chapter-num-filigrane';
    chapterNum.setAttribute('aria-hidden', 'true');
    chapterNum.textContent = String(chapter.id + 1).padStart(2, '0');
    container.appendChild(chapterNum);
    const numDelay = chapter.id === 0 ? 0.8 : 0;
    tl.fromTo(chapterNum,
      { opacity: 0, scale: 1.5, filter: 'blur(8px)' },
      { opacity: 0.12, scale: 1, filter: 'blur(0px)', duration: 1.5, ease: 'power2.out' },
      numDelay
    );

    const titleLine = document.createElement('div');
    let titleClass = 'line';
    if (chapter.id === 0) titleClass = 'line chapter-opening';
    else if (chapter.id === 5) titleClass = 'line chapter-spaghetti';
    else if (chapter.id === 7) titleClass = 'line chapter-impact';
    else if (chapter.id === 8) titleClass = 'line chapter-final';
    titleLine.className = titleClass;
    container.appendChild(titleLine);
    const titleText = chapter.title;
    this.splitTextToChars(titleLine, titleText);
    const titleChars = titleLine.querySelectorAll('.char');
    const titlePos = chapter.id === 0 ? 1.0 : 0.3;
    const subPos = chapter.id === 0 ? 2.0 : 1.0;

    if (chapter.id === 5) {
      titleLine.className = 'line chapter-spaghetti';
      const el5 = titleLine;
      const chars5 = titleLine.querySelectorAll('.char');
      tl.fromTo(
        titleLine,
        { opacity: 0, scaleY: 0.3, scaleX: 1.6, filter: 'blur(4px)', y: 0 },
        { opacity: 1, scaleY: 1, scaleX: 1, filter: 'blur(0px)', y: 0, duration: 0.5, ease: 'power2.out',
          onComplete: () => this.clearInlineFilter(el5) },
        titlePos
      );
      chars5.forEach((char, ci) => {
        tl.fromTo(char,
          { scaleY: 3.5, scaleX: 0.3, opacity: 0, y: -20 + Math.random() * 40 },
          { scaleY: 1, scaleX: 1, opacity: 1, y: 0, duration: 0.8 + Math.random() * 0.4,
            ease: 'elastic.out(1, 0.4)', delay: ci * 0.03 },
          titlePos + 0.15
        );
      });
      tl.add(() => this.markRevealed(chars5), titlePos + 0.3);
    } else if (chapter.id === 6) {
      titleLine.className = 'line chapter-vertical';
      const el6 = titleLine;
      tl.fromTo(
        titleLine,
        { opacity: 0, filter: 'blur(12px)', y: 30 },
        { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.5, ease: 'power3.out', onComplete: () => this.clearInlineFilter(el6) },
        titlePos
      );
      tl.set(titleChars, { opacity: 1 }, titlePos);
      tl.add(() => this.markRevealed(titleChars), titlePos + 0.1);
    } else if (chapter.id === 8) {
      const el8 = titleLine;
      tl.fromTo(
        titleLine,
        { opacity: 0, filter: 'blur(0px) brightness(3)', scale: 0.9, y: 0 },
        { opacity: 1, filter: 'blur(0px) brightness(1)', scale: 1, y: 0, duration: 3.0, ease: 'power2.out', onComplete: () => this.clearInlineFilter(el8) },
        titlePos
      );
      tl.set(titleChars, { opacity: 1 }, titlePos);
      tl.add(() => this.markRevealed(titleChars), titlePos + 0.1);
    } else if (chapter.id === 7) {
      const el7 = titleLine;
      tl.fromTo(
        titleLine,
        { opacity: 0, scale: 2.5, filter: 'blur(20px)', letterSpacing: '0.8em', y: 0 },
        { opacity: 1, scale: 1, filter: 'blur(0px)', letterSpacing: '0.35em', y: 0, duration: 2.0, ease: 'power4.out', onComplete: () => this.clearInlineFilter(el7) },
        titlePos
      );
      tl.set(titleChars, { opacity: 1 }, titlePos);
      tl.add(() => this.markRevealed(titleChars), titlePos + 0.1);
    } else switch (pattern) {
      case 'center-out':
        this.revealCenterOut(titleChars, tl, titlePos, titleLine, chapter.id === 0);
        break;
      case 'flash-bloom':
        this.revealFlashBloom(titleChars, tl, titlePos, titleLine);
        break;
      default: {
        const elDef = titleLine;
        tl.fromTo(
          titleLine,
          { opacity: 0, y: 15, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power3.out',
            onComplete: () => this.clearInlineFilter(elDef),
          },
          titlePos
        );
        tl.set(titleChars, { opacity: 1 }, titlePos);
        tl.add(() => this.markRevealed(titleChars), titlePos + 0.1);
        break;
      }
    }

    {
      const subtitleLine = document.createElement('div');
      subtitleLine.className = chapter.id === 0 ? 'line data chapter-opening-sub' : chapter.id === 8 ? 'line data chapter-final-sub' : 'line data';
      container.appendChild(subtitleLine);
      this.splitTextToChars(subtitleLine, chapter.subtitle);

      const subChars = subtitleLine.querySelectorAll('.char');

      switch (pattern) {
        case 'center-out':
          this.revealCenterOut(subChars, tl, subPos, subtitleLine);
          break;
        case 'word-cascade':
          this.revealWordCascade(subtitleLine, tl, subPos);
          break;
        case 'flash-bloom':
          this.revealFlashBloom(subChars, tl, subPos, subtitleLine);
          break;
        case 'typewriter':
          this.revealTypewriter(subChars, tl, subPos, subtitleLine);
          break;
        default: {
          const elSub = subtitleLine;
          tl.fromTo(
            subtitleLine,
            { opacity: 0, y: 12, filter: 'blur(6px)' },
            {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              duration: 0.9,
              ease: 'power2.out',
              onComplete: () => this.clearInlineFilter(elSub),
            },
            subPos
          );
          tl.set(subChars, { opacity: 1 }, subPos);
          tl.add(() => this.markRevealed(subChars), subPos + 0.1);
          break;
        }
      }
    }
  }
}
