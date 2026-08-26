import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-coraza-pet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- COCODRILO ENCAPSULADO EN LA ESQUINA DEL LOGO -->
    <div
      class="corner-croc-wrap"
      (click)="feedCroc($event)"
      title="Cocodrilo Guardián Coraza — Haz clic para alimentarlo"
    >
      @if (hasMeat()) {
        <span class="mini-meat">🍖</span>
      }

      <div
        class="croc-body"
        [class.snapping]="isSnapping()"
      >
        <svg class="croc-svg" viewBox="0 0 68 36">
          <!-- COLA CON MOVIMIENTO -->
          <path class="croc-tail" d="M 4 22 Q 10 17 18 20 Q 14 26 4 22 Z" fill="#15803d" />
          <!-- ESCAMAS DORSALES -->
          <polygon points="12,18 15,13 18,18" fill="#14532d" />
          <polygon points="18,17 22,12 26,17" fill="#14532d" />
          <polygon points="26,17 30,12 34,17" fill="#14532d" />
          <polygon points="34,17 38,13 42,18" fill="#14532d" />
          <!-- CUERPO -->
          <ellipse cx="28" cy="22" rx="16" ry="8" fill="#22c55e" />
          <path d="M 16 23 Q 28 27 40 23 Q 28 29 16 23 Z" fill="#86efac" opacity="0.7" />
          <!-- PATAS -->
          <rect class="croc-leg leg-l" x="20" y="26" width="6" height="6" rx="2.5" fill="#15803d" />
          <rect class="croc-leg leg-r" x="34" y="26" width="6" height="6" rx="2.5" fill="#15803d" />
          <!-- MANDÍBULA SUPERIOR -->
          <path class="croc-snout-top" d="M 38 16 L 60 17 Q 64 20 60 22 L 38 22 Z" fill="#22c55e" />
          <!-- MANDÍBULA INFERIOR -->
          <path class="croc-snout-bot" d="M 40 22 L 59 22 Q 62 25 58 26 L 40 26 Z" fill="#15803d" />
          <!-- DIENTES BLANCOS -->
          <polygon class="croc-teeth" points="44,22 46,19 48,22 50,19 52,22 54,19 56,22 58,19 60,22" fill="#ffffff" />
          <!-- OJO BRILLANTE -->
          <circle cx="42" cy="16" r="3.2" fill="#facc15" />
          <ellipse class="croc-pupil" cx="42" cy="16" rx="1" ry="2.2" fill="#0f172a" />
          <!-- ESCUDO DORADO CORAZA EN EL LOMO -->
          <circle cx="29" cy="20" r="2.8" fill="#1e40af" />
          <polygon points="29,18 31,20 29,22 27,20" fill="#facc15" />
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        margin-left: auto;
      }

      .corner-croc-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 52px;
        height: 32px;
        cursor: pointer;
        user-select: none;
        transition: transform 0.2s ease;
      }
      .corner-croc-wrap:hover {
        transform: scale(1.1);
      }

      .croc-body {
        width: 100%;
        height: 100%;
        filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.3));
      }

      .croc-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      /* MOVIMIENTO DE COLA */
      .croc-tail {
        transform-origin: 18px 20px;
        animation: tailWag 1.4s ease-in-out infinite alternate;
      }
      @keyframes tailWag {
        0% { transform: rotate(-10deg); }
        100% { transform: rotate(14deg); }
      }

      /* PATITAS */
      .leg-l {
        transform-origin: 22px 26px;
        animation: legStep 1.4s infinite alternate;
      }
      .leg-r {
        transform-origin: 36px 26px;
        animation: legStep 1.4s infinite alternate-reverse;
      }
      @keyframes legStep {
        0% { transform: rotate(-10deg); }
        100% { transform: rotate(10deg); }
      }

      /* MORDISCO / SNAP AL COMER CARNE */
      .croc-body.snapping .croc-snout-top {
        transform-origin: 38px 22px;
        animation: jawSnapTop 0.2s 3 alternate;
      }
      .croc-body.snapping .croc-snout-bot {
        transform-origin: 40px 22px;
        animation: jawSnapBot 0.2s 3 alternate;
      }
      @keyframes jawSnapTop {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-35deg); }
      }
      @keyframes jawSnapBot {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(25deg); }
      }

      /* CARNE QUE APARECE PARA COMER */
      .mini-meat {
        position: absolute;
        top: -10px;
        right: -2px;
        font-size: 1rem;
        animation: dropMeat 0.4s ease-out forwards;
      }
      @keyframes dropMeat {
        0% { transform: translateY(-12px) scale(0.5); opacity: 0; }
        100% { transform: translateY(0) scale(1); opacity: 1; }
      }
    `,
  ],
})
export class CorazaPet implements OnInit, OnDestroy {
  readonly isSnapping = signal(false);
  readonly hasMeat = signal(false);

  private autoFeedTimer: any = null;

  ngOnInit(): void {
    // Come carne automáticamente cada 25 segundos
    this.autoFeedTimer = setInterval(() => {
      this.triggerFeed();
    }, 25000);
  }

  ngOnDestroy(): void {
    if (this.autoFeedTimer) clearInterval(this.autoFeedTimer);
  }

  feedCroc(e: MouseEvent): void {
    e.stopPropagation();
    this.triggerFeed();
  }

  private triggerFeed(): void {
    if (this.isSnapping()) return;
    this.hasMeat.set(true);
    this.isSnapping.set(true);

    setTimeout(() => {
      this.hasMeat.set(false);
    }, 450);

    setTimeout(() => {
      this.isSnapping.set(false);
    }, 1000);
  }
}
