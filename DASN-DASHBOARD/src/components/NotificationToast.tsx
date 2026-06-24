import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  threatLevel: string;
  onClose: () => void;
}

export default function NotificationToast({ message, threatLevel, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 8 seconds
    const timer = setTimeout(() => {
      handleClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300); // Allow animation to finish
  };

  const isCritical = threatLevel === 'CRITICAL_THREAT';

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: isCritical ? 'rgba(239, 68, 68, 0.95)' : 'rgba(30, 41, 59, 0.95)',
      color: 'white',
      padding: '15px 20px',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
      border: `1px solid ${isCritical ? '#fca5a5' : '#475569'}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '15px',
      zIndex: 9999,
      maxWidth: '350px',
      fontFamily: '"JetBrains Mono", monospace',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.3s, transform 0.3s'
    }}>
      <AlertCircle size={24} color="white" style={{ marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', letterSpacing: '1px', marginBottom: '5px', textTransform: 'uppercase' }}>
          {isCritical ? 'Critical Threat Detected' : 'New Intelligence Logged'}
        </div>
        <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.4' }}>
          "{message}"
        </div>
      </div>
      <button onClick={handleClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>
        <X size={18} />
      </button>
    </div>
  );
}
