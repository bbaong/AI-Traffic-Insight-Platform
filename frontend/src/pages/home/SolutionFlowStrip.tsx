import type { RefObject } from 'react';
import motionStyles from './solutionMotion.module.css';
import { useFadeInClassName } from './useFadeInClassName';

type FlowStep = {
  num: string;
  title: string;
  body: string;
};

interface SolutionFlowStripProps {
  steps: readonly FlowStep[];
  flowClassName: string;
  stepClassName: string;
  lineClassName: string;
  numClassName: string;
  titleClassName: string;
  bodyClassName: string;
}

export function SolutionFlowStrip({
  steps,
  flowClassName,
  stepClassName,
  lineClassName,
  numClassName,
  titleClassName,
  bodyClassName,
}: SolutionFlowStripProps) {
  const { ref, className, visible } = useFadeInClassName({
    threshold: 0.2,
    checkOnMount: true,
    subLanding: true,
  });

  return (
    <div
      ref={ref as RefObject<HTMLDivElement | null>}
      className={`${flowClassName} ${className} ${visible ? motionStyles.flowReady : ''}`.trim()}
    >
      {steps.map((step, index) => (
        <div key={step.num} className={`${stepClassName} ${motionStyles.flowStep}`}>
          {index > 0 ? (
            <span
              className={`${lineClassName} ${motionStyles.flowLine}`}
              aria-hidden="true"
            />
          ) : null}
          <p className={numClassName}>{step.num}</p>
          <p className={titleClassName}>{step.title}</p>
          <p className={bodyClassName}>{step.body}</p>
        </div>
      ))}
    </div>
  );
}
