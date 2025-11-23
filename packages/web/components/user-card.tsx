"use client"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function UserCard() {
    // ✨ useSession 是 Better-Auth 提供的 React Hook，自动管理状态
    const { data: session, isPending, error } = authClient.useSession()
    const router = useRouter()

    const handleSignOut = async () => {
        await authClient.signOut()
        router.push("/login")
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
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800">{session?.user?.name || "User"}</h2>
                <p className="text-gray-500">{session?.user?.email || "user@example.com"}</p>
                <p className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                    Role: {session?.user?.name || "User"}
                </p>
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