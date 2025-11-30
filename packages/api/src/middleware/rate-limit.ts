import { createMiddleware } from 'hono/factory'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis/cloudflare'
import { HTTPException } from 'hono/http-exception'

type Env = {
  UPSTASH_REDIS_REST_URL: string
  UPSTASH_REDIS_REST_TOKEN: string
}

export const rateLimit = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // 1. 初始化 Redis 客户端
  const redis = new Redis({
    url: c.env.UPSTASH_REDIS_REST_URL,
    token: c.env.UPSTASH_REDIS_REST_TOKEN,
  })

  // 2. 创建限流器
  // Sliding Window 算法：平滑限流，防止临界点突发
  // 这里设置：每 10 秒最多允许 5 次请求 (适合 AI 接口，防止狂刷)
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '10 s'),
    analytics: true, // 可以在 Upstash 后台看到拦截记录
    prefix: 'ratelimit',
  })

  // 3. 确定限流标识 (Identifier)
  // 优先用 User ID (如果登录了)，否则用 IP 地址
  // 注意：Cloudflare Workers 取 IP 用 c.req.header('CF-Connecting-IP')
  const ip = c.req.header('CF-Connecting-IP') || 'anonymous'
  const identifier = ip // 如果有 auth，可以组合：`${user.id}` ?? ip

  // 4. 执行限流检查
  const { success, limit, remaining, reset } = await ratelimit.limit(identifier)

  // 设置标准 RateLimit Headers 告诉前端还能刷几次
  c.header('X-RateLimit-Limit', limit.toString())
  c.header('X-RateLimit-Remaining', remaining.toString())
  c.header('X-RateLimit-Reset', reset.toString())

  if (!success) {
    // 超过限制，直接抛出 429 错误
    throw new HTTPException(429, { message: '请求太频繁，请稍后再试 (Rate limit exceeded)' })
  }

  await next()
})