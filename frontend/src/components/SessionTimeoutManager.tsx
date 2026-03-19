import React, { useEffect, useMemo, useRef, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import SessionTimeoutModal from './SessionTimeoutModal';

type SessionTimeoutManagerProps = {
  enabled: boolean;
  onTimeout: () => void;
  onContinueOptional?: () => Promise<void> | void;
};

const DEFAULT_TIMEOUT_MINUTES = (() => {
  const raw = (import.meta as { env?: Record<string, string> }).env?.VITE_SESSION_TIMEOUT_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
})();

const WARNING_LEAD_SECONDS = 120; // 2 minutes
const ACTIVITY_THROTTLE_MS = 1000;

const SessionTimeoutManager: React.FC<SessionTimeoutManagerProps> = ({
  enabled,
  onTimeout,
  onContinueOptional,
}) => {
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(DEFAULT_TIMEOUT_MINUTES);
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(WARNING_LEAD_SECONDS);

  const warningTimeoutId = useRef<number | null>(null);
  const logoutTimeoutId = useRef<number | null>(null);
  const countdownIntervalId = useRef<number | null>(null);
  const lastActivityAt = useRef<number>(Date.now());

  const timeoutMs = useMemo(() => Math.max(1, timeoutMinutes) * 60 * 1000, [timeoutMinutes]);
  const warningLeadMs = useMemo(() => WARNING_LEAD_SECONDS * 1000, []);
  const shouldShowWarning = useMemo(() => timeoutMs > warningLeadMs, [timeoutMs, warningLeadMs]);

  const clearTimers = () => {
    if (warningTimeoutId.current) window.clearTimeout(warningTimeoutId.current);
    if (logoutTimeoutId.current) window.clearTimeout(logoutTimeoutId.current);
    if (countdownIntervalId.current) window.clearInterval(countdownIntervalId.current);
    warningTimeoutId.current = null;
    logoutTimeoutId.current = null;
    countdownIntervalId.current = null;
  };

  const startTimers = () => {
    clearTimers();
    setWarningOpen(false);

    if (shouldShowWarning) {
      const warnAtMs = timeoutMs - warningLeadMs;

      warningTimeoutId.current = window.setTimeout(() => {
        setWarningOpen(true);
        setRemainingSeconds(Math.ceil(warningLeadMs / 1000));

        countdownIntervalId.current = window.setInterval(() => {
          setRemainingSeconds((prev) => Math.max(0, prev - 1));
        }, 1000);
      }, warnAtMs);
    }

    logoutTimeoutId.current = window.setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  };

  const markActivity = () => {
    const now = Date.now();
    if (!enabled) return;
    if (warningOpen) return; // require explicit Continue once warning shows
    if (now - lastActivityAt.current < ACTIVITY_THROTTLE_MS) return;

    lastActivityAt.current = now;
    startTimers();
  };

  const handleContinue = async () => {
    try {
      await onContinueOptional?.();
    } finally {
      lastActivityAt.current = Date.now();
      startTimers();
    }
  };

  const handleLogoutNow = () => {
    onTimeout();
  };

  // Fetch configured timeout (optional) once per login.
  useEffect(() => {
    let cancelled = false;

    const fetchTimeout = async () => {
      if (!enabled) return;
      try {
        const res = await axiosInstance.get<{ minutes: number }>('/settings/session-timeout');
        const minutes = Number(res.data?.minutes);
        if (!cancelled && Number.isFinite(minutes) && minutes > 0) {
          setTimeoutMinutes(minutes);
        }
      } catch {
        // ignore; fallback to env/default
      }
    };

    fetchTimeout();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // Start/stop timers based on auth state.
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setWarningOpen(false);
      return;
    }

    lastActivityAt.current = Date.now();
    startTimers();

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, timeoutMs]);

  // Attach activity listeners
  useEffect(() => {
    if (!enabled) return;

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, markActivity));
    };
  }, [enabled, warningOpen]);

  // Safety: if countdown reaches 0, trigger timeout.
  useEffect(() => {
    if (!enabled) return;
    if (!warningOpen) return;
    if (remainingSeconds > 0) return;
    onTimeout();
  }, [enabled, warningOpen, remainingSeconds, onTimeout]);

  return (
    <SessionTimeoutModal
      open={enabled && warningOpen}
      remainingSeconds={remainingSeconds}
      onContinue={handleContinue}
      onLogoutNow={handleLogoutNow}
    />
  );
};

export default SessionTimeoutManager;
