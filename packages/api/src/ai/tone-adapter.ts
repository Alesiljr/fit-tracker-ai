import { MOOD_TONES } from '@fittracker/shared';
import type { MoodLevel } from '@fittracker/shared';

const TONE_INSTRUCTIONS: Record<string, string> = {
  gentle_encouraging:
    'Use a gentle, encouraging tone. The user may be feeling down — be extra compassionate, avoid pressure, and focus on small positive steps.',
  informative_balanced:
    'Use a calm, informative tone. Provide balanced information without being overly enthusiastic or somber. Be matter-of-fact but friendly.',
  warm_supportive:
    'Use a warm, supportive tone. The user is feeling good — match their positive energy with warmth and helpful suggestions.',
  enthusiastic_celebratory:
    'Use an enthusiastic, celebratory tone! The user is in great spirits — celebrate their wins, be energetic, and encourage them to keep the momentum.',
  high_energy_motivational:
    'Use a high-energy, motivational tone! The user is on fire — match their intensity, use motivational language, and push for ambitious goals.',
};

export function getToneInstruction(moodLevel: number): string {
  const validLevel = Math.max(1, Math.min(5, Math.round(moodLevel))) as MoodLevel;
  const toneName = MOOD_TONES[validLevel];
  return TONE_INSTRUCTIONS[toneName] ?? TONE_INSTRUCTIONS['warm_supportive'];
}
