import "server-only";

interface GenerateImageResponse {
  success: boolean;
  imageUrl: string;
  width?: number;
  height?: number;
  inferenceTime?: number;
  error?: string;
}

/**
 * Generates an image using Hugging Face and saves it to the guess
 */
export async function generateImage(
  prompt: string,
  guessId: string,
): Promise<GenerateImageResponse> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        guessId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle specific error cases
      if (response.status === 503) {
        throw new Error(
          "The AI model is loading. Please wait a moment and try again.",
        );
      }

      if (response.status === 429) {
        throw new Error(
          "Too many requests. Please wait a moment before trying again.",
        );
      }

      throw new Error(
        `Image generation error: ${response.status}\n Message: ${errorText}`,
      );
    }

    const result: GenerateImageResponse = await response.json();

    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || "Image generation failed");
    }
  } catch (error) {
    console.error("Error generating image:", error);

    // Provides helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("loading")) {
        throw new Error(
          "Model is warming up. This usually takes 20-30 seconds. Please try again shortly.",
        );
      }
      if (error.message.includes("rate limit")) {
        throw new Error("Rate Limit Exceeded.");
      }
    }

    throw new Error("Failed to generate image. Please try again.");
  }
}
