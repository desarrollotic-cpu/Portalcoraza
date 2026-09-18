import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { DataSource } from 'typeorm';
import { RetiredPersonnel } from '../src/modules/documental/entities/retired-personnel.entity';
import { RetiredPersonnelService } from '../src/modules/documental/services/retired-personnel.service';
import { SequenceService } from '../src/modules/documental/services/sequence.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { DocCounter } from '../src/modules/documental/entities/doc-counter.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';

async function test() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('No DATABASE_URL');

  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [RetiredPersonnel, DocCounter, AuditLog],
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await ds.initialize();
  console.log('DataSource initialized');

  const repo = ds.getRepository(RetiredPersonnel);
  const counterRepo = ds.getRepository(DocCounter);
  const auditRepo = ds.getRepository(AuditLog);
  const seqService = new SequenceService(ds);
  const auditService = new AuditService(auditRepo);

  const service = new RetiredPersonnelService(repo, seqService, auditService, ds.manager);

  try {
    console.log('Testing lookup 71625464...');
    const res = await service.lookupAssociate('71625464');
    console.log('Result 71625464:', res);

    console.log('\nTesting lookup 1102843240...');
    const res2 = await service.lookupAssociate('1102843240');
    console.log('Result 1102843240:', res2);
  } catch (err) {
    console.error('ERROR during test:', err);
  } finally {
    await ds.destroy();
  }
}

test();
