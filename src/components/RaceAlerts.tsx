import type { RaceAlert } from '../hooks/useRaceAlerts';

const TYPE_ICONS: Record<RaceAlert['type'], string> = {
  'safety-car': '🚗',
  'red-flag': '🚩',
  'vsc': '🚗',
  'lead-change': '🏆',
  'retirement': '🛑',
  'drs': '✅',
};

interface Props {
  alerts: RaceAlert[];
  onDismiss: (id: number) => void;
}

export default function RaceAlerts({ alerts, onDismiss }: Props) {
  if (!alerts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
    }}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#111827',
            border: `1px solid ${alert.color}55`,
            boxShadow: `0 0 12px ${alert.color}22`,
            pointerEvents: 'auto',
            animation: 'slideIn 0.2s ease-out',
            maxWidth: '300px',
          }}
        >
          <span style={{ fontSize: '16px' }}>{TYPE_ICONS[alert.type]}</span>
          <span style={{ color: alert.color, fontWeight: 600, fontSize: '13px', flex: 1 }}>{alert.message}</span>
          <button
            onClick={() => onDismiss(alert.id)}
            style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}
