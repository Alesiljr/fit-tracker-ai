import { updateProfileSchema, onboardingSchema } from '../index';

describe('updateProfileSchema', () => {
  it('validates correct input', () => {
    const input = {
      displayName: 'John Doe',
      dateOfBirth: '1990-05-15',
      heightCm: 175,
      initialWeight: 80,
      objective: 'lose_weight' as const,
      gender: 'male' as const,
      bloodType: 'O+' as const,
      timezone: 'America/Sao_Paulo',
    };
    const result = updateProfileSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('John Doe');
      expect(result.data.objective).toBe('lose_weight');
    }
  });

  it('rejects short displayName', () => {
    const input = { displayName: 'J' };
    const result = updateProfileSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('onboardingSchema', () => {
  it('validates correct input', () => {
    const input = {
      objective: 'gain_muscle' as const,
      heightCm: 180,
      initialWeight: 75,
      dateOfBirth: '1995-08-20',
      exerciseLocations: ['gym', 'home'] as const,
      dietaryRestrictions: ['vegetarian'],
      aiDislikes: ['too many emojis'],
    };
    const result = onboardingSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.objective).toBe('gain_muscle');
      expect(result.data.exerciseLocations).toHaveLength(2);
    }
  });

  it('rejects invalid objective', () => {
    const input = {
      objective: 'fly_to_moon',
      exerciseLocations: ['gym'],
      dietaryRestrictions: [],
      aiDislikes: [],
    };
    const result = onboardingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
