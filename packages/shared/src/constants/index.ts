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
