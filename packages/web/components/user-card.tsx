"use client"
import { authClient } from "@/lib/auth-client"
import { type User } from "@repo/shared"
import { useRouter } from "next/navigation"
import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function UserCard() {
    // ✨ useSession 是 Better-Auth 提供的 React Hook，自动管理状态
    const { data: session, isPending, error } = authClient.useSession()
    const user = session?.user as User;

    const router = useRouter()
    const [isPaying, setIsPaying] = useState(false) // 支付 Loading 状态

    const handleSignOut = async () => {
        await authClient.signOut()
        router.push("/login")
    }

    const handleUpgrade = async () => {
        setIsPaying(true)
        try {
            // 1. 请求后端创建 Session
            // 注意：这里需要带上 credentials，否则后端拿不到 cookie，会报 401
            const res = await fetch(`${API_URL}/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // 👈 核心！带上 Session Cookie
            })

            const data = await res.json()

            if (data.url) {
                // 2. 跳转到 Stripe 托管页面
                window.location.href = data.url
            } else {
                alert('Failed to start checkout')
            }
        } catch (e) {
            console.error(e)
            alert('Something went wrong')
        }
        setIsPaying(false)
    }

    // ✨ 优化：在加载状态下，渲染一个骨架屏或 Loading 动画
    // 绝对不要在 isPending 的时候渲染 Dashboard 的真实内容
    if (isPending) {
        return (
            <div className="animate-pulse flex flex-col items-center gap-4 p-8 bg-white rounded-lg border">
                <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
        )
    }

    // 如果加载完了还没 session (即将跳转)，返回 null 避免闪现内容
    if (!session) return null;

    return (
        <div className="bg-white p-8 rounded-lg shadow border flex flex-col items-center gap-4">
            {/* 这里的 session.user 类型是自动推导的！ */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">{user?.name || "User"}</h2>
                <p className="text-gray-500">{user?.email || "user@example.com"}</p>
                <p className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                    Role: {user?.role || "User"}
                </p>
            </div>

            <div className="w-full border-t pt-4 mt-2">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Current Plan</span>
                    <span className="font-bold bg-green-100 text-green-800 px-2 py-1 rounded uppercase text-xs">
                        {user?.plan || 'Free'}
                    </span>
                </div>

                {/* 只有 Free 用户才显示升级按钮 */}
                {user?.plan !== 'pro' && (
                     <button 
                        onClick={handleUpgrade}
                        disabled={isPaying}
                        className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center"
                    >
                        {isPaying ? (
                            <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                        ) : (
                            "Upgrade to PRO ($20/mo)"
                        )}
                    </button>
                )}
            </div>

            <button 
                onClick={handleSignOut}
                className="mt-4 px-4 py-2 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition"
            >
                Sign Out
            </button>
        </div>
    )
}