import SignUpForm from "@/components/sign-up-form";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-black">Create Account</h1>
      <SignUpForm />
      <div className="mt-4 text-sm text-gray-600">
        Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </div>
    </main>
  );
}