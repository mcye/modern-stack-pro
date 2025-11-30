import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
    user: {
      additionalFields: {
        plan: {
          type: "string",
          required: false, // 因为我们在 schema 里设置了 default('free')
        },
        stripeCustomerId: {
          type: "string",
          required: false,
        },
        role: {
          type: "string",
          required: false,
        }
      }
    },
    advanced: {
        cookiePrefix: "better-auth",
        // 禁用 crossSubdomainCookies，因为 localhost 和 workers.dev 不是子域关系
        // crossSubdomainCookies: {
        //     enabled: true,
        //     domain: "" 
        // },
        defaultCookieAttributes: {
            sameSite: "none", 
            secure: true,     
            httpOnly: true,   
        }
    },
    trustedOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://hypervigilant-monnie-supratemporal.ngrok-free.dev",
      // "https://你的前端域名.vercel.app"
    ],
    // 这里可以配置 Google, GitHub 等，今天先不配
  });
};