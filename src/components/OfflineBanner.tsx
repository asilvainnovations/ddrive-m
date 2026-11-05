import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// Tells people when the device is offline. The app's screens still open (they are cached), but
// records and official alerts cannot be refreshed, and the information shown may be out of date.
const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return (
    <div role="status" className="sticky top-0 z-50 bg-amber-100 text-amber-950 border-b border-amber-300 px-4 py-2 text-sm flex items-center gap-2 justify-center">
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        You are offline. What you see may be out of date, and changes cannot be saved until you reconnect. For official
        warnings, listen to radio advisories and your local DRRM office.
      </span>
    </div>
  );
};

export default OfflineBanner;
