/**
 * RAG (Retrieval Augmented Generation) Example using LangChain.
 * 
 * This example demonstrates a production-ready RAG system with:
 * - Document loading and text splitting
 * - Vector store (Chroma) for efficient similarity search
 * - OpenAI embeddings for document vectorization
 * - Question-answering over documents
 * - Environment-based configuration
 * 
 * Features:
 * - Load and process documents from various sources
 * - Store embeddings in a persistent vector database
 * - Answer questions based on document context
 * - Configurable chunk size and overlap
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RetrievalQAChain } from 'langchain/chains';
import * as readline from 'readline';
import { getConfig, createChatLLM, createEmbeddings } from '../utils';

/**
 * Create sample documents for demonstration.
 */
function createSampleDocuments(): Document[] {
  return [
    new Document({
      pageContent: `
LangChain is a framework for developing applications powered by language models.
It provides tools and abstractions for working with LLMs, including chains, agents,
and memory components. LangChain makes it easy to build complex LLM applications
by providing reusable components and patterns.
      `,
      metadata: { source: 'langchain_intro', topic: 'framework' },
    }),
    new Document({
      pageContent: `
Retrieval Augmented Generation (RAG) is a technique that enhances language models
by retrieving relevant information from a knowledge base before generating responses.
This allows the model to access up-to-date information and domain-specific knowledge
that wasn't part of its training data. RAG systems typically use vector databases
for efficient similarity search.
      `,
      metadata: { source: 'rag_explanation', topic: 'technique' },
    }),
    new Document({
      pageContent: `
Vector databases store embeddings - numerical representations of text that capture
semantic meaning. They enable fast similarity search, which is crucial for RAG systems.
Popular vector databases include Chroma, Pinecone, Weaviate, and FAISS. These databases
use algorithms like HNSW or IVF for approximate nearest neighbor search.
      `,
      metadata: { source: 'vector_db_info', topic: 'database' },
    }),
    new Document({
      pageContent: `
OpenAI provides powerful embedding models like text-embedding-ada-002, which convert
text into high-dimensional vectors. These embeddings capture semantic relationships
between words and concepts, making them ideal for similarity search and retrieval tasks.
The embeddings are used in RAG systems to find relevant documents.
      `,
      metadata: { source: 'embeddings_info', topic: 'embeddings' },
    }),
    new Document({
      pageContent: `
Production RAG systems should consider several factors: chunk size affects context
quality, overlap ensures continuity between chunks, and the number of retrieved
documents balances context and cost. Monitoring retrieval quality and implementing
fallback strategies are also important for production deployments.
      `,
      metadata: { source: 'production_tips', topic: 'best_practices' },
    }),
  ];
}

/**
 * Set up a RAG system with vector store and retrieval chain.
 */
async function setupRagSystem(documents?: Document[]): Promise<RetrievalQAChain> {
  // Load configuration
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  // Use sample documents if none provided
  const docs = documents || createSampleDocuments();
  
  console.log(`\n📄 Processing ${docs.length} documents...`);
  
  // Split documents into chunks
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });
  
  const splitDocs = await textSplitter.splitDocuments(docs);
  console.log(`✂️  Split into ${splitDocs.length} chunks`);
  
  // Create embeddings
  console.log('🔢 Creating embeddings...');
  const embeddings = createEmbeddings(config);
  
  // Create vector store
  console.log(`💾 Creating vector store at ${config.chromaPersistDirectory}...`);
  const vectorstore = await Chroma.fromDocuments(
    splitDocs,
    embeddings,
    {
      collectionName: 'langchain_docs',
      url: 'http://localhost:8000', // Default Chroma server URL
    }
  );
  
  // Create LLM
  const llm = createChatLLM(config);
  
  // Create retrieval QA chain
  const qaChain = RetrievalQAChain.fromLLM(
    llm,
    vectorstore.asRetriever({
      k: 3, // Retrieve top 3 most relevant chunks
    }),
    {
      returnSourceDocuments: true,
      verbose: config.verbose,
    }
  );
  
  console.log('✅ RAG system ready!\n');
  
  return qaChain;
}

/**
 * Run an interactive Q&A session with the RAG system.
 */
async function runInteractiveQA(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📚 RAG Question-Answering System');
  console.log('='.repeat(60));
  console.log('\nThis system can answer questions based on the provided documents.');
  console.log("Type 'exit', 'quit', or 'bye' to end the session.\n");
  console.log('='.repeat(60));
  
  // Set up RAG system
  const qaChain = await setupRagSystem();
  
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
  
  // Interactive Q&A loop
  while (true) {
    try {
      const question = (await askQuestion('\n❓ Your question: ')).trim();
      
      if (!question) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(question.toLowerCase())) {
        console.log('\n👋 Goodbye!');
        rl.close();
        break;
      }
      
      // Get answer
      console.log('\n🔍 Searching documents...');
      const result = await qaChain.call({ query: question });
      
      // Print answer
      console.log(`\n💡 Answer: ${result.text}`);
      
      // Print sources
      if (result.sourceDocuments && result.sourceDocuments.length > 0) {
        console.log('\n📎 Sources:');
        result.sourceDocuments.forEach((doc: Document, i: number) => {
          const source = doc.metadata.source || 'unknown';
          const topic = doc.metadata.topic || 'N/A';
          console.log(`  ${i + 1}. Source: ${source} | Topic: ${topic}`);
        });
      }
      
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
 * Run pre-defined example queries to demonstrate RAG capabilities.
 */
async function runExampleQueries(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Running Example Queries');
  console.log('='.repeat(60));
  
  const qaChain = await setupRagSystem();
  
  // Example queries
  const queries = [
    'What is LangChain?',
    'How does RAG work?',
    'What are vector databases used for?',
    'What should I consider for production RAG systems?',
  ];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log('\n' + '='.repeat(60));
    console.log(`Query ${i + 1}: ${query}`);
    console.log('='.repeat(60));
    
    try {
      const result = await qaChain.call({ query });
      console.log(`\n💡 Answer: ${result.text}`);
      
      if (result.sourceDocuments && result.sourceDocuments.length > 0) {
        console.log('\n📎 Sources:');
        result.sourceDocuments.forEach((doc: Document, j: number) => {
          const source = doc.metadata.source || 'unknown';
          console.log(`  ${j + 1}. ${source}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Example queries completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'interactive';
  
  if (mode === 'interactive') {
    runInteractiveQA().catch(console.error);
  } else if (mode === 'example') {
    runExampleQueries().catch(console.error);
  } else {
    console.log('Usage: ts-node 02_rag_qa_system.ts [--mode interactive|example]');
    process.exit(1);
  }
}

export { setupRagSystem, runInteractiveQA, runExampleQueries, createSampleDocuments };
