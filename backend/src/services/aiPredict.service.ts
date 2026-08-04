// // AI 위험도 예측 (DB 쓰기 없음)

// export async function predictRisk(_input: unknown) {
//   // TODO: AI_SERVICE_URL /predict 호출
//   return null;
// }


const AI_BASE = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export async function predictRisk(input: {
  구군: string;
  연령대: string;
  성별: string;
  차종: string;
}) {
  const res = await fetch(`${AI_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      주야: '주간',
      노면상태: '건조',
    }),
  });
  if (!res.ok) throw new Error('AI 추론 실패');
  return res.json();
}