"use client"
import ChatInterface from "@/components/chat-interface";
import UserCard from "@/components/user-card";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  // useEffect(() => {
  //   console.log("isPending:", isPending, "session:", session);
  //   if (!isPending && !session) {
  //     router.replace("/login");
  //   }
  // }, [isPending, session, router]);

  // if (isPending || !session) return null;

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-black">Dashboard</h1>
      <UserCard />
      <ChatInterface />
      <Link href="/knowledge" className="text-blue-600 hover:underline">Knowledge</Link>
    </main>
  );
}