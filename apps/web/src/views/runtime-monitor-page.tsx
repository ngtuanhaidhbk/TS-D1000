import { useEffect, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { runtimeApi } from '../shared/services/runtime-api';
import type { RuntimeSnapshot } from '../shared/types/runtime';
import { statusClassName } from './runtime-shared';

export function RuntimeMonitorPage() {
  const { token } = useAuth();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const snap = await runtimeApi.getSnapshot(token);
        if (!cancelled) setSnapshot(snap);
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load snapshot');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const handle = window.setInterval(load, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token]);

  if (loading) {
    return <section className="card">Loading runtime monitor...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Runtime Monitor</h2>
          <p className="subtle-text">Realtime snapshot for monitoring and debugging.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(snapshot?.operationMode ?? 'UNKNOWN')}>{snapshot?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(snapshot?.sseStatus ?? 'UNKNOWN')}>{snapshot?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <h3>Snapshot</h3>
        <pre className="code-block">{snapshot ? JSON.stringify(snapshot, null, 2) : 'No data'}</pre>
      </article>
    </section>
  );
}

