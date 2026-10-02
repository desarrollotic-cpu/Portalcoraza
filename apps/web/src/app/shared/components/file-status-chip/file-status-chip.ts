import { Component, Input } from '@angular/core';
import {
  personnelFileHint,
  personnelFileLabel,
  type PersonnelFileStatus,
} from '../../personnel-file';

@Component({
  selector: 'app-file-status-chip',
  template: `
    <span class="file-chip" [attr.data-kind]="kind" [title]="personnelFileHint(kind)">{{
      personnelFileLabel(kind, archiveCode)
    }}</span>
  `,
  styles: [
    `
      .file-chip {
        display: inline-block;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .file-chip[data-kind='ACTIVO'] {
        background: #dcfce7;
        color: #166534;
      }
      .file-chip[data-kind='RETIRADO'] {
        background: #fef3c7;
        color: #92400e;
      }
      .file-chip[data-kind='ARCHIVADO'] {
        background: #e0f2fe;
        color: #075985;
      }
    `,
  ],
})
export class FileStatusChip {
  @Input({ required: true }) kind!: PersonnelFileStatus;
  @Input() archiveCode: number | null = null;
  readonly personnelFileLabel = personnelFileLabel;
  readonly personnelFileHint = personnelFileHint;
}
