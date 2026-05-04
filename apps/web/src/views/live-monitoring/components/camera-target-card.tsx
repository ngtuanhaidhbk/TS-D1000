import type { DashboardResponse } from '../../shared/types/live-monitoring';

export function CameraTargetCard({ dashboard }: { dashboard: DashboardResponse }) {
  const target = dashboard.currentCameraTarget;

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Current Camera Target</h3>
      {target ? (
        <div>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
            <strong>Camera:</strong> {target.cameraName}
          </p>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
            <strong>Unit:</strong> {target.unitName}
          </p>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem' }}>
            <strong>Preset:</strong> {target.presetName}
          </p>
        </div>
      ) : (
        <p style={{ margin: '1rem 0', color: '#999', textAlign: 'center' }}>No current target</p>
      )}
    </div>
  );
}
