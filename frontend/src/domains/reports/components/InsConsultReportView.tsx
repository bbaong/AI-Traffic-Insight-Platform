import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { getInsRiskMeta, toRiskGrade } from '../../ins/utils/riskMeta';
import type { InsReportDraft } from '../stores/insReportDraftStore';
import { ReportCoverageGrid } from './ReportCoverageGrid';
import styles from './InsConsultReportView.module.css';

const SUMMARY_ROWS: {
  key: keyof NonNullable<InsReportDraft['checklist']>;
  label: string;
}[] = [
  { key: 'mileage', label: '주행거리' },
  { key: 'blackbox', label: '블랙박스' },
  { key: 'safedrive', label: '안전운전점수' },
  { key: 'fcw', label: '전방충돌방지장치' },
  { key: 'ldw', label: '차선이탈경고장치' },
];

type Props = {
  draft: InsReportDraft;
  orgLabel?: string;
  pdfLoading: boolean;
  pdfError: string | null;
  includeMemo: boolean;
  onIncludeMemoChange: (v: boolean) => void;
  onCreatePdf: () => void;
};

export function InsConsultReportView({
  draft,
  orgLabel = '보험사',
  pdfLoading,
  pdfError,
  includeMemo,
  onIncludeMemoChange,
  onCreatePdf,
}: Props) {
  const score = Math.min(100, Math.max(0, Number(draft.위험도 ?? 0)));
  const grade = draft.예측등급
    ? toRiskGrade(String(draft.예측등급))
    : null;
  const meta = grade ? getInsRiskMeta(grade) : null;
  const titleName = draft.고객명?.trim() || '고객';

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={ROUTES.DASHBOARD_INS}>
        ← 대시보드로 돌아가기
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{titleName} 고객 상담 참고 리포트</h1>
        <p className={styles.sub}>
          분석일 {draft.analyzedAt ?? '-'} | {draft.orgName ?? orgLabel}
        </p>
      </header>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className={styles.panel}>
            <dl className={styles.customerRow}>
              <div>
                <dt>성명</dt>
                <dd>{draft.고객명 || '-'}</dd>
              </div>
              <div>
                <dt>연령대</dt>
                <dd>{draft.연령대}</dd>
              </div>
              <div>
                <dt>차종</dt>
                <dd>{draft.차종}</dd>
              </div>
              <div>
                <dt>지역</dt>
                <dd>{draft.구군}</dd>
              </div>
            </dl>

            <div className={styles.scoreBlock}>
              <div className={styles.scoreTop}>
                <span className={styles.scoreLabel}>위험점수</span>
                <span className={styles.scoreNum}>
                  {score.toFixed(1)}{' '}
                  <span className={styles.scoreDenom}>/ 100</span>
                </span>
              </div>
              <div className={styles.gaugeWrap}>
                {meta ? (
                  <span
                    className={styles.gradeFloat}
                    style={{
                      left: `${score}%`,
                      color: meta.color,
                      borderColor: meta.color,
                    }}
                  >
                    {meta.label}
                  </span>
                ) : null}
                <div
                  className={styles.gaugeTrack}
                  role="img"
                  aria-label={`위험 점수 ${score.toFixed(1)}점`}
                >
                  <div className={styles.gaugeFill} />
                  <span
                    className={styles.gaugeMarker}
                    style={{ left: `${score}%` }}
                  />
                </div>
                <div className={styles.gaugeScale}>
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>표준 6대 담보 추천 결과</h2>
            <ReportCoverageGrid items={draft.담보추천 ?? []} />
          </section>
        </div>

        <aside className={styles.side}>
          <h2 className={styles.sideTitle}># 상담 요약</h2>
          <dl className={styles.summaryList}>
            {SUMMARY_ROWS.map(({ key, label }) => (
              <div key={key} className={styles.summaryRow}>
                <dt>{label}</dt>
                <dd>{draft.checklist?.[key] || '-'}</dd>
              </div>
            ))}
            <div className={styles.summaryRow}>
              <dt>상담 유형</dt>
              <dd>{draft.consultType || '신규'}</dd>
            </div>
            {includeMemo ? (
                <div className={styles.summaryRow}>
                    <dt>상담 메모</dt>
                    <dd className={styles.memo}>{draft.memo?.trim() || '-'}</dd>
                </div>
            ) : null}
          </dl>

          <div className={styles.sideFooter}>
            {draft.memo ? (
              <label className={styles.memoInclude}>
                <input
                  type="checkbox"
                  checked={includeMemo}
                  onChange={(e) => onIncludeMemoChange(e.target.checked)}
                />
                PDF에 메모 포함
              </label>
            ) : null}

            {pdfError ? (
              <p className={styles.error} role="alert">
                {pdfError}
              </p>
            ) : null}

            <button
              type="button"
              className={styles.pdfBtn}
              onClick={onCreatePdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? '생성 중…' : '↓ PDF 다운로드'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}