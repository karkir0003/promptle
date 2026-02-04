import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface GenerateImageRequest {
  prompt: string;
  guessId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const huggingfaceSpaceUrl = Deno.env.get("HUGGINGFACE_IMAGE_GEN_SPACE_URL") ?? "";

    if (!huggingfaceSpaceUrl) {
      throw new Error("Missing HUGGINGFACE_IMAGE_GEN_SPACE_URL");
    }

    // Parse request body
    const { prompt, guessId }: GenerateImageRequest = await req.json();

    if (!prompt || prompt.length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        }
      );
    }

    // Validate prompt length (max 100 chars as per game rules)
    if (prompt.length > 100) {
      return new Response(
        JSON.stringify({ error: "Prompt must be 100 characters or less" }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          } 
        }
      );
    }

    console.log("Generating image for prompt:", prompt);
    const startTime = Date.now();

    console.log("Calling Hugging Face Space:", huggingfaceSpaceUrl);
    const fullUrl = `${huggingfaceSpaceUrl}/api/generate`;
    console.log("Full URL:", fullUrl);
    
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face Space error:", response.status, errorText);
      
      // Handle specific errors
      if (response.status === 503) {
        throw new Error("Model is loading. Please wait 20-30 seconds and try again.");
      }
      
      throw new Error(`Hugging Face Space error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Space response received");

    // Check if generation was successful
    if (!result.success) {
      throw new Error(result.error || "Image generation failed");
    }

    if (!result.image) {
      throw new Error("No image returned from Space");
    }

    // Parse base64 image
    console.log("Parsing base64 image data");
    const base64Data = result.image.includes("base64,") 
      ? result.image.split("base64,")[1] 
      : result.image;
    
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const imageBlob = new Blob([binaryData], { type: "image/png" });

    const inferenceTime = (Date.now() - startTime) / 1000;
    console.log("Image generated successfully in", inferenceTime, "seconds");

    // Upload image to Supabase Storage
    console.log("Uploading image to Supabase Storage...");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials for storage upload");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate a unique filename
    const filename = `generated/${guessId || crypto.randomUUID()}.png`;
    
    // Convert blob to ArrayBuffer for Supabase upload
    const arrayBuffer = await imageBlob.arrayBuffer();
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(filename, arrayBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading to storage:", uploadError);
      throw new Error("Failed to upload image to storage");
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(filename);

    console.log("Image uploaded to:", publicUrl);

    // If guessId is provided, update the guess record
    if (guessId) {
      try {
        const { error: updateError } = await supabase
          .from("guesses")
          .update({ generated_image_url: publicUrl })
          .eq("id", guessId);

        if (updateError) {
          console.error("Error saving generated image to database:", updateError);
        } else {
          console.log("Generated image saved to guess:", guessId);
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
      }
    }

    // Return the generated image URL
    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        width: 512,
        height: 512,
        inferenceTime: inferenceTime,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error generating image:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});