import { GoogleGenerativeAI } from '@google/generative-ai'; // Google's Gemini AI SDK

// Interface for AI continuation request (input to the service)
export interface AIContinuationRequest {
  text: string; // User's text that AI should continue from
}

// Interface for AI continuation response (output from the service)
export interface AIContinuationResponse {
  continuation: string; // AI-generated text continuation
}

/**
 * Retry function with exponential backoff (handles transient API failures gracefully)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>, // Function to retry (returns a Promise)
  maxRetries: number = 3, // Maximum number of retry attempts
  initialDelay: number = 1000 // Initial delay in milliseconds (1 second)
): Promise<T> {
  let lastError: Error | null = null; // Track the last error encountered
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn(); // Execute the function and return result if successful
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error'); // Normalize error to Error type
      
      // Check if it's a retryable error (503, 429, or network errors) - don't retry on 404 (model not found) errors
      const isRetryable = 
        (lastError.message.includes('503') || // Service unavailable
        lastError.message.includes('overloaded') || // Service overloaded
        lastError.message.includes('429') || // Rate limit exceeded
        lastError.message.includes('quota') || // Quota exceeded
        lastError.message.includes('network') || // Network errors
        lastError.message.includes('ECONNRESET') || // Connection reset
        lastError.message.includes('ETIMEDOUT')) && // Connection timeout
        !lastError.message.includes('404') && // Don't retry on 404 (model not found)
        !lastError.message.includes('not found'); // Don't retry on "not found" errors
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw lastError; // Throw error if not retryable or max retries reached
      }
      
      // Exponential backoff: delays increase exponentially (1s, 2s, 4s) to avoid overwhelming the API
      const delay = initialDelay * Math.pow(2, attempt); // Calculate delay: 1000ms * 2^attempt
      await new Promise(resolve => setTimeout(resolve, delay)); // Wait before retrying
    }
  }
  
  throw lastError || new Error('Max retries exceeded'); // Throw error if all retries failed
}

/**
 * Main function to generate a complete paragraph based on user's text (wraps retry logic)
 */
export async function continueWriting(
  request: AIContinuationRequest // User's text input
): Promise<AIContinuationResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Get API key from environment variables
  
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in your .env file.' // Error if API key is missing
    );
  }

  const userText = request.text.trim(); // Remove leading/trailing whitespace from user input
  
  if (!userText) {
    throw new Error('No text provided.'); // Error if user text is empty after trimming
  }

  // Create prompt for generating a complete paragraph (instructions for the AI model)
  const prompt = `Write a complete, well-formed paragraph based on the following text or topic.

Write a full paragraph with 4-6 sentences that is coherent, engaging, and well-structured.
If the input is a topic or idea, develop it into a complete paragraph.
If the input is a partial thought, complete and expand it into a full paragraph.

User's text/topic:
${userText}

Generate a complete paragraph:`;

  // Wrap API call in retry logic with exponential backoff (handles transient failures)
  return retryWithBackoff(async () => {
    try {
      // Initialize Gemini client with API key
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Model fallback chain: try newer models first, fallback to older models if unavailable
      const modelsToTry = [
        'gemini-2.5-flash',    // Fast 2.5 model (preferred - fastest and newest)
        'gemini-2.5-pro',      // Pro 2.5 model (more capable, slightly slower)
        'gemini-1.5-flash',    // Fallback to 1.5 flash (older but still fast)
        'gemini-1.5-pro',      // Fallback to 1.5 pro (older but more capable)
        'gemini-pro',          // Last resort - older stable model (most compatible)
      ];
      
      let lastModelError: Error | null = null; // Track errors from model attempts
      let result; // Store successful result
      
      // Try each model in order until one succeeds
      for (const modelName of modelsToTry) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName, // Current model to try
            generationConfig: {
              maxOutputTokens: 500, // Maximum tokens in response (controls length)
              temperature: 0.7, // Creativity level (0-1, higher = more creative)
              topP: 0.95, // Nucleus sampling parameter (controls diversity)
              topK: 40, // Top-K sampling (limits token choices)
            },
          });
          result = await model.generateContent(prompt); // Generate content with current model
          
          // Verify we got a valid result before breaking (success - exit loop)
          if (result && result.response) {
            break; // Success, exit loop and use this result
          }
        } catch (modelError) {
          lastModelError = modelError instanceof Error ? modelError : new Error('Unknown model error'); // Normalize error
          // If it's a 404 (model not found), try next model (model unavailable, not a fatal error)
          if (lastModelError.message.includes('404') || lastModelError.message.includes('not found')) {
            continue; // Try next model in fallback chain
          }
          // For other errors (auth, quota, etc.), throw immediately (don't try other models)
          throw lastModelError;
        }
      }
      
      // If we get here and no result, all models failed (none were available or all had errors)
      if (!result) {
        throw new Error(`No available models found. Last error: ${lastModelError?.message || 'Unknown error'}`);
      }
      
      // Extract text from response - handle different response structures (API response format can vary)
      const response = await result.response;
      
      // Try to get text from response using primary method
      let text = '';
      try {
        text = response.text(); // Primary method: get text directly from response
      } catch (textError) {
        // If text() fails, try to get from candidates (fallback for different API response formats)
        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0]; // Get first candidate (usually the only one)
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            // Extract text from parts array (some responses have text in parts)
            text = candidate.content.parts
              .map((part: any) => part.text || '') // Extract text from each part, default to empty string
              .join('') // Join all parts into single string
              .trim(); // Remove leading/trailing whitespace
          }
        }
      }
      
      // If still no text, check candidates directly from result (second fallback method)
      if (!text || !text.trim()) {
        if (result.response?.candidates && result.response.candidates.length > 0) {
          const candidate = result.response.candidates[0]; // Get first candidate
          if (candidate.content?.parts) {
            // Extract text from parts (alternative response structure)
            text = candidate.content.parts
              .map((part: any) => part.text || '') // Map parts to text strings
              .join('') // Combine into single string
              .trim(); // Clean whitespace
          }
        }
      }
      
      // Validate that we actually got text content
      if (!text || !text.trim()) {
        throw new Error('Empty response from API. The model did not generate any content.'); // Error if no text extracted
      }

      return { continuation: text.trim() }; // Return trimmed text as continuation
      
    } catch (error) {
      // Enhanced error handling: convert API errors to user-friendly messages
      if (error instanceof Error) {
        if (error.message.includes('API_KEY') || error.message.includes('401')) {
          throw new Error('Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY.'); // Authentication error
        }
        if (error.message.includes('quota') || error.message.includes('429')) {
          throw new Error('API quota exceeded. Please try again later.'); // Rate limit/quota error
        }
        if (error.message.includes('503') || error.message.includes('overloaded')) {
          throw new Error('The AI model is currently overloaded. Please try again in a moment.'); // Service unavailable
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
          throw new Error('The requested AI model is not available. Please check your API configuration.'); // Model not found
        }
        throw new Error(`Failed to generate paragraph: ${error.message}`); // Generic error with original message
      }
      throw new Error('Failed to generate paragraph. Please try again.'); // Fallback for non-Error types
    }
  }, 3, 1000); // Retry configuration: 3 retries with 1s initial delay (exponential backoff)
}
