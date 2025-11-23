"use client"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export default function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignIn = async () => {
    setLoading(true)
    const { data, error } = await authClient.signIn.email({
        email,
        password,
    })
    
    if (error) {
        alert(error.message)
    } else {
        // 登录成功，跳转到仪表盘
        router.push("/dashboard")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm border p-8 rounded-lg shadow-md bg-white">
        <h2 className="text-2xl font-bold text-center text-gray-800">Welcome Back</h2>
        <input 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="border p-2 rounded text-black"
        />
        <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="border p-2 rounded text-black"
        />
        <button 
            onClick={handleSignIn} 
            disabled={loading}
            className="bg-black text-white p-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
            {loading ? "Signing in..." : "Sign In"}
        </button>
    </div>
  )
}