import React from 'react';
import '../styles/SessionTimeoutModal.css';

interface SessionTimeoutModalProps {
  open: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogoutNow: () => void;
}

const formatRemaining = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safeSeconds / 60);
  const s = safeSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  open,
  remainingSeconds,
  onContinue,
  onLogoutNow,
}) => {
  if (!open) return null;

  return (
    <div className="stm-backdrop" role="dialog" aria-modal="true" aria-label="Session expiring">
      <div className="stm-modal">
        <h3 className="stm-title">Session Expiring Soon</h3>
        <p className="stm-text">
          Your session will expire in <strong>{formatRemaining(remainingSeconds)}</strong> due to inactivity.
          Click Continue to stay logged in.
        </p>
        <div className="stm-actions">
          <button className="stm-btn stm-btn-secondary" onClick={onLogoutNow}>
            Logout
          </button>
          <button className="stm-btn stm-btn-primary" onClick={onContinue} autoFocus>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
