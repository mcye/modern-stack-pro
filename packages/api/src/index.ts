import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client/web' // 注意这里必须用 /web 适配 Cloudflare
import { users } from './db/schema'

// 定义 Hono 的环境变类型
type Bindings = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'Modern Stack API' })
})

app.post('/users', async (c) => {
  // 1. 获取环境变量
  const url = c.env.TURSO_DATABASE_URL
  const authToken = c.env.TURSO_AUTH_TOKEN

  // 2. 创建数据库连接 (LibSQL Client)
  const client = createClient({
    url,
    authToken,
  })

  // 3. 初始化 Drizzle
  const db = drizzle(client)

  // 4. 插入数据
  const { name, email } = await c.req.json();
  const result = await db.insert(users).values({ name, email }).returning();
  return c.json(result[0]);
});

app.get('/users', async (c) => {
  // 1. 获取环境变量
  const url = c.env.TURSO_DATABASE_URL
  const authToken = c.env.TURSO_AUTH_TOKEN

  // 2. 创建数据库连接 (LibSQL Client)
  const client = createClient({
    url,
    authToken,
  })

  // 3. 初始化 Drizzle
  const db = drizzle(client)

  // 4. 查询数据
  const result = await db.select().from(users).all()

  return c.json(result)
})

export default app