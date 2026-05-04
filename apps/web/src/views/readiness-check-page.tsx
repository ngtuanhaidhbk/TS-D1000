import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { ReadinessResult } from '../shared/types/system-config';
import { statusClassName } from './system-config-shared';

const quickLinks: Record<ReadinessResult['items'][number]['category'], string> = {
  TSD: '/config/tsd',
  CAMERA: '/config/cameras',
  LAYOUT: '/config/layout',
  MAPPING: '/config/mappings',
  MODE: '/config/mode',
};

export function ReadinessCheckPage() {
  const { token, user } = useAuth();
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunCheck() {
    if (!token) {
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const response = await systemConfigApi.checkReadiness(token);
      setReadiness(response);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to run readiness check');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Readiness Check</h2>
          <p className="subtle-text">Review the current room configuration and fix missing dependencies before going live.</p>
        </div>
        {user?.role === 'ADMIN' ? (
          <button className="button button-secondary" disabled={running} onClick={handleRunCheck} type="button">
            {running ? 'Running...' : 'Run Check'}
          </button>
        ) : (
          <span className="read-only-tag">Admin only action</span>
        )}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {user?.role !== 'ADMIN' ? (
        <article className="card">
          <p className="subtle-text">Operator can review the configuration pages but cannot execute readiness checks.</p>
        </article>
      ) : null}

      {readiness ? (
        <article className="card">
          <div className="card-heading">
            <h3>Overall Status</h3>
            <span className={statusClassName(readiness.overallStatus)}>{readiness.overallStatus}</span>
          </div>
          <ul className="stack-list">
            {readiness.items.map((item) => (
              <li key={item.category} className="list-card">
                <div className="card-heading">
                  <strong>{item.category}</strong>
                  <span className={statusClassName(item.status)}>{item.status}</span>
                </div>
                <p className="subtle-text">{item.message}</p>
                <Link className="inline-link" to={quickLinks[item.category]}>
                  Open related configuration
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
