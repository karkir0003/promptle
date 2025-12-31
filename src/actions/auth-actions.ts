"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DEFAULT_AUTH_REDIRECT, UPDATE_PASSWORD } from "@/constants/routes";

// Define the shape of the state we return to the client
export type AuthState = {
  success: boolean;
  error?: string;
  message?: string;
} | null;

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(DEFAULT_AUTH_REDIRECT);
}

/**
 * Request Password Reset
 * Send email for user to reset password
 */
export async function resetPassword(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  const supabase = await createClient();

  const origin = (await headers()).get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${UPDATE_PASSWORD}`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Check your email for the password reset link",
  };
}

/**
 * 2. Update Password
 * This is called AFTER the user clicks the email link.
 * The /auth/callback route has already logged them in, so we just update the user.
 */
export async function updatePassword(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return {
      success: false,
      error: "Password and confirm password are required",
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(DEFAULT_AUTH_REDIRECT);
}

/**
 * Sign in with Google (OAuth)
 */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  if (data.url) {
    redirect(data.url); // This sends the user to Google
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(
  prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required" };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${DEFAULT_AUTH_REDIRECT}`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: "Check your email to confirm your account",
  };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
