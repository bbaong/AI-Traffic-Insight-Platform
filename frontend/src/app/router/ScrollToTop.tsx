import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { jumpToPageTop } from '../../shared/utils/jumpToPageTop';

/**
 * 라우트 전환 시 이전 페이지 스크롤이 남지 않게 즉시 맨 위로.
 * (html scroll-behavior: smooth 때문에 scrollTo(0,0)만 하면 아래에서 위로 애니메이션 됨)
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  useLayoutEffect(() => {
    if (hash) return;
    jumpToPageTop();
    const id = window.requestAnimationFrame(jumpToPageTop);
    return () => window.cancelAnimationFrame(id);
  }, [pathname, hash]);

  return null;
}
