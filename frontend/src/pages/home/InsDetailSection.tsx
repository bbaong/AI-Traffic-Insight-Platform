import styles from './InsDetailSection.module.css';
import { SolutionBeforeAfter } from './SolutionBeforeAfter';
import { SolutionChapter } from './SolutionChapter';
import { SolutionFlowStrip } from './SolutionFlowStrip';
import motionStyles from './solutionMotion.module.css';

const BEFORE_ITEMS = [
  '서류·엑셀·약관을 오가며 담보를 하나씩 확인',
  '경험으로 권유하다 보니 고객이 근거를 묻기 어려움',
  '상담이 끝날 때마다 리포트를 다시 작성',
  '전화번호만으로는 이전 상담을 바로 못 찾음',
] as const;

const AFTER_ITEMS = [
  '성별·연령·차종·지역만 넣으면 위험 점수가 나옴',
  '법규 경향과 담보 추천이 같이 떠서 말할 근거가 생김',
  '특약 5종은 권장·확인·제외로 바로 판정',
  '저장하면 이력과 PDF가 한 번에 남음',
] as const;

const FLOW = [
  { num: '01', title: '프로필', body: '고객과 차량 조건' },
  { num: '02', title: '위험도', body: '점수·법규 경향' },
  { num: '03', title: '특약', body: '담보·할인 판정' },
  { num: '04', title: '저장', body: '이력·PDF' },
] as const;

const VIOLATIONS = [
  { label: '안전운전불이행', pct: 57 },
  { label: '안전거리미확보', pct: 15 },
  { label: '신호위반', pct: 9 },
] as const;

const COVERAGES = [
  { name: '대인배상Ⅰ', on: true },
  { name: '대인배상Ⅱ', on: true },
  { name: '자기차량손해', on: true },
  { name: '대물배상', on: false },
  { name: '자기신체사고', on: false },
  { name: '무보험차상해', on: false },
] as const;

const RIDERS = [
  { name: '마일리지', status: '권장' as const },
  { name: '블랙박스', status: '권장' as const },
  { name: '안전운전점수', status: '확인' as const },
  { name: '전방충돌방지', status: '제외' as const },
  { name: '차선이탈경고', status: '확인' as const },
] as const;

const HISTORY = [
  { when: '2026.08.12', type: '갱신', note: '위험도 74 · 담보 3건 권장' },
  { when: '2026.03.04', type: '신규', note: '첫 상담 · 특약 확인 남김' },
] as const;

function ScoreGauge() {
  return (
    <div className={styles.gauge} aria-hidden="true">
      <svg viewBox="0 0 200 118" className={styles.gaugeSvg}>
        <path
          className={styles.gaugeTrack}
          d="M22 100 A78 78 0 0 1 178 100"
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          pathLength="100"
        />
        <path
          className={styles.gaugeValue}
          d="M22 100 A78 78 0 0 1 178 100"
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          pathLength="100"
        />
      </svg>
      <div className={styles.gaugeLabel}>
        <strong>74</strong>
        <span>HIGH</span>
      </div>
    </div>
  );
}

export function InsDetailSection() {
  return (
    <section id="ins-section" aria-label="보험사 솔루션 상세">
      <div className={styles.beforeAfter}>
        <SolutionBeforeAfter
          innerClassName={styles.beforeAfterInner}
          before={
            <div className={`${styles.baCard} ${styles.baBefore}`}>
              <p className={styles.baLabel}>상담 준비</p>
              <ul className={styles.baList}>
                {BEFORE_ITEMS.map((item) => (
                  <li key={item} className={styles.baItem}>
                    <span className={styles.baX} aria-hidden="true">
                      ×
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className={styles.baTime}>
                20~30분
                <span className={styles.baTimeLabel}>고객 한 명</span>
              </p>
            </div>
          }
          after={
            <div className={`${styles.baCard} ${styles.baAfter}`}>
              <p className={styles.baLabel}>같은 상담, ATI에서</p>
              <ul className={styles.baList}>
                {AFTER_ITEMS.map((item) => (
                  <li key={item} className={styles.baItem}>
                    <span className={styles.baChk} aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className={styles.baTime}>
                약 5분
                <span className={styles.baTimeLabel}>분석부터 저장까지</span>
              </p>
            </div>
          }
        />
      </div>

      <div className={styles.main}>
        <SolutionFlowStrip
          steps={FLOW}
          flowClassName={styles.flow}
          stepClassName={styles.flowStep}
          lineClassName={styles.flowLine}
          numClassName={styles.flowNum}
          titleClassName={styles.flowTitle}
          bodyClassName={styles.flowBody}
        />

        <SolutionChapter className={styles.chapter} playOnMount>
          <div className={styles.copy}>
            <p className={styles.kicker}>01 · 위험도</p>
            <h2 className={styles.title}>이 고객, 어디가 위험한지 먼저 봅니다</h2>
            <p className={styles.lead}>
              성별·연령·차종·지역을 넣으면 0~100 점수와 등급이 나옵니다.
              법규위반 성향 TOP3가 같이 떠서, 상담 첫마디를 데이터로 고를 수
              있습니다.
            </p>
            <p className={styles.note}>
              유사 고객군 대비 상위 22% · 중상이상 확률 18.6%
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>AI 고객 분석</span>
              <span className={styles.pill}>HIGH</span>
            </div>
            <ScoreGauge />
            <p className={styles.script}>
              안전운전불이행 경향이 상대적으로 높습니다. 대인배상Ⅰ·Ⅱ를 우선
              확인하고, 안전운전 안내를 권장합니다.
            </p>
            <div className={styles.bars}>
              {VIOLATIONS.map((row) => (
                <div key={row.label} className={styles.barRow}>
                  <span>{row.label}</span>
                  <div
                    className={styles.barTrack}
                    style={{ ['--bar' as string]: `${row.pct}%` }}
                  />
                  <em>{row.pct}%</em>
                </div>
              ))}
            </div>
          </div>
        </SolutionChapter>

        <SolutionChapter className={`${styles.chapter} ${styles.chapterFlip}`}>
          <div className={styles.copy}>
            <p className={styles.kicker}>02 · 담보 · 특약</p>
            <h2 className={styles.title}>말할 담보와, 깎을 특약을 한 화면에서</h2>
            <p className={styles.lead}>
              표준약관 6대 담보는 추천·현행 유지로 갈립니다. 할인특약 5종은
              마일리지·블랙박스·안전운전점수·FCW·LDWS를 권장·확인·제외로
              판정합니다.
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>추천 요약</span>
              <span className={styles.meta}>표준약관 6대 · 할인특약 5종</span>
            </div>
            <p className={styles.groupLabel}>6대 담보</p>
            <div className={styles.chips}>
              {COVERAGES.map((item) => (
                <span
                  key={item.name}
                  className={item.on ? styles.chipOn : styles.chipOff}
                >
                  {item.name}
                  <i>{item.on ? '추천' : '유지'}</i>
                </span>
              ))}
            </div>
            <p className={styles.groupLabel}>할인특약</p>
            <ul className={styles.riders}>
              {RIDERS.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <b
                    className={
                      item.status === '권장'
                        ? styles.stOn
                        : item.status === '확인'
                          ? styles.stCheck
                          : styles.stOff
                    }
                  >
                    {item.status}
                  </b>
                </li>
              ))}
            </ul>
          </div>
        </SolutionChapter>

        <SolutionChapter className={styles.chapter}>
          <div className={styles.copy}>
            <p className={styles.kicker}>03 · 이력 · 리포트</p>
            <h2 className={styles.title}>다음 상담은, 처음부터 다시 하지 않습니다</h2>
            <p className={styles.lead}>
              전화번호로 고객을 이어 붙입니다. 저장하면 분석·특약·메모가 이력에
              남고, 상담 참고 리포트 PDF를 바로 받을 수 있습니다.
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>고객 000 · OO구 · 승용</span>
              <span className={styles.meta}>최근 상담</span>
            </div>
            <ol className={styles.timeline}>
              {HISTORY.map((item) => (
                <li key={item.when}>
                  <span className={styles.tlWhen}>{item.when}</span>
                  <span className={styles.tlType}>{item.type}</span>
                  <span className={styles.tlNote}>{item.note}</span>
                </li>
              ))}
            </ol>
            <div className={`${styles.report} ${motionStyles.report}`}>
              <span className={styles.reportMark}>PDF</span>
              <div>
                <p>상담 참고 리포트</p>
                <small>위험도 · 담보 추천 · 특약 판정 · 1장</small>
              </div>
            </div>
          </div>
        </SolutionChapter>
      </div>
    </section>
  );
}
