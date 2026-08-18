/** 라우트 전환용 — CSS smooth와 관계없이 즉시 맨 위 */
export function jumpToPageTop(): void {
  const html = document.documentElement;
  const { body } = document;
  const prevHtml = html.style.scrollBehavior;
  const prevBody = body.style.scrollBehavior;

  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  html.scrollTop = 0;
  body.scrollTop = 0;

  requestAnimationFrame(() => {
    html.style.scrollBehavior = prevHtml;
    body.style.scrollBehavior = prevBody;
  });
}
