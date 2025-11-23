import { Hono } from 'hono'
import { cors } from 'hono/cors' // 必须引入 CORS
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client/web' // 注意这里必须用 /web 适配 Cloudflare
import { KVNamespace } from '@cloudflare/workers-types' 
import { createAuth } from './auth'

// 定义环境变量类型
type Bindings = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  USER_CACHE: KVNamespace // Cloudflare 内置类型
  BETTER_AUTH_SECRET: string
}

// 定义上下文变量类型 (告诉 TS c.var.db 是什么)
type Variables = {
  db: LibSQLDatabase // 需要从 drizzle-orm/libsql 引入这个类型
}

// 初始化 Hono 时传入这两个泛型
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 配置 CORS (非常重要，否则前端 fetch 会跨域失败)
app.use('/*', cors({
  origin: ['http://localhost:3000'], // 允许前端地址
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true, // 允许携带 Cookie
}))

// 【核心】数据库中间件
app.use('*', async (c, next) => {
  // 这里只会在请求进来时执行
  const client = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  })
  
  const db = drizzle(client)
  
  // 将 db 挂载到当前请求的上下文 c 中
  c.set('db', db)
  
  // 继续处理下一个中间件或路由
  await next()
})

// 挂载 Better-Auth 路由
// 所有的 /api/auth/* 请求都会被这个 handler 接管
app.on(['POST', 'GET'], '/api/auth/**', (c) => {
  const db = c.var.db
  const auth = createAuth(db)
  return auth.handler(c.req.raw)
})

// 测试接口：获取当前用户 (Session)
app.get('/me', async (c) => {
    const db = c.var.db
    const auth = createAuth(db)
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    })
    console.log('session', session)
    return c.json({ user: session?.user || null })
})

export default app