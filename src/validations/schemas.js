const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const companySettingsSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal(''))
});

const userProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal(''))
});

const createLeadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
  source: z.string().optional().default('Manual'),
  status: z.string().optional().default('New'),
  priority: z.enum(['Low', 'Medium', 'High']).optional().default('Medium'),
  assigned_to: z.number().int().optional().nullable(),
  lead_score: z.number().int().min(0).max(100).optional().default(0),
  follow_up_date: z.string().datetime().optional().nullable().or(z.literal(''))
});

const updateLeadSchema = createLeadSchema.partial();

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional().or(z.literal('')),
  due_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format'
  }),
  assigned_to: z.number().int('Assigned user must be selected'),
  status: z.enum(['Pending', 'Completed']).optional().default('Pending'),
  lead_id: z.number().int().optional().nullable()
});

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['company_admin', 'staff']),
  phone: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).optional().default('active')
});

module.exports = {
  loginSchema,
  companySettingsSchema,
  userProfileSchema,
  createLeadSchema,
  updateLeadSchema,
  createTaskSchema,
  createUserSchema
};
