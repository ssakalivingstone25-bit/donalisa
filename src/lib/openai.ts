/**
 * Secure client-side proxy service for OpenAI integrations.
 * All actual API key authentication happens on the secure server side via Express API routes.
 */
export const OpenAIService = {
  /**
   * General-purpose AI platform assistant (DONA AI)
   * @param messages Conversation history to send to the bot
   */
  async donaAI(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    try {
      // Get the latest user message to send to the secure /api/chat endpoint
      const lastMessage = messages[messages.length - 1]?.content || '';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: lastMessage })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.reply !== undefined) {
        return data.reply;
      }
      if (data.text !== undefined) {
        return data.text;
      }
      throw new Error(data.error || 'Failed to retrieve response from DONA AI');
    } catch (err: any) {
      console.error('Error in OpenAIService.donaAI:', err);
      throw err;
    }
  },

  /**
   * BizLink retail assistant (BIZLINK AI)
   * @param prompt User business description or outline
   * @param type 'template' | 'description' | 'custom'
   * @param category Niche/category constraint
   */
  async bizLinkAI(prompt: string, type: 'template' | 'description' | 'custom', category?: string): Promise<{ text: string; imageUrl?: string; sandbox?: boolean }> {
    try {
      const response = await fetch('/api/openai/bizlink-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type, category })
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        return {
          text: data.text,
          imageUrl: data.imageUrl,
          sandbox: data.sandbox
        };
      }
      throw new Error(data.error || 'Failed to retrieve response from BIZLINK AI');
    } catch (err: any) {
      console.error('Error in OpenAIService.bizLinkAI:', err);
      throw err;
    }
  }
};
