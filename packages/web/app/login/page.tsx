import SignInForm from "@/components/sign-in-form";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <SignInForm />
      <div className="mt-4 text-sm">
        Don&apos;t have an account? <Link href="/register" className="text-blue-600 hover:underline">Sign up</Link>
      </div>
    </main>
  );
}