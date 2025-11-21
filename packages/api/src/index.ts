import { Hono } from 'hono'
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client/web' // 注意这里必须用 /web 适配 Cloudflare
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

// 1. 定义环境变量类型
type Bindings = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
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

app.post('/users', async (c) => {
  const db = c.var.db
  const { name, email } = await c.req.json();
  const result = await db.insert(users).values({ name, email }).returning();
  return c.json(result[0]);
});

app.get('/users', async (c) => {
  const db = c.var.db
  const result = await db.select().from(users).all()

  return c.json(result)
});

app.get('/users/:id', async (c) => {
  const db = c.var.db
  const id = parseInt(c.req.param('id'))
  const result = await db.select().from(users).where(eq(users.id, id)).all()
  return c.json(result)
});
    
export default app