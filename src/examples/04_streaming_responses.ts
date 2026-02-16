/**
 * Streaming Responses Example using LangChain.
 * 
 * This example demonstrates streaming capabilities with LangChain:
 * - Real-time token streaming from LLMs
 * - Streaming with chains
 * - Streaming with agents
 * - Environment-based configuration
 * 
 * Features:
 * - Token-by-token response streaming
 * - Better user experience for long responses
 * - Configurable streaming behavior
 * - Multiple streaming patterns
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as readline from 'readline';
import { getConfig, createChatLLM } from '../utils';

/**
 * Demonstrate basic LLM streaming.
 */
async function streamBasicLLM(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🌊 Basic LLM Streaming');
  console.log('='.repeat(60));
  console.log('\nStreaming a response token by token...\n');
  
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  // Create LLM
  const llm = createChatLLM(config);
  
  const prompt = 'Write a short poem about artificial intelligence and the future.';
  
  process.stdout.write('🤖 Assistant: ');
  
  const stream = await llm.stream(prompt);
  
  for await (const chunk of stream) {
    process.stdout.write(chunk.content);
  }
  
  console.log('\n');
}

/**
 * Demonstrate streaming with a chain.
 */
async function streamWithChain(): Promise<void> {
  console.log('='.repeat(60));
  console.log('⛓️  Chain Streaming');
  console.log('='.repeat(60));
  console.log('\nStreaming with a prompt template chain...\n');
  
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  // Create LLM
  const llm = createChatLLM(config);
  
  // Create a prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful assistant that explains complex topics in simple terms.'],
    ['human', '{topic}'],
  ]);
  
  // Create chain with output parser
  const chain = prompt.pipe(llm).pipe(new StringOutputParser());
  
  const topic = 'Explain how neural networks work';
  
  console.log(`📚 Topic: ${topic}\n`);
  process.stdout.write('🤖 Assistant: ');
  
  // Stream the response
  const stream = await chain.stream({ topic });
  
  for await (const chunk of stream) {
    process.stdout.write(chunk);
  }
  
  console.log('\n');
}

/**
 * Demonstrate streaming multiple prompts.
 */
async function streamMultiplePrompts(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Multiple Streaming Prompts');
  console.log('='.repeat(60));
  
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  const llm = createChatLLM(config);
  
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', 'You are a concise assistant. Keep responses brief.'],
    ['human', '{question}'],
  ]);
  
  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());
  
  const questions = [
    'What is machine learning?',
    'What is the difference between AI and ML?',
    'What are the main types of machine learning?',
  ];
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Question ${i + 1}: ${question}`);
    console.log(`${'='.repeat(60)}`);
    process.stdout.write('🤖 Assistant: ');
    
    const stream = await chain.stream({ question });
    
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    
    console.log();
  }
}

/**
 * Custom callback handler for tracking tokens.
 */
class TokenCounterCallback {
  tokenCount: number = 0;
  tokens: string[] = [];

  handleLLMNewToken(token: string): void {
    this.tokenCount += 1;
    this.tokens.push(token);
    process.stdout.write(token);
  }

  reset(): void {
    this.tokenCount = 0;
    this.tokens = [];
  }
}

/**
 * Demonstrate streaming with a custom callback handler.
 */
async function streamWithCustomCallback(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🎯 Custom Callback Streaming');
  console.log('='.repeat(60));
  console.log('\nStreaming with custom token counting...\n');
  
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  const llm = createChatLLM(config);
  const counter = new TokenCounterCallback();
  
  const prompt = 'Explain the concept of streaming in 3 sentences.';
  
  process.stdout.write('🤖 Assistant: ');
  
  const stream = await llm.stream(prompt);
  
  for await (const chunk of stream) {
    counter.handleLLMNewToken(chunk.content);
  }
  
  console.log(`\n\n📊 Total chunks streamed: ${counter.tokenCount}`);
}

/**
 * Run an interactive chat with streaming responses.
 */
async function interactiveStreamingChat(): Promise<void> {
  console.log('='.repeat(60));
  console.log('💬 Interactive Streaming Chat');
  console.log('='.repeat(60));
  console.log("\nChat with streaming responses. Type 'exit' to quit.\n");
  console.log('='.repeat(60));
  
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  const llm = createChatLLM(config);
  
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', 'You are a helpful and friendly AI assistant.'],
    ['human', '{input}'],
  ]);
  
  const chain = promptTemplate.pipe(llm).pipe(new StringOutputParser());
  
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
  
  while (true) {
    try {
      const userInput = (await askQuestion('\n👤 You: ')).trim();
      
      if (!userInput) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(userInput.toLowerCase())) {
        console.log('\n👋 Goodbye!');
        rl.close();
        break;
      }
      
      process.stdout.write('🤖 Assistant: ');
      
      // Stream the response
      const stream = await chain.stream({ input: userInput });
      
      for await (const chunk of stream) {
        process.stdout.write(chunk);
      }
      
      console.log();
      
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
 * Run all streaming examples in sequence.
 */
async function runAllExamples(): Promise<void> {
  const examples: Array<[string, () => Promise<void>]> = [
    ['Basic LLM Streaming', streamBasicLLM],
    ['Chain Streaming', streamWithChain],
    ['Multiple Prompts Streaming', streamMultiplePrompts],
    ['Custom Callback Streaming', streamWithCustomCallback],
  ];
  
  for (const [title, func] of examples) {
    try {
      await func();
      console.log();
    } catch (error) {
      console.log(`❌ Error in ${title}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('✅ All streaming examples completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'all';
  
  const modeMap: { [key: string]: () => Promise<void> } = {
    all: runAllExamples,
    basic: streamBasicLLM,
    chain: streamWithChain,
    multiple: streamMultiplePrompts,
    custom: streamWithCustomCallback,
    interactive: interactiveStreamingChat,
  };
  
  const selectedMode = modeMap[mode];
  
  if (selectedMode) {
    selectedMode().catch(console.error);
  } else {
    console.log('Usage: ts-node 04_streaming_responses.ts [--mode all|basic|chain|multiple|custom|interactive]');
    process.exit(1);
  }
}

export {
  streamBasicLLM,
  streamWithChain,
  streamMultiplePrompts,
  streamWithCustomCallback,
  interactiveStreamingChat,
  runAllExamples,
};
