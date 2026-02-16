/**
 * Agent with External API Tools Example using LangChain.
 * 
 * This example demonstrates an agent using external API tools:
 * - Weather API integration
 * - HTTP request tool
 * - JSON API parser
 * - Error handling for API calls
 * - Environment-based configuration
 * 
 * Features:
 * - Weather lookup tool (OpenWeatherMap simulation)
 * - Generic HTTP GET tool
 * - JSON parsing and validation
 * - Rate limiting awareness
 * - API authentication patterns
 */

import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { DynamicStructuredTool, Tool } from '@langchain/core/tools';
import { z } from 'zod';
import * as readline from 'readline';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { getConfig, createChatLLM } from '../utils';

/**
 * Create a weather lookup tool (simulated).
 */
function createWeatherTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'weather_lookup',
    description: 'Get current weather information for a city. Returns temperature, condition, and humidity.',
    schema: z.object({
      city: z.string().describe('City name to get weather for'),
    }),
    func: async ({ city }) => {
      // Simulated weather data
      const weatherData: Record<string, { temp: number; condition: string; humidity: number }> = {
        london: { temp: 15, condition: 'Cloudy', humidity: 75 },
        'new york': { temp: 22, condition: 'Sunny', humidity: 60 },
        tokyo: { temp: 18, condition: 'Rainy', humidity: 85 },
        paris: { temp: 17, condition: 'Partly cloudy', humidity: 70 },
        sydney: { temp: 25, condition: 'Sunny', humidity: 55 },
      };
      
      const cityLower = city.toLowerCase();
      
      if (cityLower in weatherData) {
        const data = weatherData[cityLower];
        return JSON.stringify({
          city,
          temperature: `${data.temp}°C`,
          condition: data.condition,
          humidity: `${data.humidity}%`,
          source: 'simulated_api',
        }, null, 2);
      } else {
        return JSON.stringify({
          error: `Weather data not available for ${city}`,
          suggestion: 'Try: London, New York, Tokyo, Paris, or Sydney',
        });
      }
    },
  });
}

/**
 * Simple HTTP GET request helper with redirect validation.
 */
function httpGet(url: string, allowedDomains: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects'));
        return;
      }
      
      const currentParsedUrl = new URL(currentUrl);
      
      // Validate domain for each request (including redirects)
      if (!allowedDomains.includes(currentParsedUrl.hostname)) {
        reject(new Error(`Domain ${currentParsedUrl.hostname} not in allowlist. This prevents redirect-based SSRF attacks.`));
        return;
      }
      
      const currentClient = currentParsedUrl.protocol === 'https:' ? https : http;
      
      currentClient.get(currentUrl, (res) => {
        // Check for redirects
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, currentUrl).toString();
          makeRequest(redirectUrl, redirectCount + 1);
          return;
        }
        
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    };
    
    makeRequest(url);
  });
}

/**
 * Create an HTTP GET request tool.
 */
function createHttpGetTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'http_get',
    description: 'Perform HTTP GET request to fetch data from APIs. Only works with allowed domains for security.',
    schema: z.object({
      url: z.string().describe('URL to fetch'),
    }),
    func: async ({ url }) => {
      try {
        // SECURITY: Domain whitelist to prevent SSRF and unauthorized access
        // WARNING: Only add trusted domains to this list. Adding untrusted domains
        // could allow Server-Side Request Forgery (SSRF) attacks where the agent
        // could be tricked into making requests to internal services or malicious sites.
        // Modify this list according to your specific security policies and requirements.
        // Only these domains are allowed to be accessed by the agent.
        const allowedDomains = ['api.github.com', 'jsonplaceholder.typicode.com', 'httpbin.org'];
        
        const parsedUrl = new URL(url);
        const domain = parsedUrl.hostname;
        
        if (!allowedDomains.includes(domain)) {
          return JSON.stringify({
            error: 'Domain not in allowlist',
            allowed_domains: allowedDomains,
            note: 'This is for security. Modify allowed_domains for your use case.',
          });
        }
        
        const response = await httpGet(url, allowedDomains);
        
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(response);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // Return first 500 chars if not JSON
          return response.substring(0, 500);
        }
      } catch (error) {
        return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
      }
    },
  });
}

/**
 * Create a JSON parsing and validation tool.
 */
function createJsonParserTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: 'json_parser',
    description: 'Parse and validate JSON strings. Returns structured information about the JSON data.',
    schema: z.object({
      json_string: z.string().describe('JSON string to parse'),
    }),
    func: async ({ json_string }) => {
      try {
        const parsed = JSON.parse(json_string);
        
        return JSON.stringify({
          success: true,
          type: typeof parsed === 'object' && Array.isArray(parsed) ? 'array' : typeof parsed,
          keys: typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : null,
          length: Array.isArray(parsed) || typeof parsed === 'object' ? 
            (Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length) : null,
          data: parsed,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          message: 'Invalid JSON format',
        });
      }
    },
  });
}

/**
 * Create a GitHub repository info tool.
 */
function createGithubInfoTool(): Tool {
  return new Tool({
    name: 'github_repo_info',
    description: "Get information about a GitHub repository. Input should be 'owner/repo' format (e.g., 'langchain-ai/langchain').",
    func: async (repo: string) => {
      try {
        const url = `https://api.github.com/repos/${repo}`;
        const response = await httpGet(url);
        const data = JSON.parse(response);
        
        return JSON.stringify({
          name: data.name,
          description: data.description,
          stars: data.stargazers_count,
          forks: data.forks_count,
          language: data.language,
          open_issues: data.open_issues_count,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }, null, 2);
      } catch (error) {
        return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
      }
    },
  });
}

/**
 * Create an agent with external API tools.
 */
async function createApiAgent(): Promise<AgentExecutor> {
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  // Initialize LLM
  const llm = createChatLLM(config);
  
  // Create tools
  const tools = [
    createWeatherTool(),
    createHttpGetTool(),
    createJsonParserTool(),
    createGithubInfoTool(),
  ];
  
  // Create prompt
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful AI assistant with access to external API tools.

Available tools:
- weather_lookup: Get weather information for cities
- http_get: Fetch data from allowed APIs
- json_parser: Parse and validate JSON data
- github_repo_info: Get GitHub repository information

When using APIs:
1. Check for errors in responses
2. Parse JSON data appropriately
3. Provide clear summaries of the information
4. Handle rate limits gracefully

Be helpful and informative in your responses.`],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ]);
  
  // Create agent
  const agent = await createOpenAIToolsAgent({
    llm,
    tools,
    prompt,
  });
  
  // Create executor
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
 * Run interactive session with API agent.
 */
async function runInteractiveAgent(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🌐 Agent with External API Tools');
  console.log('='.repeat(60));
  console.log('\nThis agent can:');
  console.log('  ☀️  Check weather for cities');
  console.log('  🌐 Fetch data from APIs');
  console.log('  📦 Get GitHub repository info');
  console.log('  📄 Parse JSON data');
  console.log("\nType 'exit', 'quit', or 'bye' to end.\n");
  console.log('='.repeat(60));
  
  const agentExecutor = await createApiAgent();
  
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
      
      process.stdout.write('\n🤖 Agent: ');
      const response = await agentExecutor.invoke({ input: userInput });
      console.log(response.output);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('close')) {
        console.log('\n\n👋 Session interrupted. Goodbye!');
        rl.close();
        break;
      }
      console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Run pre-defined example tasks.
 */
async function runExampleTasks(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example API Tasks');
  console.log('='.repeat(60));
  
  const agentExecutor = await createApiAgent();
  
  const tasks = [
    "What's the weather like in London?",
    'Get information about the langchain-ai/langchain GitHub repository',
    'Compare the weather in Tokyo and Sydney',
    'Parse this JSON: {"name": "John", "age": 30, "city": "New York"}',
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
    console.log('Usage: ts-node 08_external_api_agent.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { createApiAgent, runInteractiveAgent, runExampleTasks };
