import { z } from "zod";

export const maintenanceSweepResponseSchema = z.object({
  claimed: z.number().int().nonnegative(),
  deleted: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export type MaintenanceSweepResponse = z.infer<
  typeof maintenanceSweepResponseSchema
>;
