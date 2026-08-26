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
    <!-- PISTA SOBRE LA LÍNEA BLANCA DEL SIDEBAR -->
    <div
      class="croc-line-track"
      (click)="feedCroc($event)"
      title="Cocodrilo Guardián Coraza — Haz clic para alimentarlo"
    >
      <!-- CARNE QUE CAE SOBRE LA LÍNEA BLANCA -->
      @if (hasMeat()) {
        <span
          class="mini-meat"
          [style.left.px]="meatX()"
        >
          🍖
        </span>
      }

      <!-- COCODRILO CAMINANDO SOBRE LA LÍNEA -->
      <div
        class="croc-body"
        [class.flip]="facingLeft()"
        [class.walking]="isWalking()"
        [class.snapping]="isSnapping()"
        [style.left.px]="posX()"
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
          <!-- PATAS QUE PISAN LA LÍNEA BLANCA -->
          <rect class="croc-leg leg-l" x="20" y="26" width="6" height="7" rx="2.5" fill="#15803d" />
          <rect class="croc-leg leg-r" x="34" y="26" width="6" height="7" rx="2.5" fill="#15803d" />
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
        position: absolute;
        bottom: -16px;
        left: 0;
        width: 100%;
        height: 34px;
        pointer-events: none;
        overflow: visible;
        z-index: 10;
      }

      /* PISTA 100% TRANSPARENTE DIRECTAMENTE SOBRE LA LÍNEA BLANCA */
      .croc-line-track {
        position: relative;
        width: 100%;
        height: 100%;
        pointer-events: auto;
        cursor: pointer;
        user-select: none;
      }

      /* COCODRILO LIMPIO Y SUAVE CAMINANDO */
      .croc-body {
        position: absolute;
        bottom: 0;
        width: 48px;
        height: 28px;
        transition: transform 0.15s ease;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4));
      }

      .croc-body.flip {
        transform: scaleX(-1);
      }

      .croc-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }

      /* MOVIMIENTO DE COLA */
      .croc-tail {
        transform-origin: 18px 20px;
        animation: tailWag 1s ease-in-out infinite alternate;
      }
      .croc-body.walking .croc-tail {
        animation-duration: 0.35s;
      }
      @keyframes tailWag {
        0% { transform: rotate(-10deg); }
        100% { transform: rotate(14deg); }
      }

      /* PATITAS PASO A PASO SOBRE LA LÍNEA */
      .croc-body.walking .leg-l {
        transform-origin: 22px 26px;
        animation: legStep 0.35s infinite alternate;
      }
      .croc-body.walking .leg-r {
        transform-origin: 36px 26px;
        animation: legStep 0.35s infinite alternate-reverse;
      }
      @keyframes legStep {
        0% { transform: rotate(-25deg); }
        100% { transform: rotate(25deg); }
      }

      /* MORDISCO / SNAP AL COMER CARNE */
      .croc-body.snapping .croc-snout-top {
        transform-origin: 38px 22px;
        animation: jawSnapTop 0.18s 3 alternate;
      }
      .croc-body.snapping .croc-snout-bot {
        transform-origin: 40px 22px;
        animation: jawSnapBot 0.18s 3 alternate;
      }
      @keyframes jawSnapTop {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-35deg); }
      }
      @keyframes jawSnapBot {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(25deg); }
      }

      /* CARNE QUE CAE SOBRE LA LÍNEA */
      .mini-meat {
        position: absolute;
        bottom: 8px;
        font-size: 1rem;
        animation: bounceMeat 0.4s infinite alternate;
        z-index: 2;
        pointer-events: none;
      }
      @keyframes bounceMeat {
        0% { transform: translateY(0); }
        100% { transform: translateY(-4px); }
      }
    `,
  ],
})
export class CorazaPet implements OnInit, OnDestroy {
  readonly posX = signal(10);
  readonly facingLeft = signal(false);
  readonly isWalking = signal(true);
  readonly isSnapping = signal(false);
  readonly hasMeat = signal(false);
  readonly meatX = signal(120);

  private moveTimer: any = null;
  private autoFeedTimer: any = null;
  private minX = 4;
  private maxX = 185; // Recorre toda la línea blanca del sidebar (260px de ancho)
  private speed = 1.3;

  ngOnInit(): void {
    this.startWalkingLoop();
    this.startAutoFeed();
  }

  ngOnDestroy(): void {
    if (this.moveTimer) clearInterval(this.moveTimer);
    if (this.autoFeedTimer) clearInterval(this.autoFeedTimer);
  }

  feedCroc(e: MouseEvent): void {
    e.stopPropagation();
    this.dropMeat(this.facingLeft() ? this.minX + 20 : this.maxX - 20);
  }

  private dropMeat(targetX: number): void {
    if (this.isSnapping()) return;
    this.meatX.set(targetX);
    this.hasMeat.set(true);
    this.isWalking.set(true);
  }

  private startAutoFeed(): void {
    this.autoFeedTimer = setInterval(() => {
      if (!this.hasMeat() && !this.isSnapping()) {
        const randX = Math.floor(Math.random() * (this.maxX - this.minX - 30)) + this.minX + 15;
        this.dropMeat(randX);
      }
    }, 18000);
  }

  private startWalkingLoop(): void {
    if (this.moveTimer) clearInterval(this.moveTimer);

    this.moveTimer = setInterval(() => {
      if (this.isSnapping()) return;

      const curX = this.posX();
      const meat = this.hasMeat();
      const mX = this.meatX();

      // 1. Si hay carne sobre la línea, va hacia ella
      if (meat) {
        const dx = mX - curX;
        if (Math.abs(dx) <= 4) {
          // Llegó a la carne: come y hace mordisco
          this.hasMeat.set(false);
          this.isWalking.set(false);
          this.isSnapping.set(true);
          setTimeout(() => {
            this.isSnapping.set(false);
            this.isWalking.set(true);
          }, 1100);
        } else {
          this.facingLeft.set(dx < 0);
          this.posX.update((x) => (dx > 0 ? x + this.speed * 1.6 : x - this.speed * 1.6));
        }
        return;
      }

      // 2. Patrullaje continuo sobre la línea blanca de izquierda a derecha
      if (this.isWalking()) {
        if (this.facingLeft()) {
          if (curX <= this.minX) {
            this.facingLeft.set(false);
          } else {
            this.posX.update((x) => Math.max(this.minX, x - this.speed));
          }
        } else {
          if (curX >= this.maxX) {
            this.facingLeft.set(true);
          } else {
            this.posX.update((x) => Math.min(this.maxX, x + this.speed));
          }
        }
      }
    }, 45);
  }
}
