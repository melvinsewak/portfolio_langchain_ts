/**
 * Conversational Chatbot Example using LangChain.
 * 
 * This example demonstrates a production-ready conversational chatbot with:
 * - AgentExecutor for managing agent execution
 * - BufferMemory for maintaining chat history
 * - Custom tools for the agent to use
 * - Environment-based configuration
 * 
 * Features:
 * - Maintains conversation history across multiple interactions
 * - Uses custom tools (calculator, word counter)
 * - Configurable through .env file
 * - Structured output and error handling
 */

import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { BufferMemory } from 'langchain/memory';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import * as readline from 'readline';
import { getConfig, createChatLLM } from '../utils';

/**
 * Create a simple calculator tool.
 */
function createCalculatorTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'Calculator',
    description: 'Useful for performing mathematical calculations. Input should be a valid mathematical expression.',
    schema: z.object({
      expression: z.string().describe('Mathematical expression to evaluate'),
    }),
    func: async ({ expression }) => {
      try {
        // Safe evaluation using Function constructor with limited scope
        // Only allow basic math operations
        const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
        if (sanitized !== expression) {
          return 'Error: Invalid characters in expression. Only numbers and basic operators (+, -, *, /, (, )) are allowed.';
        }
        
        // Use Function to evaluate safely
        const result = Function(`"use strict"; return (${sanitized})`)();
        return `The result is: ${result}`;
      } catch (error) {
        return `Error calculating: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

/**
 * Create a word counter tool.
 */
function createWordCounterTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'WordCounter',
    description: 'Useful for counting words in a text. Input should be the text to count words in.',
    schema: z.object({
      text: z.string().describe('The text to count words in'),
    }),
    func: async ({ text }) => {
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      return `The text contains ${words.length} words.`;
    },
  });
}

/**
 * Create a conversational agent with memory and custom tools.
 */
async function createConversationalAgent(): Promise<AgentExecutor> {
  // Load configuration
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  // Initialize the language model (works with both OpenAI and Azure OpenAI)
  const llm = createChatLLM(config);
  
  // Create tools
  const tools = [
    createCalculatorTool(),
    createWordCounterTool(),
  ];
  
  // Create the prompt template with placeholders for chat history and agent scratchpad
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful AI assistant with access to various tools.
    
You can help users with:
- Mathematical calculations using the Calculator tool
- Counting words in text using the WordCounter tool
- General conversation and questions

Always be friendly, clear, and helpful in your responses.`],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);
  
  // Create the agent
  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });
  
  // Create memory for conversation history
  const memory = new BufferMemory({
    memoryKey: 'chat_history',
    returnMessages: true,
    outputKey: 'output',
  });
  
  // Create the agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    memory,
    verbose: config.verbose,
    handleParsingErrors: true,
    maxIterations: 5,
  });
  
  return agentExecutor;
}

/**
 * Run an interactive chat session with the agent.
 */
async function runInteractiveChat(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🤖 Conversational Chatbot with Memory and Tools');
  console.log('='.repeat(60));
  console.log('\nThis chatbot has access to:');
  console.log('  • Calculator - for mathematical calculations');
  console.log('  • Word Counter - for counting words in text');
  console.log('\nIt maintains conversation history across messages.');
  console.log("Type 'exit', 'quit', or 'bye' to end the conversation.\n");
  console.log('='.repeat(60));
  
  // Create the agent
  const agentExecutor = await createConversationalAgent();
  
  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const askQuestion = (query: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(query, resolve);
    });
  };
  
  // Interactive chat loop
  while (true) {
    try {
      const userInput = (await askQuestion('\n👤 You: ')).trim();
      
      if (!userInput) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(userInput.toLowerCase())) {
        console.log('\n👋 Goodbye! Have a great day!');
        rl.close();
        break;
      }
      
      // Get response from agent
      const response = await agentExecutor.invoke({ input: userInput });
      
      // Print the response
      console.log(`\n🤖 Assistant: ${response.output}`);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('close')) {
        console.log('\n\n👋 Chat interrupted. Goodbye!');
        rl.close();
        break;
      }
      console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log("Please try again or type 'exit' to quit.");
    }
  }
}

/**
 * Run a pre-defined example conversation to demonstrate capabilities.
 */
async function runExampleConversation(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example Conversation');
  console.log('='.repeat(60));
  
  const agentExecutor = await createConversationalAgent();
  
  // Example conversation
  const examples = [
    'Hello! Can you introduce yourself?',
    'What is 25 * 4 + 100?',
    'How many words are in this sentence: The quick brown fox jumps over the lazy dog?',
    'What was my first question?',  // Tests memory
  ];
  
  for (let i = 0; i < examples.length; i++) {
    const message = examples[i];
    console.log(`\n👤 User: ${message}`);
    try {
      const response = await agentExecutor.invoke({ input: message });
      console.log(`🤖 Assistant: ${response.output}`);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Example conversation completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'interactive';
  
  if (mode === 'interactive') {
    runInteractiveChat().catch(console.error);
  } else if (mode === 'example') {
    runExampleConversation().catch(console.error);
  } else {
    console.log('Usage: ts-node 01_conversational_chatbot.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { createConversationalAgent, runInteractiveChat, runExampleConversation };
