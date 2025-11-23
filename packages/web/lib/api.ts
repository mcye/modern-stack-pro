import { User } from '@repo/shared'; // ✨ 直接复用后端定义的类型！

const API_URL = 
  process.env.NEXT_PUBLIC_API_URL_PROD && process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_API_URL_PROD 
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function getUsers(): Promise<User[]> {
  // force-cache 意味着 Next.js 也会在服务端缓存这份数据
  // 如果你需要实时性，可以改成 'no-store'
  console.log(API_URL);
  const res = await fetch(`${API_URL}/users`, { 
    cache: 'no-store' 
  });

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}