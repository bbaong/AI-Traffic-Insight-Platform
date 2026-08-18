import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchConsultationReport,
  fetchCustomerConsultations,
} from '../api/customers';
import { fetchTokkReview } from '../api/tokkReview';
import {
  RISK_GRADE_META,
  toConsultationType,
  toRiskGrade,
} from '../constants/insEnums';
import type {
  Consultation,
  ConsultationTypeCode,
  ConsultationsResponse,
  ReportItem,
} from '../types/customers';
import { ROUTES } from '../../../shared/constants/routes';
import { useInsReportDraftStore } from '../../reports/stores/insReportDraftStore';
import { consultationToInsReportDraft } from '../utils/buildInsReportDraft';
import { resolveChecklistAnswers } from '../utils/checklistAnswers';
import {
  readCustomersSelection,
  writeCustomersSelection,
} from '../utils/customersSelection';

type UseCustomerDetailArgs = {
  selectedId: string | null;
  userId: number | undefined;
  selectedCustomerName: string;
  orgName?: string | null;
};

export function useCustomerDetail({
  selectedId,
  userId,
  selectedCustomerName,
  orgName,
}: UseCustomerDetailArgs) {
  const navigate = useNavigate();
  const setInsReportDraft = useInsReportDraftStore((s) => s.setDraft);

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
  const riskPct = Math.min(
    100,
    Math.max(0, Number(riskConsult?.riskScore ?? 0)),
  );

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
          customerName: selectedCustomerName,
          reportItems: items,
          orgName: orgName ?? undefined,
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
      selectedCustomerName,
      selectedId,
      setInsReportDraft,
      navigate,
      orgName,
    ],
  );

  return {
    detail,
    detailLoading,
    detailError,
    typeFilter,
    setTypeFilter,
    selectedConsultId,
    setSelectedConsultId,
    filteredConsults,
    selectedConsult,
    profile,
    riskConsult,
    riskGrade,
    riskMeta,
    riskPct,
    reportOpen,
    setReportOpen,
    reportLoading,
    reportItems,
    openReportDrawer,
    openHistoryReport,
  };
}