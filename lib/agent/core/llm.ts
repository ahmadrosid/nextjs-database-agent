import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export class LLMService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateResponse(query: string, onThinking?: (content: string) => void): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `<thinking>
Think step by step about how to help with this database query or operation.
Consider what the user is asking for and how to provide a helpful response.
</thinking>

You are a database agent that helps with database queries and operations. User query: ${query}`,
          },
        ],
      });

      const textContent = response.content.find(
        (content) => content.type === 'text'
      );

      const fullResponse = textContent?.text || 'Sorry, I could not generate a response.';

      // Extract thinking content if present
      const thinkingMatch = fullResponse.match(/<thinking>(.*?)<\/thinking>/s);
      if (thinkingMatch && onThinking) {
        onThinking(thinkingMatch[1].trim());
      }

      // Return response without thinking tags
      const cleanResponse = fullResponse.replace(/<thinking>.*?<\/thinking>/s, '').trim();
      return cleanResponse || 'I processed your query but generated no response.';
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }
}