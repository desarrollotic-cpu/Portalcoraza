import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  module: string | null;
  readAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private connectedUserId: string | null = null;

  readonly notifications = signal<AppNotification[]>([]);
  readonly panelOpen = signal(false);
  readonly loading = signal(false);

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.readAt).length,
  );

  connect(): void {
    const user = this.auth.currentUser();
    if (!user || !this.auth.hasPermission('notifications.view')) {
      return;
    }
    if (this.connectedUserId === user.id) {
      return;
    }

    this.disconnect();
    this.connectedUserId = user.id;
    this.loadFromApi();
    this.subscribeRealtime(user.id);
  }

  disconnect(): void {
    this.teardownRealtime();
    this.connectedUserId = null;
    this.notifications.set([]);
    this.panelOpen.set(false);
  }

  togglePanel(): void {
    this.panelOpen.update((open) => !open);
  }

  closePanel(): void {
    this.panelOpen.set(false);
  }

  markAsRead(id: string): void {
    if (!this.auth.hasPermission('notifications.read')) {
      return;
    }

    this.http
      .patch<AppNotification>(`${environment.apiUrl}/notifications/${id}/read`, {})
      .subscribe({
        next: (updated) => {
          this.notifications.update((list) =>
            list.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      });
  }

  markAllRead(): void {
    const unread = this.notifications().filter((n) => !n.readAt);
    for (const n of unread) {
      this.markAsRead(n.id);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private loadFromApi(): void {
    this.loading.set(true);
    this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications`).subscribe({
      next: (items) => {
        this.notifications.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private subscribeRealtime(userId: string): void {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.publishableKey,
    );

    this.channel = this.supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const incoming: AppNotification = {
            id: String(row['id']),
            userId: String(row['user_id']),
            title: String(row['title']),
            body: row['body'] != null ? String(row['body']) : null,
            module: row['module'] != null ? String(row['module']) : null,
            readAt: row['read_at'] != null ? String(row['read_at']) : null,
            createdAt: String(row['created_at']),
          };
          this.notifications.update((list) => {
            if (list.some((n) => n.id === incoming.id)) {
              return list;
            }
            return [incoming, ...list];
          });
        },
      )
      .subscribe();
  }

  private teardownRealtime(): void {
    if (this.channel && this.supabase) {
      this.supabase.removeChannel(this.channel);
    }
    this.channel = null;
    this.supabase = null;
  }
}
