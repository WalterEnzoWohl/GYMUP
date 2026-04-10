import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Search } from 'lucide-react';
import { ActiveWorkoutEditLockModal } from '../components/ActiveWorkoutEditLockModal';
import { Header } from '../components/Header';
import { useAppData } from '../data/AppDataContext';

const muscleOptions = ['Todos', 'Pecho', 'Espalda', 'Hombros', 'Tríceps', 'Bíceps', 'Piernas', 'Core', 'Full Body'];

const exerciseLibrary = [
  { name: 'Bench Press (Barra)', muscle: 'Pecho' },
  { name: 'Press Inclinado', muscle: 'Pecho' },
  { name: 'Aperturas Mancuernas', muscle: 'Pecho' },
  { name: 'Press Militar', muscle: 'Hombros' },
  { name: 'Elevaciones Laterales', muscle: 'Hombros' },
  { name: 'Dominadas', muscle: 'Espalda' },
  { name: 'Remo con Barra', muscle: 'Espalda' },
  { name: 'Jalón al Pecho', muscle: 'Espalda' },
  { name: 'Sentadilla', muscle: 'Piernas' },
  { name: 'Peso Muerto', muscle: 'Piernas' },
  { name: 'Prensa de Piernas', muscle: 'Piernas' },
  { name: 'Curl con Barra', muscle: 'Bíceps' },
  { name: 'Curl Martillo', muscle: 'Bíceps' },
  { name: 'Extensiones Tríceps', muscle: 'Tríceps' },
  { name: 'Rompe Cráneos', muscle: 'Tríceps' },
  { name: 'Plancha', muscle: 'Core' },
];

export default function RoutineEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeWorkout, routines, saveRoutine } = useAppData();
  const isNew = id === 'new';
  const existing = !isNew ? routines.find((r) => r.id === Number(id)) : null;
  const isEditingBlocked = Boolean(activeWorkout && !isNew && existing);

  const [name, setName] = useState(existing?.name || '');
  const [daysPerWeek, setDaysPerWeek] = useState(existing?.daysPerWeek || 4);
  const [days, setDays] = useState(
    existing?.days.map((d) => ({
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        name: ex.name,
        muscle: ex.muscle,
        sets: ex.sets.length,
        reps: ex.sets[0]?.reps || 10,
      })),
    })) || [{ name: 'Día 1', exercises: [] }]
  );
  const [expandedDay, setExpandedDay] = useState<number>(0);
  const [showExSearch, setShowExSearch] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Todos');

  const filteredExercises = exerciseLibrary.filter((ex) => {
    const matchMuscle = selectedMuscle === 'Todos' || ex.muscle === selectedMuscle;
    const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const addDay = () => {
    setDays((prev) => [...prev, { name: `Día ${prev.length + 1}`, exercises: [] }]);
  };

  const addExercise = (dayIdx: number, exName: string, muscle: string) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: [...d.exercises, { name: exName, muscle, sets: 3, reps: 10 }] }
          : d
      )
    );
    setShowExSearch(null);
    setSearchQuery('');
  };

  const removeExercise = (dayIdx: number, exIdx: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) } : d
      )
    );
  };

  const updateExercise = (dayIdx: number, exIdx: number, field: 'sets' | 'reps', value: number) => {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              exercises: d.exercises.map((ex, ei) => (ei === exIdx ? { ...ex, [field]: value } : ex)),
            }
          : d
      )
    );
  };

  const handleSave = async () => {
    const routineToSave = {
      id: existing?.id ?? 0,
      name: name.trim() || 'Nueva rutina',
      daysPerWeek,
      color: existing?.color ?? '#00C9A7',
      categories: existing?.categories ?? [],
      description: existing?.description ?? 'Rutina personalizada creada en WOHL.',
      tags: existing?.tags ?? ['PERSONALIZADA'],
      avgMinutes: existing?.avgMinutes ?? 75,
      days: days.map((day, dayIndex) => ({
        id: existing?.days[dayIndex]?.id,
        name: day.name,
        focus: day.exercises.map((exercise) => exercise.muscle).slice(0, 3).join(', ') || 'Sesión personalizada',
        description: existing?.days[dayIndex]?.description ?? undefined,
        exercises: day.exercises.map((exercise, exerciseIndex) => ({
          id: existing?.days[dayIndex]?.exercises[exerciseIndex]?.id ?? exerciseIndex + 1,
          name: exercise.name,
          muscle: exercise.muscle,
          implement: existing?.days[dayIndex]?.exercises[exerciseIndex]?.implement,
          secondaryMuscles: existing?.days[dayIndex]?.exercises[exerciseIndex]?.secondaryMuscles,
          notes: existing?.days[dayIndex]?.exercises[exerciseIndex]?.notes,
          sets: Array.from({ length: exercise.sets }, (_, setIndex) => ({
            id: setIndex + 1,
            kg: existing?.days[dayIndex]?.exercises[exerciseIndex]?.sets[setIndex]?.kg ?? 0,
            reps: exercise.reps,
            rpe: existing?.days[dayIndex]?.exercises[exerciseIndex]?.sets[setIndex]?.rpe ?? 8,
            completed: false,
          })),
        })),
      })),
    };

    await saveRoutine(routineToSave);
    navigate('/workouts');
  };

  return (
    <div className="relative flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Header showBack title={isNew ? 'Crear Rutina' : 'Editar Rutina'} />

      {!isEditingBlocked ? (
        <div className="flex flex-col gap-5 px-5 py-5 pb-6">
        {/* Name input */}
        <div>
          <label className="text-[#9BAEC1] text-xs uppercase tracking-widest font-semibold mb-2 block" style={{ fontFamily: "'Inter', sans-serif" }}>
            Nombre de la Rutina
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Upper / Lower Volumen..."
            className="w-full bg-[#13263A] border border-[#203347] rounded-xl px-4 py-3 text-white text-base outline-none focus:border-[rgba(0,201,167,0.4)] transition-colors"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          />
        </div>

        {/* Frequency selector */}
        <div>
          <label className="text-[#9BAEC1] text-xs uppercase tracking-widest font-semibold mb-3 block" style={{ fontFamily: "'Inter', sans-serif" }}>
            Días por semana
          </label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6, 7].map((d) => (
              <button
                key={d}
                onClick={() => setDaysPerWeek(d)}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                  daysPerWeek === d
                    ? 'bg-[#00C9A7] text-black'
                    : 'bg-[#1A2D42] text-[#9BAEC1] border border-[#203347]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Days / Exercises */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[#9BAEC1] text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
              Días de entrenamiento
            </label>
            <button
              onClick={addDay}
              className="flex items-center gap-1 text-[#00C9A7] text-xs font-semibold"
            >
              <Plus size={14} />
              Añadir día
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {days.map((day, dayIdx) => (
              <div key={dayIdx} className="bg-[#13263A] rounded-2xl border border-[#203347] overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === dayIdx ? -1 : dayIdx)}
                  className="w-full flex items-center justify-between px-4 py-4"
                >
                  <div>
                    <input
                      type="text"
                      value={day.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDays((prev) =>
                          prev.map((d, i) => (i === dayIdx ? { ...d, name: val } : d))
                        );
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent text-white font-semibold text-base outline-none"
                    />
                    <p className="text-[#9BAEC1] text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                      {day.exercises.length} ejercicios
                    </p>
                  </div>
                  {expandedDay === dayIdx ? (
                    <ChevronUp size={16} className="text-[#9BAEC1]" />
                  ) : (
                    <ChevronDown size={16} className="text-[#9BAEC1]" />
                  )}
                </button>

                {expandedDay === dayIdx && (
                  <div className="border-t border-[#203347] px-4 pb-4">
                    {day.exercises.length === 0 ? (
                      <p className="text-[#9BAEC1] text-sm text-center py-4" style={{ fontFamily: "'Inter', sans-serif" }}>
                        No hay ejercicios. Añade uno.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2 mt-3">
                        {day.exercises.map((ex, exIdx) => (
                          <div key={exIdx} className="flex items-center gap-3 bg-[#1A2D42] rounded-xl px-3 py-3">
                            <div className="flex-1">
                              <p className="text-white text-sm font-semibold">{ex.name}</p>
                              <p className="text-[#9BAEC1] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>{ex.muscle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) => updateExercise(dayIdx, exIdx, 'sets', Number(e.target.value))}
                                  className="w-8 bg-[#203347] text-white text-xs text-center rounded-lg py-1 outline-none"
                                />
                                <span className="text-[#9BAEC1] text-xs">×</span>
                                <input
                                  type="number"
                                  value={ex.reps}
                                  onChange={(e) => updateExercise(dayIdx, exIdx, 'reps', Number(e.target.value))}
                                  className="w-8 bg-[#203347] text-white text-xs text-center rounded-lg py-1 outline-none"
                                />
                              </div>
                              <button onClick={() => removeExercise(dayIdx, exIdx)}>
                                <Trash2 size={14} className="text-[#E53935]/60" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowExSearch(dayIdx)}
                      className="w-full mt-3 flex items-center justify-center gap-2 border border-dashed border-[rgba(0,201,167,0.3)] rounded-xl py-3 text-[#00C9A7] text-sm font-semibold"
                    >
                      <Plus size={14} />
                      Añadir Ejercicio
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={() => void handleSave()}
          className="w-full bg-[#00C9A7] rounded-2xl py-4 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,201,167,0.2)]"
        >
          <Save size={18} className="text-black" />
          <span className="text-black font-bold text-base">Guardar Rutina</span>
        </button>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Exercise search bottom sheet */}
      {showExSearch !== null && !isEditingBlocked && (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowExSearch(null)} />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col"
            style={{ background: '#1A2D42', maxHeight: '80%' }}
          >
            <div className="w-10 h-1 bg-[#203347] rounded-full mx-auto mt-4 mb-3 flex-shrink-0" />
            <div className="px-5 pb-4 flex-shrink-0">
              <h3 className="text-white font-bold text-lg mb-3">Buscar Ejercicio</h3>
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAEC1]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full bg-[#203347] rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none border border-[#333]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {muscleOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMuscle(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
                      selectedMuscle === m
                        ? 'bg-[#00C9A7] text-black'
                        : 'bg-[#203347] text-[#9BAEC1]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto px-5 pb-6">
              <div className="flex flex-col gap-2">
                {filteredExercises.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => addExercise(showExSearch, ex.name, ex.muscle)}
                    className="flex items-center justify-between bg-[#203347] rounded-xl px-4 py-3 text-left hover:bg-[#333] transition-colors"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{ex.name}</p>
                      <p className="text-[#9BAEC1] text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>{ex.muscle}</p>
                    </div>
                    <Plus size={16} className="text-[#00C9A7] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingBlocked && activeWorkout && (
        <ActiveWorkoutEditLockModal
          activeWorkoutName={activeWorkout.sessionName}
          onResume={() => navigate('/session')}
          onFinish={() => navigate('/session', { state: { action: 'finish' } })}
          onCancel={() => navigate(-1)}
        />
      )}
    </div>
  );
}
