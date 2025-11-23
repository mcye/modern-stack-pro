"use client"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"

export default function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
    })

    if (error) {
        alert(error.message)
    } else {
        alert("注册成功！")
        router.push("/dashboard") // 注册成功跳转到 dashboard 页面
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded text-black"/>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border p-2 rounded text-black"/>
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="border p-2 rounded text-black"/>
        <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-black text-white p-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
            {loading ? "Signing up..." : "Sign Up"}
        </button>
    </div>
  )
}