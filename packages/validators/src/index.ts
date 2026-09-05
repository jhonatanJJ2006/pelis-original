import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const movieSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  image: z
    .string()
    .min(1, 'La imagen es requerida')
    .refine(
      (value) =>
        value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://'),
      'URL o ruta de imagen inválida'
    ),
  synopsis: z.string().min(10, 'La sinopsis debe tener al menos 10 caracteres'),
  genre: z.string().min(1, 'El género es requerido'),
  token: z.string().min(1, 'El token es requerido'),
  actors: z.string().min(1, 'Los actores son requeridos'),
  classification: z.string().min(1, 'La clasificación es requerida'),
  releaseYear: z.string().regex(/^\d{4}$/, 'Año inválido'),
  videoUrl: z.string().optional().or(z.literal('')),
  mediaType: z.enum(['movie', 'series']).optional(),
  episodes: z.number().int().positive().optional(),
  featured: z.boolean().optional(),
});

export const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.number().positive('El precio debe ser positivo'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  features: z.array(z.string()).min(1, 'Debe haber al menos una característica'),
  icon: z.string(),
  months: z.number().int().positive(),
  maxDevices: z.number().int().positive().default(1),
  recommended: z.boolean().optional(),
  stripePriceId: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type MovieInput = z.infer<typeof movieSchema>;
export type PlanInput = z.infer<typeof planSchema>;
