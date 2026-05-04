import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { MapDevice, MapResponse } from '../shared/types/live-monitoring';
import { statusClassName } from './runtime-shared';

export function LiveMapPage() {
  const { token } = useAuth();
  const [mapState, setMapState] = useState<MapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const devices = useMemo(() => mapState?.devices ?? [], [mapState]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const data = await liveMonitoringApi.getMap(token);
        if (!cancelled) setMapState(data);
      } catch (apiError) {
        if (!cancelled) setError(apiError instanceof ApiClientError ? apiError.message : 'Unable to load live map');
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

  if (loading) return <section className="card">Loading live map...</section>;

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Realtime Map</h2>
          <p className="subtle-text">Layout devices with realtime unit state highlighting.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(mapState?.layout ? 'ACTIVE' : 'INACTIVE')}>
            {mapState?.layout ? 'LAYOUT READY' : 'NO LAYOUT'}
          </span>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {!mapState?.layout ? (
        <article className="card">
          <h3>Layout Missing</h3>
          <p className="subtle-text">Layout is not configured. Upload a layout in System Configuration to enable map view.</p>
        </article>
      ) : (
        <article className="card">
          <div className="card-heading">
            <h3>Devices</h3>
            <span className="subtle-text">{devices.length} item(s)</span>
          </div>
          {devices.length === 0 ? (
            <p className="subtle-text">No devices placed on the layout yet.</p>
          ) : (
            <div className="info-grid">
              {devices.map((device) => (
                <MapDeviceCard key={device.id} device={device} />
              ))}
            </div>
          )}
        </article>
      )}
    </section>
  );
}

function MapDeviceCard({ device }: { device: MapDevice }) {
  const label = device.label || `${device.type} ${device.refId}`;
  const state = device.runtimeState ?? (device.type === 'CAMERA' ? 'ACTIVE' : 'OFFLINE');
  return (
    <div className="list-card">
      <div className="card-heading">
        <strong>{label}</strong>
        <span className={statusClassName(state)}>{state}</span>
      </div>
      <p className="subtle-text">
        {device.refType} · {device.refId}
      </p>
      <p className="subtle-text">
        ({device.posX}, {device.posY})
      </p>
    </div>
  );
}

