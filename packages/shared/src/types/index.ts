export type UserObjective = 'lose_weight' | 'gain_muscle' | 'improve_health' | 'maintain';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type ExerciseType = 'cardio' | 'strength' | 'flexibility' | 'balance' | 'sports' | 'other';

export type ExerciseLocation = 'home' | 'gym' | 'outdoor' | 'other';

export type BoundaryType = 'hard' | 'deferred';

export type BoundaryCategory = 'exercise' | 'food' | 'suggestion' | 'topic' | 'other';

export type PreferenceSource = 'explicit' | 'implicit' | 'onboarding';

export type FeedbackType = 'liked' | 'rejected';

export type GoalType = 'weight' | 'water' | 'exercise_duration' | 'steps' | 'sleep' | 'custom';

export type GoalStatus = 'active' | 'achieved' | 'archived';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type ReportType = 'weekly' | 'monthly';

export interface UserProfile {
  id: string;
  displayName: string;
  dateOfBirth: string | null;
  heightCm: number | null;
  initialWeight: number | null;
  objective: UserObjective;
  avatarUrl: string | null;
  timezone: string;
  onboardingCompleted: boolean;
  featureUnlockLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface HealthDaySummary {
  date: string;
  weight: number | null;
  mood: MoodLevel | null;
  moodNote: string | null;
  exerciseMinutes: number;
  exerciseCalories: number;
  foodCalories: number;
  waterGlasses: number;
  steps: number;
  sleepDurationMin: number | null;
  sleepQuality: number | null;
}
