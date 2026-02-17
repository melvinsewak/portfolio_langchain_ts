/**
 * External Document Loading Example using LangChain.
 * 
 * This example demonstrates loading and processing documents from external sources:
 * - PDF files from local storage
 * - Web pages from URLs
 * - Document processing and chunking
 * - Integration with RAG system
 * - Environment-based configuration
 * 
 * Features:
 * - Load PDF documents using pdf-parse
 * - Scrape web content using cheerio
 * - Process mixed document sources
 * - Store in vector database
 * - Query across all sources
 */

import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RetrievalQAChain } from 'langchain/chains';
import { CheerioWebBaseLoader } from 'langchain/document_loaders/web/cheerio';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import * as readline from 'readline';
import * as fs from 'fs';
import { getConfig, createChatLLM, createEmbeddings } from '../utils';

/**
 * Load documents from PDF files.
 */
async function loadPdfDocuments(pdfPaths: string[]): Promise<Document[]> {
  const documents: Document[] = [];
  
  for (const pdfPath of pdfPaths) {
    try {
      console.log(`📄 Loading PDF: ${pdfPath}`);
      
      if (!fs.existsSync(pdfPath)) {
        console.log(`  ⚠️  File not found: ${pdfPath}`);
        continue;
      }
      
      const loader = new PDFLoader(pdfPath);
      const docs = await loader.load();
      documents.push(...docs);
      console.log(`  ✅ Loaded ${docs.length} pages`);
    } catch (error) {
      console.log(`  ❌ Error loading ${pdfPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return documents;
}

/**
 * Load documents from web URLs.
 */
async function loadWebDocuments(urls: string[]): Promise<Document[]> {
  const documents: Document[] = [];
  
  for (const url of urls) {
    try {
      console.log(`🌐 Loading web page: ${url}`);
      const loader = new CheerioWebBaseLoader(url);
      const docs = await loader.load();
      documents.push(...docs);
      console.log(`  ✅ Loaded ${docs.length} document(s)`);
    } catch (error) {
      console.log(`  ❌ Error loading ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return documents;
}

/**
 * Create sample PDF content for demonstration.
 */
function createSamplePdfContent(): Document[] {
  return [
    new Document({
      pageContent: `
LangChain Document Loading Best Practices

When loading external documents, consider:
1. File format compatibility (PDF, DOCX, TXT, etc.)
2. Character encoding handling
3. Metadata preservation
4. Error handling for corrupted files
5. Chunking strategy for large documents

PDF Loading:
- Use PDFLoader for standard PDFs
- Handle password-protected files appropriately
- Extract metadata (page numbers, author, etc.)
- Consider OCR for scanned PDFs
      `,
      metadata: { source: 'sample_pdf_page_1', page: 1, type: 'pdf' },
    }),
    new Document({
      pageContent: `
Web Scraping with LangChain

Best practices for web scraping:
1. Respect robots.txt
2. Rate limiting to avoid overwhelming servers
3. Handle dynamic content (JavaScript-rendered pages)
4. Clean HTML to extract meaningful text
5. Preserve important metadata (URL, title, date)

Common patterns:
- Use CheerioWebBaseLoader for simple HTML pages
- Use Puppeteer or Playwright for JavaScript-heavy sites
- Implement retry logic for failed requests
- Cache downloaded content when appropriate
      `,
      metadata: { source: 'sample_web_page', url: 'https://example.com/docs', type: 'web' },
    }),
  ];
}

/**
 * Set up a QA system with external document sources.
 */
async function setupDocumentQaSystem(
  pdfPaths?: string[],
  urls?: string[]
): Promise<RetrievalQAChain> {
  const config = getConfig();
  
  if (!config.validate()) {
    console.log('❌ Configuration validation failed. Please check your .env file.');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📚 Loading External Documents');
  console.log('='.repeat(60));
  
  let allDocuments: Document[] = [];
  
  // Load PDFs if provided
  if (pdfPaths && pdfPaths.length > 0) {
    const pdfDocs = await loadPdfDocuments(pdfPaths);
    allDocuments.push(...pdfDocs);
  }
  
  // Load web pages if provided
  if (urls && urls.length > 0) {
    const webDocs = await loadWebDocuments(urls);
    allDocuments.push(...webDocs);
  }
  
  // Use sample content if no external sources
  if (allDocuments.length === 0) {
    console.log('\n⚠️  No external sources provided, using sample content');
    allDocuments = createSamplePdfContent();
  }
  
  console.log(`\n📊 Total documents loaded: ${allDocuments.length}`);
  
  // Split documents
  console.log('\n✂️  Splitting documents...');
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });
  
  const splitDocs = await textSplitter.splitDocuments(allDocuments);
  console.log(`  Created ${splitDocs.length} chunks`);
  
  // Create embeddings and vector store
  console.log('\n🔢 Creating embeddings...');
  const embeddings = createEmbeddings(config);
  
  console.log('💾 Building vector store...');
  const vectorstore = await Chroma.fromDocuments(
    splitDocs,
    embeddings,
    {
      collectionName: 'external_docs',
      url: 'http://localhost:8000',
    }
  );
  
  // Create LLM
  const llm = createChatLLM(config);
  
  // Create QA chain
  const qaChain = RetrievalQAChain.fromLLM(
    llm,
    vectorstore.asRetriever({ k: 3 }),
    {
      returnSourceDocuments: true,
      verbose: config.verbose,
    }
  );
  
  console.log('✅ Document QA system ready!\n');
  
  return qaChain;
}

/**
 * Run interactive Q&A session with external documents.
 */
async function runInteractiveQA(pdfPaths?: string[], urls?: string[]): Promise<void> {
  console.log('='.repeat(60));
  console.log('📚 External Document QA System');
  console.log('='.repeat(60));
  console.log('\nThis system can process:');
  console.log('  📄 PDF files (local)');
  console.log('  🌐 Web pages (URLs)');
  console.log("\nType 'exit', 'quit', or 'bye' to end.\n");
  console.log('='.repeat(60));
  
  if (!pdfPaths && !urls) {
    console.log('\n💡 Tip: Edit this file to add your PDF paths or URLs');
    console.log('   Example: pdfPaths=["/path/to/file.pdf"]');
    console.log('   Example: urls=["https://example.com/page"]');
  }
  
  // Set up QA system with provided paths/urls or use sample content
  const qaChain = await setupDocumentQaSystem(pdfPaths, urls);
  
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
      const question = (await askQuestion('\n❓ Your question: ')).trim();
      
      if (!question) {
        continue;
      }
      
      if (['exit', 'quit', 'bye'].includes(question.toLowerCase())) {
        console.log('\n👋 Goodbye!');
        rl.close();
        break;
      }
      
      console.log('\n🔍 Searching documents...');
      const result = await qaChain.call({ query: question });
      
      console.log(`\n💡 Answer: ${result.text}`);
      
      if (result.sourceDocuments && result.sourceDocuments.length > 0) {
        console.log('\n📎 Sources:');
        result.sourceDocuments.forEach((doc: Document, i: number) => {
          const source = doc.metadata.source || 'unknown';
          const docType = doc.metadata.type || 'N/A';
          const page = doc.metadata.page || 'N/A';
          console.log(`  ${i + 1}. ${source} (type: ${docType}, page: ${page})`);
        });
      }
      
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
 * Run example with web URLs.
 */
async function runExampleWithUrls(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Example: Loading from Web URLs');
  console.log('='.repeat(60));
  
  // Example URLs (educational/documentation sites)
  const urls = [
    'https://python.langchain.com/docs/get_started/introduction',
  ];
  
  console.log('\n🌐 This example demonstrates loading from web pages');
  console.log('⚠️  Note: Requires internet connection\n');
  
  try {
    const qaChain = await setupDocumentQaSystem(undefined, urls);
    
    const queries = [
      'What is LangChain?',
      'How do I get started with LangChain?',
    ];
    
    for (const query of queries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Query: ${query}`);
      console.log(`${'='.repeat(60)}`);
      
      const result = await qaChain.call({ query });
      console.log(`\n💡 Answer: ${result.text}`);
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('⚠️  Falling back to sample content\n');
    await runExampleWithSamples();
  }
}

/**
 * Run example with sample content.
 */
async function runExampleWithSamples(): Promise<void> {
  console.log('='.repeat(60));
  console.log('📝 Example: Sample Document Content');
  console.log('='.repeat(60));
  
  const qaChain = await setupDocumentQaSystem();
  
  const queries = [
    'What are best practices for loading PDF documents?',
    'How should I handle web scraping with LangChain?',
  ];
  
  for (const query of queries) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Query: ${query}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      const result = await qaChain.call({ query });
      console.log(`\n💡 Answer: ${result.text}`);
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Example completed!');
  console.log('='.repeat(60));
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const modeIndex = args.indexOf('--mode');
  const mode = modeIndex !== -1 && args[modeIndex + 1] ? args[modeIndex + 1] : 'example';
  
  const pdfIndex = args.indexOf('--pdf');
  const urlIndex = args.indexOf('--url');
  
  const pdfPaths = pdfIndex !== -1 ? args.slice(pdfIndex + 1).filter(arg => !arg.startsWith('--')) : undefined;
  const urls = urlIndex !== -1 ? args.slice(urlIndex + 1).filter(arg => !arg.startsWith('--')) : undefined;
  
  if (mode === 'interactive') {
    runInteractiveQA(pdfPaths, urls).catch(console.error);
  } else if (mode === 'web') {
    runExampleWithUrls().catch(console.error);
  } else {
    runExampleWithSamples().catch(console.error);
  }
}

export {
  loadPdfDocuments,
  loadWebDocuments,
  setupDocumentQaSystem,
  runInteractiveQA,
  runExampleWithUrls,
  runExampleWithSamples,
};
