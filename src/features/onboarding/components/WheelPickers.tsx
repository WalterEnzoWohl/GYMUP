import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const VISIBLE_ROWS = 5;
const ITEM_HEIGHT = 58;
const CENTER_OFFSET = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;
const LOOP_CYCLES = 40;
const RECENTER_BUFFER = 2;
const SETTLE_MS = 200;

export type WheelPickerOption = {
  value: string;
  label: string;
};

type WheelColumnProps = {
  active: boolean;
  value: string;
  options: WheelPickerOption[];
  onChange: (value: string) => void;
  align?: 'left' | 'center' | 'right';
};

type LoopedOption = WheelPickerOption & {
  key: string;
  baseIndex: number;
};

function mod(n: number, length: number) {
  return ((n % length) + length) % length;
}

function buildLoopedOptions(options: WheelPickerOption[]): LoopedOption[] {
  if (options.length === 0) return [];
  return Array.from({ length: LOOP_CYCLES }, (_, cycle) =>
    options.map((option, baseIndex) => ({
      ...option,
      baseIndex,
      key: `${option.value}-${cycle}-${baseIndex}`,
    }))
  ).flat();
}

function WheelColumn({ active, value, options, onChange, align = 'center' }: WheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const settleRef = useRef<number | null>(null);
  const isUserScrollingRef = useRef(false);
  const internalChangeRef = useRef(false);
  // Prevents our own programmatic scrollTop assignments from re-triggering the handler
  const ignoreScrollRef = useRef(false);
  const prevActiveRef = useRef(false);
  const lastSyncedValueRef = useRef(value);
  // Tracks the last integer vi from scroll events — avoids reading scrollTop mid-CSS-snap-animation
  const currentViRef = useRef(0);

  const loopedOptions = useMemo(() => buildLoopedOptions(options), [options]);

  const [displayIndex, setDisplayIndex] = useState(() => {
    const i = options.findIndex((o) => o.value === value);
    return i >= 0 ? i : 0;
  });

  function centerScrollTop(idx: number): number {
    return (Math.floor(LOOP_CYCLES / 2) * options.length + idx) * ITEM_HEIGHT;
  }

  function applyScrollTop(el: HTMLDivElement, scrollTop: number) {
    ignoreScrollRef.current = true;
    el.scrollTop = scrollTop;
  }

  // Initializes scroll on modal open and re-centers on external value/options changes
  // (e.g. month change → day options shrink). Skips when the change came from our own onChange.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || options.length === 0) return;

    const justOpened = active && !prevActiveRef.current;
    const isOwnChange = internalChangeRef.current;
    const valueChanged = value !== lastSyncedValueRef.current;

    prevActiveRef.current = active;
    lastSyncedValueRef.current = value;
    internalChangeRef.current = false;

    if (!active) return;
    if (isOwnChange && !justOpened) return;
    if (isUserScrollingRef.current) return;

    if (justOpened || valueChanged) {
      const i = options.findIndex((o) => o.value === value);
      const idx = i >= 0 ? i : 0;
      const vi = Math.floor(LOOP_CYCLES / 2) * options.length + idx;
      currentViRef.current = vi;
      setDisplayIndex(idx);
      applyScrollTop(el, vi * ITEM_HEIGHT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value, options]);

  useEffect(() => {
    return () => {
      if (settleRef.current) window.clearTimeout(settleRef.current);
    };
  }, []);

  function handleScroll() {
    const el = scrollerRef.current;
    if (!el || options.length === 0) return;

    if (ignoreScrollRef.current) {
      ignoreScrollRef.current = false;
      return;
    }

    isUserScrollingRef.current = true;

    const vi = Math.round(el.scrollTop / ITEM_HEIGHT);
    currentViRef.current = vi;
    setDisplayIndex(mod(vi, options.length));

    if (settleRef.current) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const el = scrollerRef.current;
      if (!el) return;

      isUserScrollingRef.current = false;

      // Use tracked vi (not scrollTop) — CSS snap may still be animating when this fires
      const vi = currentViRef.current;
      const ni = mod(vi, options.length);

      // Only intervene for edge-recentering; CSS snap already placed the item correctly otherwise
      const buffer = options.length * RECENTER_BUFFER;
      if (vi <= buffer || vi >= loopedOptions.length - buffer - 1) {
        applyScrollTop(el, centerScrollTop(ni));
      }

      setDisplayIndex(ni);

      const nextOption = options[ni];
      if (nextOption && nextOption.value !== value) {
        internalChangeRef.current = true;
        onChange(nextOption.value);
      }
    }, SETTLE_MS);
  }

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-[290px] overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.94)_18%,rgba(0,0,0,1)_50%,rgba(0,0,0,0.94)_82%,transparent_100%)] [scrollbar-width:none] snap-y snap-mandatory"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: CENTER_OFFSET,
          paddingBottom: CENTER_OFFSET,
        }}
      >
        {loopedOptions.map((option) => {
          const isSelected = option.baseIndex === displayIndex;
          return (
            <div
              key={option.key}
              className={`snap-center select-none px-2 ${isSelected ? 'text-white' : 'text-[#626C7E]'}`}
              style={{ height: ITEM_HEIGHT }}
            >
              <div
                className={`flex h-full items-center ${
                  align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'
                }`}
              >
                <span
                  className={`block truncate text-[1.2rem] font-semibold tracking-tight ${
                    isSelected ? 'opacity-100' : 'opacity-35'
                  }`}
                >
                  {option.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type BaseWheelPickerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  children: ReactNode;
};

export function BaseWheelPicker({
  open,
  title,
  subtitle,
  onClose,
  onConfirm,
  confirmLabel = 'Guardar',
  children,
}: BaseWheelPickerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[rgba(4,7,18,0.82)] backdrop-blur-[4px]" />

      <div className="relative w-full max-w-[390px] rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#141A28_0%,#0B101B_100%)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.56)]">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[rgba(255,255,255,0.12)]" />

        <div className="px-2 pb-4 text-center">
          <h3 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
          {subtitle ? <p className="mt-2 text-sm leading-6 text-[#7F889C]">{subtitle}</p> : null}
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.01)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-[58px] -translate-y-1/2 rounded-[18px] border-y border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-[linear-gradient(180deg,#0B101B_0%,rgba(11,16,27,0)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-[linear-gradient(0deg,#0B101B_0%,rgba(11,16,27,0)_100%)]" />
          {children}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[#141A28] py-4 text-base font-semibold text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[22px] border border-[rgba(0,201,167,0.3)] bg-[linear-gradient(180deg,#10E6C9_0%,#0DC5AA_100%)] py-4 text-base font-extrabold text-[#041016]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type DateWheelValue = {
  day: string;
  month: string;
  year: string;
};

type DateWheelPickerProps = {
  open: boolean;
  value: DateWheelValue;
  onChange: (value: DateWheelValue) => void;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  minYear?: number;
  maxYear?: number;
};

export function DateWheelPicker({
  open,
  value,
  onChange,
  onClose,
  onConfirm,
  title,
  subtitle,
  minYear = new Date().getFullYear() - 65,
  maxYear = 2012,
}: DateWheelPickerProps) {
  const maxDay = new Date(Number(value.year), Number(value.month), 0).getDate();

  useEffect(() => {
    const numericDay = Number(value.day);
    if (numericDay > maxDay) {
      onChange({
        ...value,
        day: String(maxDay).padStart(2, '0'),
      });
    }
  }, [maxDay, onChange, value]);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: maxDay }, (_, index) => ({
        value: String(index + 1).padStart(2, '0'),
        label: String(index + 1).padStart(2, '0'),
      })),
    [maxDay]
  );
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const month = String(index + 1).padStart(2, '0');
        return {
          value: month,
          label: new Intl.DateTimeFormat('es-AR', { month: 'long' }).format(new Date(2026, index, 1)),
        };
      }),
    []
  );
  const yearOptions = useMemo(
    () =>
      Array.from({ length: maxYear - minYear + 1 }, (_, index) => String(maxYear - index)).map((year) => ({
        value: year,
        label: year,
      })),
    [maxYear, minYear]
  );

  return (
    <BaseWheelPicker open={open} title={title} subtitle={subtitle} onClose={onClose} onConfirm={onConfirm}>
      <div className="grid grid-cols-[0.82fr_1.18fr_0.9fr] items-center gap-2">
        <WheelColumn
          active={open}
          value={value.day}
          options={dayOptions}
          onChange={(nextDay) => onChange({ ...value, day: nextDay })}
          align="center"
        />
        <WheelColumn
          active={open}
          value={value.month}
          options={monthOptions}
          onChange={(nextMonth) => onChange({ ...value, month: nextMonth })}
          align="center"
        />
        <WheelColumn
          active={open}
          value={value.year}
          options={yearOptions}
          onChange={(nextYear) => onChange({ ...value, year: nextYear })}
          align="center"
        />
      </div>
    </BaseWheelPicker>
  );
}

type NumberWheelValue = {
  whole: string;
  decimal?: string;
};

type NumberWheelPickerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  value: NumberWheelValue;
  onChange: (value: NumberWheelValue) => void;
  onClose: () => void;
  onConfirm: () => void;
  wholeOptions: WheelPickerOption[];
  decimalOptions?: WheelPickerOption[];
  unitLabel?: string;
  separator?: string;
};

export function NumberWheelPicker({
  open,
  title,
  subtitle,
  value,
  onChange,
  onClose,
  onConfirm,
  wholeOptions,
  decimalOptions,
  unitLabel,
  separator = '.',
}: NumberWheelPickerProps) {
  const hasDecimal = Boolean(decimalOptions?.length);
  const wholeColumnWidth = hasDecimal ? 'w-[108px] sm:w-[116px]' : 'w-[118px] sm:w-[126px]';
  const decimalColumnWidth = 'w-[64px] sm:w-[70px]';

  return (
    <BaseWheelPicker open={open} title={title} subtitle={subtitle} onClose={onClose} onConfirm={onConfirm}>
      <div className="flex items-center justify-center gap-0.5 sm:gap-1">
        <div className={wholeColumnWidth}>
          <WheelColumn
            active={open}
            value={value.whole}
            options={wholeOptions}
            onChange={(whole) => onChange({ ...value, whole })}
            align={hasDecimal ? 'right' : 'center'}
          />
        </div>

        {hasDecimal ? (
          <div className="flex h-full items-center justify-center pt-[2px] text-[1.8rem] font-semibold text-[#6E7890]">
            {separator}
          </div>
        ) : null}

        {hasDecimal && decimalOptions ? (
          <div className={decimalColumnWidth}>
            <WheelColumn
              active={open}
              value={value.decimal ?? decimalOptions[0]?.value ?? '0'}
              options={decimalOptions}
              onChange={(decimal) => onChange({ ...value, decimal })}
              align="left"
            />
          </div>
        ) : null}

        {unitLabel ? (
          <div className="flex h-full items-center justify-center pt-[2px] pl-0 text-sm font-bold uppercase tracking-[0.06em] text-[#98A5B8] sm:text-base">
            {unitLabel}
          </div>
        ) : null}
      </div>
    </BaseWheelPicker>
  );
}

type TimeWheelValue = {
  hour: string;
  minute: string;
};

type TimeWheelPickerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  value: TimeWheelValue;
  onChange: (value: TimeWheelValue) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function TimeWheelPicker({
  open,
  title,
  subtitle,
  value,
  onChange,
  onClose,
  onConfirm,
}: TimeWheelPickerProps) {
  const hourOptions = useMemo(
    () => Array.from({ length: 19 }, (_, index) => String(index + 5).padStart(2, '0')).map((item) => ({ value: item, label: item })),
    []
  );
  const minuteOptions = useMemo(() => ['00', '15', '30', '45'].map((item) => ({ value: item, label: item })), []);

  return (
    <BaseWheelPicker open={open} title={title} subtitle={subtitle} onClose={onClose} onConfirm={onConfirm}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <WheelColumn
          active={open}
          value={value.hour}
          options={hourOptions}
          onChange={(hour) => onChange({ ...value, hour })}
          align="right"
        />
        <div className="flex h-full items-center justify-center pt-[1px] text-[1.8rem] font-semibold text-[#6E7890]">:</div>
        <WheelColumn
          active={open}
          value={value.minute}
          options={minuteOptions}
          onChange={(minute) => onChange({ ...value, minute })}
          align="left"
        />
      </div>
    </BaseWheelPicker>
  );
}
