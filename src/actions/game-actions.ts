"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { GameResult } from "@/types/game.types";
import {
  validatePrompt,
  getUserAttemptCount,
  getChallengeById,
  saveGuess,
  getUserAttemptsForChallenge,
  getUserBestScore,
} from "@/services/game-service";
import { generateImage } from "@/services/image-generation-service";
import { calculateSimilarityScore } from "@/services/scoring-service";

// Formats the attempt message based on remaining attempts
function formatAttemptMessage(attemptsLeft: number): string {
  if (attemptsLeft > 0) {
    return `Great attempt! You have ${attemptsLeft} ${
      attemptsLeft === 1 ? "attempt" : "attempts"
    } left.`;
  }
  return "That was your last attempt! Check back tomorrow for a new challenge.";
}

export async function submitGuess(
  challengeId: string,
  formData: FormData,
): Promise<GameResult> {
  const supabase = await createClient();

  // Get the current authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: "You must be logged in to submit a guess",
    };
  }

  const prompt = formData.get("prompt") as string;

  // Validate prompt length
  const validation = validatePrompt(prompt);
  if (!validation.valid) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: validation.error!,
    };
  }

  // Check how many attempts the user has made for this challenge
  const attemptData = await getUserAttemptCount(user.id, challengeId);
  if (attemptData.error) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: `${attemptData.error}. Please try again.`,
    };
  }

  const { nextAttemptNumber } = attemptData;

  if (nextAttemptNumber > 3) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: "You've used all 3 attempts for today's challenge!",
      attemptsLeft: 0,
    };
  }

  // Get the target challenge image to compare against
  const { challenge, error: challengeError } =
    await getChallengeById(challengeId);

  if (challengeError || !challenge) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: `${challengeError}. Please try again.`,
    };
  }

  // Save the guess first (without image and score)
  const { guess, error: saveError } = await saveGuess({
    userId: user.id,
    challengeId,
    prompt,
    imageUrl: null, // Will be updated after generation
    score: 0, // Will be updated after scoring
    attemptNumber: nextAttemptNumber,
  });

  if (saveError || !guess) {
    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: `${saveError}. Please try again.`,
    };
  }

  try {
    //Generates the image using the user's prompt
    console.log("Generating image for prompt:", prompt);
    const imageResult = await generateImage(prompt, guess.id);

    if (!imageResult.success || !imageResult.imageUrl) {
      throw new Error(imageResult.error || "Image generation failed");
    }

    const generatedImageUrl = imageResult.imageUrl;
    console.log("Image generated successfully:", generatedImageUrl);

    // Calculates the CLIP similarity score for the generated image and compares the target image with the user's prompt using CLIP embeddings
    let score: number;
    try {
      const result = await calculateSimilarityScore(
        challenge.image_url,
        prompt,
        challengeId,
      );
      score = result.score;
      console.log("Similarity score calculated:", score);
    } catch (scoringError) {
      console.error("Scoring error:", scoringError);
      // If scoring fails, still return the generated image but with 0 score
      score = 0;
    }

    // Updates the guess with the generated image URL and score
    const { error: updateError } = await supabase
      .from("guesses")
      .update({
        generated_image_url: generatedImageUrl,
        score: score,
      })
      .eq("id", guess.id);

    if (updateError) {
      console.error("Error updating guess:", updateError);
      // Doesn't fail the whole operation if update fails
    }

    revalidatePath("/daily-challenge");

    const attemptsLeft = 3 - nextAttemptNumber;

    return {
      success: true,
      imageUrl: generatedImageUrl,
      score: score,
      message: formatAttemptMessage(attemptsLeft),
      attemptsLeft: attemptsLeft,
    };
  } catch (error) {
    console.error("Error in image generation/scoring pipeline:", error);

    // Clean up the guess record if something went wrong
    await supabase.from("guesses").delete().eq("id", guess.id);

    // error messaging
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";

    return {
      success: false,
      imageUrl: null,
      score: 0,
      message: errorMessage,
    };
  }
}

// Helper function to get user's attempts for a challenge
export async function getUserAttempts(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getUserAttemptsForChallenge(user.id, challengeId);
}

// Helper function to get user's best score for a challenge
export async function getBestScore(challengeId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return getUserBestScore(user.id, challengeId);
}
