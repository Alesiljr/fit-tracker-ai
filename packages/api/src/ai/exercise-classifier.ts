export interface ClassifiedExercise {
  name: string;
  type: string;
  durationMin: number;
  location: string;
}

export interface ExerciseClassification {
  exercises: ClassifiedExercise[];
  totalDurationMin: number;
  estimatedCalories: number;
}

/**
 * Classifies free-text exercise descriptions into structured data.
 *
 * Current implementation is a basic placeholder parser.
 * Future versions will integrate Claude Haiku for accurate NLP classification.
 */
export async function classifyExercise(rawInput: string): Promise<ExerciseClassification> {
  // Placeholder: basic parse of the raw input
  // Future enhancement: use Claude Haiku for accurate classification
  const input = rawInput.trim();

  if (!input) {
    return { exercises: [], totalDurationMin: 0, estimatedCalories: 0 };
  }

  // Try to extract duration from input (e.g., "30 min", "1 hora", "45 minutos")
  const durationMatch = input.match(/(\d+)\s*(?:min(?:utos?)?|m\b)/i);
  const hourMatch = input.match(/(\d+)\s*(?:hora?s?|h\b)/i);

  let durationMin = 30; // default
  if (durationMatch) {
    durationMin = parseInt(durationMatch[1], 10);
  } else if (hourMatch) {
    durationMin = parseInt(hourMatch[1], 10) * 60;
  }

  // Basic type detection
  let type = 'other';
  const inputLower = input.toLowerCase();
  if (/corr(?:ida|er|eu)|run|jog|caminha/i.test(inputLower)) {
    type = 'cardio';
  } else if (/muscula|peso|acad[eê]mia|strength|lift|supino|agachamento/i.test(inputLower)) {
    type = 'strength';
  } else if (/yoga|along|stretch|flexib/i.test(inputLower)) {
    type = 'flexibility';
  } else if (/futebol|basquet|t[eê]nis|natação|swim|sport|vôlei/i.test(inputLower)) {
    type = 'sports';
  }

  // Basic location detection
  let location = 'other';
  if (/acad[eê]mia|gym/i.test(inputLower)) {
    location = 'gym';
  } else if (/casa|home/i.test(inputLower)) {
    location = 'home';
  } else if (/rua|parque|outdoor|ar livre|praia/i.test(inputLower)) {
    location = 'outdoor';
  }

  // Rough calorie estimate (very approximate placeholder)
  const caloriesPerMin: Record<string, number> = {
    cardio: 10,
    strength: 8,
    flexibility: 4,
    sports: 9,
    balance: 5,
    other: 6,
  };
  const estimatedCalories = Math.round(durationMin * (caloriesPerMin[type] ?? 6));

  const exercise: ClassifiedExercise = {
    name: input.substring(0, 100),
    type,
    durationMin,
    location,
  };

  return {
    exercises: [exercise],
    totalDurationMin: durationMin,
    estimatedCalories,
  };
}
