import { useState, useEffect, useRef, useCallback } from 'react';
import { useElectron } from './useElectron';

interface VisibilityState {
  isVisible: boolean;
  hasBeenVisible: boolean;
}

export const useLauncherVisibility = (threshold = 0.1) => {
  const { isElectron } = useElectron();
  const [visibilityState, setVisibilityState] = useState<VisibilityState>({
    isVisible: !isElectron, // Always visible if not in Electron
    hasBeenVisible: !isElectron,
  });
  const elementRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // If not in Electron, always show content
    if (!isElectron) {
      setVisibilityState({ isVisible: true, hasBeenVisible: true });
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setVisibilityState((prev) => ({
            isVisible: entry.isIntersecting,
            hasBeenVisible: prev.hasBeenVisible || entry.isIntersecting,
          }));
        });
      },
      {
        threshold,
        rootMargin: '100px 0px', // Start loading slightly before visible
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isElectron, threshold]);

  return {
    elementRef,
    isVisible: visibilityState.isVisible,
    hasBeenVisible: visibilityState.hasBeenVisible,
    shouldRender: !isElectron || visibilityState.isVisible || visibilityState.hasBeenVisible,
    isElectron,
  };
};

// Hook for sections that should completely unmount when not visible
export const useLauncherLazySection = (threshold = 0.05) => {
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
          setIsInView(entry.isIntersecting);
        });
      },
      {
        threshold,
        rootMargin: '200px 0px', // Load before it's fully visible
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
