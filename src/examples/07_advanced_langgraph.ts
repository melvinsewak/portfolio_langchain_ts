/**
 * Advanced LangGraph Patterns Example using LangChain.
 * 
 * This example demonstrates advanced multi-agent patterns with LangGraph:
 * - Parallel agent execution
 * - Conditional routing with multiple paths
 * - Dynamic workflow based on state
 * - Complex agent coordination
 * - Environment-based configuration
 * 
 * Features:
 * - Parallel task execution
 * - Conditional branching based on results
 * - Dynamic path selection
 * - Agent specialization
 * - State management across branches
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StateGraph, END, StateGraphArgs } from '@langchain/langgraph';
import * as readline from 'readline';
import { getConfig, createChatLLM } from '../utils';

// Define workflow state
interface WorkflowState {
  task: string;
  messages: string[];
  analysis_result: string;
  technical_review: string;
  business_review: string;
  final_decision: string;
  decision_path: string;
  parallel_results: Record<string, string>;
}

/**
 * Create an analyzer agent that evaluates the task.
 */
function createAnalyzerAgent() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.2);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an analyzer agent. Analyze the given task and determine:
1. Is it technical or business-focused?
2. What's the complexity level (simple/medium/complex)?
3. What type of review is needed?

Respond with: TYPE: [technical/business/both], COMPLEXITY: [simple/medium/complex]`],
    ['human', '{input}'],
  ]);
  
  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const task = state.task;
    const messages = state.messages || [];
    
    console.log(`\n🔍 Analyzer Agent processing: ${task}`);
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({ input: task });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    // Determine path based on analysis
    let decisionPath = 'both';
    if (content.includes('TYPE: technical')) {
      decisionPath = 'technical';
    } else if (content.includes('TYPE: business')) {
      decisionPath = 'business';
    }
    
    console.log(`  ✅ Analysis complete. Path: ${decisionPath}`);
    
    return {
      analysis_result: content,
      messages: [...messages, 'Analyzer: Completed analysis'],
      decision_path: decisionPath,
    };
  };
}

/**
 * Create a technical review agent.
 */
function createTechnicalReviewer() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.3);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a technical review specialist. Review technical aspects:
- Feasibility
- Technical risks
- Implementation approach
- Technology stack recommendations`],
    ['human', 'Task: {task}\nAnalysis: {analysis}'],
  ]);
  
  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const messages = state.messages || [];
    
    console.log('\n⚙️  Technical Reviewer processing...');
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({
      task: state.task,
      analysis: state.analysis_result,
    });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log('  ✅ Technical review complete');
    
    return {
      technical_review: content,
      messages: [...messages, 'Technical Reviewer: Completed review'],
    };
  };
}

/**
 * Create a business review agent.
 */
function createBusinessReviewer() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.3);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a business review specialist. Review business aspects:
- Market viability
- Cost-benefit analysis
- ROI potential
- Business risks`],
    ['human', 'Task: {task}\nAnalysis: {analysis}'],
  ]);
  
  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const messages = state.messages || [];
    
    console.log('\n💼 Business Reviewer processing...');
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({
      task: state.task,
      analysis: state.analysis_result,
    });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log('  ✅ Business review complete');
    
    return {
      business_review: content,
      messages: [...messages, 'Business Reviewer: Completed review'],
    };
  };
}

/**
 * Create agents that run in parallel.
 */
function createParallelProcessor() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.4);
  
  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    console.log('\n🔀 Running parallel reviews...');
    
    const techPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Provide a brief technical assessment.'],
      ['human', '{task}'],
    ]);
    
    const bizPrompt = ChatPromptTemplate.fromMessages([
      ['system', 'Provide a brief business assessment.'],
      ['human', '{task}'],
    ]);
    
    // Run both reviews
    const techResult = await (techPrompt.pipe(llm)).invoke({ task: state.task });
    const bizResult = await (bizPrompt.pipe(llm)).invoke({ task: state.task });
    
    const techContent = typeof techResult.content === 'string' ? techResult.content : JSON.stringify(techResult.content);
    const bizContent = typeof bizResult.content === 'string' ? bizResult.content : JSON.stringify(bizResult.content);
    
    const messages = state.messages || [];
    
    console.log('  ✅ Parallel processing complete');
    
    return {
      technical_review: techContent,
      business_review: bizContent,
      parallel_results: {
        technical: techContent,
        business: bizContent,
      },
      messages: [...messages, 'Parallel Processor: Completed both reviews'],
    };
  };
}

/**
 * Create a decision-making agent.
 */
function createDecisionMaker() {
  const config = getConfig();
  
  const llm = createChatLLM(config, 0.5);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a decision maker. Based on the reviews provided, make a final decision.
Provide a clear recommendation: APPROVE, REJECT, or NEEDS_REVISION with reasoning.`],
    ['human', `Task: {task}
Technical Review: {technical}
Business Review: {business}
Make your decision.`],
  ]);
  
  return async (state: WorkflowState): Promise<Partial<WorkflowState>> => {
    const messages = state.messages || [];
    
    console.log('\n🎯 Decision Maker processing...');
    
    const chain = prompt.pipe(llm);
    const result = await chain.invoke({
      task: state.task,
      technical: state.technical_review || 'N/A',
      business: state.business_review || 'N/A',
    });
    
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    console.log('  ✅ Decision complete');
    
    return {
      final_decision: content,
      messages: [...messages, 'Decision Maker: Final decision made'],
    };
  };
}

/**
 * Route to appropriate review based on analysis.
 */
function routeAfterAnalysis(state: WorkflowState): string {
  return state.decision_path || 'both';
}

/**
 * Create an advanced workflow with parallel execution and conditional routing.
 */
function createAdvancedWorkflow() {
  // Create agents
  const analyzer = createAnalyzerAgent();
  const technicalReviewer = createTechnicalReviewer();
  const businessReviewer = createBusinessReviewer();
  const parallelProcessor = createParallelProcessor();
  const decisionMaker = createDecisionMaker();
  
  // Define state channels
  const graphState: StateGraphArgs<WorkflowState>['channels'] = {
    task: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    messages: {
      value: (x: string[], y: string[]) => x.concat(y),
      default: () => [],
    },
    analysis_result: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    technical_review: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    business_review: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    final_decision: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    decision_path: {
      value: (x?: string, y?: string) => y ?? x ?? '',
      default: () => '',
    },
    parallel_results: {
      value: (x?: Record<string, string>, y?: Record<string, string>) => y ?? x ?? {},
      default: () => ({}),
    },
  };
  
  // Create workflow
  const workflow = new StateGraph<WorkflowState>({ channels: graphState });
  
  // Add nodes
  workflow.addNode('analyzer', analyzer);
  workflow.addNode('technical_review', technicalReviewer);
  workflow.addNode('business_review', businessReviewer);
  workflow.addNode('parallel_review', parallelProcessor);
  workflow.addNode('decision', decisionMaker);
  
  // Set entry point
  workflow.setEntryPoint('analyzer');
  
  // Add conditional routing after analysis
  workflow.addConditionalEdges('analyzer', routeAfterAnalysis, {
    technical: 'technical_review',
    business: 'business_review',
    both: 'parallel_review',
  });
  
  // Route all paths to decision maker
  workflow.addEdge('technical_review', 'decision');
  workflow.addEdge('business_review', 'decision');
  workflow.addEdge('parallel_review', 'decision');
  
  // End after decision
  workflow.addEdge('decision', END);
  
  // Compile the workflow
  const app = workflow.compile();
  
  return app;
}

/**
 * Execute a task through the advanced workflow.
 */
async function runWorkflowExample(task: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('🔀 Advanced LangGraph Workflow');
  console.log('='.repeat(60));
  console.log(`\n📋 Task: ${task}\n`);
  
  // Create workflow
  const app = createAdvancedWorkflow();
  
  // Initialize state
  const initialState: WorkflowState = {
    task,
    messages: [],
    analysis_result: '',
    technical_review: '',
    business_review: '',
    final_decision: '',
    decision_path: '',
    parallel_results: {},
  };
  
  // Execute workflow
  console.log('🚀 Starting workflow...\n');
  const result = await app.invoke(initialState);
  
  // Display results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Workflow Results');
  console.log('='.repeat(60));
  
  console.log('\n🔍 Analysis Result:');
  console.log(`  ${result.analysis_result.substring(0, 200)}...`);
  
  console.log(`\n📍 Decision Path: ${result.decision_path}`);
  
  if (result.technical_review) {
    console.log('\n⚙️  Technical Review:');
    console.log(`  ${result.technical_review.substring(0, 200)}...`);
  }
  
  if (result.business_review) {
    console.log('\n💼 Business Review:');
    console.log(`  ${result.business_review.substring(0, 200)}...`);
  }
  
  console.log('\n🎯 Final Decision:');
  console.log(`  ${result.final_decision}`);
  
  console.log('\n📝 Workflow Messages:');
  result.messages.forEach((msg, i) => {
    console.log(`  ${i + 1}. ${msg}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

/**
 * Run interactive workflow session.
 */
async function runInteractiveWorkflow(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🔀 Interactive Advanced Workflow');
  console.log('='.repeat(60));
  console.log('\nThis workflow demonstrates:');
  console.log('  🔍 Conditional routing based on analysis');
  console.log('  🔀 Parallel execution for complex tasks');
  console.log('  📊 Multi-path decision making');
  console.log("\nType 'exit', 'quit', or 'bye' to end.\n");
  console.log('='.repeat(60));
  
  const config = getConfig();
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
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
      const task = (await askQuestion('\n📋 Enter a task/proposal: ')).trim();
      
      if (!task) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(task.toLowerCase())) {
        console.log('\n👋 Goodbye!');
        rl.close();
        break;
      }
      
      await runWorkflowExample(task);
      
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
 * Run pre-defined example workflows.
 */
async function runExampleWorkflows(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example Workflows');
  console.log('='.repeat(60));
  
  const config = getConfig();
  if (!config.validate()) {
    console.log('❌ Configuration validation failed.');
    process.exit(1);
  }
  
  const examples = [
    'Build a new machine learning model to predict customer churn',
    'Create a mobile app for employee onboarding',
    'Implement a new API endpoint for user authentication',
  ];
  
  for (let i = 0; i < examples.length; i++) {
    const task = examples[i];
    console.log(`\n\n${'#'.repeat(60)}`);
    console.log(`Example ${i + 1} of ${examples.length}`);
    console.log(`${'#'.repeat(60)}\n`);
    
    try {
      await runWorkflowExample(task);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All examples completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'example';
  
  if (mode === 'interactive') {
    runInteractiveWorkflow().catch(console.error);
  } else if (mode === 'example') {
    runExampleWorkflows().catch(console.error);
  } else {
    console.log('Usage: ts-node 07_advanced_langgraph.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { createAdvancedWorkflow, runWorkflowExample, runInteractiveWorkflow, runExampleWorkflows };
