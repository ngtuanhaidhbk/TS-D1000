import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { runtimeApi } from '../shared/services/runtime-api';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { Camera, TsdUnit } from '../shared/types/system-config';
import type { RuntimeCameraLogItem, RuntimeCameraStatus, RuntimeSnapshot } from '../shared/types/runtime';
import { statusClassName } from './runtime-shared';

export function RuntimeCameraViewPage() {
  const { token } = useAuth();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [presetsByCamera, setPresetsByCamera] = useState<
    Record<string, Array<{ id: string; presetCode: string; presetName: string | null }>>
  >({});
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [manualBusy, setManualBusy] = useState(false);
  const [unitsById, setUnitsById] = useState<Record<string, TsdUnit>>({});
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeCameraStatus | null>(null);
  const [runtimeLogs, setRuntimeLogs] = useState<RuntimeCameraLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeCameras = useMemo(() => cameras.filter((camera) => camera.status === 'ACTIVE').slice(0, 4), [cameras]);
  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );
  const selectedPresets = presetsByCamera[selectedCameraId] ?? [];

  useEffect(() => {
    const authToken = token;
    if (!authToken) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [snap, cameraResponse] = await Promise.all([
          runtimeApi.getSnapshot(authToken),
          systemConfigApi.listCameras(authToken),
        ]);
        if (!cancelled) {
          setSnapshot(snap);
          setCameras(cameraResponse.items);
          const firstActive = cameraResponse.items.find((camera) => camera.status === 'ACTIVE')?.id ?? '';
          setSelectedCameraId((current) => current || firstActive);
        }

        try {
          const config = await systemConfigApi.getTsdConfig(authToken);
          const unitsResponse = await systemConfigApi.listUnits(config.id, authToken);
          if (!cancelled) setUnitsById(Object.fromEntries(unitsResponse.items.map((unit) => [unit.id, unit])));
        } catch (apiError) {
          if (!(apiError instanceof ApiClientError) || apiError.code !== 'CONFIG_NOT_FOUND') {
            throw apiError;
          }
          if (!cancelled) setUnitsById({});
        }
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load camera view');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    const handle = window.setInterval(async () => {
      try {
        const snap = await runtimeApi.getSnapshot(authToken);
        if (!cancelled) setSnapshot(snap);
      } catch {
        // non-blocking
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token]);

  useEffect(() => {
    const authToken = token;
    if (!authToken || !selectedCameraId) {
      setSelectedPresetId('');
      setRuntimeStatus(null);
      setRuntimeLogs([]);
      return;
    }
    let cancelled = false;
    async function loadPresets() {
      try {
        const response = await systemConfigApi.listPresets(selectedCameraId, authToken);
        if (!cancelled) {
          setPresetsByCamera((value) => ({ ...value, [selectedCameraId]: response.items }));
          setSelectedPresetId((current) => current || response.items[0]?.id || '');
        }
      } catch {
        if (!cancelled) {
          setPresetsByCamera((value) => ({ ...value, [selectedCameraId]: [] }));
          setSelectedPresetId('');
        }
      }
    }
    void loadPresets();
    return () => {
      cancelled = true;
    };
  }, [token, selectedCameraId]);

  useEffect(() => {
    const authToken = token;
    if (!authToken || !selectedCameraId) {
      return;
    }
    let cancelled = false;

    async function loadMonitoring() {
      try {
        const [status, logs] = await Promise.all([
          runtimeApi.getCameraStatus(selectedCameraId, authToken),
          runtimeApi.listCameraLogs(selectedCameraId, authToken, new URLSearchParams({ page: '1', pageSize: '10' })),
        ]);
        if (!cancelled) {
          setRuntimeStatus(status);
          setRuntimeLogs(logs.items);
        }
      } catch {
        if (!cancelled) {
          setRuntimeStatus(null);
          setRuntimeLogs([]);
        }
      }
    }

    void loadMonitoring();
    const handle = window.setInterval(loadMonitoring, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token, selectedCameraId]);

  async function recallPreset() {
    const authToken = token;
    if (!authToken || !selectedCameraId || !selectedPresetId) return;
    setManualBusy(true);
    setError(null);
    try {
      await runtimeApi.recallPreset(selectedCameraId, selectedPresetId, authToken);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to recall preset');
    } finally {
      setManualBusy(false);
    }
  }

  async function move(action: 'PAN_LEFT' | 'PAN_RIGHT' | 'TILT_UP' | 'TILT_DOWN' | 'ZOOM_IN' | 'ZOOM_OUT') {
    const authToken = token;
    if (!authToken || !selectedCameraId) return;
    setManualBusy(true);
    setError(null);
    try {
      await runtimeApi.moveCamera(selectedCameraId, { action, speed: 5 }, authToken);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to move camera');
    } finally {
      setManualBusy(false);
    }
  }

  async function stop() {
    const authToken = token;
    if (!authToken || !selectedCameraId) return;
    setManualBusy(true);
    setError(null);
    try {
      await runtimeApi.stopCamera(selectedCameraId, authToken);
    } catch (apiError) {
      setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to stop camera');
    } finally {
      setManualBusy(false);
    }
  }

  if (loading) {
    return <section className="card">Loading camera view...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Camera View</h2>
          <p className="subtle-text">Monitor camera targets (stream preview is optional).</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(snapshot?.operationMode ?? 'UNKNOWN')}>{snapshot?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(snapshot?.sseStatus ?? 'UNKNOWN')}>{snapshot?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <article className="card">
        <h3>Current Camera Target</h3>
        {snapshot?.currentCameraTarget ? (
          <p className="subtle-text">
            Unit <strong>{snapshot.currentCameraTarget.unitId}</strong> → Camera{' '}
            <strong>{snapshot.currentCameraTarget.cameraId}</strong> preset{' '}
            <strong>{snapshot.currentCameraTarget.presetId}</strong>
          </p>
        ) : (
          <p className="subtle-text">No camera target.</p>
        )}
      </article>

      <article className="card">
        <h3>Manual Camera Control</h3>
        {activeCameras.length === 0 ? (
          <p className="subtle-text">No active cameras available.</p>
        ) : (
          <div className="form-grid compact-form">
            <label className="field">
              <span>Camera</span>
              <select value={selectedCameraId} onChange={(event) => setSelectedCameraId(event.target.value)}>
                <option value="" disabled>
                  Select camera
                </option>
                {activeCameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Preset</span>
              <select
                value={selectedPresetId}
                onChange={(event) => setSelectedPresetId(event.target.value)}
                disabled={!selectedCamera?.capabilities.preset || selectedPresets.length === 0}
              >
                {selectedPresets.length === 0 ? (
                  <option value="">No presets</option>
                ) : (
                  selectedPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.presetCode}{preset.presetName ? ` - ${preset.presetName}` : ''}
                    </option>
                  ))
                )}
              </select>
            </label>
            <div className="form-actions">
              <button
                className="button button-secondary"
                disabled={manualBusy || !selectedCameraId || !selectedPresetId || !selectedCamera?.capabilities.preset}
                onClick={() => void recallPreset()}
                type="button"
              >
                {manualBusy ? 'Working...' : 'Recall Preset'}
              </button>
            </div>
            <div className="divider" />
            <p className="subtle-text">PTZ: {selectedCamera?.capabilities.ptz ? 'Supported' : 'Unsupported'}</p>
            <div className="stack-row">
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('TILT_UP')}
                type="button"
              >
                Up
              </button>
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('PAN_LEFT')}
                type="button"
              >
                Left
              </button>
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('PAN_RIGHT')}
                type="button"
              >
                Right
              </button>
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('TILT_DOWN')}
                type="button"
              >
                Down
              </button>
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('ZOOM_IN')}
                type="button"
              >
                Zoom+
              </button>
              <button
                className="button button-secondary button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void move('ZOOM_OUT')}
                type="button"
              >
                Zoom-
              </button>
              <button
                className="button button-danger button-compact"
                disabled={manualBusy || !selectedCamera?.capabilities.ptz}
                onClick={() => void stop()}
                type="button"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </article>

      <div className="info-grid">
        {activeCameras.length === 0 ? (
          <article className="card">
            <h3>No cameras</h3>
            <p className="subtle-text">No active cameras configured.</p>
          </article>
        ) : (
          activeCameras.map((camera) => {
            const isTarget = snapshot?.currentCameraTarget?.cameraId === camera.id;
            const targetUnitId = snapshot?.currentCameraTarget?.unitId ?? null;
            const unit = targetUnitId ? unitsById[targetUnitId] : null;
            const label = isTarget
              ? unit
                ? `${unit.externalUnitId}${unit.unitName ? ` - ${unit.unitName}` : ''}`
                : targetUnitId
              : 'No target';
            return (
              <article className="card" key={camera.id}>
                <div className="card-heading">
                  <h3>{camera.name}</h3>
                  <span className={statusClassName(isTarget ? 'ACTIVE' : 'INACTIVE')}>{isTarget ? 'TARGET' : 'IDLE'}</span>
                </div>
                <p className="subtle-text">
                  {camera.protocol} · {camera.ipAddress}
                </p>
                <p className="subtle-text">
                  Current target: <strong>{label}</strong>
                </p>
              </article>
            );
          })
        )}
      </div>

      <div className="info-grid">
        <article className="card">
          <h3>Runtime Status</h3>
          {!selectedCameraId ? (
            <p className="subtle-text">Select a camera to view runtime status.</p>
          ) : !runtimeStatus ? (
            <p className="subtle-text">No runtime status available yet.</p>
          ) : (
            <dl className="meta-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={statusClassName(runtimeStatus.status)}>{runtimeStatus.status}</span>
                </dd>
              </div>
              <div>
                <dt>Target unit</dt>
                <dd>{runtimeStatus.currentTargetUnitId ?? 'None'}</dd>
              </div>
              <div>
                <dt>Target preset</dt>
                <dd>{runtimeStatus.currentPresetId ?? 'None'}</dd>
              </div>
              <div>
                <dt>Last switch</dt>
                <dd>{runtimeStatus.lastSwitchAt ? new Date(runtimeStatus.lastSwitchAt).toLocaleString() : 'Not available'}</dd>
              </div>
              <div>
                <dt>Last result</dt>
                <dd>{runtimeStatus.lastResult ?? 'Not available'}</dd>
              </div>
              {runtimeStatus.lastReason ? (
                <div>
                  <dt>Reason</dt>
                  <dd>{runtimeStatus.lastReason}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </article>

        <article className="card">
          <h3>Recent Trigger History</h3>
          {!selectedCameraId ? (
            <p className="subtle-text">Select a camera to view logs.</p>
          ) : runtimeLogs.length === 0 ? (
            <p className="subtle-text">No recent runtime camera logs.</p>
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
                {runtimeLogs.map((item) => (
                  <tr key={item.id}>
                    <td>{new Date(item.triggeredAt).toLocaleString()}</td>
                    <td>{item.actionType}</td>
                    <td>
                      <span className={statusClassName(item.result)}>{item.result}</span>
                    </td>
                    <td>{item.reason ?? ''}</td>
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
