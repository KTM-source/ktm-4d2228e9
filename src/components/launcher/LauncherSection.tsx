import { ReactNode, memo } from 'react';
import { useLauncherLazySection } from '@/hooks/useLauncherVisibility';
import { cn } from '@/lib/utils';

interface LauncherSectionProps {
  children: ReactNode;
  className?: string;
  minHeight?: string;
  alwaysVisible?: boolean; // For navbar only
}

const LauncherSection = memo(({ 
  children, 
  className,
  minHeight = '300px',
  alwaysVisible = false 
}: LauncherSectionProps) => {
  const { elementRef, isInView, isElectron } = useLauncherLazySection();

  // If not in Electron or always visible (navbar), render normally
  if (!isElectron || alwaysVisible) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={elementRef} 
      className={cn(className)}
      style={{ minHeight }}
    >
      {isInView ? (
        <div className="animate-fade-in">
          {children}
        </div>
      ) : null}
    </div>
  );
});

LauncherSection.displayName = 'LauncherSection';

export default LauncherSection;
