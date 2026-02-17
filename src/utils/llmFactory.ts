/**
 * Helper functions for creating LLM instances based on configuration.
 */
import { ChatOpenAI } from '@langchain/openai';
import { AzureChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { AzureOpenAIEmbeddings } from '@langchain/openai';
import { Config } from './config';

/**
 * Create a ChatLLM instance based on the configured provider.
 */
export function createChatLLM(
  config: Config,
  temperature?: number,
  additionalParams?: Record<string, any>
): ChatOpenAI | AzureChatOpenAI {
  const temp = temperature !== undefined ? temperature : config.temperature;
  
  if (config.isAzure()) {
    return new AzureChatOpenAI({
      azureOpenAIEndpoint: config.azureOpenaiEndpoint,
      azureOpenAIApiDeploymentName: config.azureOpenaiDeployment,
      azureOpenAIApiKey: config.azureOpenaiApiKey,
      azureOpenAIApiVersion: config.azureOpenaiApiVersion,
      temperature: temp,
      maxTokens: config.maxTokens,
      ...additionalParams,
    });
  } else {
    return new ChatOpenAI({
      modelName: config.openaiModel,
      temperature: temp,
      maxTokens: config.maxTokens,
      openAIApiKey: config.openaiApiKey,
      ...additionalParams,
    });
  }
}

/**
 * Create an Embeddings instance based on the configured provider.
 */
export function createEmbeddings(config: Config): OpenAIEmbeddings | AzureOpenAIEmbeddings {
  if (config.isAzure()) {
    return new AzureOpenAIEmbeddings({
      azureOpenAIEndpoint: config.azureOpenaiEndpoint,
      azureOpenAIApiDeploymentName: config.azureOpenaiDeployment,
      azureOpenAIApiKey: config.azureOpenaiApiKey,
      azureOpenAIApiVersion: config.azureOpenaiApiVersion,
    });
  } else {
    return new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey,
    });
  }
}
