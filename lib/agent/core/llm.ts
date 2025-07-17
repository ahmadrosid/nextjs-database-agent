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

  async generateResponse(query: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a database agent that helps with database queries and operations. User query: ${query}`,
          },
        ],
      });

      const textContent = response.content.find(
        (content) => content.type === 'text'
      );

      return textContent?.text || 'Sorry, I could not generate a response.';
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }
}