import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { DrizzleD1Database } from "drizzle-orm/d1"; // 或者是 libsql
import { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@repo/shared";

// 工厂函数：接收 db 实例，返回 auth 实例
export const createAuth = (db: LibSQLDatabase<typeof schema> | any) => {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: schema, 
    }),
    emailAndPassword: {
      enabled: true, // 开启邮箱密码登录
    },
    trustedOrigins: [
      "http://localhost:3000", // 允许本地前端
      // "https://你的前端域名.vercel.app" // 以后上线了加这里
    ],
    // 这里可以配置 Google, GitHub 等，今天先不配
  });
};