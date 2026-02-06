"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import api from "@/lib/api-sdk";
import Link from "next/link";
import axios from "axios";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (!token) {
      toast.error("Invalid reset token.");
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setIsSuccess(true);
      toast.success("Password reset successful!");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Failed to reset password. The link may have expired.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-7 w-7 items-center justify-center rounded-md overflow-hidden">
              <img src="/marketlum-logo.png" alt="Marketlum" className="h-7 w-7 object-cover" />
            </div>
            <span className="font-bold bg-gradient-to-r from-green-500 via-cyan-500 to-purple-500 bg-clip-text text-transparent">
              Marketlum
            </span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {error ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Invalid Link</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
                <Link href="/forgot-password">
                  <Button className="w-full">Request new reset link</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </Link>
              </div>
            ) : isSuccess ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                  <h1 className="text-2xl font-bold">Password Reset!</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Your password has been reset successfully. You can now log in with your new password.
                  </p>
                </div>
                <Link href="/login">
                  <Button className="w-full">Go to login</Button>
                </Link>
              </div>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">Reset your password</h1>
                  <p className="text-balance text-sm text-muted-foreground">
                    Enter your new password below.
                  </p>
                </div>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset password"}
                  </Button>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to login
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(74,222,128,0.08)_0%,_rgba(168,85,247,0.06)_50%,_transparent_80%)]" />
        <img
          src="/marketlum-logo.png"
          alt="Marketlum"
          className="relative w-64 h-64 object-contain drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
