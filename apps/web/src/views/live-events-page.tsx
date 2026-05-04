import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { RuntimeEventResponse } from '../shared/types/live-monitoring';
import { statusClassName } from './runtime-shared';

const EVENT_TYPES = [
  'TRIGGER_PRESET',
  'MANUAL_PRESET',
  'MOVE',
  'STOP',
  'TEST',
  'DETECT_CAPABILITIES',
] as const;

export function LiveEventsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<RuntimeEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eventType, setEventType] = useState('');
  const [unitId, setUnitId] = useState('');
  const [result, setResult] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '50');
    if (eventType) params.set('eventType', eventType);
    if (unitId.trim()) params.set('unitId', unitId.trim());
    if (result) params.set('result', result);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to).toISOString());
    return params;
  }, [eventType, unitId, result, from, to]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const data = await liveMonitoringApi.getEventFeed(token, query);
        if (!cancelled) setItems(data.items);
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load event feed');
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

  function onFilterSubmit(event: FormEvent) {
    event.preventDefault();
  }

  if (loading) return <section className="card">Loading event feed...</section>;

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Event Feed</h2>
          <p className="subtle-text">Recent runtime camera events (trigger/move/test).</p>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <form className="filter-bar" onSubmit={onFilterSubmit}>
          <label className="field field-inline">
            <span>Event Type</span>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="">All</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-inline">
            <span>Unit</span>
            <input value={unitId} onChange={(e) => setUnitId(e.target.value)} placeholder="unit id" />
          </label>
          <label className="field field-inline">
            <span>Result</span>
            <select value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">All</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>
          </label>
          <label className="field field-inline">
            <span>From</span>
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field field-inline">
            <span>To</span>
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </form>

        {items.length === 0 ? (
          <p className="subtle-text">No events.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event Type</th>
                <th>Unit</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {items.map((ev) => (
                <tr key={ev.eventId}>
                  <td>{new Date(ev.receivedAt).toLocaleString()}</td>
                  <td>{ev.eventType}</td>
                  <td>{ev.unitName ?? ev.unitId ?? ''}</td>
                  <td>
                    <span className={statusClassName(ev.result)}>{ev.result}</span>
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

