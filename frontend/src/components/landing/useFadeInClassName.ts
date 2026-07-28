import { useEffect, useRef, useState, type RefObject } from 'react';
import fadeStyles from './fadeIn.module.css';

interface UseFadeInOptions {
  threshold?: number;
}

export function useFadeInClassName(
  options: UseFadeInOptions = {},
): {
  ref: RefObject<HTMLElement | null>;
  className: string;
} {
  const { threshold = 0.15 } = options;
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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const className = visible
    ? `${fadeStyles.fadeIn} ${fadeStyles.fadeInVisible}`
    : fadeStyles.fadeIn;

  return { ref, className };
}
