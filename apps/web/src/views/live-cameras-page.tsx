import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { CameraStatusResponse, CameraTriggerResponse, CameraTargetResponse } from '../shared/types/live-monitoring';
import { statusClassName } from './runtime-shared';

export function LiveCamerasPage() {
  const { token } = useAuth();
  const [cameras, setCameras] = useState<CameraStatusResponse[]>([]);
  const [targets, setTargets] = useState<CameraTargetResponse | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [triggers, setTriggers] = useState<CameraTriggerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCamera = useMemo(
    () => cameras.find((c) => c.cameraId === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );

  const selectedTarget = useMemo(() => {
    if (!targets || !selectedCameraId) return null;
    return targets.currentTargets.find((t) => t.cameraId === selectedCameraId) ?? null;
  }, [targets, selectedCameraId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const [statuses, currentTargets] = await Promise.all([
          liveMonitoringApi.getCameraStatuses(token),
          liveMonitoringApi.getCameraTargets(token),
        ]);
        if (!cancelled) {
          setCameras(statuses.slice(0, 4));
          setTargets(currentTargets);
          setSelectedCameraId((cur) => cur || statuses[0]?.cameraId || '');
        }
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load camera monitoring');
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

  useEffect(() => {
    if (!token || !selectedCameraId) {
      setTriggers([]);
      return;
    }
    let cancelled = false;

    async function loadTriggers() {
      try {
        const params = new URLSearchParams();
        params.set('cameraId', selectedCameraId);
        params.set('pageSize', '20');
        const data = await liveMonitoringApi.getCameraTriggers(token, params);
        if (!cancelled) setTriggers(data);
      } catch {
        if (!cancelled) setTriggers([]);
      }
    }

    void loadTriggers();
    const handle = window.setInterval(loadTriggers, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token, selectedCameraId]);

  if (loading) return <section className="card">Loading camera monitoring...</section>;

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Cameras</h2>
          <p className="subtle-text">Runtime camera targets and recent trigger results.</p>
        </div>
        {selectedCamera ? <span className={statusClassName(selectedCamera.status)}>{selectedCamera.status}</span> : null}
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <div className="card-heading">
          <h3>Camera Status</h3>
          <label className="field field-inline">
            <span>Selected</span>
            <select value={selectedCameraId} onChange={(e) => setSelectedCameraId(e.target.value)}>
              {cameras.map((c) => (
                <option key={c.cameraId} value={c.cameraId}>
                  {c.cameraName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {cameras.length === 0 ? (
          <p className="subtle-text">No cameras configured.</p>
        ) : (
          <div className="stats-grid">
            {cameras.map((camera) => (
              <div className="list-card" key={camera.cameraId} onClick={() => setSelectedCameraId(camera.cameraId)} role="button">
                <div className="card-heading">
                  <strong>{camera.cameraName}</strong>
                  <span className={statusClassName(camera.status)}>{camera.status}</span>
                </div>
                <p className="subtle-text">
                  Last test: {camera.lastTestAt ? new Date(camera.lastTestAt).toLocaleString() : 'Not available'}
                </p>
                <p className="subtle-text">Result: {camera.lastTestResult ?? 'UNTESTED'}</p>
              </div>
            ))}
          </div>
        )}
      </article>

      <div className="info-grid">
        <article className="card">
          <h3>Current Target</h3>
          {selectedTarget?.currentTarget ? (
            <dl className="meta-list">
              <div>
                <dt>Unit</dt>
                <dd>{selectedTarget.currentTarget.unitName || selectedTarget.currentTarget.unitId}</dd>
              </div>
              <div>
                <dt>Preset</dt>
                <dd>{selectedTarget.currentTarget.presetName ?? selectedTarget.currentTarget.presetId}</dd>
              </div>
            </dl>
          ) : (
            <p className="subtle-text">No target for selected camera.</p>
          )}
        </article>

        <article className="card">
          <h3>Trigger History</h3>
          {triggers.length === 0 ? (
            <p className="subtle-text">No trigger history yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Result</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {triggers.map((t) => (
                  <tr key={t.triggerId}>
                    <td>{new Date(t.executedAt).toLocaleString()}</td>
                    <td>{t.action}</td>
                    <td>
                      <span className={statusClassName(t.result)}>{t.result}</span>
                    </td>
                    <td>{t.reason ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </section>
  );
}

