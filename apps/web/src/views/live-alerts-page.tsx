import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { RuntimeAlert } from '../shared/types/live-monitoring';
import { statusClassName } from './runtime-shared';

export function LiveAlertsPage() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState<RuntimeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED'>('ACTIVE');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('status', statusFilter);
    params.set('page', '1');
    params.set('pageSize', '50');
    return params;
  }, [statusFilter]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        const data = await liveMonitoringApi.getAlerts(token, query);
        if (!cancelled) setAlerts(data.alerts);
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load alerts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const handle = window.setInterval(load, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token, query]);

  async function acknowledge(id: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await liveMonitoringApi.acknowledgeAlert(id, token);
      const data = await liveMonitoringApi.getAlerts(token, query);
      setAlerts(data.alerts);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to acknowledge alert');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <section className="card">Loading alerts...</section>;

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Alerts</h2>
          <p className="subtle-text">Runtime warnings and errors (acknowledge supported).</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(statusFilter)}>{statusFilter}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <div className="filter-bar">
          <label className="field field-inline">
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </label>
        </div>

        {alerts.length === 0 ? (
          <p className="subtle-text">No alerts.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Source</th>
                <th>Message</th>
                <th>Status</th>
                <th>Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className={statusClassName(a.severity)}>{a.severity}</span>
                  </td>
                  <td>{a.source}</td>
                  <td>{a.message}</td>
                  <td>{a.status}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    {a.status === 'ACTIVE' ? (
                      <button
                        className="button button-secondary button-compact"
                        disabled={busy}
                        onClick={() => void acknowledge(a.id)}
                        type="button"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="subtle-text">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </section>
  );
}

