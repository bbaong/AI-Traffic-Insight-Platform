import type { ReactNode, RefObject } from 'react';
import motionStyles from './solutionMotion.module.css';
import { useFadeInClassName } from './useFadeInClassName';

interface SolutionBeforeAfterProps {
  innerClassName: string;
  before: ReactNode;
  after: ReactNode;
}

export function SolutionBeforeAfter({
  innerClassName,
  before,
  after,
}: SolutionBeforeAfterProps) {
  const { ref, className, visible } = useFadeInClassName({
    threshold: 0.12,
    checkOnMount: true,
    subLanding: true,
  });

  return (
    <div
      ref={ref as RefObject<HTMLDivElement | null>}
      className={`${innerClassName} ${className} ${visible ? motionStyles.baReady : ''}`.trim()}
    >
      <div className={motionStyles.baCard}>{before}</div>
      <div className={motionStyles.baCard}>{after}</div>
    </div>
  );
}
