import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks which section is currently visible in the viewport using IntersectionObserver,
 * combined with hash-based route detection for initial state.
 *
 * @param sectionIds - Array of section element IDs to observe
 * @param options - Optional IntersectionObserver configuration
 * @returns The ID of the currently active (most visible) section
 */
export function useScrollSpy(
  sectionIds: string[],
  options: { rootMargin?: string; threshold?: number | number[] } = {}
) {
  const { rootMargin = '-20% 0px -60% 0px', threshold = 0 } = options;

  // Read hash from the URL on mount (strip the leading #)
  const initialHash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const [activeId, setActiveId] = useState<string>(
    initialHash && sectionIds.includes(initialHash) ? initialHash : sectionIds[0] ?? ''
  );

  // Keep track of which sections are currently intersecting and their ratios
  const visibleSections = useRef<Map<string, number>>(new Map());

  // Flag to suppress observer updates briefly after a nav click
  const isNavigating = useRef(false);
  const navTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      // While the page is smooth-scrolling from a nav click, don't override
      if (isNavigating.current) return;

      for (const entry of entries) {
        if (entry.isIntersecting) {
          visibleSections.current.set(entry.target.id, entry.intersectionRatio);
        } else {
          visibleSections.current.delete(entry.target.id);
        }
      }

      // Pick the section with the highest intersection ratio, or fall back
      // to the topmost visible section in DOM order
      if (visibleSections.current.size > 0) {
        let bestId = '';
        let bestRatio = -1;

        for (const [id, ratio] of visibleSections.current) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }

        if (bestId) {
          setActiveId(bestId);
        }
      }
    },
    []
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      visibleSections.current.clear();
    };
  }, [sectionIds, rootMargin, threshold, handleIntersection]);

  // Listen for hash changes (back/forward navigation, manual URL edits)
  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && sectionIds.includes(hash)) {
        setActiveId(hash);
        // Temporarily suppress observer so the scroll-to doesn't flicker
        isNavigating.current = true;
        clearTimeout(navTimeout.current);
        navTimeout.current = setTimeout(() => {
          isNavigating.current = false;
        }, 1000);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      clearTimeout(navTimeout.current);
    };
  }, [sectionIds]);

  /**
   * Call this when the user clicks a nav link that triggers smooth scroll.
   * It immediately sets the active section and briefly suppresses the
   * IntersectionObserver so it doesn't flicker through intermediate sections.
   */
  const scrollTo = useCallback(
    (id: string) => {
      if (sectionIds.includes(id)) {
        setActiveId(id);
        isNavigating.current = true;
        clearTimeout(navTimeout.current);
        navTimeout.current = setTimeout(() => {
          isNavigating.current = false;
        }, 1000);
      }
    },
    [sectionIds]
  );

  return { activeId, scrollTo };
}
