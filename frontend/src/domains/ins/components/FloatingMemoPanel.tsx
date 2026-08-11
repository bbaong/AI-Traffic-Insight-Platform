import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import styles from './FloatingMemoPanel.module.css';

const MEMO_MAX = 500;
const MARGIN = 8;
const MIN_W = 240;
const MIN_H = 180;
const DEFAULT_W = 300;
const DEFAULT_H = 280;
const FAB_SIZE = 44;

type Props = {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
};

type Pos = { x: number; y: number };
type Size = { w: number; h: number };
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const EDGE_CLASS: Record<Edge, string> = {
  n: styles.edge_n,
  s: styles.edge_s,
  e: styles.edge_e,
  w: styles.edge_w,
  ne: styles.edge_ne,
  nw: styles.edge_nw,
  se: styles.edge_se,
  sw: styles.edge_sw,
};

function headerOffset() {
  return (
    Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--header-height',
      ),
      10,
    ) || 56
  );
}

function defaultPos(size: Size): Pos {
  return {
    x: Math.max(MARGIN, window.innerWidth - size.w - 20),
    y: headerOffset() + 12,
  };
}

function clampPos(x: number, y: number, size: Size): Pos {
  const maxX = Math.max(MARGIN, window.innerWidth - size.w - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size.h - MARGIN);
  return {
    x: Math.min(maxX, Math.max(MARGIN, x)),
    y: Math.min(maxY, Math.max(MARGIN, y)),
  };
}

function applyResize(
  edge: Edge,
  dx: number,
  dy: number,
  start: { sx: number; sy: number; sw: number; sh: number },
): { pos: Pos; size: Size } {
  let { sx, sy, sw, sh } = start;
  let x = sx;
  let y = sy;
  let w = sw;
  let h = sh;

  if (edge.includes('e')) w = sw + dx;
  if (edge.includes('w')) {
    w = sw - dx;
    x = sx + dx;
  }
  if (edge.includes('s')) h = sh + dy;
  if (edge.includes('n')) {
    h = sh - dy;
    y = sy + dy;
  }

  if (w < MIN_W) {
    if (edge.includes('w')) x = sx + sw - MIN_W;
    w = MIN_W;
  }
  if (h < MIN_H) {
    if (edge.includes('n')) y = sy + sh - MIN_H;
    h = MIN_H;
  }

  const maxW = window.innerWidth - MARGIN - (edge.includes('w') ? MARGIN : x);
  const maxH = window.innerHeight - MARGIN - (edge.includes('n') ? MARGIN : y);
  if (w > maxW) {
    if (edge.includes('w')) x = sx + sw - maxW;
    w = Math.max(MIN_W, maxW);
  }
  if (h > maxH) {
    if (edge.includes('n')) y = sy + sh - maxH;
    h = Math.max(MIN_H, maxH);
  }

  x = Math.min(Math.max(MARGIN, x), window.innerWidth - w - MARGIN);
  y = Math.min(Math.max(MARGIN, y), window.innerHeight - h - MARGIN);

  return { pos: { x, y }, size: { w, h } };
}

export function FloatingMemoPanel({ open, value, onChange, onClose }: Props) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [size, setSize] = useState<Size>({ w: DEFAULT_W, h: DEFAULT_H });
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const expandedSizeRef = useRef<Size>({ w: DEFAULT_W, h: DEFAULT_H });

  const dragRef = useRef<{
    ox: number;
    oy: number;
    sx: number;
    sy: number;
  } | null>(null);
  const resizeRef = useRef<{
    edge: Edge;
    ox: number;
    oy: number;
    sw: number;
    sh: number;
    sx: number;
    sy: number;
  } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const posRef = useRef(pos);
  posRef.current = pos;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setCollapsed(false);
      return;
    }
    setPos((prev) => prev ?? defaultPos(size));
  }, [open, size]);

  useEffect(() => {
    if (!open) return;

    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (drag) {
        if (
          Math.abs(e.clientX - drag.ox) > 4 ||
          Math.abs(e.clientY - drag.oy) > 4
        ) {
          dragMovedRef.current = true;
        }
        const box = collapsedRef.current
          ? { w: FAB_SIZE, h: FAB_SIZE }
          : sizeRef.current;
        setPos(
          clampPos(
            drag.sx + (e.clientX - drag.ox),
            drag.sy + (e.clientY - drag.oy),
            box,
          ),
        );
        return;
      }
      const resize = resizeRef.current;
      if (resize) {
        const next = applyResize(
          resize.edge,
          e.clientX - resize.ox,
          e.clientY - resize.oy,
          resize,
        );
        setPos(next.pos);
        setSize(next.size);
      }
    }

    function onUp() {
      if (dragRef.current && dragMovedRef.current) {
        suppressClickRef.current = true;
      }
      dragRef.current = null;
      resizeRef.current = null;
      dragMovedRef.current = false;
      setDragging(false);
      setResizing(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !pos) return;
    function onWinResize() {
      if (collapsedRef.current) {
        const fab = { w: FAB_SIZE, h: FAB_SIZE };
        setPos((p) => (p ? clampPos(p.x, p.y, fab) : p));
        return;
      }
      setSize((s) => {
        const maxW = Math.max(160, window.innerWidth - MARGIN * 2);
        const maxH = Math.max(140, window.innerHeight - headerOffset() - MARGIN);
        const next = {
          w: Math.min(s.w, maxW),
          h: Math.min(s.h, maxH),
        };
        setPos((p) => (p ? clampPos(p.x, p.y, next) : p));
        return next;
      });
    }
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, [open, pos]);

  useEffect(() => {
    if (!collapsed) expandedSizeRef.current = size;
  }, [size, collapsed]);

  if (!open || !pos) return null;

  function onDragStart(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      sx: pos!.x,
      sy: pos!.y,
    };
    setDragging(true);
  }

  function onResizeStart(edge: Edge) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = {
        edge,
        ox: e.clientX,
        oy: e.clientY,
        sw: size.w,
        sh: size.h,
        sx: pos!.x,
        sy: pos!.y,
      };
      setResizing(true);
    };
  }

  function toggleCollapse() {
    if (collapsed) {
      const restored = expandedSizeRef.current;
      setSize(restored);
      setPos((p) => (p ? clampPos(p.x, p.y, restored) : p));
      setCollapsed(false);
    } else {
      expandedSizeRef.current = size;
      setCollapsed(true);
    }
  }

  if (collapsed) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`${styles.fab} ${dragging ? styles.fabDragging : ''}`}
        style={{ left: pos.x, top: pos.y }}
        aria-label="상담 메모 펼치기"
        title="드래그하여 이동 · 클릭하여 펼치기"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          dragMovedRef.current = false;
          const p = posRef.current;
          dragRef.current = {
            ox: e.clientX,
            oy: e.clientY,
            sx: p?.x ?? 0,
            sy: p?.y ?? 0,
          };
          setDragging(true);
        }}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          toggleCollapse();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapse();
          }
        }}
      >
        <MemoFabIcon />
      </div>
    );
  }

  return (
    <aside
      className={`${styles.panel} ${dragging || resizing ? styles.active : ''}`}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      aria-label="상담 메모"
    >
      {EDGES.map((edge) => (
        <div
          key={edge}
          className={`${styles.edge} ${EDGE_CLASS[edge]}`}
          onPointerDown={onResizeStart(edge)}
          aria-hidden="true"
        />
      ))}

      <div
        className={styles.head}
        onPointerDown={onDragStart}
        title="드래그하여 이동"
      >
        <h2 className={styles.title}>상담 메모</h2>
        <div className={styles.headActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleCollapse}
            aria-label="메모 접기"
            title="접기"
          >
            <span className={styles.iconMinimize} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="메모 닫기"
            title="닫기"
          >
            ×
          </button>
        </div>
      </div>

      <textarea
        className={styles.textarea}
        value={value}
        maxLength={MEMO_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder="메모를 작성하세요…"
      />
      <div className={styles.footer}>
        <span className={styles.count}>
          {value.length}/{MEMO_MAX}
        </span>
      </div>
    </aside>
  );
}

function MemoFabIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3.5h9.5L19.5 7v13.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M15 3.5V7h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 11h6M9 14.5h6M9 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
