import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({
  size = 21,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Tabler `building-bank` 상응 인라인 아이콘 */
export function BuildingBankIcon({ size = 21, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M3 21h18" />
      <path d="M3 10h18" />
      <path d="M5 6l7-3 7 3" />
      <path d="M4 10v11" />
      <path d="M20 10v11" />
      <path d="M8 14v3" />
      <path d="M12 14v3" />
      <path d="M16 14v3" />
    </BaseIcon>
  );
}

/** Tabler `shield-half` 상응 인라인 아이콘 */
export function ShieldHalfIcon({ size = 21, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3" />
      <path d="M12 3v18" />
    </BaseIcon>
  );
}

/** Tabler `arrow-right` 상응 인라인 아이콘 */
export function ArrowRightIcon({ size = 16, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M5 12h14" />
      <path d="M13 18l6-6" />
      <path d="M13 6l6 6" />
    </BaseIcon>
  );
}

/** Tabler `check` 상응 인라인 아이콘 */
export function CheckIcon({ size = 14, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M5 12l5 5l10 -10" />
    </BaseIcon>
  );
}

/** Tabler `eye` 상응 인라인 아이콘 */
export function EyeIcon({ size = 18, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
      <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6" />
    </BaseIcon>
  );
}

/** Tabler `eye-off` 상응 인라인 아이콘 */
export function EyeOffIcon({ size = 18, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <path d="M10.585 10.587a2 2 0 0 0 2.829 2.828" />
      <path d="M16.681 16.673a8.72 8.72 0 0 1 -4.681 1.327c-3.6 0 -6.6 -2 -9 -6c1.272 -2.12 2.712 -3.678 4.32 -4.674m2.86 -1.23a9.15 9.15 0 0 1 1.82 -.096c3.6 0 6.6 2 9 6c-.666 1.11 -1.41 2.078 -2.23 2.904" />
      <path d="M3 3l18 18" />
    </BaseIcon>
  );
}

/** Tabler `alert-circle` 상응 인라인 아이콘 */
export function AlertCircleIcon({ size = 18, ...rest }: IconProps) {
  return (
    <BaseIcon size={size} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </BaseIcon>
  );
}

const ROLE_ICONS = {
  'building-bank': BuildingBankIcon,
  'shield-half': ShieldHalfIcon,
} as const;

export type RoleIconName = keyof typeof ROLE_ICONS;

export function RoleIcon({
  name,
  size = 21,
  ...rest
}: IconProps & { name: string }) {
  const Icon = ROLE_ICONS[name as RoleIconName];
  if (!Icon) return null;
  return <Icon size={size} {...rest} />;
}
