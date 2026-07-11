/**
 * Utility to validate the presence and format of the OpenAI API Key.
 * Prevents runtime failures by checking that the key begins with the correct 'sk-' prefix (e.g. sk-... or sk-proj-...)
 * and is not empty or set to common incorrect placeholders.
 */
export function validateOpenAIKey(key?: string): { isValid: boolean; error?: string } {
  if (!key) {
    return {
      isValid: false,
      error: "OPENAI_API_KEY is missing. Please configure it in the Settings > Secrets tab."
    };
  }

  const trimmed = key.trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: "OPENAI_API_KEY is defined but contains only whitespace. Please enter a valid OpenAI API key."
    };
  }

  if (!trimmed.startsWith("sk-")) {
    const preview = trimmed.length > 5 ? trimmed.substring(0, 5) + "..." : trimmed;
    return {
      isValid: false,
      error: `Invalid OpenAI API key format. Expected key starting with 'sk-' or 'sk-proj-', but received value starting with '${preview}'. Please configure a valid OpenAI key.`
    };
  }

  return { isValid: true };
}
