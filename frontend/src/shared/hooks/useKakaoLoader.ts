import { useCallback, useEffect, useState } from 'react';

export type KakaoLoadStatus = 'loading' | 'loaded' | 'error';

const SCRIPT_ID = 'kakao-map-sdk';

let loadPromise: Promise<void> | null = null;

function getAppKey(): string | undefined {
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  return typeof key === 'string' && key.trim() !== '' ? key.trim() : undefined;
}

/**
 * 카카오맵 SDK 스크립트를 한 번만 삽입하고 로드한다.
 * autoload=false → kakao.maps.load() 로 초기화 시점을 잡는다.
 */
function loadKakaoSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window 없음'));
  }

  if (window.kakao?.maps) {
    return new Promise((resolve) => {
      window.kakao.maps.load(() => resolve());
    });
  }

  if (loadPromise) return loadPromise;

  const appKey = getAppKey();
  if (!appKey) {
    console.error(
      '[KakaoMap] VITE_KAKAO_MAP_APP_KEY 가 없습니다. .env 를 확인하세요.',
    );
    return Promise.reject(new Error('KAKAO_APP_KEY_MISSING'));
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const onReady = () => {
      if (!window.kakao?.maps) {
        reject(new Error('kakao.maps 없음'));
        return;
      }
      window.kakao.maps.load(() => resolve());
    };

    if (existing) {
      if (window.kakao?.maps) {
        onReady();
      } else {
        existing.addEventListener('load', onReady);
        existing.addEventListener('error', () =>
          reject(new Error('카카오맵 스크립트 로드 실패')),
        );
      }
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => onReady();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('카카오맵 스크립트 로드 실패'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface UseKakaoLoaderResult {
  status: KakaoLoadStatus;
  retry: () => void;
}

export function useKakaoLoader(): UseKakaoLoaderResult {
  const [status, setStatus] = useState<KakaoLoadStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    loadKakaoSdk()
      .then(() => {
        if (!cancelled) setStatus('loaded');
      })
      .catch((err: unknown) => {
        console.error('[KakaoMap] SDK 로드 실패', err);
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    loadPromise = null;
    setAttempt((n) => n + 1);
  }, []);

  return { status, retry };
}
