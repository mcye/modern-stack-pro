import { Hono } from 'hono'
import { cors } from 'hono/cors' // 必须引入 CORS
import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client/web' // 注意这里必须用 /web 适配 Cloudflare
import { KVNamespace } from '@cloudflare/workers-types' 
import { createAuth } from './auth'
import { getStripe } from './stripe'
import { schema } from '@repo/shared'
import { eq } from 'drizzle-orm'
import { convertToModelMessages, streamText, embed, embedMany } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { Index } from "@upstash/vector"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { rateLimit } from './middleware/rate-limit'

// 定义环境变量类型
type Bindings = {
  TURSO_DATABASE_URL: string
  TURSO_AUTH_TOKEN: string
  USER_CACHE: KVNamespace // Cloudflare 内置类型
  BETTER_AUTH_SECRET: string
  STRIPE_SECRET_KEY: string
  FRONTEND_URL: string
  OPENAI_API_KEY: string
  OPENAI_BASE_URL?: string
  UPSTASH_VECTOR_REST_URL: string
  UPSTASH_VECTOR_REST_TOKEN: string
}

// 定义上下文变量类型 (告诉 TS c.var.db 是什么)
type Variables = {
  db: LibSQLDatabase // 需要从 drizzle-orm/libsql 引入这个类型
}

// 初始化 Hono 时传入这两个泛型
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 配置 CORS (非常重要，否则前端 fetch 会跨域失败)
app.use('/*', cors({
  origin: ['http://localhost:3000', 'https://hypervigilant-monnie-supratemporal.ngrok-free.dev'], // 允许前端地址
  allowHeaders: ['Content-Type', 'Authorization', 'better-auth-csrf-token'], // 👈 加上 better-auth 可能用到的 header
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'Set-Cookie'], // 👈 增加 exposeHeaders
  maxAge: 600,
  credentials: true, // 允许携带 Cookie
}))

// 🔥 关键：只对 /api/ai/* 和 /api/rag/* 开头的路由应用限流
// 这样静态资源或普通查询不会误伤
app.use('/api/chat', rateLimit)
app.use('/api/document', rateLimit)
app.use('/users', rateLimit)

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

    return c.json({ user: session?.user || null })
})

app.get('/users', async (c) => {
  const db = c.var.db
  const users = await db.select().from(schema.user)
  return c.json({ users })
})

// 💰 创建支付会话接口
app.post('/create-checkout-session', async (c) => {
  const db = c.var.db
  const auth = createAuth(db)

  // 1. 校验用户是否登录
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  console.log('session', session)

  const user = session.user

  const stripe = getStripe(c.env.STRIPE_SECRET_KEY)

  // 2. 查找或创建 Stripe Customer
  // (简单的逻辑：如果没有 ID 就创建，实际生产中可能需要更严谨的同步)
  // 从数据库重新查询用户，拿到 stripeCustomerId
  
  let customerId = user?.stripeCustomerId

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || '',
      name: user.name || '',
      metadata: {
        userId: user.id || '' // 关键：把我们的 UserID 存到 Stripe 里，方便对账
      }
    })
    customerId = customer.id

    // 将 ID 回写到数据库
    await db.update(schema.user)
      .set({ stripeCustomerId: customerId })
      .where(eq(schema.user.id, user.id))  
  }

  // 3. 创建 Checkout Session
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription', // 订阅模式
    payment_method_types: ['card'],
    line_items: [
      {
        // 这里为了演示，直接用 price_data 创建一个临时商品
        // 生产环境应该使用 Stripe Dashboard 里创建好的 Price ID
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Pro Plan Subscription',
            description: 'Unlock all features',
          },
          unit_amount: 2000, // $20.00
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    // 支付成功跳回 Dashboard
    success_url: `${c.env.FRONTEND_URL}/dashboard?success=true`,
    // 取消支付也跳回 Dashboard
    cancel_url: `${c.env.FRONTEND_URL}/dashboard?canceled=true`,
  })

  if (!checkoutSession.url) {
    return c.json({ error: 'Error creating session' }, 500)
  }

  return c.json({ url: checkoutSession.url })
})

// 初始化 OpenAI 客户端
// 可以在请求里动态初始化，也可以在全局（如果 Key 是静态的）
const getAI = (apiKey: string, baseURL?: string) => {
  return createOpenAI({
    apiKey: apiKey,
    baseURL: baseURL, // 兼容 Groq/DeepSeek
    // compatibility: 'strict', // 严格模式
  })
}

// 初始化 Upstash SDK 客户端
const getIndex = (env: Bindings) => new Index({
  url: env.UPSTASH_VECTOR_REST_URL,
  token: env.UPSTASH_VECTOR_REST_TOKEN,
  cache: false, // 👈 关键：在 Cloudflare Workers 中必须禁用 cache，否则会报错
})

app.post('/api/chat', async (c) => {
  const db = c.var.db
  const auth = createAuth(db)
  
  // 1. 鉴权：只有登录用户才能用 AI (保护你的钱！)
  // const session = await auth.api.getSession({ headers: c.req.raw.headers })
  // if (!session) {
  //   return c.json({ error: 'Unauthorized' }, 401)
  // }

  // 2. 获取前端传来的对话历史
  // 格式: { messages: [{ role: 'user', content: 'hi' }] }
  const { messages } = await c.req.json() 
  const modelMessages = convertToModelMessages(messages)
  // 3. 获取用户最新的一条问题
  const lastUserMessage = modelMessages[modelMessages.length - 1]
  
  // 4. 提取用户问题
  const content = lastUserMessage.content
  const userQuery = typeof content === 'string' 
    ? content 
    : content
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('\n')

  // 5. 在 Upstash 中检索相关上下文
  const index = getIndex(c.env)
  
  // 6. 检索相关上下文
  const queryResult = await index.query({
    data: userQuery,
    topK: 3, // 👈 设置返回的最相关文档数量
    includeMetadata: true, // 👈 设置返回元数据
    includeData: true, // 👈 设置返回文档内容
  })

  // 7. 构造上下文文本 (Context Block)
  const contextBlock = queryResult.map(match => {
    const source = match.metadata?.source || match.metadata?.title || 'Unknown Source';
    const content = match.data || match.metadata?.content || '';
    return `--- Source: ${source} ---\n${content}`
  }).join('\n\n')

  console.log('RAG Context Found:', contextBlock) // 调试用，看看查到了啥

  // 8. 调用 AI 模型
  // 为了防止 AI 混淆之前的对话历史和当前的 RAG 上下文（导致重复回答旧问题），
  // 我们这里只将“最新的一条用户消息”传给模型，强制它只关注当前问题。
  // 如果未来需要支持多轮对话（如“它是什么颜色？”），则需要引入“Query Rewriting”步骤。
  const openai = getAI(c.env.OPENAI_API_KEY, c.env.OPENAI_BASE_URL)
  const result = streamText({
    model: openai('openai/gpt-oss-20b'), 
    messages: [lastUserMessage], 
    system: `你是一个基于知识库的智能助手。
    
    请严格根据以下【上下文信息】回答用户的问题。
    
    【重要规则】：
    1. 你的回答必须完全基于【上下文信息】。
    2. 不要重复之前问题的答案，除非它们与当前问题直接相关。
    3. 如果【上下文信息】中没有答案，请直接说“我根据现有知识库无法回答这个问题”，不要编造，也不要试图从对话历史中寻找答案。
    
    【上下文信息】：
    ${contextBlock}
    `,
  })

  // 9. 返回流式响应
  return result.toUIMessageStreamResponse()
})

// 📚 新增路由：添加文档
app.post('/api/documents', async (c) => {
  const db = c.var.db
  const auth = createAuth(db)
  
  // 1. 鉴权
  // const session = await auth.api.getSession({ headers: c.req.raw.headers })
  // if (!session) {
  //   return c.json({ error: 'Unauthorized' }, 401)
  // }

  const { title, content } = await c.req.json() as { title: string, content: string }

  if (!content || !title) {
    return c.json({ error: 'Missing content or title' }, 400)
  }

  try {
    // 2. 将数据存入 SQL (Turso) 以便管理
    const docId = crypto.randomUUID();
    
    await db.insert(schema.document).values({
        id: docId,
        userId: "Uch05Fk2YUWk3Qg8gcwx9NRX1queW2yV",
        // userId: session.user.id,
        title: title,
        content: content,
        createdAt: new Date(),
    })

    // 3. 文本切片 (Chunking)
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000, // 每个分片的字符数
      chunkOverlap: 200, // 重叠的字符数
    });
    
    const chunks = await splitter.createDocuments([content]);

    // 4. 批量存入 Upstash
    const index = getIndex(c.env)

    // 构造 Upstash 需要的向量数据格式
    // 我们尝试直接存文本，让 Upstash 自动 Embedding
    const vectors = chunks.map((chunk, i) => ({
      id: `${docId}-${i}`, // 唯一 ID: 文档ID-分片索引
      data: chunk.pageContent,
      metadata: {
        userId: "Uch05Fk2YUWk3Qg8gcwx9NRX1queW2yV",
        docId: docId,
        title: title,
        content: chunk.pageContent // 冗余存一份在 metadata 以防万一
      }
    }))

    // 5. 批量存入 Upstash
    await index.upsert(vectors)

    return c.json({ success: true, id: docId, chunks: chunks.length })

  } catch (e: any) {
    console.error(e)
    return c.json({ error: e.message }, 500)
  }
})

export default app