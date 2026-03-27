import {
  medicationSchema,
  healthConditionSchema,
  healthInfoUpdateSchema,
} from '../health-info';

describe('medicationSchema', () => {
  it('validates correct input', () => {
    const input = { name: 'Ibuprofen', dosage: '200mg', frequency: 'twice daily' };
    const result = medicationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Ibuprofen');
    }
  });

  it('rejects empty name', () => {
    const input = { name: '', dosage: '200mg' };
    const result = medicationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('healthConditionSchema', () => {
  it('validates severity enum', () => {
    const validSeverities = ['mild', 'moderate', 'severe'] as const;
    for (const severity of validSeverities) {
      const result = healthConditionSchema.safeParse({ name: 'Asthma', severity });
      expect(result.success).toBe(true);
    }

    const invalid = healthConditionSchema.safeParse({ name: 'Asthma', severity: 'critical' });
    expect(invalid.success).toBe(false);
  });

  it('rejects future diagnosedYear', () => {
    const futureYear = new Date().getFullYear() + 1;
    const result = healthConditionSchema.safeParse({
      name: 'Diabetes',
      diagnosedYear: futureYear,
    });
    expect(result.success).toBe(false);
  });
});

describe('healthInfoUpdateSchema', () => {
  it('validates full object with arrays', () => {
    const input = {
      intolerances: ['lactose', 'gluten'],
      allergies: ['peanuts'],
      medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'daily' }],
      supplements: [{ name: 'Vitamin D', dosage: '1000IU' }],
      healthConditions: [{ name: 'Hypertension', severity: 'moderate' as const, diagnosedYear: 2020 }],
    };
    const result = healthInfoUpdateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intolerances).toHaveLength(2);
      expect(result.data.medications).toHaveLength(1);
      expect(result.data.healthConditions).toHaveLength(1);
    }
  });
});
