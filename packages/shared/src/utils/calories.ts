/**
 * Caloric deficit calculation utilities.
 * Uses Harris-Benedict formula for BMR (Taxa Metabólica Basal).
 */

export interface BmrInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: 'male' | 'female';
}

export interface CaloriesSummary {
  bmr: number;
  activityMultiplier: number;
  dailyExpenditure: number;
  exerciseCalories: number;
  totalIntake: number;
  deficit: number;
  mealsLogged: number;
}

/**
 * Calculates BMR using Harris-Benedict formula.
 * Male:   88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
 * Female: 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
 */
export function calculateBmr({ weightKg, heightCm, ageYears, gender }: BmrInput): number {
  if (gender === 'male') {
    return Math.round(88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * ageYears);
  }
  return Math.round(447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * ageYears);
}

/**
 * Returns activity multiplier based on total exercise minutes for the day.
 */
export function getActivityMultiplier(exerciseMinutes: number): number {
  if (exerciseMinutes <= 0) return 1.2;       // Sedentary
  if (exerciseMinutes < 30) return 1.375;      // Light
  if (exerciseMinutes <= 60) return 1.55;      // Moderate
  return 1.725;                                // Intense
}

/**
 * Calculates age in years from date of birth.
 */
export function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculates full calorie summary for the day.
 */
export function calculateCalorieSummary(
  bmrInput: BmrInput,
  exerciseMinutes: number,
  exerciseCalories: number,
  totalIntake: number,
  mealsLogged: number,
): CaloriesSummary {
  const bmr = calculateBmr(bmrInput);
  const activityMultiplier = getActivityMultiplier(exerciseMinutes);
  const dailyExpenditure = Math.round(bmr * activityMultiplier);
  const deficit = dailyExpenditure - totalIntake;

  return {
    bmr,
    activityMultiplier,
    dailyExpenditure,
    exerciseCalories,
    totalIntake,
    deficit,
    mealsLogged,
  };
}
