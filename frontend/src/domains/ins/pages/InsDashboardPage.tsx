import { predictIns } from '../api/prediction';
import { fetchTokkReview } from '../api/tokkReview';
import { saveConsultation } from '../api/consultation';
import { CHECKLIST_ITEMS } from '../constants/checklistItems';
import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  REGION_OPTIONS,
  VEHICLE_OPTIONS,
} from '../constants/insFeatures';
import type { ConsultType } from '../constants/consultTypes';
import { consultTypeLabel } from '../constants/consultTypes';
import type {
  ChecklistAnswers,
  CustomerInfo,
  ProfileInput,
  TokkResult,
} from '../types/consulting';
import type { InsPredictData } from '../types/prediction';
import { buildInsReportDraft } from '../utils/buildInsReportDraft';
import { FloatingMemoPanel } from '../components/FloatingMemoPanel';
import { InsStep1Analyze } from '../components/InsStep1Analyze';
import { InsStep2ChecklistTokk } from '../components/InsStep2ChecklistTokk';
import { InsStepIndicator } from '../components/InsStepIndicator';
import { SaveSuccessModal } from '../components/SaveSuccessModal';
import { useAuthStore } from '../../../stores/authStore';
import { ROUTES } from '../../../shared/constants/routes';
import { useInsReportDraftStore } from '../../reports/stores/insReportDraftStore';
import styles from './InsDashboardPage.module.css';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type DashboardPrefill = {
  fromCustomers?: boolean;
  customer?: CustomerInfo;
  profile?: Partial<ProfileInput>;
};

function initialChecklist(): ChecklistAnswers {
  return {
    mileage: CHECKLIST_ITEMS[0].options?.[0] ?? '',
    blackbox: CHECKLIST_ITEMS[1].options?.[0] ?? '',
    safedrive: CHECKLIST_ITEMS[2].options?.[1] ?? '미이용',
    safedriveService: '',
    safedriveScore: '',
    fcw: CHECKLIST_ITEMS[3].options?.[2] ?? '확인 필요',
    ldw: CHECKLIST_ITEMS[4].options?.[2] ?? '확인 필요',
  };
}

function initialProfile(): ProfileInput {
  return {
    gender: GENDER_OPTIONS[0],
    age: AGE_OPTIONS[4],
    vehicle: VEHICLE_OPTIONS[0],
    region: REGION_OPTIONS[6],
  };
}

export function InsDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const setInsReportDraft = useInsReportDraftStore((s) => s.setDraft);

  const [step, setStep] = useState<1 | 2>(1);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    phone: '',
  });
  const [profile, setProfile] = useState<ProfileInput>(initialProfile);
  const [prediction, setPrediction] = useState<InsPredictData | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [checklist, setChecklist] =
    useState<ChecklistAnswers>(initialChecklist);
  const [tokkResults, setTokkResults] = useState<TokkResult[]>([]);
  const [tokkLoading, setTokkLoading] = useState(false);
  const [tokkError, setTokkError] = useState<string | null>(null);

  const [memo, setMemo] = useState('');
  const [memoOpen, setMemoOpen] = useState(false);
  const savedMemoRef = useRef('');
  const [consultType, setConsultType] = useState<ConsultType | ''>('');

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccessOpen, setSaveSuccessOpen] = useState(false);

  const location = useLocation();

  useEffect(() => {
    const prefill = location.state as DashboardPrefill | null;
    if (!prefill?.fromCustomers) return;

    if (prefill.customer) {
      setCustomer({
        name: prefill.customer.name ?? '',
        phone: prefill.customer.phone ?? '',
      });
    }

    if (prefill.profile) {
      setProfile((prev) => ({
        gender: prefill.profile?.gender || prev.gender,
        age: prefill.profile?.age || prev.age,
        vehicle: prefill.profile?.vehicle || prev.vehicle,
        region: prefill.profile?.region || prev.region,
      }));
    }

    // 뒤로가기 시 같은 state로 다시 덮어쓰지 않게 정리
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  async function handleAnalyze() {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    try {
      const data = await predictIns({
        구군: profile.region,
        연령대: profile.age,
        성별: profile.gender,
        차종: profile.vehicle,
      });
      setPrediction(data);
    } catch (e) {
      setPrediction(null);
      setAnalyzeError(
        e instanceof Error
          ? e.message
          : '분석에 실패했습니다. 서버 상태를 확인해 주세요.',
      );
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function handleTokkReview() {
    setTokkLoading(true);
    setTokkError(null);
    try {
      const rows = await fetchTokkReview(checklist);
      setTokkResults(rows);
    } catch (e) {
      setTokkResults([]);
      setTokkError(
        e instanceof Error ? e.message : '특약 검토에 실패했습니다.',
      );
    } finally {
      setTokkLoading(false);
    }
  }

  async function handleSave() {
    if (!user?.userId) {
      setSaveError('로그인이 필요합니다.');
      return;
    }
    if (!consultType) {
      setSaveError('상담 유형을 선택해 주세요.');
      return;
    }
    setSaveLoading(true);
    setSaveError(null);
    try {
      await saveConsultation({
        customer,
        profile,
        checklist,
        memo,
        consultationType: consultType,
        userId: user.userId,
        prediction,
        tokkResults,
      });
      savedMemoRef.current = memo;
      setSaveSuccessOpen(true);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : '저장에 실패했습니다.',
      );
    } finally {
      setSaveLoading(false);
    }
  }

  function handleGoCustomers() {
    setSaveSuccessOpen(false);
    navigate(ROUTES.CUSTOMERS);
  }

  /** 기존 confirmGoToReportPage 와 동일 draft 매핑 → 저장 성공 모달로 이관 */
  function handleGoReport() {
    if (!prediction) {
      setSaveSuccessOpen(false);
      setSaveError('리포트 생성을 위해 먼저 AI 분석을 실행해 주세요.');
      setStep(1);
      return;
    }
    setInsReportDraft(
      buildInsReportDraft({
        customer,
        profile,
        prediction,
        checklist,
        memo: savedMemoRef.current || memo,
        consultType: consultType
          ? consultTypeLabel(consultType)
          : '신규',
        orgName: user?.orgName ?? undefined,
        tokkResults,
      }),
    );
    setSaveSuccessOpen(false);
    navigate(ROUTES.REPORTS);
  }

  function setChecklistField<K extends keyof ChecklistAnswers>(
    key: K,
    value: ChecklistAnswers[K],
  ) {
    setChecklist((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={`${styles.page} ${styles.pageFill}`}>
      <div className={styles.toolbar}>
        <InsStepIndicator
          current={step}
          step1Done={prediction != null}
          onGoTo={setStep}
        />
        <button
          type="button"
          className={`${styles.memoBtn} ${memoOpen ? styles.memoBtnActive : ''}`}
          onClick={() => setMemoOpen((v) => !v)}
          aria-pressed={memoOpen}
        >
          메모
        </button>
      </div>

      {step === 1 ? (
        <InsStep1Analyze
          customer={customer}
          profile={profile}
          prediction={prediction}
          analyzeLoading={analyzeLoading}
          analyzeError={analyzeError}
          onCustomerChange={setCustomer}
          onProfileChange={setProfile}
          onAnalyze={() => void handleAnalyze()}
          onNext={() => setStep(2)}
        />
      ) : (
        <InsStep2ChecklistTokk
          checklist={checklist}
          tokkResults={tokkResults}
          tokkLoading={tokkLoading}
          tokkError={tokkError}
          consultType={consultType}
          saveLoading={saveLoading}
          saveError={saveError}
          onChecklistChange={setChecklistField}
          onTokkReview={() => void handleTokkReview()}
          onConsultTypeChange={setConsultType}
          onSave={() => void handleSave()}
          onPrev={() => setStep(1)}
        />
      )}

      <FloatingMemoPanel
        open={memoOpen}
        value={memo}
        onChange={setMemo}
        onClose={() => setMemoOpen(false)}
      />

      <SaveSuccessModal
        open={saveSuccessOpen}
        onGoReport={handleGoReport}
        onGoCustomers={handleGoCustomers}
      />
    </div>
  );
}

export default InsDashboardPage;
