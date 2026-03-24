export const MOOD_EMOJIS = {
  1: '😢',
  2: '😐',
  3: '😊',
  4: '😄',
  5: '🔥',
} as const;

export const MOOD_LABELS = {
  1: 'Muito triste',
  2: 'Neutro',
  3: 'Bem',
  4: 'Ótimo',
  5: 'On fire',
} as const;

export const MOOD_TONES = {
  1: 'gentle_encouraging',
  2: 'informative_balanced',
  3: 'warm_supportive',
  4: 'enthusiastic_celebratory',
  5: 'high_energy_motivational',
} as const;

export const EXERCISE_TYPES = [
  'cardio',
  'strength',
  'flexibility',
  'balance',
  'sports',
  'other',
] as const;

export const OBJECTIVE_LABELS = {
  lose_weight: 'Perder peso',
  gain_muscle: 'Ganhar massa muscular',
  improve_health: 'Melhorar saúde geral',
  maintain: 'Manter forma atual',
} as const;

export const DEFAULT_WATER_GOAL = 8;
export const DEFAULT_DEFERRED_DAYS = 30;
export const MAX_CHAT_HISTORY_MESSAGES = 20;

// Expanded meal types with default times and labels
export const MEAL_LABELS = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
  pre_workout: 'Pré-treino',
  post_workout: 'Pós-treino',
  other: 'Outro',
} as const;

export const MEAL_DEFAULT_TIMES: Record<string, string | null> = {
  breakfast: '07:00',
  morning_snack: '10:00',
  lunch: '12:00',
  afternoon_snack: '15:00',
  dinner: '19:00',
  supper: '22:00',
  pre_workout: null,
  post_workout: null,
  other: null,
};

export const MEAL_ICONS: Record<string, string> = {
  breakfast: '☀️',
  morning_snack: '🥐',
  lunch: '🌤️',
  afternoon_snack: '🍎',
  dinner: '🌙',
  supper: '🌃',
  pre_workout: '⚡',
  post_workout: '💪',
  other: '🍽️',
};

export const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Feminino',
  non_binary: 'Não-binário',
  prefer_not_to_say: 'Prefiro não informar',
} as const;

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'] as const;

export const MESSAGE_TOPICS = ['nutrition', 'exercise', 'sleep', 'wellness', 'goals', 'general'] as const;

export const TOPIC_LABELS = {
  nutrition: '🍽️ Alimentação',
  exercise: '🏋️ Exercício',
  sleep: '😴 Sono',
  wellness: '🧘 Bem-estar',
  goals: '🎯 Metas',
  general: '💬 Geral',
} as const;

export function sessionLabelFromTime(time: string): string {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 12) return 'Manhã';
  if (hour < 18) return 'Tarde';
  return 'Noite';
}
