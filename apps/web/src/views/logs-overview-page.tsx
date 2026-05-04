import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { loggingApi } from '../shared/services/logging-api';
import type { LogListItem, PaginatedLogs } from '../shared/types/logging';
import { LogsTable } from './logging-shared';

export function LogsOverviewPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [showArchive, setShowArchive] = useState(false);
  const [archiveBefore, setArchiveBefore] = useState('');
  const [archiveTypes, setArchiveTypes] = useState<string[]>(['CAMERA', 'RUNTIME']);
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);

  const fetch = useCallback(
    async (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => {
      if (!token) {
        return { items: [], page: 1, pageSize: 50, total: 0 };
      }
      const res = await loggingApi.list(
        {
          page: args.page,
          pageSize: args.pageSize,
          keyword: args.keyword,
          from: toIso(args.from),
          to: toIso(args.to),
        },
        token,
      );
      return res;
    },
    [token],
  );

  const onArchive = useCallback(async () => {
    if (!token) return;
    setArchiveMessage(null);
    const beforeIso = toIso(archiveBefore);
    if (!beforeIso) {
      setArchiveMessage('Before date is required');
      return;
    }
    if (archiveTypes.length === 0) {
      setArchiveMessage('Select at least one log type');
      return;
    }
    const res = await loggingApi.archive({ before: beforeIso, logTypes: archiveTypes }, token);
    setArchiveMessage(`Archived ${res.archivedCount} logs at ${new Date(res.archivedAt).toLocaleString()}`);
  }, [archiveBefore, archiveTypes, token]);

  const quickChips = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return {
      todayFrom: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      oneHourFrom: oneHourAgo.toISOString(),
    };
  }, []);

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <h2>Logs Overview</h2>
          {isAdmin ? (
            <button className="button button-secondary" type="button" onClick={() => setShowArchive(true)}>
              Archive
            </button>
          ) : null}
        </div>
        <div className="pill-row" style={{ marginTop: 12 }}>
          <span className="read-only-tag">Quick filters</span>
          <a className="inline-link" href={`/logs?from=${encodeURIComponent(quickChips.todayFrom)}`}>
            Today
          </a>
          <a className="inline-link" href={`/logs?from=${encodeURIComponent(quickChips.oneHourFrom)}`}>
            Last 1 hour
          </a>
          <a className="inline-link" href="/logs/errors">
            Errors
          </a>
          <a className="inline-link" href="/logs/camera">
            Camera failed
          </a>
        </div>
      </section>

      <LogsTable
        title="All Logs"
        fetch={async (args) => {
          const res = (await fetch(args)) as PaginatedLogs & { items: LogListItem[] };
          return res;
        }}
      />

      {showArchive ? (
        <div className="dialog-backdrop" role="presentation">
          <div aria-modal="true" className="dialog-card" role="dialog">
            <h2>Archive Logs</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Before</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={archiveBefore}
                  onChange={(e) => setArchiveBefore(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Log Types</span>
                <select
                  className="select"
                  multiple
                  value={archiveTypes}
                  onChange={(e) =>
                    setArchiveTypes(Array.from(e.target.selectedOptions).map((o) => o.value))
                  }
                  style={{ minHeight: 120 }}
                >
                  <option value="AUDIT">AUDIT</option>
                  <option value="RUNTIME">RUNTIME</option>
                  <option value="CAMERA">CAMERA</option>
                </select>
              </label>
            </div>
            {archiveMessage ? <p className="alert">{archiveMessage}</p> : null}
            <div className="dialog-actions">
              <button className="button button-secondary" type="button" onClick={() => setShowArchive(false)}>
                Cancel
              </button>
              <button className="button" type="button" onClick={onArchive}>
                Archive
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toIso(local: string | undefined) {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

