import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  fetchConsultationReport,
  fetchCustomerConsultations,
  fetchCustomers,
  hideCustomers,
} from '../api/customers';
import { ReportDrawer } from '../components/customers/ReportDrawer';
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
  toConsultationType,
  toRiderBadge,
  toRiskGrade,
} from '../constants/insEnums';
import { CONSULT_TYPE_OPTIONS } from '../constants/consultTypes';
import type {
  Consultation,
  ConsultationTypeCode,
  ConsultationsResponse,
  CustomerListItem,
  ReportItem,
} from '../types/customers';
import { fetchTokkReview } from '../api/tokkReview';
import { useAuthStore } from '../../../stores/authStore';
import styles from './CustomersPage.module.css';

import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { useInsReportDraftStore } from '../../reports/stores/insReportDraftStore';
import { consultationToInsReportDraft } from '../utils/buildInsReportDraft';
import { resolveChecklistAnswers } from '../utils/checklistAnswers';

const PAGE_SIZE = 10;
const FILTER_TABS: Array<{ id: 'ALL' | ConsultationTypeCode; label: string }> =
  [
    { id: 'ALL', label: '전체' },
    ...CONSULT_TYPE_OPTIONS.map((opt) => ({
      id: opt.value,
      label: opt.label,
    })),
  ];

  const CUSTOMERS_SELECTION_KEY = 'ins_customers_selection_v1';

type CustomersSelection = {
  customerId: string;
  consultationId?: string;
};

function readCustomersSelection(): CustomersSelection | null {
  try {
    const raw = sessionStorage.getItem(CUSTOMERS_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomersSelection;
    return parsed.customerId ? parsed : null;
  } catch {
    return null;
  }
}

function writeCustomersSelection(sel: CustomersSelection) {
  sessionStorage.setItem(CUSTOMERS_SELECTION_KEY, JSON.stringify(sel));
}

export function CustomersPage() {
  
  const navigate = useNavigate();
  const setInsReportDraft = useInsReportDraftStore((s) => s.setDraft);

  const user = useAuthStore((s) => s.user);
  const userId = user?.userId;

  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [list, setList] = useState<CustomerListItem[]>([]);
  const [listNonce, setListNonce] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [hideOpen, setHideOpen] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [hideError, setHideError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConsultationsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'ALL' | ConsultationTypeCode>(
    'ALL',
  );
  const [selectedConsultId, setSelectedConsultId] = useState<string | null>(
    null,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportItems, setReportItems] = useState<ReportItem[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (userId == null) {
      setList([]);
      setSelectedId(null);
      setCheckedIds(new Set());
      setListLoading(false);
      setListError('로그인이 필요합니다.');
      return;
    }
    let cancelled = false;
    setListLoading(true);
    setListError(null);
    void fetchCustomers(debouncedQ || undefined, userId)
      .then((rows) => {
        if (cancelled) return;
        setList(rows);
        setPage(1);
        setCheckedIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (rows.some((r) => r.customerId === id)) next.add(id);
          }
          return next;
        });
        setSelectedId((prev) => {
          if (prev && rows.some((r) => r.customerId === prev)) return prev;
          const saved = readCustomersSelection();
          if (saved && rows.some((r) => r.customerId === saved.customerId)) {
            return saved.customerId;
          }
          return rows[0]?.customerId ?? null;
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setList([]);
        setSelectedId(null);
        setCheckedIds(new Set());
        setListError(
          e instanceof Error ? e.message : '고객 목록을 불러오지 못했습니다.',
        );
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, listNonce, userId]);

  useEffect(() => {
    if (!selectedId || userId == null) {
      setDetail(null);
      setSelectedConsultId(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void fetchCustomerConsultations(selectedId, userId)
      .then((res) => {
        if (cancelled) return;
        setDetail(res);
        setTypeFilter('ALL');
        const saved = readCustomersSelection();
        const fromSaved =
          saved?.consultationId &&
          res.data.some((c) => c.consultationId === saved.consultationId)
            ? saved.consultationId
            : null;
        setSelectedConsultId(fromSaved ?? res.data[0]?.consultationId ?? null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setDetail(null);
        setSelectedConsultId(null);
        setDetailError(
          e instanceof Error ? e.message : '상담 이력을 불러오지 못했습니다.',
        );
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, userId]);

  // TODO: 서버 기간 필터 지원 확인 후 API 파라미터로 이관
  const filteredList = useMemo(() => {
    return list.filter((row) => {
      if (!fromDate && !toDate) return true;
      if (!row.lastConsultedAt) return false;
      const day = row.lastConsultedAt.slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [list, fromDate, toDate]);

  const pageCount = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedList = filteredList.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedCustomer =
    list.find((r) => r.customerId === selectedId) ?? detail?.customer ?? null;

  const checkedCustomers = useMemo(
    () => filteredList.filter((row) => checkedIds.has(row.customerId)),
    [filteredList, checkedIds],
  );
  const allPageChecked =
    pagedList.length > 0 &&
    pagedList.every((row) => checkedIds.has(row.customerId));
  const somePageChecked = pagedList.some((row) => checkedIds.has(row.customerId));

  function toggleChecked(id: string, on: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function togglePageChecks() {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allPageChecked) {
        for (const row of pagedList) next.delete(row.customerId);
      } else {
        for (const row of pagedList) next.add(row.customerId);
      }
      return next;
    });
  }

  async function confirmHide() {
    if (hiding || checkedCustomers.length === 0 || userId == null) return;
    setHiding(true);
    setHideError(null);
    try {
      const { hiddenIds, failed } = await hideCustomers(
        checkedCustomers.map((row) => row.customerId),
        userId,
      );
      if (failed.length === 0) {
        setCheckedIds(new Set());
        setHideOpen(false);
      } else {
        setCheckedIds(new Set(failed.map((item) => item.id)));
        setHideError(
          hiddenIds.length > 0
            ? `${hiddenIds.length}명은 삭제됐고, ${failed.length}명은 실패했습니다.`
            : failed[0]?.message ?? '고객을 삭제하지 못했습니다.',
        );
        setHideOpen(false);
      }
      if (hiddenIds.length > 0) setListNonce((n) => n + 1);
    } catch (e: unknown) {
      setHideError(
        e instanceof Error ? e.message : '고객을 삭제하지 못했습니다.',
      );
      setHideOpen(false);
    } finally {
      setHiding(false);
    }
  }

  const filteredConsults = useMemo(() => {
    const rows = detail?.data ?? [];
    if (typeFilter === 'ALL') return rows;
    return rows.filter(
      (c) => toConsultationType(c.consultationType) === typeFilter,
    );
  }, [detail, typeFilter]);

  const selectedConsult =
    filteredConsults.find((c) => c.consultationId === selectedConsultId) ??
    filteredConsults[0] ??
    null;

  const latestConsult = detail?.data[0] ?? null;
  const profile = selectedConsult?.profile ?? latestConsult?.profile ?? null;
  const riskConsult = selectedConsult ?? latestConsult;
  const riskGrade = toRiskGrade(riskConsult?.riskGrade);
  const riskMeta = riskGrade ? RISK_GRADE_META[riskGrade] : null;

  function resetFilters() {
    setQuery('');
    setDebouncedQ('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  const openReportDrawer = useCallback(
    async (consult?: Consultation) => {
      const target = consult ?? selectedConsult;
      if (!target) return;
      setSelectedConsultId(target.consultationId);
      setReportOpen(true);
      setReportLoading(true);
      try {
        const items = await fetchConsultationReport(
          target.consultationId,
          target.riskGrade,
        );
        setReportItems(items);
      } catch {
        setReportItems([]);
      } finally {
        setReportLoading(false);
      }
    },
    [selectedConsult],
  );

  const openHistoryReport = useCallback(
    async (consult?: Consultation) => {
      const target = consult ?? selectedConsult;
      if (!target) return;
      setSelectedConsultId(target.consultationId);

      try {
        const items = await fetchConsultationReport(
          target.consultationId,
          target.riskGrade,
        );

        const checklist = resolveChecklistAnswers({
          rows: target.checklist,
          riders: target.riders,
        });
        const tokkResults =
          (target.riders?.length ?? 0) > 0
            ? undefined
            : await fetchTokkReview(checklist).catch(() => []);

        const draft = consultationToInsReportDraft({
          consult: target,
          customerName: selectedCustomer?.name ?? '',
          reportItems: items,
          orgName: user?.orgName ?? undefined,
          tokkResults,
        });
        setInsReportDraft(draft);

        if (selectedId) {
          writeCustomersSelection({
            customerId: selectedId,
            consultationId: target.consultationId,
          });
        }
        navigate(ROUTES.REPORTS);
      } catch (e) {
        console.error(e);
      }
    },
    [
      selectedConsult,
      selectedCustomer?.name,
      selectedId,
      setInsReportDraft,
      navigate,
      user?.orgName,
    ],
  );

  const riskPct = Math.min(
    100,
    Math.max(0, Number(riskConsult?.riskScore ?? 0)),
  );

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
                        onClick={() => {
                          setSelectedId(row.customerId);
                          writeCustomersSelection({ customerId: row.customerId });
                        }}
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
                  <h3 className={styles.cardTitle}>상담 이력</h3>
                  <div
                    className={styles.tabs}
                    role="tablist"
                    aria-label="상담 유형"
                  >
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={typeFilter === tab.id}
                        className={`${styles.tab} ${
                          typeFilter === tab.id ? styles.tabActive : ''
                        }`}
                        onClick={() => {
                          setTypeFilter(tab.id);
                          const next =
                            tab.id === 'ALL'
                              ? detail?.data[0]
                              : detail?.data.find(
                                  (c) =>
                                    toConsultationType(c.consultationType) ===
                                    tab.id,
                                );
                          setSelectedConsultId(next?.consultationId ?? null);
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
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
                  {riskConsult && riskConsult.riskScore != null && riskMeta ? (
                    <>
                      <div className={styles.riskHead}>
                        <p className={styles.riskScore}>
                          {riskConsult.riskScore.toFixed(1)}
                          <span> / 100</span>
                        </p>
                        <span
                          className={styles.riskGrade}
                          style={{
                            color: riskMeta.color,
                            background: riskMeta.bg,
                          }}
                        >
                          {riskMeta.ko}
                        </span>
                      </div>
                      <div
                        className={styles.riskTrack}
                        role="img"
                        aria-label={`위험 점수 ${riskPct.toFixed(1)}점`}
                      >
                        <span
                          className={styles.riskThumb}
                          style={{ left: `${riskPct}%` }}
                        />
                      </div>
                      <p className={styles.riskMeta}>
                        {formatConsultDateTime(riskConsult.consultedAt)} · 상담원{' '}
                        {riskConsult.counselorName ?? '-'}
                      </p>
                    </>
                  ) : (
                    <p className={styles.hint}>
                      상담 이력이 없어 위험점수가 없습니다.
                    </p>
                  )}
                </section>

                <section className={`${styles.card} ${styles.ridersCard}`}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.cardTitle}>특약 검토 결과</h3>
                  </div>
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
                              <p className={styles.riderReason}>{r.reasonText}</p>
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
    </div>
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
