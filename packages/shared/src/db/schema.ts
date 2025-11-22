import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull().unique(),
  role: text('role').default('user').notNull(),
  createdAt: text('created_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text('updated_at')
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ✨ 魔法时刻：自动生成 Zod Schema
//用于插入数据时的校验（自动忽略 id, createdAt 等自动生成的字段）
export const insertUserSchema = createInsertSchema(users, {
  email: z.email(), // 强制校验 email 格式
}).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

// 用于前端类型推导
export type User = typeof users.$inferSelect;
export type NewUser = z.infer<typeof insertUserSchema>;