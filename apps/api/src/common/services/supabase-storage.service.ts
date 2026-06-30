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
