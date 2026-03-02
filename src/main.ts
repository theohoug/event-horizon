/**
 * @file main.ts
 * @description Entry point for Event Horizon experience
 * @author Cleanlystudio
 * @version 1.0.0
 */

import './styles/global.css';
import { Experience } from './engine/Experience';

const canvas = document.getElementById('experience') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element #experience not found');
}

const experience = new Experience(canvas);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    experience.destroy();
  });
}
