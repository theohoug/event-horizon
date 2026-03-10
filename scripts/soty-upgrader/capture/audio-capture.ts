/**
 * @file audio-capture.ts
 * @description Audio analysis capture via Web Audio API injection
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { Page } from 'playwright';
import { AudioSnapshot } from '../types';

declare global {
  interface Window {
    __SOTY_AUDIO: {
      analyser: AnalyserNode;
      getSnapshot: () => AudioSnapshotRaw;
    } | null;
    __audioContext: AudioContext;
  }
}

interface AudioSnapshotRaw {
  frequencyData: number[];
  waveformData: number[];
  volume: number;
  peakFrequency: number;
  bassEnergy: number;
  midEnergy: number;
  highEnergy: number;
  activeLayers: string[];
  isSilent: boolean;
}

export async function injectAudioAnalyzer(page: Page): Promise<void> {
  await page.evaluate(`(function() {
    window.__SOTY_AUDIO = null;

    function setupAnalyzer(audioContext) {
      if (window.__SOTY_AUDIO) return;

      try {
        var analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.8;

        if (audioContext.destination) {
          try {
            var source = audioContext.createMediaStreamDestination();
            audioContext.destination.connect = audioContext.destination.connect;
            analyser.connect(audioContext.destination);
          } catch(e) {
            // Fallback: just create the analyser without connecting
          }
        }

        var frequencyBinCount = analyser.frequencyBinCount;
        var sampleRate = audioContext.sampleRate;

        window.__SOTY_AUDIO = {
          analyser: analyser,
          getSnapshot: function() {
            var frequencyArray = new Uint8Array(frequencyBinCount);
            var waveformArray = new Uint8Array(frequencyBinCount);

            analyser.getByteFrequencyData(frequencyArray);
            analyser.getByteTimeDomainData(waveformArray);

            var frequencyData = Array.from(frequencyArray);
            var waveformData = Array.from(waveformArray);

            var volume = frequencyData.reduce(function(sum, v) { return sum + v; }, 0) / frequencyData.length / 255;

            var peakValue = 0;
            var peakIndex = 0;
            for (var i = 0; i < frequencyData.length; i++) {
              if (frequencyData[i] > peakValue) {
                peakValue = frequencyData[i];
                peakIndex = i;
              }
            }
            var peakFrequency = (peakIndex * sampleRate) / (frequencyBinCount * 2);

            var bassEnd = Math.floor((250 / (sampleRate / 2)) * frequencyBinCount);
            var midEnd = Math.floor((4000 / (sampleRate / 2)) * frequencyBinCount);

            var bassSlice = frequencyData.slice(0, bassEnd);
            var midSlice = frequencyData.slice(bassEnd, midEnd);
            var highSlice = frequencyData.slice(midEnd);

            function bandEnergy(slice) {
              return slice.length > 0 ? slice.reduce(function(s, v) { return s + v; }, 0) / (slice.length * 255) : 0;
            }

            var bassEnergy = bandEnergy(bassSlice);
            var midEnergy = bandEnergy(midSlice);
            var highEnergy = bandEnergy(highSlice);

            var activeLayers = detectActiveLayers(audioContext);
            var isSilent = volume < 0.01;

            return {
              frequencyData: frequencyData,
              waveformData: waveformData,
              volume: Math.round(volume * 1000) / 1000,
              peakFrequency: Math.round(peakFrequency),
              bassEnergy: Math.round(bassEnergy * 1000) / 1000,
              midEnergy: Math.round(midEnergy * 1000) / 1000,
              highEnergy: Math.round(highEnergy * 1000) / 1000,
              activeLayers: activeLayers,
              isSilent: isSilent
            };
          }
        };
      } catch(e) {
        window.__SOTY_AUDIO = null;
      }
    }

    function detectActiveLayers(ctx) {
      var layers = [];
      try {
        var audioSources = ctx.__sources;
        if (Array.isArray(audioSources)) {
          for (var i = 0; i < audioSources.length; i++) {
            var src = audioSources[i];
            if (src.gain && src.gain.value > 0.01 && src.name) {
              layers.push(src.name);
            }
          }
        }
      } catch(e) {
        // Sources not exposed
      }
      return layers;
    }

    var existingContext = window.__audioContext || window.audioContext;

    if (existingContext) {
      setupAnalyzer(existingContext);
    }

    var OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (OriginalAudioContext) {
      var originalPrototype = OriginalAudioContext.prototype;
      var originalCreateGain = originalPrototype.createGain;

      originalPrototype.createGain = function() {
        setupAnalyzer(this);
        return originalCreateGain.call(this);
      };
    }
  })()`);
}

export async function collectAudioSnapshot(page: Page): Promise<AudioSnapshot | null> {
  const raw = await page.evaluate(`(function() {
    if (!window.__SOTY_AUDIO) return null;
    return window.__SOTY_AUDIO.getSnapshot();
  })()`);

  if (!raw) return null;

  return {
    frequencyData: raw.frequencyData,
    waveformData: raw.waveformData,
    volume: raw.volume,
    peakFrequency: raw.peakFrequency,
    bassEnergy: raw.bassEnergy,
    midEnergy: raw.midEnergy,
    highEnergy: raw.highEnergy,
    activeLayers: raw.activeLayers,
    isSilent: raw.isSilent,
  };
}

export function calculateBandEnergy(
  frequencyData: number[],
  sampleRate: number,
  lowHz: number,
  highHz: number,
): number {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const lowBin = Math.floor((lowHz / nyquist) * binCount);
  const highBin = Math.min(Math.ceil((highHz / nyquist) * binCount), binCount - 1);

  if (lowBin >= highBin) return 0;

  let totalEnergy = 0;
  let count = 0;

  for (let i = lowBin; i <= highBin; i++) {
    totalEnergy += frequencyData[i];
    count++;
  }

  return count > 0 ? totalEnergy / (count * 255) : 0;
}
