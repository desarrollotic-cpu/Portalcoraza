import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../../associates/entities/associate.entity';
import { CAMPAIGN_IMAGE, campaignLetterHtml } from './loan-mail-layout';
import { DocumentalMailService } from './documental-mail.service';

export type CampaignStatus = {
  running: boolean;
  subject: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  lastError: string | null;
};

const EMPTY: CampaignStatus = {
  running: false,
  subject: '',
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  lastError: null,
};

@Injectable()
export class DocumentalCampaignService {
  private readonly logger = new Logger(DocumentalCampaignService.name);
  private state: CampaignStatus = { ...EMPTY };

  constructor(
    @InjectRepository(Associate)
    private readonly associates: Repository<Associate>,
    private readonly mail: DocumentalMailService,
  ) {}

  status(): CampaignStatus {
    return { ...this.state };
  }

  async audience(): Promise<{ active: number; withEmail: number; withoutEmail: number }> {
    const rows = await this.activeRows();
    const withEmail = rows.filter((r) => this.validEmail(r.email)).length;
    return { active: rows.length, withEmail, withoutEmail: rows.length - withEmail };
  }

  async sendPreview(to: string, subject: string, body: string, includeImage = true, banner?: string) {
    const html = this.letter('Equipo de archivo', subject, body, includeImage, banner);
    return this.mail.sendHtml(to, subject, html, { bccArchive: false, noReply: true });
  }

  async start(subject: string, body: string, includeImage = true, banner?: string): Promise<CampaignStatus> {
    if (this.state.running) {
      throw new ConflictException('Ya hay una campaña enviándose');
    }
    const title = subject.trim();
    const text = body.trim();
    if (title.length < 3 || text.length < 10) {
      throw new BadRequestException('Escriba un asunto y un mensaje');
    }
    const people = (await this.activeRows()).filter((r) => this.validEmail(r.email));
    this.state = {
      running: true,
      subject: title,
      total: people.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      lastError: null,
    };
    void this.run(people, title, text, includeImage, banner);
    return this.status();
  }

  private async run(
    people: Array<Pick<Associate, 'firstName' | 'firstLastName' | 'email'>>,
    subject: string,
    body: string,
    includeImage: boolean,
    banner?: string,
  ) {
    for (const person of people) {
      const name = [person.firstName, person.firstLastName].filter(Boolean).join(' ').trim();
      const html = this.letter(name || 'asociado', subject, body, includeImage, banner);
      try {
        const result = await this.mail.sendHtml(String(person.email), subject, html, { bccArchive: false, noReply: true });
        if (result.ok) this.state.sent += 1;
        else {
          this.state.failed += 1;
          this.state.lastError = result.error;
        }
      } catch (err) {
        this.state.failed += 1;
        this.state.lastError = err instanceof Error ? err.message : String(err);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    this.state.running = false;
    this.logger.log(`Campaña "${subject}": ${this.state.sent} enviados, ${this.state.failed} fallidos`);
  }

  private letter(name: string, subject: string, body: string, includeImage: boolean, banner?: string) {
    return campaignLetterHtml({
      name,
      title: subject,
      banner,
      body,
      imageUrl: includeImage ? CAMPAIGN_IMAGE : undefined,
    });
  }

  private activeRows() {
    return this.associates.find({
      where: { status: AssociateStatus.ACTIVO },
      select: { id: true, firstName: true, firstLastName: true, email: true },
    });
  }

  private validEmail(email: string | null | undefined): boolean {
    const value = (email || '').trim().toLowerCase();
    return value.includes('@') && !value.includes(' ');
  }
}
