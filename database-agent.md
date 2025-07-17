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

Reactive Pub/Sub Flow

```
  User Input → Spawn Background Job → Progress Events → Terminal UI Updates
       ↓              ↓                      ↓               ↓
    Terminal      Core Agent            Event Emitter    Live Rendering
```

**Reasoning**: Core agent logic separated from interface layers enables reusability across CLI and API. **Tradeoff**: More nested structure but cleaner separation of concerns and easier testing.