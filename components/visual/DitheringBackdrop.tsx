import { Dithering } from '@paper-design/shaders-react';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

import { cn } from '../ui';

interface DitheringBackdropProps {
  className?: string;
  minViewportWidth?: number;
  colorBack?: string;
  colorFront?: string;
  speed?: number;
  size?: number;
  maxPixelCount?: number;
}

/**
 * Mounts WebGL only while the backdrop is visible and its breakpoint matches.
 * The shader library also pauses its animation when the document is hidden.
 */
export function DitheringBackdrop({
  className,
  minViewportWidth = 1024,
  colorBack = 'transparent',
  colorFront = '#ffffff',
  speed = 0.45,
  size = 2.5,
  maxPixelCount = 800_000,
}: DitheringBackdropProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [breakpointMatches, setBreakpointMatches] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${minViewportWidth}px)`);
    const update = () => setBreakpointMatches(media.matches && document.visibilityState === 'visible');
    update();
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [minViewportWidth]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => setIsVisible(entries.some(entry => entry.isIntersecting)),
      { rootMargin: '120px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={cn('pointer-events-none', className)} aria-hidden="true">
      {breakpointMatches && isVisible && (
        <Dithering
          width="100%"
          height="100%"
          colorBack={colorBack}
          colorFront={colorFront}
          shape="warp"
          type="4x4"
          size={size}
          speed={prefersReducedMotion ? 0 : speed}
          minPixelRatio={0.75}
          maxPixelCount={maxPixelCount}
          className="h-full w-full"
        />
      )}
    </div>
  );
}
