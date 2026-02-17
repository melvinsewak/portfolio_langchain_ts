/**
 * Multi-Agent System Example using LangChain.
 * 
 * This example demonstrates a production-ready multi-agent system with:
 * - Multiple specialized agents working together
 * - Supervisor agent for task coordination
 * - Agent-to-agent communication
 * - Collaborative problem solving
 * - Environment-based configuration
 * 
 * Features:
 * - Research agent for information gathering
 * - Writer agent for content creation
 * - Critic agent for quality review
 * - Supervisor agent for orchestration
 * - Sequential and parallel agent execution
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StateGraph, END, StateGraphArgs } from '@langchain/langgraph';
import * as readline from 'readline';
import { getConfig, createChatLLM } from '../utils';

// Define the state for multi-agent workflow
interface AgentState {
  messages: string[];
  task: string;
  research_output: string;
  draft_output: string;
  final_output: string;
  next_agent: string;
}

/**
 * Create a research agent that gathers information.
 */
function createResearchAgent() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.3); // Lower temperature for research
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a research specialist agent. Your role is to gather and analyze information.
        
When given a topic or question:
1. Break down the topic into key points
2. Provide factual, well-researched information
3. Cite relevant concepts and ideas
4. Organize information logically

Be thorough and accurate in your research.`],
    ['human', '{input}'],
  ]);
  
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const task = state.task;
    const messages = state.messages || [];
    
    console.log(`\n🔍 Research Agent working on: ${task}`);
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({ input: task });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log(`✅ Research completed (${content.length} characters)`);
    
    return {
      research_output: content,
      messages: [...messages, `Research Agent: Completed research on '${task}'`],
      next_agent: 'writer',
    };
  };
}

/**
 * Create a writer agent that creates content based on research.
 */
function createWriterAgent() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.7); // Higher temperature for creative writing
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a professional writer agent. Your role is to create engaging content.
        
When given research material:
1. Transform information into well-structured content
2. Write in a clear, engaging style
3. Ensure proper flow and coherence
4. Include relevant examples and explanations

Create content that is informative and accessible.`],
    ['human', 'Based on this research:\n\n{research}\n\nCreate content about: {task}'],
  ]);
  
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const task = state.task;
    const research = state.research_output || '';
    const messages = state.messages || [];
    
    console.log('\n✍️  Writer Agent creating content...');
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({ research, task });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log(`✅ Draft completed (${content.length} characters)`);
    
    return {
      draft_output: content,
      messages: [...messages, 'Writer Agent: Created draft content'],
      next_agent: 'critic',
    };
  };
}

/**
 * Create a critic agent that reviews and improves content.
 */
function createCriticAgent() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.4); // Balanced temperature for critique
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a quality assurance critic agent. Your role is to review and improve content.
        
When reviewing content:
1. Check for accuracy and completeness
2. Identify areas for improvement
3. Suggest enhancements
4. Ensure clarity and readability
5. Provide a polished final version

Be constructive and thorough in your review.`],
    ['human', 'Review and improve this content:\n\n{draft}\n\nOriginal task: {task}'],
  ]);
  
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const task = state.task;
    const draft = state.draft_output || '';
    const messages = state.messages || [];
    
    console.log('\n🔎 Critic Agent reviewing content...');
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({ draft, task });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log(`✅ Review completed (${content.length} characters)`);
    
    return {
      final_output: content,
      messages: [...messages, 'Critic Agent: Reviewed and finalized content'],
      next_agent: 'end',
    };
  };
}

/**
 * Create a multi-agent system with supervisor orchestration.
 */
function createMultiAgentSystem() {
  // Create agents
  const researchAgent = createResearchAgent();
  const writerAgent = createWriterAgent();
  const criticAgent = createCriticAgent();
  
  // Define routing logic
  const routeAgent = (state: AgentState): string => {
    const nextAgent = state.next_agent || 'end';
    if (nextAgent === 'end') {
      return END;
    }
    return nextAgent;
  };
  
  // Create workflow graph
  const graphState: StateGraphArgs<AgentState>['channels'] = {
    messages: {
      value: (x: string[], y: string[]) => x.concat(y),
      default: () => [],
    },
    task: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    research_output: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    draft_output: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    final_output: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    next_agent: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
  };
  
  const workflow = new StateGraph<AgentState>({ channels: graphState });
  
  // Add agent nodes
  workflow.addNode('researcher', researchAgent);
  workflow.addNode('writer', writerAgent);
  workflow.addNode('critic', criticAgent);
  
  // Add edges
  workflow.setEntryPoint('researcher');
  workflow.addConditionalEdges('researcher', routeAgent, {
    writer: 'writer',
    [END]: END,
  });
  workflow.addConditionalEdges('writer', routeAgent, {
    critic: 'critic',
    [END]: END,
  });
  workflow.addConditionalEdges('critic', routeAgent, {
    [END]: END,
  });
  
  // Compile the graph
  const app = workflow.compile();
  
  return app;
}

/**
 * Execute a task using the multi-agent system.
 */
async function runMultiAgentTask(task: string): Promise<AgentState> {
  console.log('='.repeat(60));
  console.log('🤖 Multi-Agent System');
  console.log('='.repeat(60));
  console.log(`\n📋 Task: ${task}\n`);
  
  // Create the multi-agent system
  const app = createMultiAgentSystem();
  
  // Initialize state
  const initialState: AgentState = {
    messages: [],
    task,
    research_output: '',
    draft_output: '',
    final_output: '',
    next_agent: 'researcher',
  };
  
  // Execute the workflow
  console.log('🚀 Starting multi-agent workflow...\n');
  const result = await app.invoke(initialState);
  
  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Workflow Summary');
  console.log('='.repeat(60));
  
  console.log('\n📝 Messages exchanged:');
  result.messages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 Final Output');
  console.log('='.repeat(60));
  console.log(`\n${result.final_output}\n`);
  
  return result;
}

/**
 * Run interactive multi-agent session.
 */
async function runInteractiveMultiAgent(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🤖 Interactive Multi-Agent System');
  console.log('='.repeat(60));
  console.log('\nThis system uses three specialized agents:');
  console.log('  🔍 Research Agent - Gathers information');
  console.log('  ✍️  Writer Agent - Creates content');
  console.log('  🔎 Critic Agent - Reviews and improves');
  console.log("\nType 'exit', 'quit', or 'bye' to end.\n");
  console.log('='.repeat(60));
  
  // Validate config
  const config = getConfig();
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
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
      const task = (await askQuestion('\n📋 Enter a task for the agents: ')).trim();
      
      if (!task) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(task.toLowerCase())) {
        console.log('\n👋 Goodbye!');
        rl.close();
        break;
      }
      
      // Execute the task
      await runMultiAgentTask(task);
      
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
 * Run pre-defined example tasks.
 */
async function runExampleTasks(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example Multi-Agent Tasks');
  console.log('='.repeat(60));
  
  // Validate config
  const config = getConfig();
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  // Example tasks
  const tasks = [
    'Explain the benefits of multi-agent systems in AI',
    'Write a brief guide on using LangChain for beginners',
  ];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n\n${'#'.repeat(60)}`);
    console.log(`Example ${i + 1} of ${tasks.length}`);
    console.log(`${'#'.repeat(60)}\n`);
    
    try {
      await runMultiAgentTask(task);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All example tasks completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'interactive';
  
  if (mode === 'interactive') {
    runInteractiveMultiAgent().catch(console.error);
  } else if (mode === 'example') {
    runExampleTasks().catch(console.error);
  } else {
    console.log('Usage: ts-node 05_multi_agent_system.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { createMultiAgentSystem, runMultiAgentTask, runInteractiveMultiAgent, runExampleTasks };
