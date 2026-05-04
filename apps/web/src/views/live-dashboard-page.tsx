import { useState, useEffect } from 'react';
import { useAuth } from '../shared/providers/auth-provider';
import { liveMonitoringApi } from '../shared/services/live-monitoring-api';
import type { DashboardResponse } from '../shared/types/live-monitoring';
import { DashboardSummaryCards } from './live-monitoring/components/dashboard-summary-cards';
import { ActiveSpeakerCard } from './live-monitoring/components/active-speaker-card';
import { AlertList } from './live-monitoring/components/alert-list';
import { CameraTargetCard } from './live-monitoring/components/camera-target-card';
import { statusClassName } from './runtime-shared';

export function LiveDashboardPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    let intervalHandle: NodeJS.Timeout | null = null;

    async function loadDashboard() {
      try {
        setError(null);
        const data = await liveMonitoringApi.getDashboard(token);
        if (isMounted) {
          setDashboard(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
          setLoading(false);
        }
      }
    }

    loadDashboard();
    intervalHandle = setInterval(loadDashboard, 2000);

    return () => {
      isMounted = false;
      if (intervalHandle) clearInterval(intervalHandle);
    };
  }, [token]);

  if (loading) {
    return <section className="card">Loading dashboard...</section>;
  }

  return (
    <section className="config-page">
      <div className="page-header card">
        <div>
          <p className="eyebrow">Live Monitoring</p>
          <h2>Live Dashboard</h2>
          <p className="subtle-text">Realtime status: mode, connection, speakers, requests, cameras, and alerts.</p>
        </div>
        <div className="pill-row">
          <span className={statusClassName(dashboard?.operationMode ?? 'UNKNOWN')}>{dashboard?.operationMode ?? 'UNKNOWN'}</span>
          <span className={statusClassName(dashboard?.sseStatus ?? 'UNKNOWN')}>{dashboard?.sseStatus ?? 'UNKNOWN'}</span>
        </div>
      </div>

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {dashboard && (
        <>
          <DashboardSummaryCards dashboard={dashboard} />

          <div className="info-grid">
            <ActiveSpeakerCard dashboard={dashboard} />
            <CameraTargetCard dashboard={dashboard} />
            <AlertList alerts={dashboard.activeAlerts} />
          </div>
        </>
      )}
    </section>
  );
}
