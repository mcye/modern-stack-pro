import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <h1 className="text-5xl font-extrabold mb-6 text-black tracking-tight">
        Modern Stack Pro
      </h1>
      <p className="text-xl text-gray-500 mb-10 max-w-lg text-center">
        The ultimate full-stack starter kit with Hono, Next.js, Cloudflare, and Better-Auth.
      </p>
      
      <div className="flex gap-4">
        <Link 
          href="/login" 
          className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium"
        >
          Log In
        </Link>
        <Link 
          href="/dashboard" 
          className="px-6 py-3 rounded-lg bg-black text-white hover:bg-gray-800 transition font-medium shadow-lg"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}