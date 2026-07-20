import React from 'react';
import { DDRIVE_LOGO_URL } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface DDriveLogoProps {
  size?: number;
  className?: string;
  ring?: boolean;
}

/**
 * Official DDRiVE-M circular logo. Used across the platform and as
 * the avatar for the DDRiVER AI assistant.
 */
const DDriveLogo: React.FC<DDriveLogoProps> = ({ size = 40, className, ring = true }) => {
  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-white shrink-0',
        ring && 'ring-2 ring-amber-300/70 shadow-lg shadow-blue-900/30',
        className
      )}
      style={{ width: size, height: size }}
      aria-label="DDRiVE-M"
    >
      <img
        src={DDRIVE_LOGO_URL}
        alt="DDRiVE-M Logo"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  );
};

export default DDriveLogo;
