import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { runtimeApi } from '../shared/services/runtime-api';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { TsdUnit } from '../shared/types/system-config';
import type { RuntimeRequestItem, RuntimeSnapshot } from '../shared/types/runtime';
import { statusClassName } from './runtime-shared';

export function RuntimeManualControlPage() {
  const { token, user } = useAuth();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [requests, setRequests] = useState<RuntimeRequestItem[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, TsdUnit>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isManual = snapshot?.operationMode === 'MANUAL';
  const pending = useMemo(() => requests.filter((item) => item.status === 'PENDING'), [requests]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const snap = await runtimeApi.getSnapshot(token);
        const reqs = await runtimeApi.listRequests(token, new URLSearchParams({ status: 'PENDING', page: '1', pageSize: '50' }));
        let units: TsdUnit[] = [];
        try {
          const config = await systemConfigApi.getTsdConfig(token);
          const unitsResponse = await systemConfigApi.listUnits(config.id, token);
          units = unitsResponse.items;
        } catch (apiError) {
          // If TS-D not configured yet, still render runtime view without unit metadata.
          if (!(apiError instanceof ApiClientError) || apiError.code !== 'CONFIG_NOT_FOUND') {
            throw apiError;
          }
        }

        if (cancelled) return;
        setSnapshot(snap);
        setRequests(reqs.items);
        setUnitsById(Object.fromEntries(units.map((unit) => [unit.id, unit])));
      } catch (apiError) {
        if (cancelled) return;
        setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load runtime state');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const handle = window.setInterval(load, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token]);

  async function approve(id: string) {
    if (!token) return;
    setError(null);
    try {
      await runtimeApi.approveRequest(id, token);
      const [snap, reqs] = await Promise.all([
        runtimeApi.getSnapshot(token),
        runtimeApi.listRequests(token, new URLSearchParams({ status: 'PENDING', page: '1', pageSize: '50' })),
      ]);
      setSnapshot(snap);
      setRequests(reqs.items);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to approve request');
    }
  }

  async function reject(id: string) {
    if (!token) return;
    const confirmed = window.confirm('Reject this request?');
    if (!confirmed) return;
    setError(null);
    try {
      await runtimeApi.rejectRequest(id, token);
      const [snap, reqs] = await Promise.all([
        runtimeApi.getSnapshot(token),
        runtimeApi.listRequests(token, new URLSearchParams({ status: 'PENDING', page: '1', pageSize: '50' })),
      ]);
      setSnapshot(snap);
      setRequests(reqs.items);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to reject request');
    }
  }

  if (loading) {
    return <section className="card">Loading runtime state...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Manual Control</h2>
          <p className="subtle-text">Approve or reject speaking requests in MANUAL mode.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(snapshot?.operationMode ?? 'UNKNOWN')}>{snapshot?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(snapshot?.sseStatus ?? 'UNKNOWN')}>{snapshot?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="info-grid">
        <article className="card">
          <h3>Pending Requests</h3>
          {!isManual ? (
            <p className="subtle-text">Request queue is hidden in AUTOMATIC mode.</p>
          ) : pending.length === 0 ? (
            <p className="subtle-text">No pending requests.</p>
          ) : (
            <ul className="stack-list">
              {pending.map((req) => {
                const unit = unitsById[req.unitId];
                const label = unit
                  ? `${unit.externalUnitId}${unit.unitName ? ` - ${unit.unitName}` : ''}`
                  : req.unitId;
                return (
                  <li className="stack-row" key={req.id}>
                    <div>
                      <strong>{label}</strong>
                      <p className="subtle-text">
                        {req.deviceType ?? unit?.deviceType ?? 'UNKNOWN'} · requested{' '}
                        {new Date(req.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="stack-actions">
                      <button className="button button-secondary" onClick={() => approve(req.id)} type="button">
                        Approve
                      </button>
                      <button className="button button-danger" onClick={() => reject(req.id)} type="button">
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="card">
          <h3>Active Speakers</h3>
          {snapshot && snapshot.activeSpeakers.length > 0 ? (
            <ul className="stack-list">
              {snapshot.activeSpeakers.map((unitId) => {
                const unit = unitsById[unitId];
                return (
                  <li className="stack-row" key={unitId}>
                    <div>
                      <strong>{unit ? `${unit.externalUnitId}${unit.unitName ? ` - ${unit.unitName}` : ''}` : unitId}</strong>
                      <p className="subtle-text">{unit?.deviceType ?? 'UNKNOWN'} · SPEAKING</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="subtle-text">No active speakers.</p>
          )}

          <div className="divider" />
          <h3>Current Camera Target</h3>
          {snapshot?.currentCameraTarget ? (
            <dl className="meta-list">
              <div>
                <dt>Unit</dt>
                <dd>{snapshot.currentCameraTarget.unitId}</dd>
              </div>
              <div>
                <dt>Camera</dt>
                <dd>{snapshot.currentCameraTarget.cameraId}</dd>
              </div>
              <div>
                <dt>Preset</dt>
                <dd>{snapshot.currentCameraTarget.presetId}</dd>
              </div>
            </dl>
          ) : (
            <p className="subtle-text">No camera target.</p>
          )}
        </article>
      </div>
      <p className="subtle-text">
        Current user: <strong>{user?.username}</strong> ({user?.role})
      </p>
    </section>
  );
}
