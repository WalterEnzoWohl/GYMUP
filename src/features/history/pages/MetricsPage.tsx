import { useState } from 'react';
import { ChevronLeft, ChevronRight, Activity, Dumbbell, Layers, TrendingUp, Settings } from 'lucide-react';
import { useNavigate } from 'react-router';
import pechoUrl from '@/assets/icons/Pecho.svg';
import espaldaUrl from '@/assets/icons/espalda.svg';
import hombrosUrl from '@/assets/icons/hombros.svg';
import brazosUrl from '@/assets/icons/biceps.svg';
import abdominalesUrl from '@/assets/icons/abdominales.svg';
import cuadricepsUrl from '@/assets/icons/Cuadriceps.svg';
import gluteosUrl from '@/assets/icons/gluteos.svg';
import gemelosUrl from '@/assets/icons/gemelos.svg';
import { Header } from '@/shared/components/layout/Header';
import { useAppData } from '@/core/app-data/AppDataContext';
import { WeeklyMuscleLoad } from '@/features/home/components/WeeklyMuscleLoad';
import {
  buildMetricsSummary,
  buildExercisePRs,
  buildWeeklyFrequency,
  buildMuscleRadar,
  buildMonthCalendarDays,
} from '@/core/domain/metricsInsights';
import { parseIsoDate } from '@/shared/lib/dateUtils';
import type { SessionHistory } from '@/shared/types/models';

type Tab = 'general' | 'fuerza' | 'cuerpo';

const WOHL = {
  accent: '#00C9A7',
  surface: '#152F48',
  line: 'rgba(144,164,184,0.18)',
  text: '#fff',
  textMuted: '#9BAEC1',
  textDim: '#65758A',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVolume(kg: number) {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}K` : String(Math.round(kg));
}

function stateColor(pct: number) {
  return pct >= 70 ? WOHL.accent : pct >= 40 ? '#F5B942' : '#FF7A8C';
}

function monthOffsetToIso(todayIso: string, offset: number): string {
  const d = parseIsoDate(todayIso);
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}


function SparklineSvg({ data, color = WOHL.accent }: { data: number[]; color?: string }) {
  if (data.length < 2) return <div style={{ width: 60, height: 24 }} />;
  const w = 60;
  const h = 24;
  const min = Math.min(...data);
  const span = Math.max(...data) - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${((1 - (v - min) / span) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({ icon: Icon, label, value, unit, delta }: {
  icon: typeof Activity; label: string; value: string; unit?: string; delta: number | null;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div style={{ background: WOHL.surface, border: `1px solid ${WOHL.line}`, borderRadius: 14, padding: '12px 10px' }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: 'rgba(0,201,167,0.10)', border: '1px solid rgba(0,201,167,0.22)',
        color: WOHL.accent, display: 'grid', placeItems: 'center', marginBottom: 6,
      }}>
        <Icon size={13} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.16em', color: WOHL.textMuted }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Plus Jakarta Sans'", fontSize: 22, fontWeight: 900, marginTop: 2, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 10, fontStyle: 'italic', color: '#9BAEC1', fontWeight: 700, marginLeft: 2 }}>{unit}</span>}
      </div>
      {delta !== null && (
        <div style={{ fontSize: 10, fontWeight: 800, marginTop: 4 }}>
          <span style={{ color: positive ? '#54D62C' : '#FF7A8C' }}>{positive ? '+' : ''}{delta}%</span>
          <span style={{ color: WOHL.textDim, fontWeight: 600, marginLeft: 4 }}>vs 4 sem.</span>
        </div>
      )}
    </div>
  );
}

// ─── Month Calendar ──────────────────────────────────────────────────────────

function MonthCalendar({ sessionHistory, todayIso }: { sessionHistory: SessionHistory[]; todayIso: string }) {
  const [offset, setOffset] = useState(0);
  const refIso = monthOffsetToIso(todayIso, offset);
  const { days, month, year } = buildMonthCalendarDays(refIso);
  const trainedSet = new Set(sessionHistory.map((s) => s.isoDate));

  const monthLabel = new Intl.DateTimeFormat('es-AR', {
    month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
  }).format(parseIsoDate(refIso)).toUpperCase();

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.22em', color: WOHL.text }}>CALENDARIO</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setOffset((o) => o - 1)} style={{ background: 'transparent', border: 0, color: WOHL.textMuted, cursor: 'pointer', padding: 0, display: 'flex' }}>
            <ChevronLeft size={14} />
          </button>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.18em', color: WOHL.accent }}>{monthLabel}</div>
          <button onClick={() => setOffset((o) => Math.min(o + 1, 0))} style={{ background: 'transparent', border: 0, color: offset < 0 ? WOHL.textMuted : WOHL.textDim, cursor: offset < 0 ? 'pointer' : 'default', padding: 0, display: 'flex' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((h) => (
          <div key={h} style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: WOHL.textMuted, textAlign: 'center' }}>{h}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((isoDate) => {
          const d = parseIsoDate(isoDate);
          const isCurrentMonth = d.getMonth() === month && d.getFullYear() === year;
          const trained = trainedSet.has(isoDate);
          const isToday = isoDate === todayIso;

          if (!isCurrentMonth) {
            return (
              <div key={isoDate} style={{
                aspectRatio: '1', display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'",
                color: WOHL.textDim, borderRadius: 9999, border: '1.6px solid transparent',
              }}>
                {d.getDate()}
              </div>
            );
          }

          return (
            <div key={isoDate} style={{
              aspectRatio: '1', display: 'grid', placeItems: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: "'Plus Jakarta Sans'",
              color: trained ? WOHL.text : isToday ? WOHL.accent : '#9BAEC1',
              border: trained ? `1.6px solid ${WOHL.accent}` : isToday ? `1.6px solid ${WOHL.accent}` : '1.6px solid transparent',
              background: trained ? 'rgba(0,201,167,0.16)' : 'transparent',
              borderRadius: 9999,
            }}>
              {d.getDate()}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: WOHL.textMuted }}>
        {[
          { color: WOHL.accent, label: 'Entrenamiento' },
          { color: 'rgba(144,164,184,0.45)', label: 'Sin entrenamiento' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Frequency Bars ──────────────────────────────────────────────────────────

function FrequencyBars({ sessionHistory, todayIso }: { sessionHistory: SessionHistory[]; todayIso: string }) {
  const weeks = buildWeeklyFrequency(sessionHistory, todayIso);
  const max = Math.max(...weeks.map((w) => w.sessions), 1);

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {/* Y axis */}
      <div style={{
        width: 14, height: 130, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', fontSize: 9, color: WOHL.textDim,
        fontWeight: 700, alignItems: 'flex-end', paddingTop: 2,
      }}>
        {[max + 1, Math.round((max + 1) * 0.75), Math.round((max + 1) * 0.5), Math.round((max + 1) * 0.25), 0].map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130, position: 'relative' }}>
          {[0, 0.25, 0.5, 0.75].map((g, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0, bottom: `${g * 100}%`,
              height: 1, background: 'rgba(144,164,184,0.10)',
            }} />
          ))}
          {weeks.map((w, i) => {
            const pct = w.sessions / (max + 1) * 100;
            const isTop = w.sessions === max;
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4, height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 1,
              }}>
                <div style={{ fontSize: 10, color: isTop ? WOHL.accent : '#fff', fontWeight: 800, fontFamily: "'Plus Jakarta Sans'" }}>
                  {w.sessions > 0 ? w.sessions : ''}
                </div>
                <div style={{
                  width: '78%', height: `${pct}%`, borderRadius: '6px 6px 2px 2px',
                  background: w.sessions > 0
                    ? `linear-gradient(180deg, ${WOHL.accent}, rgba(0,201,167,0.42))`
                    : 'rgba(144,164,184,0.08)',
                  border: w.sessions > 0 ? '1px solid rgba(0,201,167,0.55)' : '1px solid rgba(144,164,184,0.12)',
                  minHeight: 2,
                }} />
              </div>
            );
          })}
        </div>
        {/* X axis labels */}
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {weeks.map((w, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontSize: 8, color: WOHL.textMuted,
              lineHeight: 1.25, whiteSpace: 'pre-line', fontWeight: 700,
            }}>
              {w.week}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Muscle Radar ─────────────────────────────────────────────────────────────

const RADAR_GROUPS_DISPLAY = [
  { id: 'pecho',      label: 'PECHO',       iconUrl: pechoUrl },
  { id: 'espalda',    label: 'ESPALDA',     iconUrl: espaldaUrl },
  { id: 'hombros',    label: 'HOMBROS',     iconUrl: hombrosUrl },
  { id: 'brazos',     label: 'BRAZOS',      iconUrl: brazosUrl },
  { id: 'abdomen',    label: 'ABDOMINALES', iconUrl: abdominalesUrl },
  { id: 'cuadriceps', label: 'CUÁDRICEPS',  iconUrl: cuadricepsUrl },
  { id: 'gluteos',    label: 'GLÚTEOS',     iconUrl: gluteosUrl },
  { id: 'gemelos',    label: 'GEMELOS',     iconUrl: gemelosUrl },
];

function MuscleRadarSvg({ sessionHistory, todayIso }: { sessionHistory: SessionHistory[]; todayIso: string }) {
  const radarData = buildMuscleRadar(sessionHistory, todayIso);
  const cx = 140; const cy = 130; const R = 78;
  const n = RADAR_GROUPS_DISPLAY.length;

  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const ringPts = (scale: number) =>
    RADAR_GROUPS_DISPLAY.map((_, i) => {
      const a = angle(i);
      return `${(cx + Math.cos(a) * R * scale).toFixed(1)},${(cy + Math.sin(a) * R * scale).toFixed(1)}`;
    }).join(' ');

  const dataPts = RADAR_GROUPS_DISPLAY.map((g, i) => {
    const entry = radarData.find((d) => d.muscle === g.id || radarData[i]?.muscle === g.label) ?? radarData[i];
    const pct = entry?.value ?? 0;
    const a = angle(i);
    const r = (pct / 100) * R;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, pct, group: g, i };
  });

  const polyPts = dataPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div>
      <svg width="100%" viewBox="0 0 280 260" style={{ display: 'block', overflow: 'visible' }}>
        {/* Rings */}
        {[0.25, 0.5, 0.75, 1].map((s, i) => (
          <polygon key={i} points={ringPts(s)}
            fill={i === 3 ? 'rgba(255,255,255,0.02)' : 'none'}
            stroke="rgba(144,164,184,0.16)" strokeWidth={1} />
        ))}
        {/* Axes */}
        {RADAR_GROUPS_DISPLAY.map((_, i) => {
          const a = angle(i);
          return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke="rgba(144,164,184,0.12)" strokeWidth={1} />;
        })}
        {/* Center scale labels */}
        {[{ v: 0, y: cy + 3 }, { v: 25, y: cy - R * 0.25 + 3 }, { v: 50, y: cy - R * 0.5 + 3 }].map(({ v, y }) => (
          <text key={v} x={cx} y={y} fill="#65758A" fontSize={8.5} textAnchor="middle" fontWeight={700} fontFamily="'Plus Jakarta Sans'">{v}</text>
        ))}
        {/* Data polygon */}
        <polygon points={polyPts} fill="rgba(0,201,167,0.18)" stroke={WOHL.accent} strokeWidth={1.8} strokeLinejoin="round" />
        {/* Data dots */}
        {dataPts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.2} fill={stateColor(p.pct)} stroke="#0B1F33" strokeWidth={1} />
        ))}
        {/* Labels with glyph + name + % */}
        {RADAR_GROUPS_DISPLAY.map((g, i) => {
          const a = angle(i);
          const lr = R + 32;
          const lx = cx + Math.cos(a) * lr;
          const ly = cy + Math.sin(a) * lr;
          const pct = dataPts[i]?.pct ?? 0;
          const color = stateColor(pct);
          return (
            <g key={g.id}>
              <image
                href={g.iconUrl}
                x={lx - 12} y={ly - 30} width={24} height={24}
                style={{ filter: 'invert(1) opacity(0.75)' }}
              />
              <text x={lx} y={ly + 4} textAnchor="middle" fill="#C8D1DB" fontSize={8.5} fontWeight={800} fontFamily="'Plus Jakarta Sans'" letterSpacing={0.5}>{g.label}</text>
              <text x={lx} y={ly + 15} textAnchor="middle" fill={color} fontSize={9} fontWeight={800} fontFamily="'Plus Jakarta Sans'">{pct}%</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 11, color: WOHL.textMuted, flexWrap: 'wrap' }}>
        {[
          { color: WOHL.accent, label: 'Óptimo (70% o más)' },
          { color: '#F5B942', label: 'En progreso (40–70%)' },
          { color: '#FF7A8C', label: 'Necesita atención (<40%)' },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: 9999, background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Progress Podium ──────────────────────────────────────────────────────────

const PODIUM_STYLE: Record<number, { color: string; height: number }> = {
  1: { color: '#F5C24A', height: 138 },
  2: { color: '#C8D1DB', height: 110 },
  3: { color: '#D88A4A', height: 86 },
  4: { color: '#5B7A99', height: 64 },
  5: { color: '#445E78', height: 48 },
};

function ProgressPodium({ sessionHistory }: { sessionHistory: SessionHistory[] }) {
  const prs = buildExercisePRs(sessionHistory);
  const ranked = prs
    .filter((p) => p.volumeProgress !== null)
    .sort((a, b) => (b.volumeProgress ?? 0) - (a.volumeProgress ?? 0))
    .slice(0, 5)
    .map((p, i) => ({ ...p, rank: i + 1 }));

  if (ranked.length < 2) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: WOHL.textDim, fontSize: 13 }}>
        Registrá más sesiones para ver el podio de progreso.
      </div>
    );
  }

  const VISUAL_ORDER = [5, 3, 1, 2, 4].map((r) => ranked.find((x) => x.rank === r)).filter(Boolean);

  return (
    <div style={{ background: WOHL.surface, border: `1px solid ${WOHL.line}`, borderRadius: 18, padding: '20px 12px 14px', marginBottom: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, alignItems: 'flex-end' }}>
        {VISUAL_ORDER.map((p) => {
          if (!p) return null;
          const s = PODIUM_STYLE[p.rank];
          const isGold = p.rank === 1;
          const big = p.rank <= 3;
          const pct = p.volumeProgress ?? 0;
          return (
            <div key={p.rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ textAlign: 'center', minHeight: 38, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans'", fontWeight: 800,
                  fontSize: isGold ? 11.5 : big ? 10 : 9,
                  color: isGold ? '#fff' : big ? '#D7DEE6' : WOHL.textMuted,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 68,
                }}>{p.name}</div>
                <div style={{ fontSize: 8.5, color: WOHL.textDim, marginTop: 2 }}>{p.maxKg}×{p.bestReps}</div>
              </div>
              <div style={{
                width: '100%', height: s.height, borderRadius: '8px 8px 3px 3px',
                background: `linear-gradient(180deg, ${s.color}33, ${s.color}10 65%, rgba(11,31,51,0.4))`,
                border: `1px solid ${s.color}66`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                padding: big ? '8px 4px 6px' : '6px 4px 4px',
                boxShadow: isGold ? `0 0 22px ${s.color}55, 0 4px 10px rgba(0,0,0,0.25)` : '0 4px 10px rgba(0,0,0,0.25)',
              }}>
                <div style={{
                  width: isGold ? 28 : big ? 24 : 19, height: isGold ? 28 : big ? 24 : 19,
                  borderRadius: 9999,
                  background: `radial-gradient(circle at 35% 30%, ${s.color}, ${s.color}99)`,
                  border: `1.5px solid ${s.color}`,
                  display: 'grid', placeItems: 'center',
                  fontFamily: "'Plus Jakarta Sans'", fontWeight: 900,
                  fontSize: isGold ? 13 : big ? 11 : 9,
                  color: '#0B1F33', marginBottom: big ? 6 : 4,
                  boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.2), 0 0 10px ${s.color}66`,
                }}>{p.rank}</div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans'", fontWeight: 900,
                  fontSize: isGold ? 21 : big ? 16 : 12.5,
                  letterSpacing: '-0.02em', lineHeight: 1,
                  color: pct >= 0 ? '#54D62C' : '#FF7A8C',
                  textShadow: isGold ? '0 0 10px rgba(84,214,44,0.45)' : 'none',
                }}>{pct >= 0 ? '+' : ''}{pct}%</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${WOHL.line}`, display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: WOHL.textMuted }}>
        <span>Ranking por % progreso · vol = kg × reps</span>
        <span style={{ color: WOHL.textDim }}>todo el historial</span>
      </div>
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.22em', color: WOHL.text, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: WOHL.surface, border: `1px solid ${WOHL.line}`, borderRadius: 18, padding: 14, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

// ─── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({ sessionHistory, todayIso }: { sessionHistory: SessionHistory[]; todayIso: string }) {
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <WeeklyMuscleLoad />
      </div>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.22em' }}>BALANCE MUSCULAR</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: WOHL.accent }}>VOLUMEN EFECTIVO</div>
        </div>
        <MuscleRadarSvg sessionHistory={sessionHistory} todayIso={todayIso} />
      </Card>
    </>
  );
}

// ─── Fuerza Tab ───────────────────────────────────────────────────────────────

function FuerzaTab({ sessionHistory }: { sessionHistory: SessionHistory[] }) {
  const prs = buildExercisePRs(sessionHistory);

  if (prs.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <TrendingUp size={32} style={{ color: WOHL.textDim, margin: '0 auto 12px' }} />
        <p style={{ color: WOHL.textMuted, fontSize: 13 }}>
          Registrá al menos 2 sesiones del mismo ejercicio para ver tus récords.
        </p>
      </Card>
    );
  }

  return (
    <>
      <ProgressPodium sessionHistory={sessionHistory} />

      <SLabel>RÉCORDS PERSONALES</SLabel>
      <div style={{ background: WOHL.surface, border: `1px solid ${WOHL.line}`, borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
        {prs.map((p, i) => (
          <div key={p.name} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            alignItems: 'center', gap: 12, padding: '14px 14px',
            borderBottom: i < prs.length - 1 ? `1px solid ${WOHL.line}` : 'none',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans'", fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: WOHL.textMuted, marginTop: 2, letterSpacing: '.04em' }}>
                {p.maxKg} kg × {p.bestReps}
                {p.deltaKg !== null && p.deltaKg !== 0 && (
                  <span style={{ color: p.deltaKg > 0 ? '#54D62C' : '#FF7A8C', marginLeft: 6, fontWeight: 700 }}>
                    {p.deltaKg > 0 ? '▲' : '▼'} {p.deltaKg > 0 ? '+' : ''}{p.deltaKg}
                  </span>
                )}
                {p.deltaKg === 0 && <span style={{ color: WOHL.textDim, marginLeft: 6, fontWeight: 700 }}>=  0</span>}
              </div>
            </div>
            <SparklineSvg
              data={p.sparkline}
              color={p.deltaKg !== null && p.deltaKg < 0 ? '#FF7A8C' : WOHL.accent}
            />
            <div style={{ textAlign: 'right', fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
              {p.maxKg}
              <span style={{ fontSize: 11, fontStyle: 'italic', color: '#9BAEC1', fontWeight: 700, marginLeft: 2 }}>kg</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Cuerpo Tab ───────────────────────────────────────────────────────────────

function CuerpoTab({ sessionHistory, todayIso }: { sessionHistory: SessionHistory[]; todayIso: string }) {

  return (
    <>
      <Card>
        <MonthCalendar sessionHistory={sessionHistory} todayIso={todayIso} />
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.22em' }}>FRECUENCIA SEMANAL</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: WOHL.accent }}>ÚLTIMAS 8 SEMANAS</div>
        </div>
        <FrequencyBars sessionHistory={sessionHistory} todayIso={todayIso} />
      </Card>

    </>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const [tab, setTab] = useState<Tab>('general');
  const navigate = useNavigate();
  const { sessionHistory, appContext } = useAppData();

  const headerSettingsAction = (
    <button
      onClick={() => navigate('/config')}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(0,201,167,0.22)] bg-[rgba(0,201,167,0.08)] transition-colors hover:bg-[rgba(0,201,167,0.14)]"
      type="button"
      aria-label="Abrir configuración"
    >
      <Settings size={17} className="text-[#00C9A7]" />
    </button>
  );
  const summary = buildMetricsSummary(sessionHistory, appContext.todayIso);

  const kpis = [
    { icon: Activity, label: 'SESIONES', value: String(summary.totalSessions), unit: undefined, delta: summary.sessionsDelta },
    { icon: Dumbbell, label: 'VOLUMEN', value: formatVolume(summary.totalVolumeKg), unit: 'KG', delta: summary.volumeDelta },
    { icon: Layers, label: 'SERIES', value: String(summary.totalSeries), unit: undefined, delta: summary.seriesDelta },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header rightContent={headerSettingsAction} />

      <div style={{ padding: '16px 14px 0' }}>
        {/* Subtitle */}
        <div style={{ fontSize: 13, color: WOHL.textMuted, marginBottom: 14 }}>
          Tu progreso, en datos reales.
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {kpis.map(({ icon, label, value, unit, delta }) => (
            <KpiTile key={label} icon={icon} label={label} value={value} unit={unit} delta={delta} />
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: `1px solid ${WOHL.line}` }}>
          {(['general', 'fuerza', 'cuerpo'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { general: 'General', fuerza: 'Fuerza', cuerpo: 'Calendario' };
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '10px 0', background: 'transparent', border: 0, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans'", fontWeight: 800, fontSize: 13, letterSpacing: '.06em',
                color: tab === t ? WOHL.accent : WOHL.textMuted,
                borderBottom: tab === t ? `2px solid ${WOHL.accent}` : '2px solid transparent',
                marginBottom: -1,
              }}>
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ paddingBottom: 40 }}>
          {tab === 'general' && <GeneralTab sessionHistory={sessionHistory} todayIso={appContext.todayIso} />}
          {tab === 'fuerza' && <FuerzaTab sessionHistory={sessionHistory} />}
          {tab === 'cuerpo' && <CuerpoTab sessionHistory={sessionHistory} todayIso={appContext.todayIso} />}
        </div>
      </div>
    </div>
  );
}
