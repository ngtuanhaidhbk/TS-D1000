import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

import { nowIso } from './system-config-utils';

export type AuditLogEntry = {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  result: 'SUCCESS' | 'FAILED';
  detailJson: unknown | null;
  createdAt: string; // ISO
  archivedAt: string | null; // ISO
};

@Injectable()
export class SystemConfigAuditService {
  private readonly logger = new Logger(SystemConfigAuditService.name);
  private readonly entries = new Map<string, AuditLogEntry>();

  record(action: string, actorUserId: string, targetType: string, targetId: string, detailJson?: unknown) {
    const entry: AuditLogEntry = {
      id: randomUUID(),
      actorUserId,
      action,
      targetType,
      targetId,
      result: 'SUCCESS',
      detailJson: detailJson ?? null,
      createdAt: nowIso(),
      archivedAt: null,
    };
    this.entries.set(entry.id, entry);

    // Console logging stays as fallback and for local visibility.
    this.logger.log(JSON.stringify(entry));
    return entry;
  }

  recordFailure(action: string, actorUserId: string, targetType: string, targetId: string, detailJson?: unknown) {
    const entry: AuditLogEntry = {
      id: randomUUID(),
      actorUserId,
      action,
      targetType,
      targetId,
      result: 'FAILED',
      detailJson: detailJson ?? null,
      createdAt: nowIso(),
      archivedAt: null,
    };
    this.entries.set(entry.id, entry);

    this.logger.warn(JSON.stringify(entry));
    return entry;
  }

  list(): AuditLogEntry[] {
    return [...this.entries.values()];
  }

  findById(id: string): AuditLogEntry | null {
    return this.entries.get(id) ?? null;
  }

  archive(beforeIso: string, actions?: string[]) {
    const before = beforeIso;
    const archivedAt = nowIso();
    let archivedCount = 0;
    for (const entry of this.entries.values()) {
      if (entry.archivedAt) continue;
      if (entry.createdAt >= before) continue;
      if (actions && actions.length > 0 && !actions.includes(entry.action)) continue;
      entry.archivedAt = archivedAt;
      archivedCount += 1;
    }
    return { archivedCount, archivedAt };
  }
}
