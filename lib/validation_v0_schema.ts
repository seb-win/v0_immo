import { z } from "zod"

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["agent", "customer"]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const legacyLeadSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().optional(),
  status: z.enum(["new", "contacted", "qualified", "converted"]).default("new"),
  created_at: z.string().datetime().optional(),
})

export const propertySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.number().positive("Price must be positive"),
  location: z.string().min(1, "Location is required"),
  property_type: z.enum(["house", "apartment", "condo", "townhouse", "commercial"]),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  square_feet: z.number().positive().optional(),
  agent_id: z.string().uuid(),
  created_at: z.string().datetime().optional(),
})

// Type exports for use throughout the app
export type UserProfile = z.infer<typeof userProfileSchema>
//export type Lead = z.infer<typeof leadSchema>
export type Property = z.infer<typeof propertySchema>
