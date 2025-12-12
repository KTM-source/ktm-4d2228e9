import { useState, useEffect, useRef } from 'react';
import { useElectron } from './useElectron';

// Hook for sections that should completely unmount when not visible
// This is aggressive - sections are removed from DOM when out of view
export const useLauncherLazySection = (threshold = 0.1) => {
  const { isElectron } = useElectron();
  const [isInView, setIsInView] = useState(!isElectron);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isElectron) {
      setIsInView(true);
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Only show when intersecting, hide immediately when not
          setIsInView(entry.isIntersecting);
        });
      },
      {
        threshold,
        // Small margin to start loading just before visible
        rootMargin: '50px 0px',
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isElectron, threshold]);

  return {
    elementRef,
    isInView,
    isElectron,
  };
};
