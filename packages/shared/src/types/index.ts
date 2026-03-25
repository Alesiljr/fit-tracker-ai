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

export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'supper' | 'pre_workout' | 'post_workout' | 'other';

export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type MessageTopic = 'nutrition' | 'exercise' | 'sleep' | 'wellness' | 'goals' | 'general';

export type ReportType = 'weekly' | 'monthly';

export interface UserProfile {
  id: string;
  displayName: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodType: BloodType | null;
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

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface HealthCondition {
  name: string;
  severity?: 'mild' | 'moderate' | 'severe';
  diagnosedYear?: number;
  notes?: string;
}

export interface UserHealthInfo {
  id: string;
  userId: string;
  intolerances: string[];
  allergies: string[];
  medications: Medication[];
  supplements: Medication[];
  healthConditions: HealthCondition[];
  createdAt: string;
  updatedAt: string;
}

export interface BestDayResponse {
  date: string | null;
  score: number;
  highlights: string[];
  message: string;
  period: 'week' | 'month' | 'all';
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
