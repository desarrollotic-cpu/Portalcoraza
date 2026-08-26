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
    <!-- ESCENARIO TRANSPARENTE EN EL BORDE INFERIOR (SIN FONDOS, SIN BORDES, SIN CAJAS) -->
    <div class="pet-stage" (click)="onStageClick($event)">
      <!-- CARNE QUE CAE AL PISO -->
      @if (meatPos() !== null) {
        <div
          class="pet-meat"
          [style.left.px]="meatPos()!.x"
          [style.bottom.px]="meatPos()!.y"
        >
          🍖
        </div>
      }

      <!-- COCODRILO PURO BORDEANDO -->
      <div
        class="pet-croc"
        [class.flip]="facingLeft()"
        [class.snapping]="isSnapping()"
        [class.walking]="isWalking()"
        [style.left.px]="posX()"
        [style.bottom.px]="posY()"
        (click)="onCrocClick($event)"
        title="Cocodrilo Coraza — Haz clic para darle carne"
      >
        <!-- COCODRILO VECTORIAL / PIXEL-ART PURO -->
        <svg class="croc-svg" viewBox="0 0 68 36">
          <!-- COLA -->
          <path class="croc-tail" d="M 4 22 Q 10 17 18 20 Q 14 26 4 22 Z" fill="#15803d" />
          <!-- ESCAMAS DORSALES -->
          <polygon points="12,18 15,13 18,18" fill="#14532d" />
          <polygon points="18,17 22,12 26,17" fill="#14532d" />
          <polygon points="26,17 30,12 34,17" fill="#14532d" />
          <polygon points="34,17 38,13 42,18" fill="#14532d" />
          <!-- CUERPO -->
          <ellipse cx="28" cy="22" rx="16" ry="8" fill="#16a34a" />
          <path d="M 16 23 Q 28 27 40 23 Q 28 29 16 23 Z" fill="#86efac" opacity="0.6" />
          <!-- PATAS -->
          <rect class="croc-leg leg-l" x="20" y="26" width="6" height="7" rx="3" fill="#15803d" />
          <rect class="croc-leg leg-r" x="34" y="26" width="6" height="7" rx="3" fill="#15803d" />
          <!-- CABEZA Y MANDÍBULA SUPERIOR -->
          <path class="croc-snout-top" d="M 38 16 L 60 17 Q 64 20 60 22 L 38 22 Z" fill="#16a34a" />
          <!-- MANDÍBULA INFERIOR -->
          <path class="croc-snout-bot" d="M 40 22 L 59 22 Q 62 25 58 26 L 40 26 Z" fill="#15803d" />
          <!-- DIENTES -->
          <polygon class="croc-teeth" points="44,22 46,19 48,22 50,19 52,22 54,19 56,22 58,19 60,22" fill="#ffffff" />
          <!-- OJO REPTILIANO -->
          <circle cx="42" cy="16" r="3.5" fill="#facc15" />
          <ellipse class="croc-pupil" cx="42" cy="16" rx="1" ry="2.5" fill="#0f172a" />
          <!-- INSIGNIA CORAZA EN EL LOMO -->
          <circle cx="30" cy="20" r="3" fill="#1e40af" />
          <polygon points="30,18 32,20 30,22 28,20" fill="#facc15" />
        </svg>
      </div>
    </div>
  `,
  styles: [
    `
      /* STAGE 100% TRANSPARENTE EN EL BORDE INFERIOR */
      .pet-stage {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 48px;
        pointer-events: none;
        z-index: 9998;
        overflow: hidden;
      }

      /* COCODRILO LIMPIO */
      .pet-croc {
        position: absolute;
        width: 68px;
        height: 36px;
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.15s ease;
        user-select: none;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
      }

      .pet-croc.flip {
        transform: scaleX(-1);
      }

      .croc-svg {
        width: 100%;
        height: 100%;
      }

      /* ANIMACIONES COLA Y PATAS */
      .croc-tail {
        transform-origin: 18px 20px;
        animation: tailWag 1s ease-in-out infinite alternate;
      }
      .pet-croc.walking .croc-tail {
        animation-duration: 0.35s;
      }
      @keyframes tailWag {
        0% { transform: rotate(-8deg); }
        100% { transform: rotate(12deg); }
      }

      .pet-croc.walking .leg-l {
        transform-origin: 22px 26px;
        animation: legStep 0.35s infinite alternate;
      }
      .pet-croc.walking .leg-r {
        transform-origin: 36px 26px;
        animation: legStep 0.35s infinite alternate-reverse;
      }
      @keyframes legStep {
        0% { transform: rotate(-25deg); }
        100% { transform: rotate(25deg); }
      }

      /* MORDISCO / SNAP AL COMER CARNE */
      .pet-croc.snapping .croc-snout-top {
        transform-origin: 38px 22px;
        animation: jawSnapTop 0.25s 3 alternate;
      }
      .pet-croc.snapping .croc-snout-bot {
        transform-origin: 40px 22px;
        animation: jawSnapBot 0.25s 3 alternate;
      }
      @keyframes jawSnapTop {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-35deg); }
      }
      @keyframes jawSnapBot {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(25deg); }
      }

      /* CARNE FLOTANTE / PISO */
      .pet-meat {
        position: absolute;
        font-size: 1.35rem;
        pointer-events: none;
        animation: bounceMeat 0.5s infinite alternate;
        transition: left 0.1s linear;
      }
      @keyframes bounceMeat {
        0% { transform: translateY(0); }
        100% { transform: translateY(-8px); }
      }
    `,
  ],
})
export class CorazaPet implements OnInit, OnDestroy {
  readonly posX = signal(150);
  readonly posY = signal(4);
  readonly facingLeft = signal(false);
  readonly isWalking = signal(true);
  readonly isSnapping = signal(false);
  readonly meatPos = signal<{ x: number; y: number } | null>(null);

  private animTimer: any = null;
  private meatSpawnTimer: any = null;
  private speed = 2.2;

  ngOnInit(): void {
    this.startGameLoop();
    this.startAutoMeatFeeding();
  }

  ngOnDestroy(): void {
    if (this.animTimer) clearInterval(this.animTimer);
    if (this.meatSpawnTimer) clearInterval(this.meatSpawnTimer);
  }

  onCrocClick(e: MouseEvent): void {
    e.stopPropagation();
    this.feedMeat(this.posX() + (this.facingLeft() ? -120 : 120));
  }

  onStageClick(e: MouseEvent): void {
    this.feedMeat(e.clientX);
  }

  feedMeat(targetX: number): void {
    const screenW = window.innerWidth;
    const clampedX = Math.max(40, Math.min(targetX, screenW - 80));
    this.meatPos.set({ x: clampedX, y: 8 });
    this.isWalking.set(true);
  }

  private startAutoMeatFeeding(): void {
    // Cada 20-30 segundos suelta una carne para que vaya a comerla
    this.meatSpawnTimer = setInterval(() => {
      if (this.meatPos() === null && Math.random() < 0.6) {
        const screenW = window.innerWidth;
        const randX = Math.floor(Math.random() * (screenW - 160)) + 60;
        this.feedMeat(randX);
      }
    }, 22000);
  }

  private startGameLoop(): void {
    if (this.animTimer) clearInterval(this.animTimer);

    this.animTimer = setInterval(() => {
      const screenW = window.innerWidth;
      const curX = this.posX();
      const meat = this.meatPos();

      // 1. Si hay carne en el piso, va corriendo a comérsela
      if (meat) {
        const dx = meat.x - curX;
        if (Math.abs(dx) < 18) {
          // Atrapó la carne: hace mordisco fuerte
          this.meatPos.set(null);
          this.isWalking.set(false);
          this.isSnapping.set(true);
          setTimeout(() => {
            this.isSnapping.set(false);
            this.isWalking.set(true);
          }, 1200);
        } else {
          this.facingLeft.set(dx < 0);
          const chaseSpeed = this.speed * 2.0;
          this.posX.update((x) => x + (dx > 0 ? chaseSpeed : -chaseSpeed));
        }
        return;
      }

      // 2. Patrullaje continuo bordeando la pantalla de izquierda a derecha
      if (this.isWalking()) {
        if (this.facingLeft()) {
          if (curX <= 20) {
            this.facingLeft.set(false);
          } else {
            this.posX.update((x) => x - this.speed);
          }
        } else {
          if (curX >= screenW - 90) {
            this.facingLeft.set(true);
          } else {
            this.posX.update((x) => x + this.speed);
          }
        }

        // Breve pausa ocasional para observar
        if (Math.random() < 0.003) {
          this.isWalking.set(false);
          setTimeout(() => {
            this.isWalking.set(true);
          }, 3000);
        }
      }
    }, 40);
  }
}
