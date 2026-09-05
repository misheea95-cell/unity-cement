import { createInsertSchema } from "drizzle-zod";
import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const remittancesTable = pgTable(
  "remittances",
  {
    id: serial("id").primaryKey(),
    employeeCode: text("employee_code").notNull(),
    transferNumber: text("transfer_number").notNull(),
    currency: text("currency").notNull(),
    sender: text("sender").notNull(),
    beneficiary: text("beneficiary").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeCodeIdx: uniqueIndex("remittances_employee_code_idx").on(table.employeeCode),
  }),
);

export const insertRemittanceSchema = createInsertSchema(remittancesTable).omit({
  id: true,
  updatedAt: true,
});

export type InsertRemittance = z.infer<typeof insertRemittanceSchema>;
export type Remittance = typeof remittancesTable.$inferSelect;