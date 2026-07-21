import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseStorageService {
  private client: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {}

  async uploadPublicObject(
    bucket: string,
    filePath: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    const client = this.getClient();

    const { error } = await client.storage.from(bucket).upload(filePath, body, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  async deleteObject(bucket: string, filePath: string): Promise<void> {
    const client = this.getClient();
    const { error } = await client.storage.from(bucket).remove([filePath]);
    if (error) {
      throw new Error(error.message);
    }
  }

  async downloadObject(
    bucket: string,
    filePath: string,
  ): Promise<{ data: Buffer; contentType: string }> {
    const client = this.getClient();
    const { data, error } = await client.storage.from(bucket).download(filePath);
    if (error || !data) {
      throw new Error(error?.message ?? 'No se pudo descargar el objeto');
    }
    const arrayBuffer = await data.arrayBuffer();
    const contentType = data.type || this.guessContentType(filePath);
    return { data: Buffer.from(arrayBuffer), contentType };
  }

  /**
   * Deriva el `filePath` original a partir de la publicUrl. Formato de URL:
   *   https://xxx.supabase.co/storage/v1/object/public/<bucket>/<filePath>
   * También acepta path relativo (`deliveryId/ts.jpg`) guardado sin host.
   */
  extractFilePath(publicUrl: string, bucket: string): string | null {
    if (!publicUrl) return null;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx !== -1) {
      return publicUrl.substring(idx + marker.length);
    }
    // Path relativo o URL sin el marcador public (bucket ya privado).
    if (!publicUrl.includes('://') && !publicUrl.startsWith('/')) {
      return publicUrl;
    }
    const privateMarker = `/storage/v1/object/authenticated/${bucket}/`;
    const privIdx = publicUrl.indexOf(privateMarker);
    if (privIdx !== -1) {
      return publicUrl.substring(privIdx + privateMarker.length);
    }
    return null;
  }

  private guessContentType(filePath: string): string {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }

    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new Error('Configuracion Supabase incompleta');
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    return this.client;
  }
}
