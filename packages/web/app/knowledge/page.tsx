"use client"
import { useState } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL

export default function KnowledgePage() {
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch(`${API_URL}/api/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
                credentials: 'include' // 带 Cookie
            })
            
            if (res.ok) {
                alert("Knowledge added successfully!")
                setTitle("")
                setContent("")
            } else {
                const err = await res.json()
                alert("Error: " + JSON.stringify(err))
            }
        } catch (e) {
            alert("Network error")
        }
        setIsLoading(false)
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow border">
            <h1 className="text-2xl font-bold mb-4">Add Knowledge</h1>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input 
                        className="mt-1 w-full border rounded p-2"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Content</label>
                    <textarea 
                        className="mt-1 w-full border rounded p-2 h-32"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Enter text for AI to remember..."
                        required
                    />
                </div>
                <button 
                    disabled={isLoading}
                    className="bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? "Embedding..." : "Save to Vector DB"}
                </button>
            </form>
        </div>
    )
}