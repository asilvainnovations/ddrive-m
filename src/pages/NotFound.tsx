import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 max-w-md">
        <h1 className="text-4xl font-bold mb-3 font-montserrat text-slate-900 dark:text-white">Page not found</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 font-poppins">
          There is no page at <code className="px-1 rounded bg-slate-100 dark:bg-slate-800">{location.pathname}</code>.
          Use the menu, or go to the Home page.
        </p>
        <Link to="/" className="text-blue-700 dark:text-blue-400 font-semibold underline">
          Go to the Home page
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
