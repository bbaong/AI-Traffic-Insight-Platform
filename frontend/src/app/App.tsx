import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { ScrollToTop } from './router/ScrollToTop';
import { getRefreshToken, useAuthStore } from '../shared/stores/authStore';
import { refreshSession } from '../domains/auth/api/auth';
import { useEffect } from 'react';

/* 인증 부트스트랩 */
export async function bootstrapAuth(): Promise<void> {
  const rt = getRefreshToken();
  if (!rt) return;
  const next = await refreshSession(rt);
  if (!next) {
    useAuthStore.getState().clearUser();
    return;
  }
  useAuthStore.getState().setAccessToken(next.accessToken, next.refreshToken);
}

/* 앱 컴포넌트 */
function App() {
  useEffect(() => {
    bootstrapAuth().catch(() => undefined);
  }, []);
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
