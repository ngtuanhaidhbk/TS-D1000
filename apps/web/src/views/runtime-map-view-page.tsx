import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { runtimeApi } from '../shared/services/runtime-api';
import { systemConfigApi } from '../shared/services/system-config-api';
import type { Layout, LayoutDevice, TsdUnit } from '../shared/types/system-config';
import type { RuntimeSnapshot } from '../shared/types/runtime';
import { statusClassName } from './runtime-shared';

export function RuntimeMapViewPage() {
  const { token } = useAuth();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [devices, setDevices] = useState<LayoutDevice[]>([]);
  const [unitsById, setUnitsById] = useState<Record<string, TsdUnit>>({});
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dots = useMemo(() => {
    if (!snapshot) return [];
    return devices.map((device) => {
      const unit = device.refType === 'TSD_UNIT' ? unitsById[device.refId] : null;
      const runtime = snapshot.units[device.refId];
      const state = device.refType === 'TSD_UNIT' ? runtime?.state ?? unit?.runtimeState ?? 'IDLE' : 'IDLE';
      return {
        id: device.id,
        label: device.iconLabel ?? (unit ? unit.externalUnitId : device.refType),
        refType: device.refType,
        refId: device.refId,
        posX: device.posX,
        posY: device.posY,
        state,
      };
    });
  }, [devices, snapshot, unitsById]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadBase() {
      setLoading(true);
      setError(null);
      try {
        const snap = await runtimeApi.getSnapshot(token);
        setSnapshot(snap);

        let configId: string | null = null;
        try {
          const config = await systemConfigApi.getTsdConfig(token);
          configId = config.id;
        } catch (apiError) {
          if (!(apiError instanceof ApiClientError) || apiError.code !== 'CONFIG_NOT_FOUND') {
            throw apiError;
          }
        }

        if (configId) {
          const unitsResponse = await systemConfigApi.listUnits(configId, token);
          if (!cancelled) {
            setUnitsById(Object.fromEntries(unitsResponse.items.map((unit) => [unit.id, unit])));
          }
        } else {
          setUnitsById({});
        }

        try {
          const layoutResponse = await systemConfigApi.getLayout(token);
          const deviceResponse = await systemConfigApi.listLayoutDevices(token);
          if (!cancelled) {
            setLayout(layoutResponse);
            setDevices(deviceResponse.items);
          }
        } catch (apiError) {
          if (apiError instanceof ApiClientError && apiError.code === 'LAYOUT_NOT_CONFIGURED') {
            if (!cancelled) {
              setLayout(null);
              setDevices([]);
            }
          } else {
            throw apiError;
          }
        }
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load runtime map');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadBase();
    const handle = window.setInterval(async () => {
      try {
        const snap = await runtimeApi.getSnapshot(token);
        if (!cancelled) setSnapshot(snap);
      } catch {
        // non-blocking
      }
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [token]);

  if (loading) {
    return <section className="card">Loading runtime map...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Runtime</p>
          <h2>Map View</h2>
          <p className="subtle-text">Read-only realtime layout highlight for REQUEST/SPEAKING states.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(snapshot?.operationMode ?? 'UNKNOWN')}>{snapshot?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(snapshot?.sseStatus ?? 'UNKNOWN')}>{snapshot?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {!layout ? (
        <article className="card">
          <h3>Layout Missing</h3>
          <p className="subtle-text">No layout configured yet. Upload a layout in System Configuration to enable map rendering.</p>
        </article>
      ) : (
        <article className="card">
          <h3>Placed Devices</h3>
          {dots.length === 0 ? (
            <p className="subtle-text">No placed devices yet.</p>
          ) : (
            <div className="info-grid">
              {dots.map((dot) => (
                <div className="list-card" key={dot.id}>
                  <strong>{dot.label}</strong>
                  <p className="subtle-text">
                    {dot.refType} · {dot.refId}
                  </p>
                  {dot.refType === 'TSD_UNIT' ? (
                    <span className={statusClassName(dot.state)}>{dot.state}</span>
                  ) : (
                    <span className="read-only-tag">CAMERA</span>
                  )}
                  <p className="subtle-text">
                    ({dot.posX}, {dot.posY})
                  </p>
                </div>
              ))}
            </div>
          )}
        </article>
      )}
    </section>
  );
}

