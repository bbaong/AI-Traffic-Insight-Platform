import { useEffect, useRef, useState, type RefObject } from 'react';
import fadeStyles from './fadeIn.module.css';
import solutionFadeStyles from './solutionFade.module.css';

interface UseFadeInOptions {
  threshold?: number;
  checkOnMount?: boolean;
  /** 서브 랜딩(/solutions/gov|ins) 전용 느린 fade */
  subLanding?: boolean;
}

function isNodeInView(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewHeight * 0.92 && rect.bottom > viewHeight * 0.05;
}

export function useFadeInClassName(
  options: UseFadeInOptions = {},
): {
  ref: RefObject<HTMLElement | null>;
  className: string;
  visible: boolean;
} {
  const { threshold = 0.15, checkOnMount = false, subLanding = false } = options;
  const styles = subLanding ? solutionFadeStyles : fadeStyles;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    if (prefersReduced) {
      setVisible(true);
      return;
    }

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setVisible(true);
      observer.disconnect();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
        }
      },
      { threshold },
    );

    observer.observe(node);

    const timers: number[] = [];

    if (checkOnMount) {
      const checkVisible = () => {
        if (isNodeInView(node)) {
          reveal();
        }
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(checkVisible);
      });
      timers.push(window.setTimeout(checkVisible, 120));
      timers.push(window.setTimeout(checkVisible, 400));
    }

    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [threshold, checkOnMount]);

  const className = visible
    ? `${styles.fadeIn} ${styles.fadeInVisible}`
    : styles.fadeIn;

  return { ref, className, visible };
}
