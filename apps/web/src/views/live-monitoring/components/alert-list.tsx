import type { RuntimeAlert } from '../../../shared/types/live-monitoring';

const severityColors: Record<string, string> = {
  INFO: '#0066cc',
  WARNING: '#ff9900',
  ERROR: '#ff3333',
  CRITICAL: '#cc0000',
};

export function AlertList({ alerts }: { alerts: RuntimeAlert[] }) {
  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Active Alerts ({alerts.length})</h3>
      {alerts.length > 0 ? (
        <div>
          {alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '0.75rem',
                marginBottom: '0.75rem',
                backgroundColor: '#fff',
                borderLeft: `4px solid ${severityColors[alert.severity] || '#999'}`,
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 'bold', color: severityColors[alert.severity] }}>
                {alert.severity}
              </p>
              <p style={{ margin: '0', color: '#333' }}>{alert.message}</p>
              <p style={{ margin: '0.25rem 0 0 0', color: '#999', fontSize: '0.75rem' }}>{alert.source}</p>
            </div>
          ))}
          {alerts.length > 3 && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.875rem' }}>
              +{alerts.length - 3} more
            </p>
          )}
        </div>
      ) : (
        <p style={{ margin: '1rem 0', color: '#999', textAlign: 'center' }}>No active alerts</p>
      )}
    </div>
  );
}
