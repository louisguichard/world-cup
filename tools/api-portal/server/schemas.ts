import { z } from "zod";

export const ApiKeyCreateSchema = z.object({
  serviceGroup: z.string().min(1),
  label: z.string().min(1),
  envVarName: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]*$/, "Must be uppercase with underscores, no spaces"),
  value: z.string().min(1),
  endpoint: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  testMethod: z.enum(["GET", "POST"]).optional(),
  testHeaders: z.record(z.string()).optional(),
  notes: z.string().optional(),
});

export const ApiKeyUpdateSchema = ApiKeyCreateSchema.partial();

export const SyncTargetCreateSchema = z.object({
  name: z.string().min(1),
  envFilePath: z.string().min(1),
  keyIds: z.array(z.string()),
});

export const SetupSchema = z.object({
  passphrase: z.string().min(8, "Passphrase must be at least 8 characters"),
});

export const UnlockSchema = z.object({
  passphrase: z.string().min(1),
});

export const VaultResetSchema = z.object({
  confirm: z.literal("RESET VAULT"),
});

export type ApiKeyCreate = z.infer<typeof ApiKeyCreateSchema>;
export type ApiKeyUpdate = z.infer<typeof ApiKeyUpdateSchema>;
export type SyncTargetCreate = z.infer<typeof SyncTargetCreateSchema>;
