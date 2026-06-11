import { useEffect, useState } from 'react';

export function useRoute() {
  const [route, setRoute] = useState(window.location.pathname + window.location.search);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (href: string) => {
    window.history.pushState({}, '', href);
    setRoute(window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    path: route.split('?')[0],
    query: new URLSearchParams(route.split('?')[1] || ''),
    navigate,
  };
}
