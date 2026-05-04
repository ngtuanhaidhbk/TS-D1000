import type { DashboardResponse } from '../../../shared/types/live-monitoring';

const statusColors: Record<string, string> = {
  CONNECTED: '#0f0',
  RECONNECTING: '#fa0',
  DISCONNECTED: '#f00',
  UNAVAILABLE: '#f00',
  MANUAL: '#06c',
  AUTOMATIC: '#060',
};

export function DashboardSummaryCards({ dashboard }: { dashboard: DashboardResponse }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
      <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Operation Mode</p>
        <div
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: statusColors[dashboard.operationMode] || '#999',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {dashboard.operationMode}
        </div>
      </div>

      <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>SSE Status</p>
        <div
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: statusColors[dashboard.sseStatus] || '#999',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {dashboard.sseStatus}
        </div>
      </div>

      <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Active Speakers</p>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0', color: '#333' }}>{dashboard.activeSpeakerCount}</p>
      </div>

      <div style={{ padding: '1.5rem', backgroundColor: '#f5f5f5', borderRadius: '8px', border: '1px solid #ddd' }}>
        <p style={{ fontSize: '0.875rem', color: '#666', margin: '0 0 0.5rem 0' }}>Pending Requests</p>
        <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0', color: '#333' }}>{dashboard.pendingRequestCount}</p>
      </div>
    </div>
  );
}
