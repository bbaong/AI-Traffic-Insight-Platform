import styles from './InsDetailSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const HIGHLIGHTS = [
  'AI 위험도 분석 — 0~100점 + 법규위반 성향 TOP3',
  '6대 표준 담보 추천 — 추천·제외 근거 자동 생성',
  '할인특약 5종 체크 — 마일리지·블랙박스·안전운전점수·ADAS',
  '고객 이력 자동 저장 — 전화번호로 중복 없이 관리',
  '상담 메모 숨기기·PDF 리포트 즉시 발송',
] as const;

const FLOW_STEPS = [
  {
    step: '1',
    title: '고객 정보 입력',
    body: '이름·전화번호·프로필 입력. 기존 고객이면 자동으로 불러옵니다',
  },
  {
    step: '2',
    title: 'AI 위험도 분석',
    body: '위험 점수·담보 추천·법규 성향이 즉시 산출됩니다',
  },
  {
    step: '3',
    title: '할인특약 검토',
    body: '5가지 체크리스트로 맞춤 특약 권장·제외가 판정됩니다',
  },
  {
    step: '4',
    title: '저장 · 리포트',
    body: '저장 버튼 하나로 이력 기록과 PDF 리포트가 완성됩니다',
  },
] as const;

export function InsDetailSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      id="ins-section"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="ins-detail-heading"
    >
      <div className={styles.inner}>
        <aside className={styles.mock} aria-label="고객 분석 미리보기">
          <p className={styles.mockTitle}>고객 분석 결과</p>
          <div className={styles.scoreRow}>
            <div className={styles.scoreCircle} aria-hidden="true">
              74
            </div>
            <div>
              <p className={styles.scoreLabel}>위험도 HIGH</p>
              <p className={styles.scoreMeta}>중상이상 확률 18.6% · 상위 22%</p>
            </div>
          </div>

          <p className={styles.mockTitle}>법규위반 성향 TOP3</p>
          <ul className={styles.bars}>
            <li>
              <span className={styles.barLabel}>안전운전불이행</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: '57%' }} />
              </div>
              <span className={styles.barPct}>57%</span>
            </li>
            <li>
              <span className={styles.barLabel}>안전거리미확보</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: '15%', opacity: 0.75 }}
                />
              </div>
              <span className={styles.barPct}>15%</span>
            </li>
            <li>
              <span className={styles.barLabel}>신호위반</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: '9%', opacity: 0.55 }}
                />
              </div>
              <span className={styles.barPct}>9%</span>
            </li>
          </ul>

          <p className={styles.mockTitle}>맞춤 특약 추천</p>
          <div className={styles.chips}>
            <span className={styles.chipOn}>자기신체사고 상향</span>
            <span className={styles.chipOn}>블랙박스 할인특약</span>
            <span className={styles.chipOff}>대물배상 현행 유지</span>
            <span className={styles.chipOn}>마일리지 특약 검토</span>
          </div>
        </aside>

        <div className={styles.text}>
          <p className={styles.eyebrow}>보험사 — 상담 워크플로</p>
          <h2 id="ins-detail-heading" className={styles.title}>
            상담 준비 20분을
            <br />
            5분으로
          </h2>
          <p className={styles.body}>
            고객 조건을 입력하면 AI가 위험도 점수·법규위반 성향·담보 추천·할인특약
            판정을 한꺼번에 완성합니다. 저장 버튼 하나로 고객 이력과 PDF
            리포트까지.
          </p>
          <ul className={styles.list}>
            {HIGHLIGHTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.flowWrap}>
        <div className={styles.flowInner}>
          <p className={styles.flowEyebrow}>보험사 사용 흐름</p>
          <h3 className={styles.flowTitle}>4단계로 완성되는 상담</h3>
          <p className={styles.flowSub}>
            고객이 앉기 전에 분석을 마치고, 고객이 자리를 뜨기 전에 리포트를 건넬
            수 있습니다.
          </p>
          <ol className={styles.flowGrid}>
            {FLOW_STEPS.map((item) => (
              <li key={item.step} className={styles.flowStep}>
                <span className={styles.flowNum}>{item.step}</span>
                <h4 className={styles.flowStepTitle}>{item.title}</h4>
                <p className={styles.flowStepBody}>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
