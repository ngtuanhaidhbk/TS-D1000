import { useEffect, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { RuntimeStatusResponse } from '../shared/types/live-monitoring';
import { ApiClientError } from '../shared/services/api-client';

export function LiveRuntimeStatusPage() {
  const { token } = useAuth();
  const [data, setData] = useState<RuntimeStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void liveMonitoringApi
      .getRuntimeStatus(token)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiClientError) setError(e.message);
        else setError('Unable to load runtime status');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="card">
      <div className="card-header">
        <h2>Runtime Status</h2>
      </div>
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
      {data ? (
        <dl className="detail-grid" style={{ marginTop: 16 }}>
          <div>
            <dt>SSE Status</dt>
            <dd>
              <span className={`status-pill ${statusClass(data.sseStatus)}`}>{data.sseStatus}</span>
            </dd>
          </div>
          <div>
            <dt>Last Event</dt>
            <dd>{data.lastEventAt ? new Date(data.lastEventAt).toLocaleString() : 'N/A'}</dd>
          </div>
          <div>
            <dt>Data Stale</dt>
            <dd>{data.isDataStale ? 'Yes' : 'No'}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function statusClass(status: string) {
  switch (status) {
    case 'CONNECTED':
      return 'status-success';
    case 'RECONNECTING':
      return 'status-warning';
    case 'DISCONNECTED':
    default:
      return 'status-failed';
  }
}

