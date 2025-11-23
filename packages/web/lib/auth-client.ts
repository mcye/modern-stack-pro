import { createAuthClient } from "better-auth/react" // 注意这里用 react 版本

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL_PROD && process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_API_URL_PROD 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
})