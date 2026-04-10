import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const VISIBLE_ROWS = 5;
const ITEM_HEIGHT = 58;
const CENTER_OFFSET = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function WheelColumn({ active, value, options, onChange, align = 'center' }: WheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const snapTimeoutRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  const [settledValue, setSettledValue] = useState(value);

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((option) => option.value === value);
    return index >= 0 ? index : 0;
  }, [options, value]);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element || !active) {
      return;
    }

    const nextTop = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(element.scrollTop - nextTop) < 2) {
      return;
    }

    element.scrollTo({ top: nextTop, behavior: 'smooth' });
  }, [active, selectedIndex]);

  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        window.clearTimeout(snapTimeoutRef.current);
      }

      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSettledValue((current) => (current === value ? current : ''));

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
    }

    settleTimeoutRef.current = window.setTimeout(() => {
      setSettledValue(value);
    }, 1000);

    return () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, [value]);

  const handleScroll = () => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }

    const nextIndex = clamp(Math.round(element.scrollTop / ITEM_HEIGHT), 0, Math.max(options.length - 1, 0));
    const nextOption = options[nextIndex];

    if (nextOption && nextOption.value !== value) {
      onChange(nextOption.value);
    }

    if (snapTimeoutRef.current) {
      window.clearTimeout(snapTimeoutRef.current);
    }

    snapTimeoutRef.current = window.setTimeout(() => {
      element.scrollTo({
        top: nextIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }, 90);
  };

  return (
    <div className="relative min-w-0">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="h-[290px] overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,1)_50%,rgba(0,0,0,0.96)_82%,transparent_100%)] [scrollbar-width:none] snap-y snap-mandatory"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: CENTER_OFFSET,
          paddingBottom: CENTER_OFFSET,
        }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          const illuminated = selected && settledValue === value;

          return (
            <div
              key={option.value}
              className={`snap-center select-none px-2 ${selected ? 'text-white' : 'text-[#566075]'}`}
              style={{ height: ITEM_HEIGHT }}
            >
              <div
                className={`flex h-full items-center ${
                  align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'
                }`}
              >
                <span
                  className={`block truncate tracking-tight ${
                    illuminated
                      ? 'text-[2rem] font-black text-[#00C9A7]'
                      : selected
                        ? 'text-[1.2rem] font-semibold text-white opacity-95'
                        : 'text-[1.2rem] font-semibold opacity-70'
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
  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-50 flex items-end justify-center px-3 pb-3">
          <motion.button
            type="button"
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(4,7,18,0.82)] backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.985 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-[390px] rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,#141A28_0%,#0B101B_100%)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.56)]"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[rgba(255,255,255,0.12)]" />

            <div className="px-2 pb-4 text-center">
              <h3 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
              {subtitle ? <p className="mt-2 text-sm leading-6 text-[#7F889C]">{subtitle}</p> : null}
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.07)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,rgba(255,255,255,0.01)_100%)] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-[58px] -translate-y-1/2 rounded-[18px] border-y border-[rgba(0,201,167,0.92)] bg-[linear-gradient(180deg,rgba(0,201,167,0.08)_0%,rgba(0,201,167,0.04)_100%)] shadow-[0_0_0_1px_rgba(0,201,167,0.08),0_0_24px_rgba(0,201,167,0.08)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-[linear-gradient(180deg,#0B101B_0%,rgba(11,16,27,0)_100%)]" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-[linear-gradient(0deg,#0B101B_0%,rgba(11,16,27,0)_100%)]" />
              {children}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[#141A28] py-4 text-base font-semibold text-white transition-colors hover:bg-[#181F2E]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-[22px] border border-[rgba(0,201,167,0.3)] bg-[linear-gradient(180deg,#10E6C9_0%,#0DC5AA_100%)] py-4 text-base font-extrabold text-[#041016] shadow-[0_16px_30px_rgba(0,201,167,0.2)] transition-transform active:scale-[0.99]"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
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
  maxYear = new Date().getFullYear() - 14,
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
    () => Array.from({ length: maxDay }, (_, index) => ({ value: String(index + 1).padStart(2, '0'), label: String(index + 1).padStart(2, '0') })),
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
      <div className="flex items-center justify-center gap-1 sm:gap-1.5">
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
          <div className="flex h-full items-center justify-center pt-[2px] text-[1.9rem] font-semibold text-[#6E7890]">
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
          <div className="flex h-full items-center justify-center pt-[3px] pl-0.5 text-base font-bold uppercase tracking-[0.08em] text-[#00C9A7] sm:text-lg">
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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <WheelColumn
          active={open}
          value={value.hour}
          options={hourOptions}
          onChange={(hour) => onChange({ ...value, hour })}
          align="right"
        />
        <div className="flex h-full items-center justify-center pt-[1px] text-[2rem] font-semibold text-[#6E7890]">:</div>
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
