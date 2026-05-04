import type { DashboardResponse } from '../../shared/types/live-monitoring';

export function ActiveSpeakerCard({ dashboard }: { dashboard: DashboardResponse }) {
  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Active Speaker</h3>
      {dashboard.activeSpeakerCount > 0 ? (
        <div>
          <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#666' }}>
            {dashboard.activeSpeakerCount} speaker{dashboard.activeSpeakerCount > 1 ? 's' : ''} on floor
          </p>
        </div>
      ) : (
        <p style={{ margin: '1rem 0', color: '#999', textAlign: 'center' }}>No active speakers</p>
      )}
    </div>
  );
}
