import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { ConfigOverview, ReadinessResult } from '../shared/types/system-config';
import { formatDateTime, statusClassName } from './system-config-shared';

export function ConfigOverviewPage() {
  const { token, user } = useAuth();
  const [overview, setOverview] = useState<ConfigOverview | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    void systemConfigApi
      .getOverview(token)
      .then((response) => {
        if (mounted) {
          setOverview(response);
        }
      })
      .catch((apiError: unknown) => {
        if (mounted) {
          setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load overview');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  async function handleReadinessCheck() {
    if (!token) {
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const result = await systemConfigApi.checkReadiness(token);
      setReadiness(result);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to run readiness check');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return <section className="card">Loading configuration overview...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">System Configuration</p>
          <h2>Overview</h2>
          <p className="subtle-text">
            Review the active room setup before editing TS-D1000, cameras, layout, mappings, and operation mode.
          </p>
        </div>
        {user?.role === 'ADMIN' ? (
          <button className="button button-secondary" disabled={checking} onClick={handleReadinessCheck} type="button">
            {checking ? 'Running check...' : 'Run Readiness Check'}
          </button>
        ) : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {overview ? (
        <>
          <div className="stats-grid">
            <article className="card stat-card">
              <p className="eyebrow">Room</p>
              <h3>{overview.room.name}</h3>
              <span className={statusClassName(overview.room.operationMode)}>{overview.room.operationMode}</span>
            </article>
            <article className="card stat-card">
              <p className="eyebrow">TS-D1000</p>
              <h3>{overview.tsdConnection.configured ? 'Configured' : 'Not configured'}</h3>
              <p className="subtle-text">Last test: {formatDateTime(overview.tsdConnection.lastTestAt)}</p>
            </article>
            <article className="card stat-card">
              <p className="eyebrow">Cameras</p>
              <h3>
                {overview.cameraSummary.active} / {overview.cameraSummary.total} active
              </h3>
              <p className="subtle-text">Maximum 4 active cameras in MVP.</p>
            </article>
            <article className="card stat-card">
              <p className="eyebrow">Mappings</p>
              <h3>
                {overview.mappingSummary.active} / {overview.mappingSummary.total} active
              </h3>
              <p className="subtle-text">Runtime uses the latest active mappings.</p>
            </article>
          </div>

          <div className="info-grid">
            <article className="card info-card">
              <div className="card-heading">
                <h3>TS-D1000</h3>
                <Link className="inline-link" to="/config/tsd">
                  Open
                </Link>
              </div>
              <p className="subtle-text">
                Configured: <strong>{overview.tsdConnection.configured ? 'Yes' : 'No'}</strong>
              </p>
              <p className="subtle-text">
                Last test result: <strong>{overview.tsdConnection.lastTestResult ?? 'Not tested'}</strong>
              </p>
            </article>

            <article className="card info-card">
              <div className="card-heading">
                <h3>Layout &amp; Map</h3>
                <Link className="inline-link" to="/config/layout">
                  Open
                </Link>
              </div>
              <p className="subtle-text">
                Layout configured: <strong>{overview.layout.configured ? 'Yes' : 'No'}</strong>
              </p>
              <p className="subtle-text">File type: <strong>{overview.layout.fileType ?? 'Not uploaded'}</strong></p>
            </article>

            <article className="card info-card">
              <div className="card-heading">
                <h3>Mappings</h3>
                <Link className="inline-link" to="/config/mappings">
                  Open
                </Link>
              </div>
              <p className="subtle-text">
                Active mappings: <strong>{overview.mappingSummary.active}</strong>
              </p>
            </article>

            <article className="card info-card">
              <div className="card-heading">
                <h3>Operation Mode</h3>
                <Link className="inline-link" to="/config/mode">
                  Open
                </Link>
              </div>
              <span className={statusClassName(overview.room.operationMode)}>{overview.room.operationMode}</span>
            </article>
          </div>

          {readiness ? (
            <article className="card">
              <div className="card-heading">
                <h3>Readiness Result</h3>
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
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

