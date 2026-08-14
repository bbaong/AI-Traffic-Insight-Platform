import { useEffect, useRef, useState, type ReactNode } from 'react';
import stackStyles from './solutionStack.module.css';

function isNodeInView(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < viewHeight * 0.88 && rect.bottom > viewHeight * 0.08;
}

export function SolutionChapter({
  children,
  className,
  playOnMount = false,
}: {
  children: ReactNode;
  className?: string;
  playOnMount?: boolean;
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

    let done = false;
    const timers: number[] = [];

    const reveal = () => {
      if (done) return;
      done = true;
      observer.disconnect();

      const apply = () => setOn(true);

      if (playOnMount) {
        // 초기 CSS 상태가 먼저 그려진 뒤 transition이 실행되도록 지연
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            timers.push(window.setTimeout(apply, 60));
          });
        });
      } else {
        apply();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
        }
      },
      {
        threshold: 0.12,
        rootMargin: playOnMount ? '0px 0px -6% 0px' : '0px 0px -18% 0px',
      },
    );

    observer.observe(node);

    const checkVisible = () => {
      if (isNodeInView(node)) {
        reveal();
      }
    };

    if (playOnMount) {
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
  }, [playOnMount]);

  return (
    <div
      ref={ref}
      data-revealed={on ? '' : undefined}
      className={`${className ?? ''} ${stackStyles.reveal} ${on ? stackStyles.in : ''}`.trim()}
    >
      {children}
    </div>
  );
}
