import { useEffect, useRef, useState, type ReactNode } from 'react';
import stackStyles from './solutionStack.module.css';

export function SolutionChapter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOn(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setOn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -18% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className ?? ''} ${stackStyles.reveal} ${on ? stackStyles.in : ''}`.trim()}
    >
      {children}
    </div>
  );
}
