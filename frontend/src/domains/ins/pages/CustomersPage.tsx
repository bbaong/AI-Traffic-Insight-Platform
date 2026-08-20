import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ReportDrawer } from '../components/customers/ReportDrawer';
import { InsChatPanel } from '../components/InsChatPanel';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import {
  CONSULTATION_TYPE_META,
  RIDER_BADGE_META,
  RIDER_KEY_LABEL,
  RISK_GRADE_META,
  consultationTypeLabel,
  formatConsultDate,
  formatConsultDateTime,
  genderLabel,
  scoreToRiskGrade,
  toConsultationType,
  toRiderBadge,
} from '../constants/insEnums';
import { useAuthStore } from '../../../shared/stores/authStore';
import styles from './CustomersPage.module.css';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { useCustomersList } from '../hooks/useCustomersList';
import { useCustomerDetail } from '../hooks/useCustomerDetail';

export function CustomersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?.userId;

  const {
    query,
    setQuery,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    setPage,
    list,
    listLoading,
    listError,
    selectedId,
    selectCustomer,
    filteredList,
    pagedList,
    safePage,
    pageCount,
    checkedIds,
    checkedCustomers,
    allPageChecked,
    somePageChecked,
    toggleChecked,
    togglePageChecks,
    hideOpen,
    setHideOpen,
    hiding,
    hideError,
    setHideError,
    confirmHide,
    resetFilters,
  } = useCustomersList(userId);

  const selectedCustomerFromList =
    list.find((r) => r.customerId === selectedId) ?? null;

  const {
    detail,
    detailLoading,
    detailError,
    selectedConsult,
    setSelectedConsultId,
    filteredConsults,
    profile,
    riskConsult,
    riskMeta,
    riskPct,
    reportOpen,
    setReportOpen,
    reportLoading,
    reportItems,
    openReportDrawer,
    openHistoryReport,
  } = useCustomerDetail({
    selectedId,
    userId,
    selectedCustomerName: selectedCustomerFromList?.name ?? '',
    orgName: user?.orgName,
  });

  const selectedCustomer =
    selectedCustomerFromList ?? detail?.customer ?? null;

  const occScore = finiteScore(riskConsult?.occScore);
  const sevScore = finiteScore(riskConsult?.sevScore);
  const hasRiskScore = riskConsult?.riskScore != null && riskMeta != null;
  const hasRiskAxes = occScore != null && sevScore != null;
  const consultPoint = riskConsult?.consultPoint?.trim() || '';

  return (
    <div className={styles.page}>
      <div className={styles.filterBar}>
        <label className={styles.searchWrap}>
          <span className={styles.fieldLabel}>고객명 / 휴대폰 번호 검색</span>
          <span className={styles.searchBox}>
            <SearchIcon />
            <input
              className={styles.searchInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 또는 휴대폰 번호"
            />
          </span>
        </label>
        <label className={styles.dateWrap}>
          <span className={styles.fieldLabel}>최근 상담일</span>
          <div className={styles.dateRow}>
            <input
              type="date"
              className={styles.dateInput}
              value={fromDate}
              onClick={(e) => e.currentTarget.showPicker?.()}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <span className={styles.tilde}>–</span>
            <input
              type="date"
              className={styles.dateInput}
              value={toDate}
              onClick={(e) => e.currentTarget.showPicker?.()}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </label>
        <button type="button" className={styles.resetBtn} onClick={resetFilters}>
          <ResetIcon />
          초기화
        </button>
      </div>

      <div className={styles.grid}>
        <section className={styles.listCard} aria-label="고객 목록">
          <div className={styles.listHead}>
            <h2 className={styles.cardTitle}>고객 목록</h2>
            <button
              type="button"
              className={styles.deleteBtn}
              disabled={checkedCustomers.length === 0 || hiding}
              onClick={() => {
                setHideError(null);
                setHideOpen(true);
              }}
            >
              삭제
              {checkedCustomers.length > 0 ? ` (${checkedCustomers.length})` : ''}
            </button>
          </div>
          {hideError ? (
            <p className={styles.error} role="alert">
              {hideError}
            </p>
          ) : null}
          {listLoading ? (
            <p className={styles.hint}>목록을 불러오는 중…</p>
          ) : listError ? (
            <p className={styles.error} role="alert">
              {listError}
            </p>
          ) : pagedList.length === 0 ? (
            <p className={styles.hint}>조건에 맞는 고객이 없습니다.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input
                        type="checkbox"
                        className={styles.check}
                        checked={allPageChecked}
                        ref={(el) => {
                          if (el) {
                            el.indeterminate = somePageChecked && !allPageChecked;
                          }
                        }}
                        onChange={togglePageChecks}
                        aria-label="현재 페이지 고객 전체 선택"
                      />
                    </th>
                    <th>고객명</th>
                    <th>휴대폰 번호</th>
                    <th>최근 상담일</th>
                    <th>상담 수</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedList.map((row) => {
                    const active = row.customerId === selectedId;
                    const checked = checkedIds.has(row.customerId);
                    return (
                      <tr
                        key={row.customerId}
                        className={active ? styles.rowActive : ''}
                        onClick={() => selectCustomer(row.customerId)}
                      >
                        <td className={styles.checkCol}>
                          <input
                            type="checkbox"
                            className={styles.check}
                            checked={checked}
                            onChange={(e) =>
                              toggleChecked(row.customerId, e.target.checked)
                            }
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`${row.name} 선택`}
                          />
                        </td>
                        <td className={styles.nameCell}>{row.name}</td>
                        <td>{row.phone}</td>
                        <td>{formatConsultDate(row.lastConsultedAt)}</td>
                        <td>{row.consultationCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!listLoading && filteredList.length > 0 ? (
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter(
                  (n) =>
                    pageCount <= 5 ||
                    Math.abs(n - safePage) <= 1 ||
                    n === 1 ||
                    n === pageCount,
                )
                .map((n, idx, arr) => {
                  const prev = arr[idx - 1];
                  return (
                    <span key={n} className={styles.pageGroup}>
                      {prev != null && n - prev > 1 ? (
                        <span className={styles.ellipsis}>…</span>
                      ) : null}
                      <button
                        type="button"
                        className={`${styles.pageNum} ${
                          n === safePage ? styles.pageNumOn : ''
                        }`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    </span>
                  );
                })}
              <button
                type="button"
                className={styles.pageBtn}
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                ›
              </button>
            </div>
          ) : null}
        </section>

        <div className={styles.detailCol}>
          {!selectedId ? (
            <section className={styles.card}>
              <p className={styles.hint}>왼쪽에서 고객을 선택해 주세요.</p>
            </section>
          ) : detailLoading ? (
            <section className={styles.card}>
              <p className={styles.hint}>상담 이력을 불러오는 중…</p>
            </section>
          ) : detailError ? (
            <section className={styles.card}>
              <p className={styles.error} role="alert">
                {detailError}
              </p>
            </section>
          ) : (
            <>
              <h2 className={styles.detailTitle}>
                선택 고객
                <strong>{selectedCustomer?.name ?? '-'}</strong>
              </h2>

              <div className={styles.detailGrid}>
                <div className={styles.detailStack}>
                <section className={styles.card}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardTitle}>기본 정보</h3>
                    <span className={styles.metaHint}>최근 상담 기준</span>
                  </div>
                  <div className={styles.infoGrid}>
                    <InfoTile icon={<PersonIcon />} label="고객명" value={selectedCustomer?.name ?? '-'} />
                    <InfoTile icon={<PhoneIcon />} label="휴대폰 번호" value={selectedCustomer?.phone ?? '-'} />
                    <InfoTile icon={<CalendarIcon />} label="연령대" value={profile?.ageGroup ?? '-'} />
                    <InfoTile icon={<GenderIcon />} label="성별" value={genderLabel(profile?.gender)} />
                    <InfoTile icon={<CarIcon />} label="차종" value={profile?.vehicleType ?? '-'} />
                    <InfoTile icon={<PinIcon />} label="지역" value={profile?.region ?? '-'} />
                  </div>
                </section>

                <section className={`${styles.card} ${styles.historyCard}`}>
                  <div className={styles.historyHead}>
                    <h3 className={styles.cardTitle}>상담 이력</h3>
                    <button
                      type="button"
                      className={styles.addConsultBtn}
                      aria-label="새 상담 시작"
                      title="대시보드에서 새 상담"
                      disabled={!selectedCustomer}
                      onClick={() => {
                        const g = genderLabel(profile?.gender);
                        navigate(ROUTES.DASHBOARD_INS, {
                          state: {
                            fromCustomers: true,
                            customer: {
                              name: selectedCustomer?.name ?? '',
                              phone: selectedCustomer?.phone ?? '',
                            },
                            profile: {
                              gender: g === '남' || g === '여' ? g : '남',
                              age: profile?.ageGroup ?? '',
                              vehicle: profile?.vehicleType ?? '',
                              region: profile?.region ?? '',
                            },
                          },
                        });
                      }}
                    >
                    +
                  </button>
                </div>

                  {filteredConsults.length === 0 ? (
                    <p className={styles.hint}>표시할 상담 이력이 없습니다.</p>
                  ) : (
                    <div className={styles.timeline}>
                      <div className={styles.historyCols} aria-hidden>
                        <span>일시</span>
                        <span>상담 유형</span>
                        <span>메모</span>
                        <span>리포트</span>
                      </div>
                      <ul className={styles.consultList}>
                        {filteredConsults.map((c) => {
                          const type = toConsultationType(c.consultationType);
                          const meta = type
                            ? CONSULTATION_TYPE_META[type]
                            : null;
                          const active =
                            c.consultationId === selectedConsult?.consultationId;
                          const memoText = c.memo?.trim() ?? '';
                          const memoDate = formatConsultDateTime(
                            c.consultedAt,
                          ).slice(0, 10);
                          return (
                            <li key={c.consultationId}>
                              <div
                                className={`${styles.consultItem} ${
                                  active ? styles.consultActive : ''
                                }`}
                                onClick={() =>
                                  setSelectedConsultId(c.consultationId)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setSelectedConsultId(c.consultationId);
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <span className={styles.consultDot} aria-hidden />
                                <span className={styles.consultDate}>
                                  {formatConsultDateTime(c.consultedAt)}
                                </span>
                                <span
                                  className={styles.typeBadge}
                                  style={
                                    meta
                                      ? {
                                          color: meta.color,
                                          background: meta.bg,
                                        }
                                      : undefined
                                  }
                                >
                                  {consultationTypeLabel(c.consultationType)}
                                </span>
                                <div
                                  className={styles.iconCell}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  {memoText ? (
                                    <HistoryMemoPopover
                                      title={`${memoDate} 상담 메모`}
                                      body={memoText}
                                    />
                                  ) : (
                                    <span className={styles.emptyCell}>-</span>
                                  )}
                                </div>
                                <div
                                  className={styles.iconCell}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className={styles.iconBtn}
                                    aria-label={`${memoDate} 상담 리포트`}
                                    onClick={() => void openHistoryReport(c)}
                                  >
                                    <ReportIcon />
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </section>
                </div>

                <div className={styles.detailStack}>
                <section className={`${styles.card} ${styles.riskCard}`}>
                  <h3 className={styles.cardTitle}>위험점수</h3>
                  <div className={styles.riskBody}>
                    <div className={styles.riskHead}>
                      <p className={styles.riskScore}>
                      {riskConsult?.riskScore != null
                        ? riskConsult.riskScore.toFixed(1)
                        : '—'}
                        <span> / 100</span>
                      </p>
                      {riskMeta ? (
                        <span
                          className={styles.riskGrade}
                          style={{
                            color: riskMeta.color,
                            background: riskMeta.bg,
                          }}
                        >
                          {riskMeta.ko}
                        </span>
                      ) : (
                        <span className={styles.axisEmptyBadge}>—</span>
                      )}
                    </div>
                    <div
                      className={styles.riskTrack}
                      role="img"
                      aria-label={
                        hasRiskScore
                          ? `위험 점수 ${riskPct.toFixed(1)}점`
                          : '위험 점수 없음'
                      }
                    >
                      <span
                        className={styles.riskThumb}
                        style={{ left: `${hasRiskScore ? riskPct : 0}%` }}
                      />
                    </div>
                    <p className={styles.riskMeta}>
                      {hasRiskScore && riskConsult
                        ? `${formatConsultDateTime(riskConsult.consultedAt)} · 상담원 ${riskConsult.counselorName ?? '-'}`
                        : '상담 이력이 없어 위험점수가 없습니다'}
                    </p>
                    <p className={styles.axisNote}>
                      {hasRiskAxes
                        ? '두 축을 곱한 순위 · 막대 합이 점수가 아닙니다'
                        : '\u00a0'}
                    </p>
                    <div className={styles.axisGrid}>
                      <AxisTile title="발생 위험" score={occScore} />
                      <AxisTile title="심도 위험" score={sevScore} />
                    </div>
                    <div className={styles.consultSlot}>
                      {consultPoint ? (
                        <div className={styles.consultPoint}>
                          <span className={styles.consultPointIcon}>
                            <PointPinIcon />
                          </span>
                          <p>
                            <strong>상담 포인트 —</strong> {consultPoint}
                          </p>
                        </div>
                      ) : (
                        <div className={styles.legacyBox}>
                          <span className={styles.legacyBadge}>
                            {!hasRiskScore
                              ? '대기'
                              : hasRiskAxes
                                ? '참고'
                                : '구버전 상담'}
                          </span>
                          <p>
                            {!hasRiskScore
                              ? '상담을 선택하면 발생·심도 결과를 볼 수 있습니다'
                              : hasRiskAxes
                                ? '이 상담에 저장된 상담 포인트가 없습니다'
                                : '이 상담은 발생·심도 데이터가 없습니다'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className={`${styles.card} ${styles.ridersCard}`}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardTitle}>특약 검토 결과</h3>
                    <div className={styles.legend} aria-label="특약 상태 범례">
                    <span className={styles.legItem} style={{ color: '#2E8B4E' }}>
                      <i style={{ background: '#2E8B4E' }} />
                      권장
                    </span>
                    <span className={styles.legItem} style={{ color: '#F77C34' }}>
                      <i style={{ background: '#F77C34' }} />
                      추가확인
                    </span>
                    <span className={styles.legItem} style={{ color: '#8290A2' }}>
                      <i style={{ background: '#8290A2' }} />
                      제외
                    </span>
                    </div>
                  </div>
                  {!selectedConsult ? (
                    <p className={styles.hint}>
                      상담을 선택하면 특약 결과를 볼 수 있습니다.
                    </p>
                  ) : selectedConsult.riders.length === 0 ? (
                    <p className={styles.hint}>
                      이 상담에 저장된 특약 결과가 없습니다.
                    </p>
                  ) : (
                    <ul className={styles.riderList}>
                      {selectedConsult.riders.map((r) => {
                        const badge = toRiderBadge(r.badge);
                        const bm = badge ? RIDER_BADGE_META[badge] : null;
                        return (
                          <li
                            key={`${r.riderKey}-${r.badge}`}
                            className={styles.riderRow}
                          >
                            <span className={styles.riderIcon} aria-hidden>
                              {riderEmoji(r.riderKey)}
                            </span>
                            <div className={styles.riderMain}>
                              <div className={styles.riderTop}>
                                <span className={styles.riderName}>
                                  {RIDER_KEY_LABEL[r.riderKey] ?? r.riderKey}
                                </span>
                                {bm ? (
                                  <span
                                    className={styles.riderBadge}
                                    style={{
                                      color: bm.color,
                                      borderColor: bm.color,
                                      background: `${bm.color}18`,
                                    }}
                                  >
                                    {bm.label}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={styles.reportBtn}
                    onClick={() => void openReportDrawer()}
                    disabled={!selectedConsult}
                  >
                    상담 참고 리포트
                  </button>
                </section>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <ReportDrawer
        open={reportOpen}
        customerName={selectedCustomer?.name ?? ''}
        consultation={selectedConsult}
        items={reportItems}
        loading={reportLoading}
        onClose={() => setReportOpen(false)}
      />
      <ConfirmDialog
        open={hideOpen}
        title="고객 삭제"
        message={
          checkedCustomers.length === 1
            ? `'${checkedCustomers[0]?.name ?? '선택한 고객'}' 님을 목록에서 삭제하시겠습니까?`
            : `선택한 ${checkedCustomers.length}명의 고객을 목록에서 삭제하시겠습니까?`
        }
        detail={
          checkedCustomers.length > 1
            ? `${checkedCustomers
                .slice(0, 8)
                .map((row) => row.name)
                .join(', ')}${checkedCustomers.length > 8 ? ' …' : ''} · 상담 이력은 보관됩니다.`
            : '상담 이력은 보관되며, 목록에서만 사라집니다.'
        }
        confirmLabel={hiding ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        busy={hiding}
        onConfirm={() => {
          void confirmHide();
        }}
        onCancel={() => {
          if (!hiding) setHideOpen(false);
        }}
      />
      <InsChatPanel
        customers={list}
        onSelectCustomer={selectCustomer}
      />
    </div>
  );
}

function finiteScore(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Math.min(100, Math.max(0, Number(value)));
}

const AXIS_BAR: Record<string, string> = {
  Low: '#22c55e',
  Moderate: '#eab308',
  High: '#f97316',
  Critical: '#ef4444',
};

function AxisTile({ title, score }: { title: string; score: number | null }) {
  const grade = score == null ? null : scoreToRiskGrade(score);
  const meta = grade ? RISK_GRADE_META[grade] : null;
  return (
    <article className={styles.axisTile}>
      <div className={styles.axisHead}>
        <h4 className={styles.axisName}>{title}</h4>
        {meta ? (
          <span
            className={styles.riskGrade}
            style={{ color: meta.color, background: meta.bg }}
          >
            {meta.ko}
          </span>
        ) : (
          <span className={styles.axisEmptyBadge}>—</span>
        )}
      </div>
      <div className={styles.axisBarRow}>
        <div className={styles.axisTrack}>
          <span
            className={styles.axisFill}
            style={{
              width: `${score ?? 0}%`,
              background: grade ? AXIS_BAR[grade] : '#e2e8f0',
            }}
          />
        </div>
        <span className={styles.axisScore}>
          {score == null ? '—' : score.toFixed(0)}
        </span>
      </div>
    </article>
  );
}

function PointPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s-7-5.8-7-11a7 7 0 1 1 14 0c0 5.2-7 11-7 11Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.infoTile}>
      <span className={styles.infoIcon} aria-hidden>
        {icon}
      </span>
      <div className={styles.infoCopy}>
        <span className={styles.infoLabel}>{label}</span>
        <span className={styles.infoValue}>{value}</span>
      </div>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.5 18.5c1.2-3 3.6-4.5 6.5-4.5s5.3 1.5 6.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 17.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3M16 3.5v3M3.5 10h17" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GenderIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="10" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13.4 6.6 18 2M15 2h3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 14h16l-1.2-4.2A2 2 0 0 0 16.9 8H7.1a2 2 0 0 0-1.9 1.8L4 14Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4 14v3h2.5M20 14v3h-2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="7.5" cy="17" r="1.4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="16.5" cy="17" r="1.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s-6-5.33-6-10a6 6 0 1 1 12 0c0 4.67-6 10-6 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function HistoryMemoPopover({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const pad = 8;
    const gap = 6;
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = r.bottom + gap;
    if (top + h > vh - pad) top = r.top - gap - h;
    if (top < pad) top = pad;

    let left = r.right - w;
    if (left < pad) left = pad;
    if (left + w > vw - pad) left = Math.max(pad, vw - pad - w);

    setPos({ top, left });
    setPlaced(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place, title, body]);

  useEffect(() => {
    if (!open) return;
    function onMove() {
      place();
    }
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, place]);

  function show() {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function hide() {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setPlaced(false);
    }, 120);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={styles.iconBtn}
        aria-label={title}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          window.clearTimeout(closeTimer.current);
          setOpen((v) => !v);
        }}
      >
        <MemoIcon />
      </button>
      {open
        ? createPortal(
            <div
              ref={popRef}
              className={styles.memoPop}
              role="tooltip"
              style={{
                top: pos.top,
                left: pos.left,
                visibility: placed ? 'visible' : 'hidden',
              }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <p className={styles.memoPopTitle}>{title}</p>
              <p className={styles.memoPopBody}>{body}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MemoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7A2.5 2.5 0 0 1 16.5 16H12l-4.2 3.2c-.7.5-1.8 0-1.8-.8V16H7.5A2.5 2.5 0 0 1 5 13.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3.5h7.2L19 8.2V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5H7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 3.5V8h5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12.5h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function riderEmoji(key: string): string {
  if (key.includes('mileage')) return '🚗';
  if (key.includes('blackbox')) return '📹';
  if (key.includes('safe')) return '🛡️';
  if (key.includes('fcw')) return '⚠️';
  if (key.includes('ldw')) return '➖';
  return '📋';
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 4v5h-5M6 20v-5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CustomersPage;
