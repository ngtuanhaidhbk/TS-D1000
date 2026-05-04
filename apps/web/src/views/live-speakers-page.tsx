import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { ActiveSpeakerResponse, PendingRequestsResponse, SnapshotResponse, UnitDetailResponse } from '../shared/types/live-monitoring';
import { statusClassName } from './runtime-shared';

type TabKey = 'ACTIVE' | 'PENDING' | 'ALL';

export function LiveSpeakersPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<TabKey>('ACTIVE');
  const [activeSpeakers, setActiveSpeakers] = useState<ActiveSpeakerResponse[]>([]);
  const [pending, setPending] = useState<PendingRequestsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResponse | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allUnits = useMemo(() => snapshot?.units ?? [], [snapshot]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const [speakers, pendingSummary, snap] = await Promise.all([
          liveMonitoringApi.getActiveSpeakers(token),
          liveMonitoringApi.getPendingRequests(token),
          liveMonitoringApi.getSnapshot(token),
        ]);
        if (!cancelled) {
          setActiveSpeakers(speakers);
          setPending(pendingSummary);
          setSnapshot(snap);
        }
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load speaker monitoring');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const handle = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token]);

  async function openUnit(unitId: string) {
    if (!token) return;
    try {
      const detail = await liveMonitoringApi.getUnitDetail(unitId, token);
      setSelectedUnit(detail);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load unit detail');
    }
  }

  if (loading) return <section className="card">Loading speaker monitoring...</section>;

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Speakers</h2>
          <p className="subtle-text">Active speakers, pending requests, and unit runtime states.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(snapshot?.operationMode ?? 'UNKNOWN')}>{snapshot?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(snapshot?.sseStatus ?? 'UNKNOWN')}>{snapshot?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <div className="pill-row">
          <button className="button button-secondary button-compact" onClick={() => setTab('ACTIVE')} type="button">
            Active Speakers
          </button>
          <button className="button button-secondary button-compact" onClick={() => setTab('PENDING')} type="button">
            Pending Requests
          </button>
          <button className="button button-secondary button-compact" onClick={() => setTab('ALL')} type="button">
            All Units
          </button>
        </div>

        <div className="divider" />

        {tab === 'ACTIVE' ? (
          activeSpeakers.length === 0 ? (
            <p className="subtle-text">No active speakers.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Last Event</th>
                  <th>Mapping</th>
                </tr>
              </thead>
              <tbody>
                {activeSpeakers.map((s) => (
                  <tr key={s.unitId} onClick={() => void openUnit(s.unitId)}>
                    <td>{s.unitName ?? s.unitId}</td>
                    <td>{s.deviceType}</td>
                    <td>{s.lastEventAt ? new Date(s.lastEventAt).toLocaleString() : 'Not available'}</td>
                    <td>{s.mappedCamera ? `${s.mappedCamera.cameraName} / ${s.mappedCamera.presetName ?? s.mappedCamera.presetId}` : 'No mapping'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {tab === 'PENDING' ? (
          !pending ? (
            <p className="subtle-text">No request data.</p>
          ) : pending.requests.length === 0 ? (
            <p className="subtle-text">No pending requests.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Requested At</th>
                </tr>
              </thead>
              <tbody>
                {pending.requests.map((r) => (
                  <tr key={r.requestId} onClick={() => void openUnit(r.unitId)}>
                    <td>{r.unitName ?? r.unitId}</td>
                    <td>{r.deviceType}</td>
                    <td>{new Date(r.requestedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {tab === 'ALL' ? (
          allUnits.length === 0 ? (
            <p className="subtle-text">No units configured.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Last Event</th>
                </tr>
              </thead>
              <tbody>
                {allUnits.map((u) => (
                  <tr key={u.unitId} onClick={() => void openUnit(u.unitId)}>
                    <td>{u.unitName ?? u.unitId}</td>
                    <td>{u.deviceType}</td>
                    <td>
                      <span className={statusClassName(u.state)}>{u.state}</span>
                    </td>
                    <td>{u.lastEventAt ? new Date(u.lastEventAt).toLocaleString() : 'Not available'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}
      </article>

      {selectedUnit ? (
        <article className="card">
          <div className="card-heading">
            <h3>Unit Detail</h3>
            <span className={statusClassName(selectedUnit.runtimeState)}>{selectedUnit.runtimeState}</span>
          </div>
          <dl className="meta-list">
            <div>
              <dt>Unit</dt>
              <dd>{selectedUnit.unitName ?? selectedUnit.unitId}</dd>
            </div>
            <div>
              <dt>Device Type</dt>
              <dd>{selectedUnit.deviceType}</dd>
            </div>
            <div>
              <dt>Last Event</dt>
              <dd>{selectedUnit.lastEventAt ? new Date(selectedUnit.lastEventAt).toLocaleString() : 'Not available'}</dd>
            </div>
            <div>
              <dt>Mapping</dt>
              <dd>
                {selectedUnit.mappedCamera
                  ? `${selectedUnit.mappedCamera.cameraName} / ${selectedUnit.mappedCamera.presetName ?? selectedUnit.mappedCamera.presetId}`
                  : 'No active mapping'}
              </dd>
            </div>
          </dl>
          {selectedUnit.hasWarning ? <div className="warning-banner">{selectedUnit.warningMessage}</div> : null}
        </article>
      ) : null}
    </section>
  );
}

