'use client';

import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  async function runSync() {
    try {
      setSyncing(true);
      await fetch('/api/sync', { cache: 'no-store' });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (!online) return;

    // Initial sync when we detect online
    void runSync();

    // Retry sync periodically in case the first online event is too early
    const interval = window.setInterval(() => {
      if (navigator.onLine) void runSync();
    }, 15000);

    const onFocus = () => {
      if (navigator.onLine) void runSync();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [online]);

  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold">
      <span
        className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden
      />
      <span className={online ? 'text-emerald-700' : 'text-red-700'}>
        {online ? (syncing ? 'Online · Syncing' : 'Online') : 'Offline'}
      </span>
    </div>
  );
}

