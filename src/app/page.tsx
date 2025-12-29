import Link from "next/link";
import { requireGuest } from "@/lib/supabase/auth";

<<<<<<< HEAD
export default async function Home() {
  await requireGuest();

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Promptle</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            A daily prompt engineering challenge. Recreate the target image with your best prompt!
          </p>
=======
export default function Home() {
  const mockTarget = {
    imageUrl:
      "https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=1000&auto=format&fit=crop",
    photographer: "Karthik Subramanian",
  };

  return (
    <main className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Left Panel */}
      <div className="w-full md:w-1/2 h-[40vh] md:h-screen p-6 bg-muted/20 flex items-center justify-center border-r border-border">
        <div className="w-full max-w-md aspect-square">
          <TargetViewer
            imageUrl={mockTarget.imageUrl}
            photographer={mockTarget.photographer}
          />
>>>>>>> 3592fe9c84633c640e319ef4e93067f5b0818514
        </div>

        <div className="flex flex-col gap-4 pt-6">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
