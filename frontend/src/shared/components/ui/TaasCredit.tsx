import type { ReactNode } from 'react';
import { TAAS_NAME, TAAS_URL } from '../../constants/sources';
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
