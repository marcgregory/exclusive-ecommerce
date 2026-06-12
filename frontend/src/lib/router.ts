import { useEffect, useState } from 'react';

export function useRoute() {
  const getCurrentRoute = () => window.location.pathname + window.location.search + window.location.hash;
  const [route, setRoute] = useState(getCurrentRoute);

  useEffect(() => {
    const onPop = () => setRoute(getCurrentRoute());
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
    };
  }, []);

  const navigate = (href: string) => {
    window.history.pushState({}, '', href);
    setRoute(getCurrentRoute());
    if (window.location.hash) {
      window.requestAnimationFrame(() => {
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return {
    path: route.split(/[?#]/)[0],
    query: new URLSearchParams(route.split('?')[1]?.split('#')[0] || ''),
    navigate,
  };
}
