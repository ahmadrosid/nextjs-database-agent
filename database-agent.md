# Database Agent Design Document

## Agent Description
A modular database agent with core functionality that can be consumed via CLI interface or API service, automatically implementing database features based on natural language queries.

## Features
### Core Agent
- **Natural Language Processing**: Interprets user queries like "store recently played songs in a table"
- **Code Analysis**: Scans existing Next.js components to understand integration points
- **Database Operations**: Creates schemas, migrations, API routes, and frontend integrations
- **Progress Events**: Emits real-time progress updates for any interface to consume

### CLI Interface
- **Interactive Terminal**: Persistent input box with scrollable output history
- **Real-time Progress Display**: Shows agent thinking process, file operations, and current status
- **Command Structure**: Supports various commands and options


**Reasoning**: Modular design allows the core agent to be reused across different interfaces while maintaining focused functionality. **Tradeoff**: Added complexity in architecture but better extensibility and reusability.

## Package Selection
- **ink**: Rich terminal UI with layout management for split-screen interface
- **commander.js**: Command-line argument parsing and command structure
- **chalk**: Terminal colors and styling for better UX
- **eventemitter3**: High-performance event emitter for reactive pub/sub architecture
- **drizzle-orm**: TypeScript ORM for database operations as recommended
- **execa**: Process execution for running migrations and commands
- **fs-extra**: Enhanced file system operations for code generation

**Reasoning**: Proven packages that handle specific concerns well. EventEmitter3 chosen for optimal performance in real-time progress updates. **Tradeoff**: More dependencies but better maintainability and reliability than building from scratch.

## Folder Structure
```
├── scripts/
│   └── database-agent.js          # CLI entry point
├── lib/
│   └── agent/
│       ├── core/                  # Core agent logic (interface-agnostic)
│       │   ├── analyzer/          # Code analysis utilities
│       │   ├── generator/         # Code generation logic
│       │   └── database/          # Database operations
│       ├── cli/                   # CLI interface components
├── drizzle/                       # Database schema and migrations
└── app/api/agent/                 # Generated API routes
```

## Architecture

### Agent Core Architecture

The agent follows a layered architecture with three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Interface                           │
├─────────────────────────────────────────────────────────────┤
│                     CoreAgent                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   LLMService    │  │   ToolManager   │  │ EventEmitter│  │
│  │                 │  │                 │  │             │  │
│  │ • Anthropic API │  │ • Tool Registry │  │ • Progress  │  │
│  │ • Tool Calling  │  │ • Execution     │  │ • Real-time │  │
│  │ • Streaming     │  │ • Error Handle  │  │ • Updates   │  │
│  │ • Conversation  │  │                 │  │             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     Tool Ecosystem                         │
│  listFiles | readFile | writeFile | bashCommand | search   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**CoreAgent** (`agent/core/CoreAgent.ts:8`)
- Main orchestrator that coordinates LLM and tools
- Manages conversation state and processing lifecycle
- Emits progress events for UI consumption
- Handles abort signals and error propagation

**LLMService** (`agent/core/llm.ts:6`)
- Anthropic API integration with streaming support
- Tool calling coordination and response handling
- Conversation history management with 20-message limit
- Thinking mode integration for transparent reasoning

**ToolManager** (`agent/core/tools/index.ts:10`)
- Tool registration and execution orchestration
- Error handling and result formatting
- Claude API tool schema generation
- Available tools: `listFiles`, `readFile`, `writeFile`, `bashCommand`, `searchFiles`, `diffEdit`

### Terminal rendering - Reactive Pub/Sub Flow

```
  User Input → Spawn Background Job → Progress Events → Terminal UI Updates
       ↓              ↓                      ↓               ↓
    Terminal      Core Agent            Event Emitter    Live Rendering
```

### Event-Driven Progress Flow

```
User Query → CoreAgent.processQuery() → Progress Events → CLI Rendering

Events Emitted:
├── thinking          # LLM reasoning process
├── analyzing         # Database requirements analysis  
├── executing_tools   # Tool execution notifications
├── tool_execution_complete/error # Tool completion status
├── generating        # Final response generation
├── complete          # Query processed successfully
└── error/aborted     # Error states
```

**Reasoning**: Core agent logic separated from interface layers enables reusability across CLI and API. **Tradeoff**: More nested structure but cleaner separation of concerns and easier testing.

Test Queries:
1. “Can you store the recently played songs in a table”
  The agent should create the table, populate it, and also create a route to fetch information from that table. 
  BONUS: integrate the route into the existing code so that the site actually fetches the data and properly displays it on the frontend.

2. “Can you store the ‘Made for you’ and ‘Popular albums’ in a table”
  The agent should create the tables, populate them, and also create a route to fetch information from those tables.
  BONUS: integrate the route into the existing code so that the site actually fetches the data and properly displays it on the frontend.
