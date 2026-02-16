/**
 * Common configuration loader for langchain examples.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env file
dotenv.config();

export type LLMProvider = 'openai' | 'azure';

/**
 * Configuration class to load and manage environment variables.
 */
export class Config {
  // LLM Provider configuration
  public readonly llmProvider: LLMProvider;
  
  // OpenAI configuration
  public readonly openaiApiKey: string;
  public readonly openaiModel: string;
  
  // Azure OpenAI configuration
  public readonly azureOpenaiApiKey: string;
  public readonly azureOpenaiEndpoint: string;
  public readonly azureOpenaiDeployment: string;
  public readonly azureOpenaiApiVersion: string;
  
  // Common LLM settings
  public readonly temperature: number;
  public readonly maxTokens: number;
  public readonly verbose: boolean;
  
  // Vector store configuration
  public readonly chromaPersistDirectory: string;
  
  // Document processing configuration
  public readonly chunkSize: number;
  public readonly chunkOverlap: number;

  constructor() {
    // LLM Provider configuration (openai or azure)
    this.llmProvider = (process.env.LLM_PROVIDER?.toLowerCase() || 'openai') as LLMProvider;
    
    // OpenAI configuration
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    
    // Azure OpenAI configuration
    this.azureOpenaiApiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.azureOpenaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    this.azureOpenaiDeployment = process.env.AZURE_OPENAI_DEPLOYMENT || '';
    this.azureOpenaiApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
    
    // Common LLM settings
    this.temperature = parseFloat(process.env.TEMPERATURE || '0.7');
    this.maxTokens = parseInt(process.env.MAX_TOKENS || '1000', 10);
    this.verbose = process.env.VERBOSE?.toLowerCase() === 'true';
    
    // Vector store configuration
    this.chromaPersistDirectory = process.env.CHROMA_PERSIST_DIRECTORY || './chroma_db';
    
    // Document processing configuration
    this.chunkSize = parseInt(process.env.CHUNK_SIZE || '1000', 10);
    this.chunkOverlap = parseInt(process.env.CHUNK_OVERLAP || '200', 10);
  }

  /**
   * Validate that all required configurations are present.
   */
  validate(): boolean {
    try {
      if (this.llmProvider === 'azure') {
        // Validate Azure OpenAI configuration
        if (!this.azureOpenaiApiKey || this.azureOpenaiApiKey === 'your_azure_openai_api_key_here') {
          console.log('⚠️  Warning: AZURE_OPENAI_API_KEY not configured properly.');
          console.log('   Please update your .env file with a valid Azure OpenAI API key.');
          return false;
        }
        if (!this.azureOpenaiEndpoint) {
          console.log('⚠️  Warning: AZURE_OPENAI_ENDPOINT not configured.');
          console.log('   Please set your Azure OpenAI endpoint in .env file.');
          return false;
        }
        if (!this.azureOpenaiDeployment) {
          console.log('⚠️  Warning: AZURE_OPENAI_DEPLOYMENT not configured.');
          console.log('   Please set your Azure OpenAI deployment name in .env file.');
          return false;
        }
      } else {
        // Validate OpenAI configuration
        if (!this.openaiApiKey || this.openaiApiKey === 'your_openai_api_key_here') {
          console.log('⚠️  Warning: OPENAI_API_KEY not configured properly.');
          console.log('   Please update your .env file with a valid API key.');
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.log(`❌ Configuration validation failed: ${error}`);
      return false;
    }
  }

  /**
   * Get the configured LLM provider.
   */
  getLLMProvider(): LLMProvider {
    return this.llmProvider;
  }

  /**
   * Check if Azure OpenAI is configured.
   */
  isAzure(): boolean {
    return this.llmProvider === 'azure';
  }
}

/**
 * Get the application configuration.
 */
export function getConfig(): Config {
  return new Config();
}
