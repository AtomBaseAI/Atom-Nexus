import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
    email: z.email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
    acceptTerms: z.boolean(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.acceptTerms, {
    message: 'You must accept the terms and privacy policy',
    path: ['acceptTerms'],
  })

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  preferredLocale: z.enum(['en', 'ta', 'hi']).optional(),
})

export const courseBaseSchema = z.object({
  title: z.string().trim().min(4, 'Title must be at least 4 characters').max(120),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  shortDescription: z.string().trim().min(20, 'Short description must be at least 20 characters').max(220),
  description: z.string().trim().max(8000).default(''),
  thumbnailUrl: z.string().trim().max(600).default(''),
  categoryId: z.string().min(1, 'Category is required'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS']).default('BEGINNER'),
  language: z.string().default('en'),
  objectives: z.array(z.string().trim().min(1)).default([]),
  prerequisites: z.array(z.string().trim().min(1)).default([]),
  targetAudience: z.array(z.string().trim().min(1)).default([]),
})

export const courseCreateSchema = courseBaseSchema.partial({ title: true, slug: true, shortDescription: true }).extend({
  title: z.string().trim().min(1, 'Title is required'),
})

export const courseUpdateSchema = courseBaseSchema.partial().extend({
  isFree: z.boolean().optional(),
  priceAmount: z.number().int().min(0).max(100_000_00).optional(), // paise
  compareAtPrice: z.number().int().min(0).max(100_000_00).nullable().optional(),
  featured: z.boolean().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
})

export const sectionCreateSchema = z.object({ title: z.string().trim().min(2).max(140) })

export const sectionUpdateSchema = z.object({
  title: z.string().trim().min(2).max(140).optional(),
  order: z.number().int().min(0).optional(),
})

export const lessonCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).default(''),
  isPreview: z.boolean().default(false),
})

export const lessonUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(600).optional(),
  isPreview: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  sectionId: z.string().optional(),
})

export const videoAssignSchema = z.object({
  videoUrl: z.string().url('Enter a valid video URL'),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 12).optional(),
})

export const audioTrackSchema = z.object({
  languageCode: z.string().trim().min(2).max(8),
  displayName: z.string().trim().min(2).max(60),
  srcUrlForUpload: z.string().optional(),
})

export const subtitleSchema = z.object({
  languageCode: z.string().trim().min(2).max(8),
  displayName: z.string().trim().min(2).max(60),
  srcUrl: z.string().optional(),
})

export const progressSchema = z.object({
  lastPositionSeconds: z.number().min(0).max(60 * 60 * 12),
  watchedSeconds: z.number().min(0).max(60 * 60 * 12),
  durationSeconds: z.number().min(0).max(60 * 60 * 12).optional(),
})

export const createOrderSchema = z.object({ courseId: z.string().min(1) })

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})

export const mockPaySchema = z.object({
  razorpayOrderId: z.string().min(1),
  outcome: z.enum(['success', 'failure']),
})

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens')
    .optional(),
})

export const learnerUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
})

export const settingsUpdateSchema = z.object({
  platformName: z.string().trim().min(2).max(80).optional(),
  defaultLocale: z.enum(['en', 'ta', 'hi']).optional(),
  supportedLocales: z.string().trim().max(120).optional(),
  refundPolicy: z.string().trim().max(2000).optional(),
  supportEmail: z.string().trim().max(120).optional(),
})

/** Canonical slugify used by admin forms. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
