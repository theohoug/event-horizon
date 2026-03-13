/**
 * @file QROverlay.ts
 * @description QR code overlay for companion device pairing
 * @author Cleanlystudio
 * @version 1.0.0
 */

import { t, onLangChange } from '../i18n/translations';

export class QROverlay {
  private el: HTMLDivElement;
  private visible = false;
  private labelEl: HTMLSpanElement | null = null;

  constructor(roomId: string, baseUrl: string) {
    this.el = document.createElement('div');
    this.el.id = 'qr-overlay';
    this.el.innerHTML = `
      <div id="qr-canvas"></div>
      <span id="qr-label">${t().companion.label}</span>
      <span id="qr-room">${roomId}</span>
    `;
    document.body.appendChild(this.el);
    this.labelEl = this.el.querySelector('#qr-label');

    onLangChange(() => {
      if (this.labelEl) this.labelEl.textContent = t().companion.label;
    });

    this.generateQR(`${baseUrl}?companion=${roomId}`);
  }

  private async generateQR(url: string) {
    const qrGen = (await import('qrcode-generator')).default;
    const qr = qrGen(0, 'M');
    qr.addData(url);
    qr.make();

    const canvas = document.getElementById('qr-canvas');
    if (canvas) {
      canvas.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
      const svg = canvas.querySelector('svg');
      if (svg) {
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.querySelectorAll('rect[fill="#000000"]').forEach(r => {
          (r as SVGElement).setAttribute('fill', 'rgba(255, 240, 224, 0.85)');
        });
        svg.querySelectorAll('rect[fill="#ffffff"]').forEach(r => {
          (r as SVGElement).setAttribute('fill', 'transparent');
        });
      }
    }
  }

  update(scroll: number, introActive: boolean) {
    const shouldShow = !introActive && scroll > 0.02 && scroll < 0.92;
    if (shouldShow !== this.visible) {
      this.visible = shouldShow;
      this.el.classList.toggle('visible', shouldShow);
    }
  }

  destroy() {
    this.el.remove();
  }
}
