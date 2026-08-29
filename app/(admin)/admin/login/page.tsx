"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (formData: LoginFormValues) => {
    setError(null);
    try {
      const { data, error: signInError } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        setError(signInError.message || "Invalid credentials");
        return;
      }
      
      // Fix for cross-domain auth: set the token as a cookie on the frontend domain 
      // so the Next.js middleware.ts can read it and allow access to /admin
      const sessionToken = data?.token || (data as any)?.session?.token;
      if (sessionToken) {
        document.cookie = `better-auth.session_token=${sessionToken}; path=/; max-age=2592000; SameSite=Lax;`;
      } else {
        console.warn("Could not find token in response:", data);
      }
      
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please check if backend is running.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative z-0 overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-900/20 rounded-full blur-[120px] -z-10"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-500 relative border border-white/10 shadow-2xl">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 border-4 border-background">
            <span className="font-bold text-black text-4xl font-outfit">D</span>
          </div>
        </div>

        <div className="text-center mt-10 mb-8">
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Welcome Back</h1>
          <p className="text-zinc-400">Sign in to your DineHub admin portal</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                {...register("email")}
                type="email"
                placeholder="Email address"
                className={cn(
                  "w-full bg-black/40 border rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-colors",
                  errors.email ? "border-red-500/50" : "border-white/10 focus:border-primary-500/50"
                )}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-xs text-red-400 ml-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary-500 transition-colors" />
              <input
                {...register("password")}
                type="password"
                placeholder="Password"
                className={cn(
                  "w-full bg-black/40 border rounded-xl pl-12 pr-4 py-3.5 text-white focus:outline-none transition-colors",
                  errors.password ? "border-red-500/50" : "border-white/10 focus:border-primary-500/50"
                )}
              />
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-red-400 ml-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded bg-black/40 border-white/10 text-primary-500 focus:ring-primary-500/50" />
              <span className="text-sm text-zinc-400">Remember me</span>
            </label>
            <a href="#" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3.5 px-6 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Sign In <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
