import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 用户表
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull(),
	image: text('image'),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
	role: text('role').default('user'),
	stripeCustomerId: text('stripe_customer_id'),
    plan: text('plan').default('free'), // 'free' | 'pro'
});

// 会话表 (注意新增了 token 字段)
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  	token: text('token').notNull().unique(), // 👈 缺的就是这个！
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	userId: text('userId').notNull().references(()=> user.id),
});

// 账号表
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	userId: text('userId').notNull().references(()=> user.id),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	idToken: text('idToken'),
	accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
	refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
	scope: text('scope'),
	password: text('password'),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// 验证表
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
	createdAt: integer('createdAt', { mode: 'timestamp' }),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

export const document = sqliteTable("document", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull(), // 关联到 user.id
    title: text("title").notNull(),   // 文档标题
    content: text("content"),         // 原始内容 (可选，如果太长就不存 SQL)
    createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

export const schema = { user, session, account, verification, document };
export type User = typeof user.$inferSelect;