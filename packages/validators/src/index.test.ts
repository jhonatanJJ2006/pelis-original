import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema, movieSchema, planSchema } from './index';

describe('registerSchema', () => {
  it('should accept valid registration data', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when passwords do not match', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('confirmPassword');
    }
  });

  it('should reject short password', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: '12345',
      confirmPassword: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short name', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('should accept valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('movieSchema', () => {
  const validMovie = {
    name: 'Dune: Parte Dos',
    image: '/posters/dune.jpg',
    synopsis: 'Paul Atreides se une a los Fremen para vengar a su familia.',
    genre: 'Ciencia ficción',
    token: 'dune-2024',
    actors: 'Timothée Chalamet, Zendaya',
    classification: 'PG-13',
    releaseYear: '2024',
  };

  it('should accept valid movie data', () => {
    const result = movieSchema.safeParse(validMovie);
    expect(result.success).toBe(true);
  });

  it('should accept https image URLs', () => {
    const result = movieSchema.safeParse({ ...validMovie, image: 'https://cdn.example.com/dune.jpg' });
    expect(result.success).toBe(true);
  });

  it('should reject relative images that are not paths', () => {
    const result = movieSchema.safeParse({ ...validMovie, image: 'dune.jpg' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid release year', () => {
    const result = movieSchema.safeParse({ ...validMovie, releaseYear: '24' });
    expect(result.success).toBe(false);
  });

  it('should reject synopsis shorter than 10 chars', () => {
    const result = movieSchema.safeParse({ ...validMovie, synopsis: 'Corta' });
    expect(result.success).toBe(false);
  });

  it('should accept optional videoUrl as empty string', () => {
    const result = movieSchema.safeParse({ ...validMovie, videoUrl: '' });
    expect(result.success).toBe(true);
  });

  it('should accept mediaType series with episodes', () => {
    const result = movieSchema.safeParse({ ...validMovie, mediaType: 'series', episodes: 8 });
    expect(result.success).toBe(true);
  });

  it('should reject negative episodes', () => {
    const result = movieSchema.safeParse({ ...validMovie, mediaType: 'series', episodes: -1 });
    expect(result.success).toBe(false);
  });
});

describe('planSchema', () => {
  const validPlan = {
    name: 'Plan Premium',
    price: 9.99,
    description: 'Todo el catálogo en calidad 4K sin anuncios.',
    features: ['4K', 'Sin anuncios', '5 dispositivos'],
    icon: 'crown',
    months: 1,
  };

  it('should accept valid plan data', () => {
    const result = planSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('should reject zero or negative price', () => {
    expect(planSchema.safeParse({ ...validPlan, price: 0 }).success).toBe(false);
    expect(planSchema.safeParse({ ...validPlan, price: -5 }).success).toBe(false);
  });

  it('should reject plans without features', () => {
    const result = planSchema.safeParse({ ...validPlan, features: [] });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer months', () => {
    const result = planSchema.safeParse({ ...validPlan, months: 1.5 });
    expect(result.success).toBe(false);
  });

  it('should accept recommended flag and stripePriceId', () => {
    const result = planSchema.safeParse({
      ...validPlan,
      recommended: true,
      stripePriceId: 'price_123',
    });
    expect(result.success).toBe(true);
  });
});
