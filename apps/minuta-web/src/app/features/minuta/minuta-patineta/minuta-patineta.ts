import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ScooterAnswers, ScooterApiService, TriBool } from '../scooter-api.service';
import { MINUTA_PAGE_STYLES } from '../minuta.shared';

const NOVELTY_OPTS = [
  { value: 'DANO_ESTRUCTURAL', label: 'Daño estructural' },
  { value: 'FALLA_DIRECCION', label: 'Falla de dirección' },
  { value: 'FALLA_FRENOS', label: 'Falla de frenos' },
  { value: 'RUEDA_DETERIORADA', label: 'Rueda deteriorada' },
  { value: 'BATERIA_INSUFICIENTE', label: 'Batería insuficiente' },
  { value: 'FALLA_ELECTRICA', label: 'Falla eléctrica' },
  { value: 'LUCES_DEFECTUOSAS', label: 'Luces defectuosas' },
  { value: 'REFLECTIVOS_DEFECTUOSOS', label: 'Elementos reflectivos defectuosos' },
  { value: 'FALTA_CHALECO', label: 'Falta de chaleco reflectivo' },
  { value: 'CHALECO_MAL_ESTADO', label: 'Chaleco en mal estado' },
  { value: 'FALTA_EPP', label: 'Falta de elementos de protección' },
  { value: 'OTRA', label: 'Otra novedad' },
];

type BoolKey = Exclude<keyof ScooterAnswers, 'lightsOk' | 'reflectiveOk'>;

@Component({
  selector: 'app-minuta-patineta',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <section class="page">
      <div>
        <a routerLink="/" class="back-link">← Inicio</a>
        <h2>Inspección patineta eléctrica</h2>
        <p class="hint">
          Inspección preoperacional (PESV). Responda Sí o No. Fecha, hora y su nombre se
          registran solos.
        </p>
      </div>

      @if (!eligible()) {
        <p class="muted">
          Su puesto no tiene patineta eléctrica habilitada. Si debe inspeccionar, avise a
          Operaciones.
        </p>
      } @else if (done()) {
        <div class="card ok">
          <strong>Inspección guardada</strong>
          <p class="muted">Quedó registrada para revisión en Operaciones.</p>
          <a routerLink="/" class="btn">Volver al inicio</a>
        </div>
      } @else {
        <form class="form" (ngSubmit)="submit()">
          <fieldset>
            <legend>Información general</legend>
            <p><small>Fecha / hora</small><br /><b>{{ now | date: 'dd/MM/yyyy HH:mm' }}</b></p>
            <p><small>Vigilante</small><br /><b>{{ vigilanteName() }}</b></p>
            @if (posts().length > 1) {
              <label>
                Puesto
                <select [(ngModel)]="postId" name="postId" required>
                  @for (p of posts(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
              </label>
            } @else if (posts().length === 1) {
              <p><small>Puesto</small><br /><b>{{ posts()[0].name }}</b></p>
            }
            <div class="q">
              <span>¿Está recibiendo formalmente la patineta para iniciar su turno?</span>
              <div class="opts">
                <label><input type="radio" name="recv" [ngModel]="receiving()" (ngModelChange)="receiving.set($event)" [value]="true" /> Sí</label>
                <label><input type="radio" name="recv" [ngModel]="receiving()" (ngModelChange)="receiving.set($event)" [value]="false" /> No</label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Estado estructural</legend>
            @for (q of structureQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Dirección y maniobrabilidad</legend>
            @for (q of steeringQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Sistema de frenos</legend>
            <div class="q">
              <span>¿El sistema de frenos funciona correctamente?</span>
              <div class="opts">
                <label><input type="radio" name="brakesOk" [ngModel]="boolVal('brakesOk')" (ngModelChange)="setBool('brakesOk', $event)" [value]="true" /> Sí</label>
                <label><input type="radio" name="brakesOk" [ngModel]="boolVal('brakesOk')" (ngModelChange)="setBool('brakesOk', $event)" [value]="false" /> No</label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Ruedas</legend>
            @for (q of wheelQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Sistema eléctrico</legend>
            @for (q of electricQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Visibilidad</legend>
            <div class="q">
              <span>¿Las luces de la patineta funcionan correctamente?</span>
              <div class="opts">
                <label><input type="radio" name="lightsOk" [ngModel]="tri('lightsOk')" (ngModelChange)="setTri('lightsOk', $event)" value="SI" /> Sí</label>
                <label><input type="radio" name="lightsOk" [ngModel]="tri('lightsOk')" (ngModelChange)="setTri('lightsOk', $event)" value="NO" /> No</label>
                <label><input type="radio" name="lightsOk" [ngModel]="tri('lightsOk')" (ngModelChange)="setTri('lightsOk', $event)" value="NA" /> No aplica</label>
              </div>
            </div>
            <div class="q">
              <span>¿Los elementos reflectivos se encuentran visibles y en buen estado?</span>
              <div class="opts">
                <label><input type="radio" name="reflectiveOk" [ngModel]="tri('reflectiveOk')" (ngModelChange)="setTri('reflectiveOk', $event)" value="SI" /> Sí</label>
                <label><input type="radio" name="reflectiveOk" [ngModel]="tri('reflectiveOk')" (ngModelChange)="setTri('reflectiveOk', $event)" value="NO" /> No</label>
                <label><input type="radio" name="reflectiveOk" [ngModel]="tri('reflectiveOk')" (ngModelChange)="setTri('reflectiveOk', $event)" value="NA" /> No aplica</label>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>Elementos de protección del operador</legend>
            @for (q of ppeQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Verificación operativa</legend>
            @for (q of opsQs; track q.key) {
              <div class="q">
                <span>{{ q.label }}</span>
                <div class="opts">
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="true" /> Sí</label>
                  <label><input type="radio" [name]="q.key" [ngModel]="boolVal(q.key)" (ngModelChange)="setBool(q.key, $event)" [value]="false" /> No</label>
                </div>
              </div>
            }
          </fieldset>

          <fieldset>
            <legend>Concepto de aptitud</legend>
            <div class="q">
              <span>¿La patineta es apta para iniciar operación?</span>
              <div class="opts">
                <label><input type="radio" name="apt" [ngModel]="apt()" (ngModelChange)="apt.set($event)" [value]="true" /> Sí</label>
                <label><input type="radio" name="apt" [ngModel]="apt()" (ngModelChange)="apt.set($event)" [value]="false" /> No</label>
              </div>
            </div>
          </fieldset>

          @if (needsNovelty()) {
            <fieldset class="novelty">
              <legend>Registro de novedad</legend>
              <label>
                Seleccione la novedad identificada
                <select [(ngModel)]="noveltyType" name="noveltyType" required>
                  <option value="">— Elegir —</option>
                  @for (o of noveltyOpts; track o.value) {
                    <option [value]="o.value">{{ o.label }}</option>
                  }
                </select>
              </label>
              <div class="q">
                <span>¿La novedad fue reportada al supervisor?</span>
                <div class="opts">
                  <label><input type="radio" name="rep" [ngModel]="noveltyReported()" (ngModelChange)="noveltyReported.set($event)" [value]="true" /> Sí</label>
                  <label><input type="radio" name="rep" [ngModel]="noveltyReported()" (ngModelChange)="noveltyReported.set($event)" [value]="false" /> No</label>
                </div>
              </div>
              <div class="q">
                <span>¿La patineta fue retirada de operación?</span>
                <div class="opts">
                  <label><input type="radio" name="wit" [ngModel]="noveltyWithdrawn()" (ngModelChange)="noveltyWithdrawn.set($event)" [value]="true" /> Sí</label>
                  <label><input type="radio" name="wit" [ngModel]="noveltyWithdrawn()" (ngModelChange)="noveltyWithdrawn.set($event)" [value]="false" /> No</label>
                </div>
              </div>
            </fieldset>
          }

          @if (error()) {
            <p class="err">{{ error() }}</p>
          }

          <button type="submit" class="btn" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar inspección' }}
          </button>
        </form>
      }
    </section>
  `,
  styles: [
    MINUTA_PAGE_STYLES,
    `
      .back-link { font-size: 0.9rem; color: var(--primary-600); }
      fieldset {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0.85rem 1rem 1rem;
        margin: 0 0 0.85rem;
        background: var(--surface);
      }
      legend { font-weight: 700; padding: 0 0.35rem; }
      .q { display: flex; flex-direction: column; gap: 0.45rem; margin: 0.75rem 0; }
      .opts { display: flex; flex-wrap: wrap; gap: 0.85rem; }
      .opts label { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; }
      .novelty { border-color: color-mix(in srgb, var(--warning-500) 50%, var(--border)); }
      .btn {
        width: 100%; margin-top: 0.5rem; padding: 0.9rem 1rem;
        border: 0; border-radius: var(--radius-sm); font-weight: 700;
        background: var(--gradient-primary); color: #fff; cursor: pointer;
      }
      .btn:disabled { opacity: 0.6; }
      .err { color: var(--error-600); font-weight: 600; }
      .ok { padding: 1rem; }
      .card.ok { display: flex; flex-direction: column; gap: 0.75rem; }
    `,
  ],
})
export class MinutaPatineta implements OnInit {
  private readonly api = inject(ScooterApiService);
  private readonly auth = inject(AuthService);

  readonly now = new Date();
  readonly posts = signal<Array<{ id: string; code: string; name: string }>>([]);
  readonly eligible = signal(true);
  readonly done = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly receiving = signal<boolean | null>(null);
  readonly apt = signal<boolean | null>(null);
  readonly noveltyReported = signal<boolean | null>(null);
  readonly noveltyWithdrawn = signal<boolean | null>(null);
  readonly answers = signal<Partial<ScooterAnswers>>({});

  postId = '';
  noveltyType = '';
  readonly noveltyOpts = NOVELTY_OPTS;

  readonly structureQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'structureOk', label: '¿La estructura está en buen estado, sin daños ni piezas sueltas?' },
    { key: 'platformOk', label: '¿La plataforma de apoyo para los pies está en buenas condiciones?' },
  ];
  readonly steeringQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'handlebarOk', label: '¿El manubrio está firme y sin holguras?' },
    { key: 'steeringOk', label: '¿La dirección responde adecuadamente?' },
  ];
  readonly wheelQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'wheelsOk', label: '¿Las ruedas están en buen estado y sin desgaste excesivo?' },
    { key: 'wheelsSecured', label: '¿Las ruedas están correctamente aseguradas?' },
  ];
  readonly electricQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'batteryOk', label: '¿La batería tiene carga suficiente para iniciar el servicio?' },
    { key: 'cablesOk', label: '¿No se observan cables sueltos, pelados o conexiones deterioradas?' },
    { key: 'chargeIndicatorOk', label: '¿El indicador de carga y encendido funciona correctamente?' },
  ];
  readonly ppeQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'vestWorn', label: '¿Porta correctamente el chaleco reflectivo o prenda de alta visibilidad?' },
    { key: 'vestClean', label: '¿El chaleco está limpio y en adecuado estado de conservación?' },
    { key: 'otherPpe', label: '¿Dispone de los demás elementos de protección definidos por la empresa?' },
  ];
  readonly opsQs: Array<{ key: BoolKey; label: string }> = [
    { key: 'testRideOk', label: '¿La patineta responde en una prueba corta de desplazamiento?' },
    { key: 'noAbnormalNoise', label: '¿No se evidencian ruidos, vibraciones o fallas anormales?' },
  ];

  readonly needsNovelty = computed(() => {
    const r = this.receiving();
    const a = this.apt();
    const ans = this.answers();
    if (r === false || a === false) return true;
    for (const k of [
      ...this.structureQs,
      ...this.steeringQs,
      ...this.wheelQs,
      ...this.electricQs,
      ...this.ppeQs,
      ...this.opsQs,
      { key: 'brakesOk' as BoolKey },
    ]) {
      if (ans[k.key] === false) return true;
    }
    if (ans.lightsOk === 'NO' || ans.reflectiveOk === 'NO') return true;
    return false;
  });

  vigilanteName(): string {
    return this.auth.currentUser()?.fullName || this.auth.currentUser()?.email || 'Vigilante';
  }

  ngOnInit(): void {
    this.api.eligiblePosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.eligible.set(posts.length > 0);
        if (posts[0]) this.postId = posts[0].id;
      },
      error: () => this.eligible.set(false),
    });
  }

  boolVal(key: BoolKey): boolean | null {
    const v = this.answers()[key];
    return typeof v === 'boolean' ? v : null;
  }

  setBool(key: BoolKey, v: boolean | string): void {
    this.answers.update((a) => ({ ...a, [key]: v === true || v === 'true' }));
  }

  tri(key: 'lightsOk' | 'reflectiveOk'): TriBool | null {
    const v = this.answers()[key];
    return v === 'SI' || v === 'NO' || v === 'NA' ? v : null;
  }

  setTri(key: 'lightsOk' | 'reflectiveOk', v: TriBool): void {
    this.answers.update((a) => ({ ...a, [key]: v }));
  }

  submit(): void {
    this.error.set('');
    const receiving = this.receiving();
    const apt = this.apt();
    if (receiving === null || apt === null) {
      this.error.set('Complete recepción y aptitud operacional.');
      return;
    }
    const ans = this.answers();
    const requiredBool: BoolKey[] = [
      'structureOk', 'platformOk', 'handlebarOk', 'steeringOk', 'brakesOk',
      'wheelsOk', 'wheelsSecured', 'batteryOk', 'cablesOk', 'chargeIndicatorOk',
      'vestWorn', 'vestClean', 'otherPpe', 'testRideOk', 'noAbnormalNoise',
    ];
    for (const k of requiredBool) {
      if (typeof ans[k] !== 'boolean') {
        this.error.set('Responda todas las preguntas Sí/No.');
        return;
      }
    }
    if (!ans.lightsOk || !ans.reflectiveOk) {
      this.error.set('Responda las preguntas de visibilidad.');
      return;
    }
    if (this.needsNovelty()) {
      if (!this.noveltyType) {
        this.error.set('Seleccione la novedad identificada.');
        return;
      }
      if (this.noveltyReported() === null || this.noveltyWithdrawn() === null) {
        this.error.set('Complete el registro de novedad.');
        return;
      }
    }

    const asBool = (v: unknown) => v === true || v === 'true';
    this.saving.set(true);
    this.api
      .create({
        postId: this.postId || undefined,
        receivingScooter: asBool(receiving),
        answers: ans as ScooterAnswers,
        aptForOperation: asBool(apt),
        noveltyType: this.needsNovelty() ? this.noveltyType : null,
        noveltyReportedToSupervisor: this.needsNovelty()
          ? asBool(this.noveltyReported())
          : null,
        noveltyWithdrawnFromService: this.needsNovelty()
          ? asBool(this.noveltyWithdrawn())
          : null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.done.set(true);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err?.error?.message || 'No se pudo guardar. Intente de nuevo.');
        },
      });
  }
}
