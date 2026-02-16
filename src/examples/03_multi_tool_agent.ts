/**
 * Multi-Tool Agent Example using LangChain.
 * 
 * This example demonstrates a production-ready agent with multiple tools:
 * - Web search capabilities (simulated)
 * - File operations
 * - Data processing
 * - API interactions
 * - Environment-based configuration
 * 
 * Features:
 * - Multiple specialized tools for different tasks
 * - Agent reasoning and tool selection
 * - Error handling and fallback strategies
 * - Structured output
 */

import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig, createChatLLM } from '../utils';

/**
 * Create an advanced calculator tool.
 */
function createCalculatorTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'calculator',
    description: 'Performs mathematical calculations. Input must be a valid mathematical expression.',
    schema: z.object({
      expression: z.string().describe('Mathematical expression to evaluate'),
    }),
    func: async ({ expression }) => {
      try {
        // Safe evaluation: Parse and evaluate expression using a simple recursive evaluator
        // This avoids the security risks of Function constructor or eval
        const tokens = expression.match(/(\d+\.?\d*|[+\-*\/()])/g);
        if (!tokens || tokens.join('') !== expression.replace(/\s/g, '')) {
          return 'Error: Invalid characters in expression. Only numbers and basic operators (+, -, *, /, (, )) are allowed.';
        }
        
        // Simple expression evaluator with operator precedence
        let pos = 0;
        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];
        
        const parseNumber = (): number => {
          const token = consume();
          if (token === '(') {
            const result = parseExpression();
            const closeParen = consume();
            if (closeParen !== ')') {
              throw new Error('Mismatched parentheses');
            }
            return result;
          }
          if (token === '-') {
            return -parseNumber();
          }
          return parseFloat(token);
        };
        
        const parseTerm = (): number => {
          let result = parseNumber();
          while (peek() === '*' || peek() === '/') {
            const op = consume();
            const right = parseNumber();
            result = op === '*' ? result * right : result / right;
          }
          return result;
        };
        
        const parseExpression = (): number => {
          let result = parseTerm();
          while (peek() === '+' || peek() === '-') {
            const op = consume();
            const right = parseTerm();
            result = op === '+' ? result + right : result - right;
          }
          return result;
        };
        
        const result = parseExpression();
        return `Result: ${result}`;
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

/**
 * Create a data statistics tool.
 */
function createDataStatsTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'data_statistics',
    description: 'Calculates statistics (count, sum, mean, min, max) for a comma-separated list of numbers.',
    schema: z.object({
      numbers: z.string().describe('Comma-separated list of numbers'),
    }),
    func: async ({ numbers }) => {
      try {
        const numList = numbers.split(',').map(x => parseFloat(x.trim()));
        
        if (numList.length === 0 || numList.some(isNaN)) {
          return 'Error: Invalid numbers provided';
        }
        
        const stats = {
          count: numList.length,
          sum: numList.reduce((a, b) => a + b, 0),
          mean: numList.reduce((a, b) => a + b, 0) / numList.length,
          min: Math.min(...numList),
          max: Math.max(...numList),
        };
        
        return JSON.stringify(stats, null, 2);
      } catch (error) {
        return `Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

/**
 * Create a datetime information tool.
 */
function createDateTimeTool(): Tool {
  return new Tool({
    name: 'datetime_info',
    description: 'Gets current date and time information. No input required.',
    func: async () => {
      const now = new Date();
      
      const info = {
        current_date: now.toISOString().split('T')[0],
        current_time: now.toTimeString().split(' ')[0],
        day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
        timestamp: now.getTime() / 1000,
      };
      
      return JSON.stringify(info, null, 2);
    },
  });
}

/**
 * Create a text analysis tool.
 */
function createTextAnalyzerTool(): Tool {
  return new Tool({
    name: 'text_analyzer',
    description: 'Analyzes text and provides statistics like word count, sentence count, etc.',
    func: async (text: string) => {
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const analysis = {
        character_count: text.length,
        word_count: words.length,
        sentence_count: sentences.length,
        average_word_length: words.length > 0 
          ? words.reduce((sum, word) => sum + word.length, 0) / words.length 
          : 0,
        unique_words: new Set(words).size,
      };
      
      return JSON.stringify(analysis, null, 2);
    },
  });
}

/**
 * Create a tool for writing to files in the system temporary directory.
 */
function createFileWriterTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'file_writer',
    description: 'Writes content to a file in the system temporary directory. Provide filename and content.',
    schema: z.object({
      filename: z.string().describe('Name of the file to write to'),
      content: z.string().describe('Content to write to the file'),
    }),
    func: async ({ filename, content }) => {
      try {
        const os = await import('os');
        const tmpDir = os.tmpdir();
        
        // Use only the basename to prevent path traversal
        const safeFilename = path.basename(filename);
        
        // Ensure we write to temp directory for safety
        const filepath = path.join(tmpDir, safeFilename);
        
        // Verify the resolved path is still under temp directory to prevent directory traversal
        const resolvedPath = path.resolve(filepath);
        if (!resolvedPath.startsWith(tmpDir)) {
          return 'Error: Invalid file path - attempted directory traversal';
        }
        
        fs.writeFileSync(filepath, content);
        return `Successfully wrote to ${filepath}`;
      } catch (error) {
        return `Error writing file: ${error instanceof Error ? error.message : String(error)}`;
      }
    },
  });
}

/**
 * Create an agent with multiple specialized tools.
 */
async function createMultiToolAgent(): Promise<AgentExecutor> {
  // Load configuration
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  // Initialize the language model
  const llm = createChatLLM(config);
  
  // Create all tools
  const tools = [
    createCalculatorTool(),
    createDataStatsTool(),
    createDateTimeTool(),
    createTextAnalyzerTool(),
    createFileWriterTool(),
  ];
  
  // Create the prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful AI assistant with access to multiple specialized tools.

Available tools:
- calculator: For mathematical calculations
- data_statistics: For analyzing numerical data
- datetime_info: For getting current date and time
- text_analyzer: For analyzing text content
- file_writer: For writing content to files

Always use the most appropriate tool for each task. Break down complex requests into
smaller steps if needed. Provide clear and helpful responses.`],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);
  
  // Create the agent
  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });
  
  // Create the agent executor
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: config.verbose,
    handleParsingErrors: true,
    maxIterations: 10,
  });
  
  return agentExecutor;
}

/**
 * Run an interactive session with the multi-tool agent.
 */
async function runInteractiveAgent(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🛠️  Multi-Tool Agent');
  console.log('='.repeat(60));
  console.log('\nThis agent has access to:');
  console.log('  • Calculator - mathematical calculations');
  console.log('  • Data Statistics - analyze numerical data');
  console.log('  • DateTime Info - current date and time');
  console.log('  • Text Analyzer - analyze text content');
  console.log('  • File Writer - write to files in temp directory');
  console.log("\nType 'exit', 'quit', or 'bye' to end the session.\n");
  console.log('='.repeat(60));
  
  // Create the agent
  const agentExecutor = await createMultiToolAgent();
  
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
  
  // Interactive loop
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
      
      // Get response from agent
      const response = await agentExecutor.invoke({ input: userInput });
      
      // Print the response
      console.log(`\n🤖 Agent: ${response.output}`);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('close')) {
        console.log('\n\n👋 Session interrupted. Goodbye!');
        rl.close();
        break;
      }
      console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.log("Please try again or type 'exit' to quit.");
    }
  }
}

/**
 * Run pre-defined example tasks to demonstrate agent capabilities.
 */
async function runExampleTasks(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example Tasks');
  console.log('='.repeat(60));
  
  const agentExecutor = await createMultiToolAgent();
  
  // Example tasks
  const tasks = [
    'Calculate 15 * 8 + 42',
    'Analyze these numbers: 10, 20, 30, 40, 50',
    'What is the current date and time?',
    'Analyze this text: The quick brown fox jumps over the lazy dog. It is a sunny day.',
    "Write 'Hello from LangChain Agent!' to a file called agent_output.txt",
  ];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Task ${i + 1}: ${task}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const response = await agentExecutor.invoke({ input: task });
      console.log(`\n🤖 Agent: ${response.output}`);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Example tasks completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'interactive';
  
  if (mode === 'interactive') {
    runInteractiveAgent().catch(console.error);
  } else if (mode === 'example') {
    runExampleTasks().catch(console.error);
  } else {
    console.log('Usage: ts-node 03_multi_tool_agent.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { createMultiToolAgent, runInteractiveAgent, runExampleTasks };
