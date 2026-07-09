import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  body?: string;
  ttlMs: number;
}

/**
 * Servicio global de notificaciones (toasts). Reemplaza `alert()` y ofrece
 * una experiencia consistente en toda la aplicación.
 *
 * Uso desde cualquier componente:
 *   this.toast.success('Guardado', 'Los cambios se aplicaron');
 *   this.toast.error('Error al subir el archivo');
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly messages = signal<ToastMessage[]>([]);

  success(title: string, body?: string, ttlMs = 4000): void {
    this.push({ kind: 'success', title, body, ttlMs });
  }

  error(title: string, body?: string, ttlMs = 6000): void {
    this.push({ kind: 'error', title, body, ttlMs });
  }

  warning(title: string, body?: string, ttlMs = 5000): void {
    this.push({ kind: 'warning', title, body, ttlMs });
  }

  info(title: string, body?: string, ttlMs = 4000): void {
    this.push({ kind: 'info', title, body, ttlMs });
  }

  dismiss(id: number): void {
    this.messages.update((list) => list.filter((m) => m.id !== id));
  }

  private push(partial: Omit<ToastMessage, 'id'>): void {
    const id = this.nextId++;
    const message: ToastMessage = { id, ...partial };
    this.messages.update((list) => [...list, message]);
    setTimeout(() => this.dismiss(id), partial.ttlMs);
  }
}
