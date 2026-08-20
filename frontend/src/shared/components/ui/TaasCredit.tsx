import type { ReactNode } from 'react';
import {
  MOIS_POP_DATASET,
  MOIS_POP_NAME,
  MOIS_POP_URL,
  TAAS_NAME,
  TAAS_URL,
} from '../../constants/sources';
import styles from './TaasCredit.module.css';

type TaasLinkProps = {
  className?: string;
  children?: ReactNode;
};

export function TaasLink({ className, children = TAAS_NAME }: TaasLinkProps) {
  return (
    <a
      href={TAAS_URL}
      className={`${styles.link} ${className ?? ''}`.trim()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${TAAS_NAME} 새 창에서 열기`}
    >
      {children}
    </a>
  );
}

type TaasCreditProps = {
  variant: 'footer' | 'map' | 'model';
  className?: string;
};

export function TaasCredit({ variant, className }: TaasCreditProps) {
  if (variant === 'footer') {
    return (
      <span className={className}>
        본 서비스는 도로교통공단 <TaasLink />에서 제공된 자료를
        활용하였습니다
      </span>
    );
  }

  if (variant === 'map') {
    return (
      <span className={className}>
        다발지역 자료 · <TaasLink>TAAS</TaasLink>
      </span>
    );
  }

  return (
    <span className={className}>
      학습 데이터 · 도로교통공단 <TaasLink>TAAS</TaasLink> (2016–2025)
    </span>
  );
}

export function InsModelCredit({ className }: { className?: string }) {
  return (
    <span className={className}>
      학습 데이터 · 도로교통공단 <TaasLink>TAAS</TaasLink> (2016–2025)
      <br />
      발생 위험 · 행정안전부{' '}
      <a
        href={MOIS_POP_URL}
        className={styles.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${MOIS_POP_NAME} 새 창에서 열기`}
      >
        {MOIS_POP_NAME}
      </a>
      , 「{MOIS_POP_DATASET}」
    </span>
  );
}
