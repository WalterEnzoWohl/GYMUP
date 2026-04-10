import type { AppSettings } from './models';

const KG_TO_LB = 2.2046226218;

export function convertWeightFromKg(valueKg: number, unit: AppSettings['weightUnit']) {
  return unit === 'kg' ? valueKg : valueKg * KG_TO_LB;
}

export function convertWeightToKg(value: number, unit: AppSettings['weightUnit']) {
  return unit === 'kg' ? value : value / KG_TO_LB;
}

export function getWeightUnitLabel(unit: AppSettings['weightUnit']) {
  return unit;
}

export function formatWeightNumber(
  valueKg: number,
  unit: AppSettings['weightUnit'],
  decimals = unit === 'kg' ? 0 : 1
) {
  const converted = convertWeightFromKg(valueKg, unit);
  return converted.toFixed(decimals).replace(/\.0$/, '');
}

export function formatWeightWithUnit(
  valueKg: number,
  unit: AppSettings['weightUnit'],
  decimals = unit === 'kg' ? 0 : 1
) {
  return `${formatWeightNumber(valueKg, unit, decimals)} ${getWeightUnitLabel(unit)}`;
}

export function formatCompactWeight(valueKg: number, unit: AppSettings['weightUnit']) {
  const converted = convertWeightFromKg(valueKg, unit) / 1000;
  return `${converted.toFixed(1)}k ${getWeightUnitLabel(unit)}`;
}

export function formatWeightInputValue(valueKg: number, unit: AppSettings['weightUnit']) {
  if (valueKg === 0) {
    return '';
  }

  const converted = Number(convertWeightFromKg(valueKg, unit).toFixed(2));
  return converted.toString();
}

export function parseWeightInputValue(value: string, unit: AppSettings['weightUnit']) {
  const normalizedValue = value.replace(',', '.');
  const numericValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Number(convertWeightToKg(numericValue, unit).toFixed(2));
}

export function getAutoWeightIncrementKg(unit: AppSettings['weightUnit']) {
  return unit === 'kg' ? 2.5 : Number(convertWeightToKg(5, 'lb').toFixed(2));
}
