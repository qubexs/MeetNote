import { initLlama, LlamaContext, loadLlamaModelInfo } from 'react-native-llama';
import RNFS from 'react-native-fs';

export interface SummaryOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  format?: 'paragraph' | 'bullets' | 'action_items';
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  duration: number;
}

class LLMService {
  private llamaContext: LlamaContext | null = null;
  private modelPath: string = '';
  private isInitialized: boolean = false;

  async initialize(modelName: string = 'phi3-mini-q4'): Promise<void> {
    try {
      this.modelPath = `${RNFS.DocumentDirectoryPath}/models/${modelName}.gguf`;

      // Check if model exists
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) {
        throw new Error(
          `LLM model not found at ${this.modelPath}. Please download the model first.`
        );
      }

      // Load model info
      const modelInfo = await loadLlamaModelInfo(this.modelPath);
      console.log('Model info:', modelInfo);

      // Initialize Llama context
      this.llamaContext = await initLlama({
        model: this.modelPath,
        n_ctx: 2048, // Context window
        n_batch: 512,
        n_threads: 4, // Adjust based on device
        use_mlock: true,
        use_mmap: true,
      });

      this.isInitialized = true;
      console.log('LLM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LLM:', error);
      throw error;
    }
  }

  async generateSummary(
    transcript: string,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    if (!this.isInitialized || !this.llamaContext) {
      throw new Error('LLM not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const format = options?.format || 'paragraph';

    // Build prompt based on format
    const prompt = this.buildSummaryPrompt(transcript, format);

    try {
      const result = await this.llamaContext.completion({
        prompt,
        n_predict: options?.maxTokens || 500,
        temperature: options?.temperature || 0.7,
        top_p: options?.topP || 0.9,
        top_k: 40,
        repeat_penalty: 1.1,
        stop: ['</s>', 'Human:', 'User:'],
      });

      const duration = Date.now() - startTime;

      // Parse the result
      const summary = this.extractSummary(result.text, format);
      const keyPoints = this.extractKeyPoints(result.text);
      const actionItems = this.extractActionItems(result.text);

      return {
        summary,
        keyPoints,
        actionItems,
        duration,
      };
    } catch (error) {
      console.error('Summary generation error:', error);
      throw error;
    }
  }

  private buildSummaryPrompt(transcript: string, format: string): string {
    const basePrompt = `You are a professional meeting notes assistant. Summarize the following meeting transcript concisely.

Transcript:
${transcript}

Please provide:
1. A clear summary of the main discussion
2. Key points covered
3. Any action items or decisions made

Format the response as:

SUMMARY:
[Your summary here]

KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]

ACTION ITEMS:
- [Action 1]
- [Action 2]

`;

    if (format === 'bullets') {
      return basePrompt + '\nUse bullet points for the summary.';
    } else if (format === 'action_items') {
      return basePrompt + '\nFocus primarily on action items and decisions.';
    }

    return basePrompt;
  }

  private extractSummary(text: string, format: string): string {
    const summaryMatch = text.match(/SUMMARY:([\s\S]*?)(?=KEY POINTS:|ACTION ITEMS:|$)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
    return text.split('\n\n')[0] || text;
  }

  private extractKeyPoints(text: string): string[] {
    const keyPointsMatch = text.match(/KEY POINTS:([\s\S]*?)(?=ACTION ITEMS:|$)/i);
    if (keyPointsMatch) {
      return keyPointsMatch[1]
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.trim().substring(1).trim());
    }
    return [];
  }

  private extractActionItems(text: string): string[] {
    const actionItemsMatch = text.match(/ACTION ITEMS:([\s\S]*?)$/i);
    if (actionItemsMatch) {
      return actionItemsMatch[1]
        .split('\n')
        .filter((line) => line.trim().startsWith('-'))
        .map((line) => line.trim().substring(1).trim());
    }
    return [];
  }

  async generateCustomPrompt(prompt: string, maxTokens: number = 500): Promise<string> {
    if (!this.isInitialized || !this.llamaContext) {
      throw new Error('LLM not initialized.');
    }

    const result = await this.llamaContext.completion({
      prompt,
      n_predict: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
    });

    return result.text;
  }

  async downloadModel(modelName: string, url: string, onProgress?: (progress: number) => void): Promise<void> {
    const modelDir = `${RNFS.DocumentDirectoryPath}/models`;
    const modelPath = `${modelDir}/${modelName}.gguf`;

    const dirExists = await RNFS.exists(modelDir);
    if (!dirExists) {
      await RNFS.mkdir(modelDir);
    }

    console.log(`Downloading ${modelName}...`);

    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: modelPath,
      progressDivider: 10,
      begin: (res) => {
        console.log('Download started:', res);
      },
      progress: (res) => {
        const progress = (res.bytesWritten / res.contentLength) * 100;
        console.log(`Download progress: ${progress.toFixed(2)}%`);
        if (onProgress) {
          onProgress(progress);
        }
      },
    });

    const result = await download.promise;

    if (result.statusCode === 200) {
      console.log('Model downloaded successfully');
      this.modelPath = modelPath;
    } else {
      throw new Error(`Failed to download model: ${result.statusCode}`);
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  async release(): Promise<void> {
    if (this.llamaContext) {
      await this.llamaContext.release();
      this.llamaContext = null;
      this.isInitialized = false;
    }
  }
}

export default new LLMService();
