# WOHL – Guía de contexto para Claude Code

## ¿Qué es este proyecto?

WOHL es una app mobile-first de fitness para organizar rutinas, registrar entrenamientos y medir progreso personal. **No es una red social ni una app de contenido.** Su foco es planificación + ejecución + seguimiento.

- **Deploy:** Vercel (frontend) + Supabase (DB + auth)
- **Estado:** Prototipo funcional, todo operativo pero sin pulir

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 6 + TypeScript |
| Estilos | Tailwind CSS v4 + tw-animate-css |
| Animaciones | Motion (Framer Motion v12) |
| Routing | React Router v7 (createBrowserRouter) |
| Drag & drop | react-dnd + react-dnd-touch-backend |
| Gráficos | Recharts |
| Iconos | lucide-react |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Package manager | npm |
| Deploy | Vercel (SPA, vercel.json con rewrites) |
| Estructura | Frontend only — no hay backend propio |

---

## Estructura del repo

```
/
├── src/
│   ├── app/                        # Entrada de la app
│   │   ├── App.tsx                 # RouterProvider + AppSetupScreen (auth gate)
│   │   ├── Root.tsx                # Layout shell: BottomNav, ActiveWorkoutDock, guards de onboarding
│   │   └── routes.tsx              # Todas las rutas (lazy-loaded por página)
│   ├── assets/                     # SVGs del logo
│   ├── core/
│   │   ├── app-data/
│   │   │   └── AppDataContext.tsx  # Provider global: estado de toda la app + acciones Supabase
│   │   ├── domain/
│   │   │   ├── profileInsights.ts  # Lógica Harris-Benedict y derivaciones de perfil
│   │   │   └── seedData.ts         # Datos por defecto para nuevos usuarios
│   │   └── repositories/
│   │       └── supabaseRepository.ts  # Toda la lógica de acceso a Supabase (única fuente)
│   ├── features/                   # Módulos por dominio de negocio
│   │   ├── auth/                   # AuthScreen, ChangePasswordPage
│   │   ├── exercises/              # Catálogo de ejercicios (hook + lib + types)
│   │   ├── history/                # HistoryPage, SessionHistoryPage, MuscleProgressPage
│   │   ├── home/                   # HomePage (dashboard)
│   │   ├── onboarding/             # OnboardingPage, WheelPickers, onboardingConfig
│   │   ├── profile/                # ProfilePage, ProfileEditorPage, UserAvatar
│   │   ├── routines/               # WorkoutsPage, RoutineDetailPage, RoutineEditorPage
│   │   ├── session/                # TrainingSessionPage, PostSessionPage, TrainingExerciseCard
│   │   │   └── lib/sessionDrafts.ts  # Helpers para el borrador de sesión activa
│   │   └── settings/               # ConfigPage, HelpCenterPage, SupportContactPage, TermsPage
│   ├── shared/
│   │   ├── components/layout/      # Header, BottomNav, ActiveWorkoutDock, ActiveWorkoutEditLockModal, AppSetupScreen
│   │   ├── constants/              # Constantes globales (opciones de nivel de actividad, etc.)
│   │   ├── lib/
│   │   │   ├── supabase.ts         # Cliente Supabase singleton
│   │   │   ├── appSettings.ts      # Defaults y merge de AppSettings (persistidas en localStorage)
│   │   │   ├── dateUtils.ts        # buildAppContext, buildWeekDayStatus, buildHistoryCalendar
│   │   │   ├── unitUtils.ts        # Conversión kg ↔ lb
│   │   │   └── userProfileUtils.ts # hasCompletedOnboarding y derivados
│   │   └── types/
│   │       └── models.ts           # Todos los tipos TypeScript del dominio
│   ├── styles/                     # index.css, tailwind.css, theme.css, fonts.css
│   └── main.tsx                    # Punto de entrada Vite
├── supabase/
│   └── migrations/                 # Migraciones SQL (ver sección Schema de DB)
├── wohl_data_excercise/            # Assets públicos: datos del catálogo de ejercicios (CSV/JSON)
├── guidelines/
│   └── Guidelines.md
├── vite.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## Lógica de negocio central

```
Usuario
  └── Rutinas (una activa a la vez)
        └── Días de rutina
              └── Ejercicios planificados (nombre, músculo, implemento, sets, notas)
                    └── Sesiones ejecutadas (instancia real de un día de entreno)
                          └── Sets registrados (kg, reps, RPE?)
```

**Reglas clave:**
- Un usuario tiene **una sola rutina activa** en todo momento
- El plan (rutina) y la ejecución (sesión) están **separados** — editar una rutina futura no rompe el historial
- Las sesiones guardan el rendimiento real con memoria del último peso usado
- El volumen se calcula como `kg × reps` acumulado por sesión/semana
- Hay un temporizador de descanso integrado al flujo de entrenamiento

---

## Arquitectura de la UI (3 tabs)

### Inicio
Dashboard operativo: saludo, CTA iniciar entrenamiento, opción sesión vacía, próximo entrenamiento, resumen semanal, última sesión.

### Entrenar
Gestión de rutinas: ver rutina activa, cambiar/crear/duplicar/editar/eliminar rutinas. Cada rutina tiene días, y cada día tiene ejercicios ordenados.

### Perfil
Identidad + datos físicos + objetivo + calorías/macros (Harris-Benedict) + progreso muscular mensual + historial + ajustes.

---

## Identidad visual

- **Tema:** oscuro
- **Paleta:** azul profundo + turquesa/neón para acciones y progreso
- **Efectos:** glow en estados activos
- **Componentes:** tarjetas grandes, bordes redondeados, bottom nav, chips, toggles, segmented controls
- **Estética:** premium, orientada a rendimiento

**No romper la identidad visual sin motivo explícito.**

---

## Arquitectura global: providers y estado

### AppDataContext (`src/core/app-data/AppDataContext.tsx`)
Es el único provider global de datos. Envuelve toda la app y expone:
- Estado: `userProfile`, `routines`, `sessionHistory`, `appContext`, `weekDays`, `historyDays`, `appSettings`, `activeWorkout`
- Acciones: `saveRoutine`, `deleteRoutine`, `completeSession`, `updateSession`, `deleteSession`, `setActiveRoutine`, `updateUserProfile`, `saveActiveWorkout`, `clearActiveWorkout`, etc.

**Toda la comunicación con Supabase pasa por `supabaseRepository.ts`** — nunca importar el cliente Supabase directamente en componentes o páginas.

### AppSetupScreen (`src/shared/components/layout/AppSetupScreen.tsx`)
Gate de autenticación: si no hay sesión activa, muestra `AuthScreen`. Si hay sesión, monta `AppDataProvider` y renderiza la app.

### Root (`src/app/Root.tsx`)
Shell de layout. Maneja:
- Guard de onboarding (redirige a `/onboarding` si `!hasCompletedOnboarding`)
- Visibilidad de `BottomNav` y `ActiveWorkoutDock` (ocultos en `/session`, `/post-session`, `/onboarding`)
- Toggle de tema claro/oscuro via clase `dark` en `documentElement`

### Persistencia en localStorage (por userId)
- `wohl.activeWorkout.<userId>` — borrador del entrenamiento activo (`ActiveWorkoutDraft`)
- `wohl.appSettings.<userId>` — configuración del usuario (`AppSettings`)

### AppSettings (defaults)
```ts
weightUnit: 'kg', theme: 'dark', soundsEnabled: true,
vibrationEnabled: true, restTimerSeconds: 90,
autoWeightIncrement: false, showPreviousWeight: true, notifyGymDays: false
```

### Rutas (React Router v7)
| Ruta | Página |
|---|---|
| `/` | HomePage |
| `/session` | TrainingSessionPage |
| `/post-session` | PostSessionPage |
| `/workouts` | WorkoutsPage |
| `/profile` | ProfilePage |
| `/profile/edit` | ProfileEditorPage |
| `/onboarding` | OnboardingPage |
| `/config` | ConfigPage |
| `/config/password` | ChangePasswordPage |
| `/history` | HistoryPage |
| `/routine/:id` | RoutineDetailPage |
| `/routine-editor/:id` | RoutineEditorPage |
| `/session-history/:id` | SessionHistoryPage |
| `/muscle-progress/:id` | MuscleProgressPage |

Todas las páginas son **lazy-loaded**. El alias `@/` apunta a `src/`.

### Catálogo de ejercicios
Los datos del catálogo viven en `wohl_data_excercise/` (directorio público de Vite). Se accede via `useExerciseCatalog` (`src/features/exercises/hooks/`) que los carga en runtime. Los ejercicios del catálogo se vinculan a ejercicios de rutina/sesión mediante `exerciseSlug`.

---

## Schema de la base de datos (Supabase)

### Tablas principales
| Tabla | Descripción |
|---|---|
| `profiles` | Perfil del usuario (1:1 con `auth.users`) |
| `routines` | Rutinas de entrenamiento |
| `routine_days` | Días dentro de una rutina |
| `routine_day_exercises` | Ejercicios planificados en un día |
| `workout_sessions` | Sesiones de entrenamiento ejecutadas |
| `workout_session_exercises` | Ejercicios registrados en una sesión |
| `workout_session_sets` | Sets individuales de cada ejercicio |

### Migraciones aplicadas
| Archivo | Contenido |
|---|---|
| `20260406_initial_schema.sql` | Schema completo + RLS + triggers `set_updated_at` |
| `20260409_onboarding_profile_fields.sql` | Campos de onboarding en `profiles`: `gender`, `birth_date`, `target_weight_kg`, `focus_muscle`, `workout_location`, `preferred_training_days`, `preferred_schedule_mode`, `preferred_workout_time`, `preferred_workout_time_by_day`, `onboarding_completed_at` |
| `20260409_profile_avatars.sql` | Soporte para avatar de perfil |
| `20260412_add_exercise_slug_references.sql` | `exercise_slug` en `routine_day_exercises` y `workout_session_exercises` |

### RLS
Todas las tablas tienen RLS habilitado. Los usuarios solo pueden ver y modificar sus propios datos. Las políticas usan `auth.uid()` comparado contra `owner_id` o `id`.

### Notas de schema
- `sets_json` en `routine_day_exercises` guarda el plan de sets como JSONB
- `categories` en `routines` es JSONB (array de `{ name, percentage, color }`)
- `preferred_training_days` en `profiles` es JSONB (array de strings con nombres de días)
- `workout_sessions.volume` = kg × reps acumulado (calculado al cerrar sesión)

---

## Problemas conocidos (no resolver sin consultar)

- Redundancia entre "Iniciar entrenamiento" y "Próximo entrenamiento" en home → pendiente decisión de UX
- Mezcla entre Perfil / Ajustes / Configuración → refactor pendiente
- Headers altos que consumen espacio útil en mobile
- Capa nutricional aislada del resto del tracking
- Progreso muscular mensual simplificado
- Métrica "Nivel" poco explicada
- Lógica de auto-incremento de peso sin reglas visibles aún

---

## Convenciones de código

- **TypeScript estricto** — no usar `any` sin justificación
- Componentes en PascalCase, hooks con prefijo `use`
- Llamadas a Supabase centralizadas en `lib/` o en hooks, no directo en componentes
- Variables de entorno con prefijo `VITE_` en frontend, sin prefijo en backend
- Commits en español o inglés, pero consistentes dentro de cada sesión

---

## Lo que NO hacer

- No instalar librerías nuevas sin preguntar primero
- No cambiar el schema de Supabase sin mostrar la migración antes de ejecutarla
- No tocar la lógica de separación plan/ejecución — es el corazón del modelo de datos
- No simplificar la UI eliminando información de progreso (el usuario valora las métricas)
- No cambiar el tema visual a claro

---

## Contexto de desarrollo

- **Dev:** Windows + VS Code + Claude Code extension
- **Variables de entorno:** `.env.local` para desarrollo, `.env.production` para producción — no commitear nunca
- **Comandos habituales:**
  ```bash
  npm run dev          # Vite dev server (abre el browser automáticamente)
  npm run build        # Build de producción (vite build)
  npm run typecheck    # tsc --noEmit (sin emitir archivos)
  ```
  > No hay backend propio ni script `dev:server`. Todo el backend es Supabase.

---

## Próximas prioridades (roadmap rough)

1. Fortalecer flujo de logging de sesión (núcleo del producto)
2. Mejorar onboarding inicial (objetivo, experiencia, equipamiento, días disponibles)
3. Separar Perfil de Ajustes
4. Conectar capa nutricional con progreso y entrenamiento
5. Progresión inteligente de cargas
6. Consolidar catálogo maestro de ejercicios en DB

## Bug crítico activo (prioridad máxima)

### Flujo de creación/edición de rutina roto
- Al presionar "Guardar rutina" en RoutineEditorPage, la pantalla no navega ni cierra
- Los ejercicios no persisten en Supabase (la rutina se guarda vacía o no se guarda)
- No hay feedback visual durante el guardado
- Se pueden crear rutinas sin ejercicios (falta validación)
- Causa probable: handleSave tiene un bug en el armado del payload o en el manejo del async

Este es el flujo que debe funcionar end-to-end:
1. Usuario crea rutina → agrega días → agrega ejercicios a cada día
2. Presiona "Guardar rutina"
3. Loading state en el botón mientras guarda
4. Si éxito → navegar a `/` (home)
5. Si error → mostrar mensaje claro sin perder los datos del formulario