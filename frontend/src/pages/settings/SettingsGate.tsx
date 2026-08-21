import { SettingsPage } from './SettingsPage';
import { SettingsVerifyPage } from './SettingsVerifyPage';
import { useSettingsVerifyStore } from '../../shared/stores/settingsVerifyStore';

/** 설정 진입 전 비밀번호 재확인 게이트 */
export function SettingsGate() {
  const verifiedUntil = useSettingsVerifyStore((s) => s.verifiedUntil);
  const isVerified = useSettingsVerifyStore((s) => s.isVerified);

  // verifiedUntil 구독으로 만료/갱신 시 리렌더
  void verifiedUntil;

  if (!isVerified()) {
    return <SettingsVerifyPage />;
  }

  return <SettingsPage />;
}

export default SettingsGate;
