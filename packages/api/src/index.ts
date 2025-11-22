import { Hono } from 'hono'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client/web' // 注意这里必须用 /web 适配 Cloudflare
import { eq } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { users, insertUserSchema } from '@repo/shared/src/db/schema'
import { KVNamespace } from '@cloudflare/workers-types' 

// 1. 定义环境变量类型
type Bindings = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  USER_CACHE: KVNamespace // Cloudflare 内置类型
}

// 2. 定义上下文变量类型 (告诉 TS c.var.db 是什么)
type Variables = {
  db: LibSQLDatabase // 需要从 drizzle-orm/libsql 引入这个类型
}

// 3. 初始化 Hono 时传入这两个泛型
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 4. 【核心】数据库中间件
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

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'Modern Stack API' })
})

// ✨ 核心升级：增加 zValidator 中间件
// 如果请求体不符合 insertUserSchema，Hono 会自动返回 400 错误
app.post('/users', zValidator('json', insertUserSchema), async (c) => {
  const db = c.var.db
  
  // ✅ 这里的 data 已经是类型安全的了，且经过了 Zod 验证
  // TypeScript 会自动推导出 data 的类型为 { name: string, email: string }
  const data = c.req.valid('json')

  try {
    const result = await db.insert(users).values(data).returning()

    // 下次有人请求 GET /users 时会重新从 DB 拉取最新数据
    await c.env.USER_CACHE.delete('users_all')
    
    return c.json(result[0], 201)
  } catch (e) {
    // 简单处理唯一索引冲突（如邮箱重复）
    return c.json({ error: 'User setup failed, email might exist' }, 500)
  }
})

app.get('/users', async (c) => {
  // 2. 尝试从 KV 读取
  const cacheKey = 'users_all'
  const cachedData = await c.env.USER_CACHE.get(cacheKey)

  if (cachedData) {
    console.log('🔥 Cache HIT')
    // KV 存的是字符串，需要解析回 JSON
    return c.json(JSON.parse(cachedData))
  }

  console.log('🐢 Cache MISS - Reading DB')
  const db = c.var.db
  const result = await db.select().from(users).all()

  // 3. 写入 KV (设置 60 秒过期，防止数据太旧)
  // waitUntil 允许在响应返回后继续执行后台任务，不阻塞响应时间
  c.executionCtx.waitUntil(
    c.env.USER_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 60 })
  )

  return c.json(result)
})

app.get('/users/:id', async (c) => {
  const db = c.var.db
  const id = parseInt(c.req.param('id'))
  const result = await db.select().from(users).where(eq(users.id, id)).all()
  return c.json(result)
});
    
export default app