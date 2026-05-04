import { useEffect, useMemo, useState } from 'react';

import type { LogDetail, LogListItem, LogLevel, LogResult, LogType } from '../shared/types/logging';
import { loggingApi } from '../shared/services/logging-api';
import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';

export function LogTypeBadge({ value }: { value: LogType }) {
  const cls = useMemo(() => {
    switch (value) {
      case 'AUDIT':
        return 'status-pill status-automatic';
      case 'RUNTIME':
        return 'status-pill status-automatic';
      case 'CAMERA':
        return 'status-pill status-success';
      case 'SYSTEM_ERROR':
        return 'status-pill status-failed';
      case 'MANUAL_OPERATION':
        return 'status-pill status-warning';
      default:
        return 'status-pill read-only-tag';
    }
  }, [value]);

  return <span className={cls}>{value}</span>;
}

export function LogLevelBadge({ value }: { value: LogLevel }) {
  const cls = useMemo(() => {
    switch (value) {
      case 'INFO':
        return 'status-pill status-automatic';
      case 'WARNING':
        return 'status-pill status-warning';
      case 'ERROR':
      case 'CRITICAL':
        return 'status-pill status-failed';
      default:
        return 'status-pill read-only-tag';
    }
  }, [value]);
  return <span className={cls}>{value}</span>;
}

export function LogResultBadge({ value }: { value: LogResult | null }) {
  if (!value) return <span className="read-only-tag">N/A</span>;
  const cls =
    value === 'SUCCESS'
      ? 'status-pill status-success'
      : value === 'SKIPPED'
        ? 'status-pill status-warning'
        : 'status-pill status-failed';
  return <span className={cls}>{value}</span>;
}

export function JsonViewer({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre
      style={{
        margin: 0,
        padding: 12,
        borderRadius: 12,
        background: 'rgba(0,0,0,0.04)',
        overflow: 'auto',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {text}
    </pre>
  );
}

export function LogDetailDrawer({
  logId,
  onClose,
}: {
  logId: string | null;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<LogDetail | null>(null);

  useEffect(() => {
    if (!logId || !token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);

    void loggingApi
      .detail(logId, token)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiClientError) setError(e.message);
        else setError('Unable to load log detail');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [logId, token]);

  if (!logId) return null;

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        aria-modal="true"
        className="dialog-card"
        role="dialog"
        style={{ width: 'min(920px, 96vw)', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Log Detail</h2>
          <button className="button button-secondary" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {loading ? <p>Loading...</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

        {detail ? (
          <>
            <dl className="detail-grid" style={{ marginTop: 16 }}>
              <div>
                <dt>Time</dt>
                <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>
                  <LogTypeBadge value={detail.logType} />
                </dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>
                  <LogLevelBadge value={detail.level} />
                </dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>
                  <LogResultBadge value={detail.result} />
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{detail.source}</dd>
              </div>
              <div>
                <dt>Action/Event</dt>
                <dd>{detail.action ?? detail.eventType ?? 'N/A'}</dd>
              </div>
              <div>
                <dt>Actor</dt>
                <dd>{detail.actorUserId ?? 'N/A'}</dd>
              </div>
              <div>
                <dt>Target</dt>
                <dd>{detail.targetType && detail.targetId ? `${detail.targetType}:${detail.targetId}` : 'N/A'}</dd>
              </div>
            </dl>

            <h3 style={{ marginTop: 16 }}>Message</h3>
            <p>{detail.message}</p>

            <h3 style={{ marginTop: 16 }}>Detail JSON</h3>
            <JsonViewer value={detail.detailJson} />

            {detail.errorStack ? (
              <>
                <h3 style={{ marginTop: 16 }}>Error Stack</h3>
                <JsonViewer value={detail.errorStack} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

export type LogsTableProps = {
  title: string;
  fetch: (args: { page: number; pageSize: number; keyword?: string; from?: string; to?: string }) => Promise<{
    items: LogListItem[];
    page: number;
    pageSize: number;
    total: number;
  }>;
  extraFilters?: React.ReactNode;
};

export function LogsTable({ title, fetch, extraFilters }: LogsTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch({ page, pageSize, keyword: keyword.trim() || undefined, from: from || undefined, to: to || undefined })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiClientError) setError(e.message);
        else setError('Unable to load logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetch, from, keyword, page, pageSize, to]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>{title}</h2>
      </div>

      <div className="filter-bar" style={{ marginTop: 16 }}>
        <label className="field">
          <span className="field-label">Keyword</span>
          <input className="input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search..." />
        </label>
        <label className="field">
          <span className="field-label">From</span>
          <input className="input" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">To</span>
          <input className="input" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Page size</span>
          <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        {extraFilters}
      </div>

      {error ? <p className="alert alert-error">{error}</p> : null}
      {loading ? <p>Loading...</p> : null}

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: 170 }}>Time</th>
              <th>Type</th>
              <th>Level</th>
              <th>Source</th>
              <th style={{ minWidth: 160 }}>Action/Event</th>
              <th>Result</th>
              <th style={{ minWidth: 320 }}>Message</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={8}>No logs found for the selected filters.</td>
              </tr>
            ) : null}
            {items.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
                <td>
                  <LogTypeBadge value={row.logType} />
                </td>
                <td>
                  <LogLevelBadge value={row.level} />
                </td>
                <td>{row.source}</td>
                <td>{row.action ?? row.eventType ?? 'N/A'}</td>
                <td>
                  <LogResultBadge value={row.result} />
                </td>
                <td title={row.message}>{row.message}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="button button-secondary" type="button" onClick={() => setSelectedLogId(row.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <span className="read-only-tag">
          Total: {total} | Page {page}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={page * pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <LogDetailDrawer logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
    </section>
  );
}

