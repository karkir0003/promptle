"use client";

import { useActionState } from "react";
import { updatePassword } from "@/actions/auth-actions";

export default function UpdatePassword() {
  const [state, formAction, isPending] = useActionState(updatePassword, null);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <div className="w-full max-w-md p-8 space-y-4 bg-white rounded shadow">
        <h1 className="text-2xl font-bold text-center">Set New Password</h1>

        <form action={formAction} className="flex flex-col gap-4">
          <input
            name="password"
            type="password"
            placeholder="New Password"
            required
            minLength={6}
            className="border p-2 rounded"
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm New Password"
            required
            minLength={6}
            className="border p-2 rounded"
          />
          <button
            disabled={isPending}
            className="bg-black text-white p-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {isPending ? "Updating..." : "Update Password"}
          </button>
        </form>

        {state?.error && (
          <p className="text-red-600 text-sm text-center">{state.error}</p>
        )}
      </div>
    </div>
  );
}
