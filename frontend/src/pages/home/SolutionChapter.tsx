import { useEffect, useRef, useState, type ReactNode } from 'react';
import stackStyles from './solutionStack.module.css';

/** 챕터 상단이 화면에 들어왔는지 — 높이(72vh)와 무관 */
function isChapterTopInView(node: HTMLElement): boolean {
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
    let observer: IntersectionObserver;

    const checkVisible = () => {
      if (isChapterTopInView(node)) {
        reveal();
      }
    };

    const reveal = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      window.removeEventListener('scroll', checkVisible);

      const apply = () => setOn(true);

      if (playOnMount) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            timers.push(window.setTimeout(apply, 60));
          });
        });
      } else {
        apply();
      }
    };

    // threshold 0: 챕터가 커도 상단이 루트에 닿는 순간
    // rootMargin 하단 -8%: 화면 맨 끝 1px이 아니라, 조금 올라왔을 때
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
        }
      },
      {
        threshold: 0,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    window.addEventListener('scroll', checkVisible, { passive: true });

    // 페인트 이후 관찰 — 라우트 전환 때 이전 페이지 스크롤로 전부 reveal 되는 것 방지
    let innerStartId = 0;
    const startId = window.requestAnimationFrame(() => {
      innerStartId = window.requestAnimationFrame(() => {
        observer.observe(node);
        checkVisible();
      });
    });
    timers.push(window.setTimeout(checkVisible, 120));

    return () => {
      window.cancelAnimationFrame(startId);
      window.cancelAnimationFrame(innerStartId);
      observer.disconnect();
      window.removeEventListener('scroll', checkVisible);
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
