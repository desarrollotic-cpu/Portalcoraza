import { Injectable, computed, effect, signal } from '@angular/core';

export type ColorScheme = 'light' | 'dark';

const STORAGE_KEY = 'coraza-color-scheme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ColorScheme>(this.readStored());
  readonly isDark = computed(() => this.mode() === 'dark');

  constructor() {
    effect(() => {
      this.applyToDom(this.mode());
    });
  }

  toggle(): void {
    this.set(this.isDark() ? 'light' : 'dark');
  }

  set(mode: ColorScheme): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore quota / private mode */
    }
  }

  private applyToDom(mode: ColorScheme): void {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    root.style.colorScheme = mode;
  }

  private readStored(): ColorScheme {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
