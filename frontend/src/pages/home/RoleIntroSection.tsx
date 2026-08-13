import { Link } from 'react-router-dom';
import govPhoto from '../../assets/images/role-gov.png';
import insPhoto from '../../assets/images/role-ins.png';
import { ROUTES } from '../../shared/constants/routes';
import styles from './RoleIntroSection.module.css';
import { useFadeInClassName } from './useFadeInClassName';

const CARDS = [
  {
    to: ROUTES.LANDING_GOV,
    image: govPhoto,
    label: '지자체',
    tone: 'gov' as const,
    desc: '어디를 먼저 볼지 정합니다. 구·군을 시 평균과 비교하고,\n다음 분기 추세와 중대율을 본 뒤, 우선 점검할 지점을 제안합니다.',
  },
  {
    to: ROUTES.LANDING_INS,
    image: insPhoto,
    label: '보험사',
    tone: 'ins' as const,
    desc: '이 고객에게 무엇을 말할지 정합니다. 위험 점수와 법규 경향을 보고,\n6대 담보와 할인특약을 상담 중에 바로 확인합니다.',
  },
] as const;

export function RoleIntroSection() {
  const { ref, className } = useFadeInClassName();

  return (
    <section
      id="intro"
      ref={ref}
      className={`${styles.section} ${className}`}
      aria-labelledby="role-intro-heading"
    >
      <div className={styles.inner}>
        <h2 id="role-intro-heading" className={styles.title}>
          당신의 업무에는,
          <br />
          어떤 답이 필요합니까?
        </h2>

        <div className={styles.row}>
          {CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className={`${styles.card} ${card.tone === 'gov' ? styles.cardGov : styles.cardIns}`}
            >
              <img src={card.image} alt="" className={styles.cardImage} />
              <div className={styles.cardOverlay} aria-hidden="true" />
              <div className={styles.cardCopy}>
                <span className={styles.cardLabel}>{card.label}</span>
                <span className={styles.cardRule} aria-hidden="true" />
                <p className={styles.cardDesc}>{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
