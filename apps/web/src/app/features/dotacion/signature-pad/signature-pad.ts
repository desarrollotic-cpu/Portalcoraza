import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  forwardRef,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

class SimpleSignaturePad {
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private isEmpty = true;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas no soportado');
    }
    this.ctx = ctx;
    this.setupCanvas();
    this.bindEvents();
  }

  private readonly ctx: CanvasRenderingContext2D;

  private setupCanvas(): void {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
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

  private readonly onMouseDown = (e: MouseEvent): void => {
    this.isDrawing = true;
    const rect = this.canvas.getBoundingClientRect();
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
    this.isEmpty = false;
  };

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.isDrawing) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  };

  private readonly onMouseUp = (): void => {
    this.isDrawing = false;
  };

  private readonly onTouch = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (e.type === 'touchstart') {
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
      this.isEmpty = false;
    } else if (e.type === 'touchmove' && this.isDrawing) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.lastX = x;
      this.lastY = y;
    }
  };

  clear(): void {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.isEmpty = true;
  }

  toDataURL(): string {
    return this.canvas.toDataURL('image/png');
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
      <canvas #canvas width="500" height="180"></canvas>
      <button type="button" class="btn-secondary" (click)="clear()">Limpiar firma</button>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `
    .signature-pad { display: flex; flex-direction: column; gap: 0.5rem; }
    canvas {
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: #fff;
      touch-action: none;
      cursor: crosshair;
      width: 100%;
      max-width: 500px;
    }
    .btn-secondary {
      align-self: flex-start;
      padding: 0.4rem 0.75rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: var(--coraza-surface);
      cursor: pointer;
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

  ngAfterViewInit(): void {
    this.pad = new SimpleSignaturePad(this.canvasRef.nativeElement);
    const emit = (): void => {
      if (!this.pad) return;
      this.onChange(this.pad.empty ? null : this.pad.toDataURL());
      this.onTouched();
    };
    this.canvasRef.nativeElement.addEventListener('mouseup', emit);
    this.canvasRef.nativeElement.addEventListener('touchend', emit);
  }

  ngOnDestroy(): void {
    this.pad?.destroy();
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
