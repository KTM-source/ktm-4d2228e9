import { ReactNode, memo } from 'react';
import { useLauncherLazySection } from '@/hooks/useLauncherVisibility';
import { cn } from '@/lib/utils';

interface LauncherSectionProps {
  children: ReactNode;
  className?: string;
  minHeight?: string;
  alwaysVisible?: boolean; // For hero/navbar sections
}

const LauncherSection = memo(({ 
  children, 
  className,
  minHeight = '200px',
  alwaysVisible = false 
}: LauncherSectionProps) => {
  const { elementRef, isInView, isElectron } = useLauncherLazySection();

  // If not in Electron or always visible, render normally
  if (!isElectron || alwaysVisible) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      ref={elementRef} 
      className={cn(className)}
      style={{ minHeight: isInView ? 'auto' : minHeight }}
    >
      {isInView ? (
        <div 
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          style={{ animationFillMode: 'both' }}
        >
          {children}
        </div>
      ) : (
        // Placeholder with minimal DOM
        <div 
          className="w-full bg-transparent" 
          style={{ height: minHeight }}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

LauncherSection.displayName = 'LauncherSection';

export default LauncherSection;
