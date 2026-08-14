/** 랜딩 페이지 맨 위(히어로)로 스크롤 */
export function scrollToLandingTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** 스티키 랜딩 네비 하단 선에 맞춰 섹션으로 스크롤 */
export function scrollToLandingSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;

  const nav = document.querySelector<HTMLElement>('[data-landing-nav]');
  const offset = nav?.offsetHeight ?? 0;
  const top = window.scrollY + el.getBoundingClientRect().top - offset;

  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}
