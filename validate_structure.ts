#!/usr/bin/env node
/**
 * Validation script to check the structure and configuration of examples.
 * This runs without requiring langchain dependencies to be installed.
 */

import * as fs from 'fs';
import * as path from 'path';

function checkFileExists(filepath: string, description: string): boolean {
  const exists = fs.existsSync(filepath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${description}: ${filepath}`);
  return exists;
}

function checkDirectoryStructure(): boolean {
  console.log('='.repeat(60));
  console.log('🔍 Checking Directory Structure');
  console.log('='.repeat(60));
  
  const checks: Array<[string, string]> = [
    ['README.md', 'README file'],
    ['package.json', 'Package file'],
    ['.env.example', 'Environment example file'],
    ['.gitignore', 'Git ignore file'],
    ['tsconfig.json', 'TypeScript config file'],
    ['QUICKSTART.md', 'Quick start guide'],
    ['src/', 'Source directory'],
    ['src/examples/', 'Examples directory'],
    ['src/utils/', 'Utils directory'],
    ['src/utils/config.ts', 'Configuration module'],
    ['src/utils/llmFactory.ts', 'LLM factory module'],
    ['src/utils/index.ts', 'Utils index'],
    ['src/examples/01_conversational_chatbot.ts', 'Conversational chatbot example'],
    ['src/examples/02_rag_qa_system.ts', 'RAG Q&A system example'],
    ['src/examples/03_multi_tool_agent.ts', 'Multi-tool agent example'],
    ['src/examples/04_streaming_responses.ts', 'Streaming responses example'],
    ['src/examples/05_multi_agent_system.ts', 'Multi-agent system example'],
    ['src/examples/06_external_document_loading.ts', 'External document loading example'],
    ['src/examples/07_advanced_langgraph.ts', 'Advanced LangGraph example'],
    ['src/examples/08_external_api_agent.ts', 'External API agent example'],
  ];
  
  let allPassed = true;
  for (const [filepath, description] of checks) {
    if (!checkFileExists(filepath, description)) {
      allPassed = false;
    }
  }
  
  console.log();
  return allPassed;
}

function checkEnvExample(): boolean {
  console.log('='.repeat(60));
  console.log('🔧 Checking Environment Configuration');
  console.log('='.repeat(60));
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'OPENAI_MODEL',
    'TEMPERATURE',
    'MAX_TOKENS',
    'VERBOSE',
    'CHROMA_PERSIST_DIRECTORY',
    'CHUNK_SIZE',
    'CHUNK_OVERLAP',
  ];
  
  try {
    const content = fs.readFileSync('.env.example', 'utf-8');
    
    let allPresent = true;
    for (const varName of requiredVars) {
      const present = content.includes(varName);
      const status = present ? '✅' : '❌';
      console.log(`${status} ${varName}`);
      if (!present) {
        allPresent = false;
      }
    }
    
    console.log();
    return allPresent;
  } catch (error) {
    console.log(`❌ Error reading .env.example: ${error}\n`);
    return false;
  }
}

function checkPackageJson(): boolean {
  console.log('='.repeat(60));
  console.log('📦 Checking Package Dependencies');
  console.log('='.repeat(60));
  
  const requiredPackages = [
    '@langchain/core',
    '@langchain/openai',
    '@langchain/community',
    'langchain',
    '@langchain/langgraph',
    'chromadb',
    'dotenv',
    'zod',
    'typescript',
    'ts-node',
  ];
  
  try {
    const content = fs.readFileSync('package.json', 'utf-8');
    const pkg = JSON.parse(content);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    
    let allPresent = true;
    for (const packageName of requiredPackages) {
      const present = packageName in allDeps;
      const status = present ? '✅' : '❌';
      console.log(`${status} ${packageName}`);
      if (!present) {
        allPresent = false;
      }
    }
    
    console.log();
    return allPresent;
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error}\n`);
    return false;
  }
}

function checkExampleStructure(filepath: string): boolean {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    
    const checks: Record<string, boolean> = {
      'Has JSDoc comment': content.substring(0, 500).includes('/**'),
      'Imports utils': content.includes('from \'../utils\'') || content.includes('from "../utils"'),
      'Has main block': content.includes('require.main === module'),
      'Has mode argument handling': content.includes('--mode'),
      'Has interactive mode': content.toLowerCase().includes('interactive'),
    };
    
    let allPassed = true;
    for (const [check, passed] of Object.entries(checks)) {
      if (!passed) {
        allPassed = false;
      }
      const status = passed ? '  ✅' : '  ❌';
      console.log(`${status} ${check}`);
    }
    
    return allPassed;
  } catch (error) {
    console.log(`  ❌ Error reading file: ${error}`);
    return false;
  }
}

function checkAllExamples(): boolean {
  console.log('='.repeat(60));
  console.log('📝 Checking Example Files Structure');
  console.log('='.repeat(60));
  
  const examples = [
    'src/examples/01_conversational_chatbot.ts',
    'src/examples/02_rag_qa_system.ts',
    'src/examples/03_multi_tool_agent.ts',
    'src/examples/04_streaming_responses.ts',
    'src/examples/05_multi_agent_system.ts',
    'src/examples/06_external_document_loading.ts',
    'src/examples/07_advanced_langgraph.ts',
    'src/examples/08_external_api_agent.ts',
  ];
  
  let allPassed = true;
  for (const example of examples) {
    console.log(`\n📄 ${path.basename(example)}:`);
    if (!checkExampleStructure(example)) {
      allPassed = false;
    }
  }
  
  console.log();
  return allPassed;
}

function checkReadme(): boolean {
  console.log('='.repeat(60));
  console.log('📖 Checking README');
  console.log('='.repeat(60));
  
  const requiredSections = [
    'Features',
    'Getting Started',
    'Installation',
    'Running Examples',
    'Configuration',
    'Project Structure',
  ];
  
  try {
    const content = fs.readFileSync('README.md', 'utf-8');
    
    let allPresent = true;
    for (const section of requiredSections) {
      const present = content.includes(section);
      const status = present ? '✅' : '❌';
      console.log(`${status} ${section} section`);
      if (!present) {
        allPresent = false;
      }
    }
    
    console.log();
    return allPresent;
  } catch (error) {
    console.log(`❌ Error reading README.md: ${error}\n`);
    return false;
  }
}

function main(): number {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Portfolio LangChain TypeScript - Structure Validation');
  console.log('='.repeat(60));
  console.log();
  
  const checks: Array<[string, () => boolean]> = [
    ['Directory Structure', checkDirectoryStructure],
    ['Environment Variables', checkEnvExample],
    ['Package Dependencies', checkPackageJson],
    ['Example Files', checkAllExamples],
    ['README Documentation', checkReadme],
  ];
  
  const results: Array<[string, boolean]> = [];
  for (const [name, checkFunc] of checks) {
    try {
      const passed = checkFunc();
      results.push([name, passed]);
    } catch (error) {
      console.log(`❌ Error in ${name}: ${error}\n`);
      results.push([name, false]);
    }
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 Validation Summary');
  console.log('='.repeat(60));
  
  let allPassed = true;
  for (const [name, passed] of results) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('='.repeat(60));
  
  if (allPassed) {
    console.log('\n🎉 All validation checks passed!');
    console.log('\nNext steps:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your OPENAI_API_KEY to .env');
    console.log('3. Install dependencies: npm install');
    console.log('4. Run examples: npm run example:01 -- --mode example');
    return 0;
  } else {
    console.log('\n⚠️  Some validation checks failed. Please review the output above.');
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  process.exit(main());
}
