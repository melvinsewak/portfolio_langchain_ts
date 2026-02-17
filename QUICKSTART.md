# Quick Start Guide

Get up and running with the LangChain TypeScript examples in under 5 minutes!

## 🚀 Quick Setup

### 1. Clone and Install

```bash
git clone https://github.com/melvinsewak/portfolio_langchain_ts.git
cd portfolio_langchain_ts
npm install
```

### 2. Configure API Key

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Run Your First Example

```bash
# Try the conversational chatbot
npm run example:01 -- --mode example
```

That's it! You're ready to explore all 8 examples.

## 🎯 Try Each Example

### Example 1: Conversational Chatbot
Chat with an AI that has access to tools and remembers conversation history.

```bash
# Demo mode
npm run example:01 -- --mode example

# Interactive mode
npm run example:01 -- --mode interactive
```

### Example 2: RAG Q&A System
Ask questions about documents using Retrieval Augmented Generation.

```bash
# Demo mode
npm run example:02 -- --mode example

# Interactive mode
npm run example:02 -- --mode interactive
```

### Example 3: Multi-Tool Agent
Agent with multiple specialized tools for different tasks.

```bash
npm run example:03 -- --mode example
```

### Example 4: Streaming Responses
See responses stream in real-time, token by token.

```bash
# Run all streaming demos
npm run example:04 -- --mode all

# Interactive streaming chat
npm run example:04 -- --mode interactive
```

### Example 5: Multi-Agent System
Multiple AI agents collaborating on tasks.

```bash
npm run example:05 -- --mode example
```

### Example 6: External Document Loading
Load and query PDFs and web pages.

```bash
# With a PDF file
npm run example:06 -- --mode example --pdf ./path/to/document.pdf

# With a web URL
npm run example:06 -- --mode example --url https://example.com
```

### Example 7: Advanced LangGraph
Complex agent workflows with conditional routing.

```bash
npm run example:07 -- --mode example
```

### Example 8: External API Agent
Agent that can interact with external APIs.

```bash
npm run example:08 -- --mode example
```

## 💡 Tips

- Use `--mode interactive` for hands-on exploration
- Use `--mode example` to see pre-defined demonstrations
- Check the main [README.md](./README.md) for detailed documentation
- All examples support both OpenAI and Azure OpenAI (configure in `.env`)

## 🔧 Troubleshooting

### API Key Issues
- Make sure your `.env` file has a valid `OPENAI_API_KEY`
- Check that the key starts with `sk-` for OpenAI

### Installation Issues
- Ensure you have Node.js 18 or higher: `node --version`
- Try clearing npm cache: `npm cache clean --force`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Example-Specific Issues

**Example 2 & 6 (RAG/Chroma):**
- These examples use Chroma vector store
- Make sure you have enough disk space for the vector database
- The database is stored in `./chroma_db` by default

**Example 6 (External Documents):**
- For PDF loading, ensure the PDF file path is correct
- For web scraping, ensure you have internet connectivity

## 📚 Next Steps

- Explore the source code in `src/examples/`
- Customize the examples for your use case
- Check out the [main README](./README.md) for advanced configuration
- Visit the [LangChain.js docs](https://js.langchain.com/) for more information

## ❓ Need Help?

- Check the [README.md](./README.md) for detailed documentation
- Review the Python version: [portfolio_langchain_py](https://github.com/melvinsewak/portfolio_langchain_py)
- Open an issue on GitHub for bugs or questions

Happy coding! 🎉
