# Portfolio LangChain TypeScript Examples

A collection of production-ready LangChain examples showcasing different functionalities and use cases. All examples are configurable through environment variables for easy deployment and customization.

This is the TypeScript implementation of the [Python LangChain examples](https://github.com/melvinsewak/portfolio_langchain_py).

## 🎯 Features

- **Environment-based configuration** - All settings managed through `.env` file
- **Production-ready patterns** - Real-world use cases and best practices
- **Interactive & demo modes** - Run examples interactively or with pre-defined scenarios
- **Comprehensive examples** - Multiple use cases from basic to advanced
- **Error handling** - Robust error handling and validation
- **TypeScript** - Full type safety and modern JavaScript features

## 📋 Examples Included

### 1. Conversational Chatbot (`01_conversational_chatbot.ts`)
A production-ready conversational AI chatbot featuring:
- **AgentExecutor** for managing agent execution
- **BufferMemory** for maintaining chat history
- **Custom tools** (Calculator, Word Counter)
- **chat_history** and **agent_scratchpad** integration
- Interactive and example modes

### 2. RAG Question-Answering System (`02_rag_qa_system.ts`)
Retrieval Augmented Generation system with:
- Document loading and text splitting
- **Chroma vector store** for similarity search
- **OpenAI embeddings** for vectorization
- Question answering over documents
- Source attribution

### 3. Multi-Tool Agent (`03_multi_tool_agent.ts`)
Advanced agent with multiple specialized tools:
- Calculator for mathematical operations
- Data statistics analyzer
- DateTime information provider
- Text analyzer
- File writer
- Agent reasoning and tool selection

### 4. Streaming Responses (`04_streaming_responses.ts`)
Real-time token streaming demonstrations:
- Basic LLM streaming
- Chain streaming
- Custom callback handlers
- Token counting
- Interactive streaming chat

### 5. Multi-Agent System (`05_multi_agent_system.ts`)
Collaborative multi-agent system with orchestration:
- **Multiple specialized agents** working together
- **Research agent** for information gathering
- **Writer agent** for content creation
- **Critic agent** for quality review
- **LangGraph** for agent orchestration
- Sequential agent workflow
- Agent-to-agent communication

### 6. External Document Loading (`06_external_document_loading.ts`)
Load and process documents from external sources:
- **PDF document loading** from local files
- **Web page scraping** from URLs
- Mixed document sources processing
- Integration with vector store
- Query across multiple sources

### 7. Advanced LangGraph Patterns (`07_advanced_langgraph.ts`)
Advanced multi-agent workflow patterns:
- **Conditional routing** based on analysis
- Dynamic path selection
- Complex agent coordination
- Multi-path decision making

### 8. External API Agent (`08_external_api_agent.ts`)
Agent with external API integration:
- **Weather API** lookup tool
- **HTTP GET** request capabilities
- **GitHub API** integration
- JSON parsing and validation
- API authentication patterns

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/melvinsewak/portfolio_langchain_ts.git
   cd portfolio_langchain_ts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   ```

### Running Examples

Each example can be run in two modes:

#### Interactive Mode
Allows you to interact with the example in real-time:

```bash
# Conversational Chatbot
npm run example:01 -- --mode interactive

# RAG Q&A System
npm run example:02 -- --mode interactive

# Multi-Tool Agent
npm run example:03 -- --mode interactive

# Streaming Chat
npm run example:04 -- --mode interactive

# Multi-Agent System
npm run example:05 -- --mode interactive

# External Document Loading (with options)
npm run example:06 -- --mode interactive --pdf ./sample.pdf --url https://example.com

# Advanced LangGraph
npm run example:07 -- --mode interactive

# External API Agent
npm run example:08 -- --mode interactive
```

#### Example/Demo Mode
Runs pre-defined scenarios to demonstrate capabilities:

```bash
# Run any example in demo mode
npm run example:01 -- --mode example
npm run example:02 -- --mode example
# ... etc
```

## ⚙️ Configuration

All examples are configured through the `.env` file:

```env
# Choose your LLM provider: "openai" or "azure"
LLM_PROVIDER=openai

# For OpenAI
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# For Azure OpenAI
# AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
# AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
# AZURE_OPENAI_DEPLOYMENT=your-deployment-name
# AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Common settings
TEMPERATURE=0.7
MAX_TOKENS=1000
VERBOSE=false

# RAG configuration
CHROMA_PERSIST_DIRECTORY=./chroma_db
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

## 🏗️ Project Structure

```
portfolio_langchain_ts/
├── src/
│   ├── examples/          # All 8 example implementations
│   └── utils/            # Shared utilities
├── .env.example          # Example environment file
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 📖 Learn More

- [LangChain.js Documentation](https://js.langchain.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)

## 🤝 Contributing

Contributions are welcome! Feel free to add new examples, improve existing ones, or fix bugs.

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

**Note**: Remember to keep your API keys secure and never commit them to version control!