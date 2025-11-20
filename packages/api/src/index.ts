import { Hono } from 'hono'

const app = new Hono()

// 1. 基础路由
app.get('/', (c) => {
  return c.json({
    message: 'Hello Modern Stack Pro!',
    timestamp: new Date().toISOString(),
    env: 'development'
  })
})

// 2. 带参数的路由
app.get('/hello/:name', (c) => {
  const name = c.req.param('name')
  return c.json({
    message: `Hello, ${name}!`,
    role: 'Full Stack Developer'
  })
})

app.get('/greet/:name', (c) => {
  const name = c.req.param('name')
  return c.json({ message: `Hello, ${name} from Hono!` })
})

export default app