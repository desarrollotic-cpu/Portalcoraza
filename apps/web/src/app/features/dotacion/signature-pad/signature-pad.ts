import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const EXPORT_MAX_WIDTH = 640;
const JPEG_QUALITY = 0.55;
const DISPLAY_HEIGHT = 240;

class SimpleSignaturePad {
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private isEmpty = true;
  private scaleX = 1;
  private scaleY = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas no soportado');
    }
    this.ctx = ctx;
    this.resizeToDisplay();
    this.bindEvents();
  }

  private readonly ctx: CanvasRenderingContext2D;

  /** Ajusta el buffer interno al tamaño CSS (HiDPI / tablet). */
  resizeToDisplay(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(280, Math.round(rect.width || this.canvas.clientWidth || 500));
    const cssHeight = Math.max(180, Math.round(rect.height || DISPLAY_HEIGHT));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;

    this.scaleX = this.canvas.width / cssWidth;
    this.scaleY = this.canvas.height / cssHeight;

    this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2.75;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.clear();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseout', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouch, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouch, { passive: false });
    this.canvas.addEventListener('touchend', this.onMouseUp);
  }

  private pointerPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private readonly onMouseDown = (e: MouseEvent): void => {
    this.isDrawing = true;
    const p = this.pointerPos(e.clientX, e.clientY);
    this.lastX = p.x;
    this.lastY = p.y;
    this.isEmpty = false;
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    const p = this.pointerPos(e.clientX, e.clientY);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.lastX = p.x;
    this.lastY = p.y;
  };

  private readonly onMouseUp = (): void => {
    this.isDrawing = false;
  };

  private readonly onTouch = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const p = this.pointerPos(touch.clientX, touch.clientY);
    if (e.type === 'touchstart') {
      this.isDrawing = true;
      this.lastX = p.x;
      this.lastY = p.y;
      this.isEmpty = false;
    } else if (e.type === 'touchmove' && this.isDrawing) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
      this.lastX = p.x;
      this.lastY = p.y;
    }
  };

  clear(): void {
    // Clear in CSS pixel space (current transform already applied).
    const w = this.canvas.width / this.scaleX;
    const h = this.canvas.height / this.scaleY;
    this.ctx.save();
    this.ctx.setTransform(this.scaleX, 0, 0, this.scaleY, 0, 0);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.restore();
    this.isEmpty = true;
  }

  /** JPEG comprimido; reescala a EXPORT_MAX_WIDTH si el canvas es más ancho. */
  toDataURL(): string {
    const src = this.canvas;
    const maxW = EXPORT_MAX_WIDTH;
    if (src.width <= maxW) {
      return src.toDataURL('image/jpeg', JPEG_QUALITY);
    }

    const ratio = maxW / src.width;
    const out = document.createElement('canvas');
    out.width = maxW;
    out.height = Math.max(1, Math.round(src.height * ratio));
    const ctx = out.getContext('2d');
    if (!ctx) {
      return src.toDataURL('image/jpeg', JPEG_QUALITY);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0, out.width, out.height);
    return out.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  get empty(): boolean {
    return this.isEmpty;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('mouseout', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouch);
    this.canvas.removeEventListener('touchmove', this.onTouch);
    this.canvas.removeEventListener('touchend', this.onMouseUp);
  }
}

@Component({
  selector: 'app-signature-pad',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SignaturePad),
      multi: true,
    },
  ],
  template: `
    <div class="signature-pad">
      <p class="label">Firma del asociado que recibe</p>
      <canvas #canvas class="pad-canvas"></canvas>
      <button type="button" class="btn-secondary" (click)="clear()">Limpiar firma</button>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .signature-pad {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    .label {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-secondary, var(--coraza-text-muted));
    }
    .pad-canvas {
      display: block;
      width: 100%;
      height: ${DISPLAY_HEIGHT}px;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: #fff;
      touch-action: none;
      cursor: crosshair;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
    }
    .btn-secondary {
      align-self: flex-start;
      padding: 0.45rem 0.85rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: var(--coraza-surface);
      color: var(--text-primary, inherit);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
    }
    .hint { margin: 0; font-size: 0.85rem; color: var(--coraza-text-muted); }
  `,
})
export class SignaturePad implements AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly hint = signal<string | null>(null);
  private pad: SimpleSignaturePad | null = null;
  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.pad = new SimpleSignaturePad(this.canvasRef.nativeElement);
    const emit = (): void => {
      if (!this.pad) return;
      this.onChange(this.pad.empty ? null : this.pad.toDataURL());
      this.onTouched();
    };
    this.canvasRef.nativeElement.addEventListener('mouseup', emit);
    this.canvasRef.nativeElement.addEventListener('touchend', emit);
    // Second pass after layout settles (modals / tablet).
    queueMicrotask(() => this.pad?.resizeToDisplay());
  }

  ngOnDestroy(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.pad?.destroy();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      const wasEmpty = this.pad?.empty ?? true;
      this.pad?.resizeToDisplay();
      if (!wasEmpty) {
        this.onChange(null);
        this.hint.set('La firma se limpió al cambiar el tamaño. Vuelve a firmar.');
      }
    }, 180);
  }

  clear(): void {
    this.pad?.clear();
    this.onChange(null);
    this.hint.set(null);
  }

  isEmpty(): boolean {
    return this.pad?.empty ?? true;
  }

  exportDataUrl(): string | null {
    if (!this.pad || this.pad.empty) return null;
    return this.pad.toDataURL();
  }

  writeValue(): void {
    // Firma siempre se captura en blanco; no se precarga desde valor externo.
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
