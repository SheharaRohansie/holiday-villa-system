import React, { useEffect } from 'react';
import '../styles/Toast.css';

type ToastProps = {
  message: string;
  onClose: () => void;
  durationMs?: number;
};

const Toast: React.FC<ToastProps> = ({ message, onClose, durationMs = 3000 }) => {
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(id);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
    </div>
  );
};

export default Toast;
