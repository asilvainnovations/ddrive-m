import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LOGO_LOCAL_URL, LOGO_SOURCE_URL } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface DDriveLogoProps {
  size?: number;
  className?: string;
  ring?: boolean;
  /** Wrap the logo in a link to the Home page (the default). Set false where the logo sits inside another control. */
  linkHome?: boolean;
  /** Show "DDRiVE-M" next to the logo. */
  withName?: boolean;
  nameClassName?: string;
}

/**
 * The DDRiVE-M logo, always circular, linked to the Home page. Uses the local copy in public/icons
 * when present and falls back to the original image, then to the initials if neither loads (offline).
 */
const DDriveLogo: React.FC<DDriveLogoProps> = ({ size = 40, className, ring = true, linkHome = true, withName = false, nameClassName }) => {
  const [src, setSrc] = useState<string | null>(LOGO_LOCAL_URL);

  const mark = (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-white shrink-0',
        ring && 'ring-2 ring-amber-300/70 shadow-md shadow-blue-900/20',
        className
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover"
          draggable={false}
          onError={() => setSrc(src === LOGO_LOCAL_URL ? LOGO_SOURCE_URL : null)}
        />
      ) : (
        <span aria-hidden="true" className="font-montserrat font-bold text-blue-800" style={{ fontSize: size * 0.32 }}>
          DM
        </span>
      )}
    </span>
  );

  const body = (
    <>
      {mark}
      {withName && <span className={cn('font-montserrat font-bold tracking-tight', nameClassName)}>DDRiVE-M</span>}
    </>
  );

  if (!linkHome) {
    return (
      <span className="inline-flex items-center gap-2" role="img" aria-label="DDRiVE-M">
        {body}
      </span>
    );
  }
  return (
    <Link to="/" className="inline-flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700" aria-label="DDRiVE-M home">
      {body}
    </Link>
  );
};

export default DDriveLogo;
