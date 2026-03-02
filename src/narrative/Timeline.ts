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
    title: 'YOU ARE HERE',
    subtitle: '13.8 billion years after the beginning — you are atoms, briefly alive, looking up',
    triggerStart: 'top top',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 1,
    title: 'THE PULL',
    subtitle: 'Something immense and invisible is pulling at the fabric of reality itself',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'char-rise',
  },
  {
    id: 2,
    title: '',
    subtitle: 'Have you ever stood at the edge of something vast and felt how small you are?',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'typewriter',
  },
  {
    id: 3,
    title: 'THE WARP',
    subtitle: 'Light bends — stars stretch into arcs — straight lines no longer exist here',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'char-rise',
  },
  {
    id: 4,
    title: '',
    subtitle: 'You were told the universe was cold — but look at this light — it has been traveling for you',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'word-cascade',
  },
  {
    id: 5,
    title: 'THE FALL',
    subtitle: 'You cross the point of no return — and the strange thing is — you feel nothing',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'flash-bloom',
  },
  {
    id: 6,
    title: '',
    subtitle: 'There is a kind of peace in letting go — in surrendering to something larger than yourself',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'typewriter',
  },
  {
    id: 7,
    title: 'SPAGHETTIFICATION',
    subtitle: 'Tidal forces pull you apart — atom by atom — into threads thinner than light',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 8,
    title: '',
    subtitle: 'You are not breaking — you are becoming something the universe has never seen before',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'word-cascade',
  },
  {
    id: 9,
    title: '',
    subtitle: 'The boundary between you and the universe was always an illusion — feel it dissolve',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'typewriter',
  },
  {
    id: 10,
    title: 'TIME DILATION',
    subtitle: 'One heartbeat here — outside, civilizations rise and fall — stars are born and die',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'flash-bloom',
  },
  {
    id: 11,
    title: '',
    subtitle: 'Close your eyes — time is not passing — it is pooling around you like water',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'typewriter',
  },
  {
    id: 12,
    title: 'SINGULARITY',
    subtitle: 'Where physics breaks — where space becomes time — where infinity becomes a point',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'center-out',
  },
  {
    id: 13,
    title: '',
    subtitle: 'Every star that ever burned — every life that ever was — it all began from a point like this',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'word-cascade',
  },
  {
    id: 14,
    title: 'THE VOID',
    subtitle: 'Beyond equations — beyond language — beyond thought — silence',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'flash-bloom',
  },
  {
    id: 15,
    title: '',
    subtitle: 'In the silence you hear it — not nothing — but everything you forgot to listen to',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'typewriter',
  },
  {
    id: 16,
    title: '',
    subtitle: 'You came looking for answers — but the void only asks one question — who are you without everything?',
    triggerStart: 'top center',
    triggerEnd: 'bottom center',
    reveal: 'word-cascade',
  },
  {
    id: 17,
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

    const lastSection = document.querySelector('[data-chapter="17"]');
    if (lastSection) {
      ScrollTrigger.create({
        trigger: lastSection,
        start: 'center center',
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
    gsap.fromTo(
      credits.querySelectorAll('.credits-line'),
      { opacity: 0, y: 20, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, stagger: 0.12, delay: 0.6, ease: 'power3.out' }
    );
  }

  private hideCredits() {
    const credits = document.getElementById('credits');
    const chapterText = document.getElementById('chapter-text');
    if (!credits) return;
    this.creditsVisible = false;
    this.activeChapter = -1;
    this.transitioning = false;
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

  private revealCenterOut(chars: NodeListOf<Element>, tl: gsap.core.Timeline, delay: number, parent?: HTMLElement) {
    if (parent) {
      tl.fromTo(
        parent,
        { opacity: 0, scale: 1.15, filter: 'blur(12px)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.0,
          ease: 'power3.out',
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

  private createChapterContent(container: HTMLElement, chapter: Chapter) {
    container.innerHTML = '';
    const isEmotional = chapter.title === '';
    const pattern = chapter.reveal;
    this.currentPattern = pattern;

    const tl = gsap.timeline();

    if (!isEmotional) {
      const titleLine = document.createElement('div');
      titleLine.className = 'line';
      container.appendChild(titleLine);
      this.splitTextToChars(titleLine, chapter.title);

      const titleChars = titleLine.querySelectorAll('.char');

      switch (pattern) {
        case 'center-out':
          this.revealCenterOut(titleChars, tl, 0, titleLine);
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
    }

    const subtitleLine = document.createElement('div');
    subtitleLine.className = isEmotional ? 'line emotional' : 'line data';
    container.appendChild(subtitleLine);
    this.splitTextToChars(subtitleLine, chapter.subtitle);

    const subChars = subtitleLine.querySelectorAll('.char');
    const subDelay = isEmotional ? 0.4 : 0.6;

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
