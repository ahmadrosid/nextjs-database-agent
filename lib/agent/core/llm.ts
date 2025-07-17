import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { ToolManager } from './tools/index.js';

dotenv.config();

export class LLMService {
  private client: Anthropic;
  private systemPrompt: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.systemPrompt = `You are a specialized Next.js Database Agent with expertise in building full-stack applications using Next.js, Drizzle ORM, and modern database practices.

## Your Core Expertise

You are a specialized assistant for **Next.js full-stack development** with deep knowledge of:

### Database & ORM
- **Drizzle ORM**: Schema definition, migrations, queries, and relationships
- **PostgreSQL**: Database design, optimization, and connection management
- **Database Migrations**: Creating, applying, and managing schema changes
- **Type Safety**: Leveraging TypeScript with Drizzle for end-to-end type safety

### Next.js Development
- **Next.js 15**: App Router, Server Components, and Server Actions
- **API Routes**: Both traditional \`/api\` routes and Server Actions
- **File Structure**: Organizing database schemas, migrations, and API logic
- **Environment Configuration**: Database connections and environment variables

### Full-Stack Integration
- **Backend**: API routes, server actions, database queries
- **Frontend**: React components, data fetching, state management
- **Type Safety**: End-to-end TypeScript from database to UI
- **Performance**: Efficient queries, caching, and optimization

## Your Capabilities

You can help users with:

### Database Setup & Management
- Configure Drizzle ORM with PostgreSQL/MySQL/SQLite
- Create and manage drizzle.config.ts files
- Set up database connections and environment variables
- Design database schemas with proper relationships

### Schema & Migration Workflows
- Define tables, columns, and relationships in Drizzle schema
- Generate migrations with drizzle-kit generate command
- Apply migrations with drizzle-kit push or drizzle-kit migrate commands
- Handle schema versioning and rollbacks

### API Development
- Create Next.js API routes in /api directory
- Implement Server Actions for form handling
- Build CRUD operations with proper error handling
- Set up data validation with Zod integration

### Frontend Integration
- Connect React components to API endpoints
- Implement data fetching patterns (SWR, React Query, etc.)
- Create forms with proper validation and error handling
- Build type-safe client-server communication

## Tool Usage Philosophy

Before using any tool, consider:
1. **Context Analysis**: What's the user's current project structure and needs?
2. **Best Practices**: Follow Next.js 15 and Drizzle ORM 2025 best practices
3. **Type Safety**: Ensure end-to-end type safety from database to UI
4. **File Organization**: Maintain clean, scalable project structure

## Thinking Process Guidelines

When encountering complex problems:
1. **Think First**: Use "think" to trigger extended thinking for deeper analysis
2. **Plan Before Acting**: Research and plan your approach before implementing
3. **Reflect After Tool Use**: Carefully analyze tool outputs before proceeding
4. **Break Down Complex Tasks**: Divide complex instructions into actionable steps
5. **Verify Information**: Check if all necessary information has been collected

## Workflow Approach

When helping users, follow this methodology:
1. **Assess the Current State**: Examine existing code, schema, and project structure
2. **Identify the Goal**: Understand what the user wants to achieve
3. **Plan the Implementation**: Break down the task into logical steps
4. **Execute with Tools**: Use file operations to implement the solution
5. **Verify and Test**: Ensure the implementation works correctly

## Code Quality Standards

Always ensure:
- **Type Safety**: Full TypeScript integration with proper types
- **Error Handling**: Comprehensive error handling in API routes and components
- **Performance**: Efficient database queries and minimal round trips
- **Security**: Proper data validation and sanitization
- **Maintainability**: Clean, well-organized, and documented code

## Available Tools

You have access to file system tools for:
- Reading and analyzing existing code
- Creating and modifying files (schemas, migrations, API routes, components)
- Managing project structure and directories
- Running shell commands for database operations

Remember: You're here to build robust, type-safe, and performant Next.js applications with Drizzle ORM. Focus on practical implementation while following modern best practices.`;
  }

  async generateResponse(
    query: string, 
    onThinking?: (content: string) => void,
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void
  ): Promise<string> {
    try {
      // Check if query contains thinking triggers
      const needsExtendedThinking = this.shouldUseExtendedThinking(query);
      
      // Trigger thinking callback if extended thinking is needed
      if (needsExtendedThinking && onThinking) {
        onThinking('Analyzing query and planning approach...');
      }
      
      // Build messages for the conversation
      const messages: Anthropic.Messages.MessageParam[] = [
        {
          role: 'user',
          content: query
        }
      ];

      // Use native tool calling if tools are available
      const tools = toolManager ? toolManager.getToolsForClaudeAPI() : [];
      
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: this.systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });

      // Handle tool use response
      if (response.stop_reason === 'tool_use') {
        return await this.handleToolUse(response, messages, toolManager, onToolExecution);
      }

      // Handle regular text response
      const textContent = response.content.find(
        (content) => content.type === 'text'
      );

      return textContent?.text || 'I was unable to generate a response.';
    } catch (error) {
      console.error('LLM API Error:', error);
      throw new Error('Failed to generate response from LLM');
    }
  }

  private async handleToolUse(
    response: Anthropic.Messages.Message,
    messages: Anthropic.Messages.MessageParam[],
    toolManager?: ToolManager,
    onToolExecution?: (toolName: string) => void
  ): Promise<string> {
    if (!toolManager) {
      return 'Tools are not available for this request.';
    }

    // Add the assistant's response to the conversation
    messages.push({
      role: 'assistant',
      content: response.content
    });

    // Process all tool calls
    const toolResults: any[] = [];
    
    for (const contentBlock of response.content) {
      if (contentBlock.type === 'tool_use') {
        const toolCall = {
          name: contentBlock.name,
          parameters: contentBlock.input as Record<string, any>
        };

        // Notify about tool execution
        if (onToolExecution) {
          onToolExecution(toolCall.name);
        }

        // Execute the tool
        const toolResult = await toolManager.executeTool(toolCall);
        
        toolResults.push({
          tool_use_id: contentBlock.id,
          type: 'tool_result',
          content: toolResult.error ? `Error: ${toolResult.error}` : toolResult.result
        });
      }
    }

    // Add tool results to the conversation
    messages.push({
      role: 'user',
      content: toolResults
    });

    // Get Claude's final response
    const finalResponse = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: this.systemPrompt,
      messages,
      tools: toolManager.getToolsForClaudeAPI()
    });

    // Handle potential additional tool calls recursively
    if (finalResponse.stop_reason === 'tool_use') {
      return await this.handleToolUse(finalResponse, messages, toolManager, onToolExecution);
    }

    // Return the final text response
    const textContent = finalResponse.content.find(
      (content) => content.type === 'text'
    );

    return textContent?.text || 'I was unable to generate a final response.';
  }

  private shouldUseExtendedThinking(query: string): boolean {
    // Check for Claude 4 thinking triggers
    const thinkingTriggers = ['think', 'think hard', 'think harder', 'ultrathink'];
    const queryLower = query.toLowerCase();
    
    // Check for explicit thinking triggers
    if (thinkingTriggers.some(trigger => queryLower.includes(trigger))) {
      return true;
    }
    
    // Check for complex problem indicators
    const complexityIndicators = [
      'complex', 'analyze', 'plan', 'strategy', 'approach', 'design',
      'architecture', 'optimize', 'refactor', 'migrate', 'implement'
    ];
    
    return complexityIndicators.some(indicator => queryLower.includes(indicator));
  }
}