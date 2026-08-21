import { useMemo, useState, useEffect } from 'react';
import {
  fetchCustomers,
  hideCustomers,
} from '../api/customers';
import type { CustomerListItem } from '../types/customers';
import {
  readCustomersSelection,
  writeCustomersSelection,
} from '../utils/customersSelection';

const PAGE_SIZE = 10;

/* 고객 목록 훅 */
export function useCustomersList(userId: number | undefined) {
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

  /* 검색어 디바운스 */
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  /* 고객 목록 로드 */
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
    void fetchCustomers(debouncedQ || undefined)
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

  /* 필터링된 고객 목록 반환 */
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

  const checkedCustomers = useMemo(
    () => filteredList.filter((row) => checkedIds.has(row.customerId)),
    [filteredList, checkedIds],
  );
  const allPageChecked =
    pagedList.length > 0 &&
    pagedList.every((row) => checkedIds.has(row.customerId));
  const somePageChecked = pagedList.some((row) =>
    checkedIds.has(row.customerId),
  );

  function selectCustomer(customerId: string) {
    setSelectedId(customerId);
    writeCustomersSelection({ customerId });
  }

  /* 체크 토글 */
  function toggleChecked(id: string, on: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /* 페이지 체크 토글 */
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

  /* 삭제 확인 */
  async function confirmHide() {
    if (hiding || checkedCustomers.length === 0 || userId == null) return;
    setHiding(true);
    setHideError(null);
    try {
      const { hiddenIds, failed } = await hideCustomers(
        checkedCustomers.map((row) => row.customerId),
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

  /* 필터 초기화 */
  function resetFilters() {
    setQuery('');
    setDebouncedQ('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }

  return {
    query,
    setQuery,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    page,
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
  };
}