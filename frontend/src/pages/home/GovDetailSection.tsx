import type { ReactNode, RefObject } from 'react';
import { getRiskMeta } from '../../shared/utils/riskMeta';
import styles from './GovDetailSection.module.css';
import { GovLandingMap } from './GovLandingMap';
import { SolutionChapter } from './SolutionChapter';
import { useFadeInClassName } from './useFadeInClassName';

const ALIAS = {
  selected: '△△구',
  second: '□□구',
  third: '○○군',
} as const;

const BEFORE_ITEMS = [
  '구별 사고 자료를 따로 찾아 엑셀로 붙임',
  '시 평균과 맞춰 보려면 표를 다시 만들어야 함',
  '다음 분기를 놓고 어디를 먼저 볼지 합의가 늦어짐',
  '회의 자료는 반나절 넘게 손으로 만듦',
] as const;

const AFTER_ITEMS = [
  '구를 고르면 위험도 지도와 지표가 바로 뜸',
  '보행·야간·중대·신호를 시 평균과 나란히 봄',
  '다음 분기 예측과 우선점검 순서가 같이 나옴',
  '행정 참고 리포트는 버튼 하나로 받음',
] as const;

const FLOW = [
  { num: '01', title: '지도', body: '구·군 위험도' },
  { num: '02', title: '비교', body: '시 평균 대비' },
  { num: '03', title: '추세', body: '다음 분기 예측' },
  { num: '04', title: '보고', body: '제안·PDF' },
] as const;

const TOP3 = [
  { rank: 1, name: ALIAS.selected, score: 31.2, risk: 'CRITICAL' as const },
  { rank: 2, name: ALIAS.second, score: 28.6, risk: 'HIGH' as const },
  { rank: 3, name: ALIAS.third, score: 27.4, risk: 'HIGH' as const },
] as const;

const COMPARE = [
  { label: '보행자 사고', district: 22.1, city: 18.8, worse: true },
  { label: '야간 사고', district: 42.0, city: 40.1, worse: true },
  { label: '중상 이상', district: 28.6, city: 26.1, worse: true },
  { label: '신호위반', district: 9.4, city: 10.6, worse: false },
] as const;

const TREND = [
  { label: '24-4Q', value: 193, forecast: false },
  { label: '25-1Q', value: 184, forecast: false },
  { label: '25-2Q', value: 174, forecast: false },
  { label: '25-3Q', value: 164, forecast: true },
] as const;

const SUGGESTIONS = [
  {
    title: '야간 보행 구간 조명 강화',
    body: '야간 사고 비율이 시 평균보다 높습니다. 보행 밀집 구간의 야간 조명을 우선 점검하세요.',
  },
  {
    title: '보행자 사고 다발 지점 정비',
    body: '보행자 사고 비중이 시 평균을 웃돕니다. 횡단보도·과속 단속 지점을 점검하세요.',
  },
] as const;

function FadeBlock({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, className: fadeClass } = useFadeInClassName({ threshold: 0.12 });
  return (
    <div
      ref={ref as RefObject<HTMLDivElement | null>}
      className={`${className ?? ''} ${fadeClass}`.trim()}
    >
      {children}
    </div>
  );
}

function delta(district: number, city: number): string {
  const diff = district - city;
  const sign = diff > 0 ? '↑' : '↓';
  return `${sign} ${Math.abs(diff).toFixed(1)}p`;
}

export function GovDetailSection() {
  const maxTrend = Math.max(...TREND.map((t) => t.value));

  return (
    <section id="gov-section" aria-label="지자체 솔루션 상세">
      <div className={styles.beforeAfter}>
        <div className={styles.beforeAfterInner}>
          <FadeBlock className={`${styles.baCard} ${styles.baBefore}`}>
            <p className={styles.baLabel}>보고 준비</p>
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
              반나절
              <span className={styles.baTimeLabel}>월간 자료 1건</span>
            </p>
          </FadeBlock>

          <FadeBlock className={`${styles.baCard} ${styles.baAfter}`}>
            <p className={styles.baLabel}>같은 보고, ATI에서</p>
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
              <span className={styles.baTimeLabel}>분석부터 리포트까지</span>
            </p>
          </FadeBlock>
        </div>
      </div>

      <div className={styles.main}>
        <FadeBlock className={styles.flow}>
          {FLOW.map((step, index) => (
            <div key={step.num} className={styles.flowStep}>
              {index > 0 ? (
                <span className={styles.flowLine} aria-hidden="true" />
              ) : null}
              <p className={styles.flowNum}>{step.num}</p>
              <p className={styles.flowTitle}>{step.title}</p>
              <p className={styles.flowBody}>{step.body}</p>
            </div>
          ))}
        </FadeBlock>

        <SolutionChapter className={styles.chapter}>
          <div className={styles.copy}>
            <p className={styles.kicker}>01 · 지도 · 우선점검</p>
            <h2 className={styles.title}>어디를 먼저 볼지, 지도에서 고릅니다</h2>
            <p className={styles.lead}>
              구·군을 위험도 색으로 나눕니다. 한 곳을 고르면 사고 다발 지역과
              우선점검 순위가 같이 보입니다.
            </p>
            <p className={styles.note}>
              우선점검 점수는 예측 중대사고율 기준입니다.
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>사고위험 지도 / 우선점검 점수</span>
              <span className={styles.pill}>{ALIAS.selected} 선택</span>
            </div>
            <GovLandingMap selectedLabel={ALIAS.selected} />
            <p className={styles.groupLabel}>구별 우선점검 TOP3</p>
            <table className={styles.rankTable}>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>구·군</th>
                  <th>중대율</th>
                  <th>위험</th>
                </tr>
              </thead>
              <tbody>
                {TOP3.map((item) => {
                  const risk = getRiskMeta(item.risk);
                  return (
                    <tr
                      key={item.rank}
                      className={item.rank === 1 ? styles.rankSelected : undefined}
                    >
                      <td>{item.rank}</td>
                      <td>{item.name}</td>
                      <td>{item.score.toFixed(1)}%</td>
                      <td style={{ color: risk.colorVar }}>{risk.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SolutionChapter>

        <SolutionChapter className={`${styles.chapter} ${styles.chapterFlip}`}>
          <div className={styles.copy}>
            <p className={styles.kicker}>02 · 비교 · 추세</p>
            <h2 className={styles.title}>시 평균과 다음 분기를 같이 봅니다</h2>
            <p className={styles.lead}>
              보행자·야간·중대·신호위반을 대구 평균과 나란히 비교합니다. 분기
              추세 옆에는 AI 예측이 붙어, 이번 점검이 다음 숫자와 맞는지 볼 수
              있습니다.
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>{ALIAS.selected} · 시 평균 대비</span>
              <span className={styles.meta}>예측 포함</span>
            </div>
            <div className={styles.compare}>
              {COMPARE.map((row) => (
                <div key={row.label} className={styles.compareRow}>
                  <div className={styles.compareHead}>
                    <span>{row.label}</span>
                    <span className={row.worse ? styles.deltaUp : styles.deltaDown}>
                      {delta(row.district, row.city)}
                    </span>
                  </div>
                  <div className={styles.dual}>
                    <div
                      className={`${styles.barTrack} ${styles.barTeal}`}
                      style={{ ['--bar' as string]: `${row.district * 2}%` }}
                    />
                    <div
                      className={`${styles.barTrack} ${styles.barMuted}`}
                      style={{ ['--bar' as string]: `${row.city * 2}%` }}
                    />
                  </div>
                  <div className={styles.compareVals}>
                    <span>{row.district}%</span>
                    <span>{row.city}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.trend}>
              {TREND.map((bar) => (
                <div key={bar.label} className={styles.trendCol}>
                  <span className={bar.forecast ? styles.trendValTeal : styles.trendVal}>
                    {bar.value}
                  </span>
                  <div
                    className={bar.forecast ? styles.trendForecast : styles.trendBar}
                    style={{ height: `${(bar.value / maxTrend) * 72}px` }}
                  />
                  <span className={bar.forecast ? styles.trendLabelTeal : styles.trendLabel}>
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
            <p className={styles.legend}>
              <i className={styles.dotTeal} /> {ALIAS.selected}
              <i className={styles.dotMuted} /> 시 평균
              <i className={styles.dotDash} /> 예측
            </p>
          </div>
        </SolutionChapter>

        <SolutionChapter className={styles.chapter}>
          <div className={styles.copy}>
            <p className={styles.kicker}>03 · 제안 · 리포트</p>
            <h2 className={styles.title}>점검 이유와 자료를 같이 가져갑니다</h2>
            <p className={styles.lead}>
              지표가 시 평균을 넘으면 조명·보행 구간처럼 우선 볼 지점을
              제안합니다. 같은 화면에서 행정 참고 리포트 PDF를 받을 수 있습니다.
            </p>
          </div>
          <div className={styles.viz}>
            <div className={styles.vizHead}>
              <span>우선점검 제안</span>
              <span className={styles.meta}>행정 참고</span>
            </div>
            <ul className={styles.tips}>
              {SUGGESTIONS.map((item) => (
                <li key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                </li>
              ))}
            </ul>
            <div className={styles.report}>
              <span className={styles.reportMark}>PDF</span>
              <div>
                <p>행정 참고 리포트</p>
                <small>지도 · 비교 · 추세 · 우선점검 제안 · 1부</small>
              </div>
            </div>
          </div>
        </SolutionChapter>
      </div>
    </section>
  );
}
