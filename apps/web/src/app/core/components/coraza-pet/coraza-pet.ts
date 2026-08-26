import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PetType = 'crocodile' | 'dog' | 'cat' | 'duck';
export type PetState = 'walk' | 'idle' | 'snap' | 'sleep' | 'chase';

@Component({
  selector: 'app-coraza-pet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (enabled()) {
      <!-- CONTENEDOR FLOTANTE EN EL BORDE INFERIOR -->
      <div class="pet-stage" (click)="onStageClick($event)">
        <!-- PELOTA O PREMIO CUANDO SE LANZA -->
        @if (ballPos() !== null) {
          <div
            class="pet-ball"
            [style.left.px]="ballPos()!.x"
            [style.bottom.px]="ballPos()!.y"
          >
            {{ selectedPet() === 'crocodile' ? '🍖' : '🎾' }}
          </div>
        }

        <!-- LA MASCOTA -->
        <div
          class="pet-sprite"
          [class.flip]="facingLeft()"
          [class.sleeping]="state() === 'sleep'"
          [class.snapping]="state() === 'snap'"
          [class.walking]="state() === 'walk' || state() === 'chase'"
          [style.left.px]="posX()"
          [style.bottom.px]="posY()"
          (click)="onPetClick($event)"
          title="¡Haz clic en tu mascota o tíralo un premio!"
        >
          <!-- GLOBO DE DIÁLOGO / REACCIÓN -->
          @if (speechText()) {
            <div class="pet-bubble">{{ speechText() }}</div>
          }

          <!-- COCODRILO PIXEL-ART / VECTORIAL -->
          @if (selectedPet() === 'crocodile') {
            <svg class="pet-svg croc-svg" viewBox="0 0 64 36">
              <!-- COLA -->
              <path class="croc-tail" d="M 4 22 Q 10 18 18 20 Q 14 26 4 22 Z" fill="#15803d" />
              <!-- ESCAMAS DORSALES (CRESTAS) -->
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
              <!-- CABEZA Y HOCICO -->
              <path class="croc-snout-top" d="M 38 16 L 58 17 Q 62 20 58 22 L 38 22 Z" fill="#16a34a" />
              <path class="croc-snout-bot" d="M 40 22 L 57 22 Q 60 25 56 26 L 40 26 Z" fill="#15803d" />
              <!-- DIENTES AFILADOS -->
              <polygon class="croc-teeth" points="44,22 46,20 48,22 50,20 52,22 54,20 56,22" fill="#ffffff" />
              <!-- OJO REPTILIANO -->
              <circle cx="42" cy="16" r="3.5" fill="#facc15" />
              <ellipse class="croc-pupil" cx="42" cy="16" rx="1" ry="2.5" fill="#0f172a" />
              <!-- CORAZA TÁCTICA BADGE -->
              <circle cx="30" cy="20" r="3" fill="#1e40af" />
              <polygon points="30,18 32,20 30,22 28,20" fill="#facc15" />
            </svg>
          }

          <!-- PERRO GUARDIÁN -->
          @if (selectedPet() === 'dog') {
            <svg class="pet-svg dog-svg" viewBox="0 0 50 36">
              <path class="dog-tail" d="M 6 18 Q 2 12 8 8" stroke="#92400e" stroke-width="4" fill="none" stroke-linecap="round" />
              <ellipse cx="22" cy="20" rx="14" ry="9" fill="#b45309" />
              <ellipse cx="22" cy="22" rx="10" ry="5" fill="#fde68a" />
              <rect class="dog-leg leg-l" x="14" y="25" width="5" height="8" rx="2.5" fill="#92400e" />
              <rect class="dog-leg leg-r" x="26" y="25" width="5" height="8" rx="2.5" fill="#92400e" />
              <circle cx="35" cy="14" r="8" fill="#b45309" />
              <ellipse cx="40" cy="16" rx="4" ry="3" fill="#fde68a" />
              <circle cx="42" cy="15" r="1.5" fill="#0f172a" />
              <ellipse class="dog-ear" cx="30" cy="10" rx="3" ry="6" fill="#78350f" />
              <circle cx="36" cy="12" r="2" fill="#0f172a" />
              <path d="M 18 15 Q 26 15 28 24 L 16 24 Z" fill="#1e40af" />
            </svg>
          }

          <!-- GATICO -->
          @if (selectedPet() === 'cat') {
            <svg class="pet-svg cat-svg" viewBox="0 0 50 36">
              <path class="cat-tail" d="M 6 22 Q 2 12 6 8" stroke="#475569" stroke-width="3.5" fill="none" stroke-linecap="round" />
              <ellipse cx="22" cy="22" rx="12" ry="8" fill="#64748b" />
              <rect class="cat-leg leg-l" x="15" y="26" width="4" height="7" rx="2" fill="#475569" />
              <rect class="cat-leg leg-r" x="25" y="26" width="4" height="7" rx="2" fill="#475569" />
              <circle cx="34" cy="16" r="7" fill="#64748b" />
              <polygon points="29,11 31,6 35,11" fill="#475569" />
              <polygon points="35,11 39,6 41,11" fill="#475569" />
              <circle cx="36" cy="15" r="1.8" fill="#22c55e" />
              <circle cx="36" cy="15" r="0.8" fill="#0f172a" />
            </svg>
          }

          <!-- PATO -->
          @if (selectedPet() === 'duck') {
            <svg class="pet-svg duck-svg" viewBox="0 0 46 36">
              <ellipse cx="20" cy="22" rx="12" ry="8" fill="#eab308" />
              <rect class="duck-leg leg-l" x="16" y="28" width="3" height="6" fill="#ea580c" />
              <rect class="duck-leg leg-r" x="22" y="28" width="3" height="6" fill="#ea580c" />
              <circle cx="28" cy="14" r="6" fill="#eab308" />
              <polygon points="32,14 42,16 32,18" fill="#ea580c" />
              <circle cx="30" cy="13" r="1.5" fill="#0f172a" />
            </svg>
          }
        </div>
      </div>
    }

    <!-- BOTÓN Y MENÚ DE CONFIGURACIÓN DE LA MASCOTA -->
    <div class="pet-widget-fab">
      <button
        type="button"
        class="btn-pet-toggle"
        (click)="toggleMenu()"
        [title]="enabled() ? 'Configurar Mascota Coraza' : 'Activar Mascota Coraza'"
      >
        <span class="pet-icon">{{ currentPetEmoji() }}</span>
        <span class="pet-label">{{ enabled() ? petName() : 'Mascota OFF' }}</span>
      </button>

      @if (menuOpen()) {
        <div class="pet-menu-popover">
          <div class="pop-header">
            <strong>🐾 Mascota de Trabajo Coraza</strong>
            <button type="button" class="btn-close-pop" (click)="menuOpen.set(false)">✕</button>
          </div>

          <div class="pop-body">
            <!-- ACTIVAR / DESACTIVAR -->
            <label class="toggle-row">
              <span>Activar Mascota en Pantalla</span>
              <input
                type="checkbox"
                [ngModel]="enabled()"
                (ngModelChange)="onToggleEnabled($event)"
              />
            </label>

            @if (enabled()) {
              <!-- SELECTOR DE MASCOTA -->
              <div class="form-group">
                <label>Elegir Compañero:</label>
                <div class="pet-options-grid">
                  <button
                    type="button"
                    class="btn-option"
                    [class.active]="selectedPet() === 'crocodile'"
                    (click)="changePet('crocodile')"
                  >
                    🐊 Cocodrilo Coco
                  </button>
                  <button
                    type="button"
                    class="btn-option"
                    [class.active]="selectedPet() === 'dog'"
                    (click)="changePet('dog')"
                  >
                    🐕 Perro Guardián
                  </button>
                  <button
                    type="button"
                    class="btn-option"
                    [class.active]="selectedPet() === 'cat'"
                    (click)="changePet('cat')"
                  >
                    🐈 Michi
                  </button>
                  <button
                    type="button"
                    class="btn-option"
                    [class.active]="selectedPet() === 'duck'"
                    (click)="changePet('duck')"
                  >
                    🦆 Pato Cuack
                  </button>
                </div>
              </div>

              <!-- ACCIONES DE INTERACCIÓN -->
              <div class="actions-row">
                <button type="button" class="btn-act" (click)="throwTreat()">
                  {{ selectedPet() === 'crocodile' ? '🍖 Dar Carne' : '🎾 Tirar Pelota' }}
                </button>
                <button type="button" class="btn-act" (click)="toggleSleep()">
                  {{ state() === 'sleep' ? '⏰ Despertar' : '💤 Dormir' }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* STAGE FLOTANTE INFERIOR */
      .pet-stage {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100vw;
        height: 60px;
        pointer-events: none;
        z-index: 9998;
        overflow: hidden;
      }

      /* SPRITE MASCOTA */
      .pet-sprite {
        position: absolute;
        width: 68px;
        height: 40px;
        pointer-events: auto;
        cursor: pointer;
        transition: transform 0.2s ease, bottom 0.2s ease;
        user-select: none;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.18));
      }

      .pet-sprite.flip {
        transform: scaleX(-1);
      }

      .pet-svg {
        width: 100%;
        height: 100%;
      }

      /* ANIMACIONES COCODRILO */
      .croc-tail {
        transform-origin: 18px 20px;
        animation: tailWag 1.2s ease-in-out infinite alternate;
      }
      .pet-sprite.walking .croc-tail {
        animation-duration: 0.4s;
      }
      @keyframes tailWag {
        0% { transform: rotate(-8deg); }
        100% { transform: rotate(10deg); }
      }

      .pet-sprite.walking .leg-l {
        transform-origin: 22px 26px;
        animation: legStep 0.4s infinite alternate;
      }
      .pet-sprite.walking .leg-r {
        transform-origin: 36px 26px;
        animation: legStep 0.4s infinite alternate-reverse;
      }
      @keyframes legStep {
        0% { transform: rotate(-25deg); }
        100% { transform: rotate(25deg); }
      }

      /* MORDISCO / SNAP DEL COCODRILO */
      .pet-sprite.snapping .croc-snout-top {
        transform-origin: 38px 22px;
        animation: jawSnapTop 0.3s 2 alternate;
      }
      .pet-sprite.snapping .croc-snout-bot {
        transform-origin: 40px 22px;
        animation: jawSnapBot 0.3s 2 alternate;
      }
      @keyframes jawSnapTop {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(-35deg); }
      }
      @keyframes jawSnapBot {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(25deg); }
      }

      /* DORMIR */
      .pet-sprite.sleeping {
        opacity: 0.85;
        transform: translateY(6px);
      }
      .pet-sprite.sleeping.flip {
        transform: scaleX(-1) translateY(6px);
      }

      /* PELOTA / PREMIO */
      .pet-ball {
        position: absolute;
        font-size: 1.4rem;
        pointer-events: none;
        animation: bounceBall 0.6s infinite alternate;
        transition: left 0.1s linear;
      }
      @keyframes bounceBall {
        0% { transform: translateY(0); }
        100% { transform: translateY(-12px); }
      }

      /* GLOBO DE DIÁLOGO */
      .pet-bubble {
        position: absolute;
        top: -38px;
        left: 50%;
        transform: translateX(-50%);
        background: #0f172a;
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 800;
        padding: 0.25rem 0.55rem;
        border-radius: 0.45rem;
        white-space: nowrap;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        pointer-events: none;
        animation: popBubble 0.2s ease-out;
      }
      .pet-sprite.flip .pet-bubble {
        transform: scaleX(-1) translateX(50%);
      }
      .pet-bubble::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 4px 4px 0 4px;
        border-style: solid;
        border-color: #0f172a transparent transparent transparent;
      }
      @keyframes popBubble {
        0% { transform: translateX(-50%) scale(0.6); opacity: 0; }
        100% { transform: translateX(-50%) scale(1); opacity: 1; }
      }

      /* WIDGET FLOTANTE FAB */
      .pet-widget-fab {
        position: fixed;
        bottom: 12px;
        right: 14px;
        z-index: 9999;
        font-family: inherit;
      }

      .btn-pet-toggle {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        background: #0f172a;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 0.4rem 0.75rem;
        border-radius: 2rem;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        transition: all 0.15s ease;
      }
      .btn-pet-toggle:hover {
        background: #1e293b;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      }
      .pet-icon { font-size: 1.1rem; }

      /* POPOVER DE CONFIGURACIÓN */
      .pet-menu-popover {
        position: absolute;
        bottom: 45px;
        right: 0;
        width: 260px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.85rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        padding: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        animation: popUp 0.15s ease-out;
      }
      @keyframes popUp {
        0% { opacity: 0; transform: translateY(10px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .pop-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
        font-weight: 800;
        color: #0f172a;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 0.4rem;
      }
      .btn-close-pop {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-weight: 800;
      }
      .btn-close-pop:hover { color: #0f172a; }

      .toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        font-weight: 700;
        color: #334155;
        cursor: pointer;
      }
      .form-group label {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        color: #64748b;
        margin-bottom: 0.35rem;
      }
      .pet-options-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.35rem;
      }
      .btn-option {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 0.45rem;
        padding: 0.35rem;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
      }
      .btn-option:hover { background: #eff6ff; border-color: #93c5fd; }
      .btn-option.active {
        background: #dcfce7;
        border-color: #22c55e;
        color: #15803d;
        font-weight: 800;
      }

      .actions-row {
        display: flex;
        gap: 0.4rem;
        margin-top: 0.25rem;
      }
      .btn-act {
        flex: 1;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 0.35rem;
        border-radius: 0.4rem;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-act:hover { background: #e2e8f0; }
    `,
  ],
})
export class CorazaPet implements OnInit, OnDestroy {
  readonly enabled = signal(true);
  readonly selectedPet = signal<PetType>('crocodile');
  readonly state = signal<PetState>('walk');
  readonly menuOpen = signal(false);

  readonly posX = signal(120);
  readonly posY = signal(8);
  readonly facingLeft = signal(false);
  readonly speechText = signal<string | null>('¡Hola JHON! 🐊');
  readonly ballPos = signal<{ x: number; y: number } | null>(null);

  private animTimer: any = null;
  private speechTimeout: any = null;
  private speed = 2.5;

  readonly currentPetEmoji = computed(() => {
    switch (this.selectedPet()) {
      case 'crocodile': return '🐊';
      case 'dog': return '🐕';
      case 'cat': return '🐈';
      case 'duck': return '🦆';
      default: return '🐾';
    }
  });

  readonly petName = computed(() => {
    switch (this.selectedPet()) {
      case 'crocodile': return 'Cocodrilo Coco';
      case 'dog': return 'Guardián Rex';
      case 'cat': return 'Michi';
      case 'duck': return 'Pato Cuack';
      default: return 'Mascota';
    }
  });

  ngOnInit(): void {
    const savedPet = localStorage.getItem('coraza_pet_type') as PetType;
    if (savedPet) this.selectedPet.set(savedPet);

    const savedEnabled = localStorage.getItem('coraza_pet_enabled');
    if (savedEnabled !== null) this.enabled.set(savedEnabled === 'true');

    this.startGameLoop();

    // Saludo inicial
    this.speak('¡Patrullando Coraza! 🐊🛡️', 3500);
  }

  ngOnDestroy(): void {
    if (this.animTimer) clearInterval(this.animTimer);
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
  }

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  onToggleEnabled(val: boolean): void {
    this.enabled.set(val);
    localStorage.setItem('coraza_pet_enabled', String(val));
    if (val && !this.animTimer) {
      this.startGameLoop();
    }
  }

  changePet(pet: PetType): void {
    this.selectedPet.set(pet);
    localStorage.setItem('coraza_pet_type', pet);
    if (pet === 'crocodile') {
      this.speak('¡Soy Coco el Cocodrilo! 🐊🥩', 3000);
    } else if (pet === 'dog') {
      this.speak('¡Guau! Rex listo 🐕', 3000);
    } else if (pet === 'cat') {
      this.speak('Miau 🐾', 3000);
    } else if (pet === 'duck') {
      this.speak('¡Cuack cuack! 🦆', 3000);
    }
  }

  throwTreat(): void {
    const screenW = window.innerWidth;
    const targetX = Math.floor(Math.random() * (screenW - 200)) + 80;
    this.ballPos.set({ x: targetX, y: 15 });
    this.state.set('chase');
    this.speak(this.selectedPet() === 'crocodile' ? '¡Carneee! 🥩' : '¡Pelota! 🎾', 2000);
  }

  toggleSleep(): void {
    if (this.state() === 'sleep') {
      this.state.set('walk');
      this.speak('¡Despierto y listo!', 2000);
    } else {
      this.state.set('sleep');
      this.speak('Zzz... 💤', 3000);
    }
  }

  onPetClick(e: MouseEvent): void {
    e.stopPropagation();
    if (this.selectedPet() === 'crocodile') {
      this.state.set('snap');
      this.speak('¡ÑAM! 🐊💥', 1800);
      setTimeout(() => {
        if (this.state() === 'snap') this.state.set('walk');
      }, 1200);
    } else {
      this.speak('❤️ ¡Hola!', 2000);
    }
  }

  onStageClick(e: MouseEvent): void {
    if (!this.enabled() || this.state() === 'sleep') return;
    this.ballPos.set({ x: e.clientX, y: 15 });
    this.state.set('chase');
  }

  speak(text: string, durationMs = 2500): void {
    this.speechText.set(text);
    if (this.speechTimeout) clearTimeout(this.speechTimeout);
    this.speechTimeout = setTimeout(() => {
      this.speechText.set(null);
    }, durationMs);
  }

  private startGameLoop(): void {
    if (this.animTimer) clearInterval(this.animTimer);

    this.animTimer = setInterval(() => {
      if (!this.enabled() || this.state() === 'sleep') return;

      const screenW = window.innerWidth;
      const curX = this.posX();
      const ball = this.ballPos();

      // Si hay pelota o premio que perseguir
      if (ball && (this.state() === 'chase' || this.state() === 'walk')) {
        const dx = ball.x - curX;
        if (Math.abs(dx) < 20) {
          // Atrapó la pelota
          this.ballPos.set(null);
          this.state.set(this.selectedPet() === 'crocodile' ? 'snap' : 'idle');
          this.speak(this.selectedPet() === 'crocodile' ? '¡Delicioso! 🍖' : '¡La atrapé! 🎾', 2000);
          setTimeout(() => {
            this.state.set('walk');
          }, 1500);
        } else {
          this.facingLeft.set(dx < 0);
          const moveSpeed = this.speed * 2.2;
          this.posX.update((x) => x + (dx > 0 ? moveSpeed : -moveSpeed));
        }
        return;
      }

      // Caminata normal aleatoria
      if (this.state() === 'walk') {
        if (this.facingLeft()) {
          if (curX <= 30) {
            this.facingLeft.set(false);
          } else {
            this.posX.update((x) => x - this.speed);
          }
        } else {
          if (curX >= screenW - 140) {
            this.facingLeft.set(true);
          } else {
            this.posX.update((x) => x + this.speed);
          }
        }

        // 1% de probabilidad de tomar una siesta o quedarse quieto
        if (Math.random() < 0.005) {
          this.state.set('idle');
          setTimeout(() => {
            if (this.state() === 'idle') this.state.set('walk');
          }, 4000);
        }
      }
    }, 40);
  }
}
