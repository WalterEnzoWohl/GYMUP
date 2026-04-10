import type { ActivityLevelOption, MuscleGroupRecord } from '@/shared/types/models';

export const ACTIVITY_LEVEL_OPTIONS: ActivityLevelOption[] = [
  {
    label: 'Sedentario',
    factor: 1.2,
    description: 'Poco o nada de ejercicio, tipico de trabajo de oficina y muy poco movimiento diario.',
  },
  {
    label: 'Actividad ligera',
    factor: 1.375,
    description: 'Entrenamiento 1 a 3 dias por semana, con caminatas suaves o gimnasio ocasional.',
  },
  {
    label: 'Actividad moderada',
    factor: 1.55,
    description: 'Entrenamiento regular 3 a 5 dias por semana, como un esquema de gym 4 dias.',
  },
  {
    label: 'Actividad intensa',
    factor: 1.725,
    description: 'Entrenamiento exigente 6 a 7 dias por semana.',
  },
  {
    label: 'Muy intensa / atleta',
    factor: 1.9,
    description: 'Trabajo fisico fuerte y entrenamiento doble o de nivel atletico.',
  },
];

export const MUSCLE_GROUPS: MuscleGroupRecord[] = [
  {
    id: 'pecho',
    name: 'Pecho',
    color: '#00C9A7',
    exercises: [],
  },
  {
    id: 'espalda',
    name: 'Espalda',
    color: '#00C9A7',
    exercises: [],
  },
  {
    id: 'piernas',
    name: 'Piernas',
    color: '#00C9A7',
    exercises: [],
  },
  {
    id: 'hombros',
    name: 'Hombros',
    color: '#00C9A7',
    exercises: [],
  },
  {
    id: 'brazos',
    name: 'Brazos',
    color: '#00C9A7',
    exercises: [],
  },
];

export const TRAINING_LEVEL_OPTIONS = ['Principiante', 'Intermedio', 'Avanzado'] as const;
