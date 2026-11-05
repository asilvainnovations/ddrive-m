import React, { useEffect } from 'react';

// Blue header band used by the public pages, matching the Home page hero.
const PageHeader: React.FC<{ title: string; intro?: React.ReactNode; eyebrow?: string; children?: React.ReactNode }> = ({ title, intro, eyebrow, children }) => {
  useEffect(() => {
    document.title = `${title} | DDRiVE-M`;
  }, [title]);
  return (
    <section className="bg-gradient-to-br from-blue-900 via-blue-900 to-sky-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        {eyebrow && <p className="text-amber-300 font-semibold text-sm tracking-widest uppercase mb-3">{eyebrow}</p>}
        <h1 className="font-montserrat font-extrabold text-3xl sm:text-4xl">{title}</h1>
        {intro && <div className="mt-4 text-blue-100">{intro}</div>}
        {children}
      </div>
    </section>
  );
};

export default PageHeader;
