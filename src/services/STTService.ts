import { initWhisper, transcribeFile, WhisperContext } from 'whisper.rn';
import RNFS from 'react-native-fs';

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language?: string;
  duration: number;
}

class STTService {
  private whisperContext: WhisperContext | null = null;
  private modelPath: string = '';
  private isInitialized: boolean = false;

  async initialize(modelName: string = 'whisper-tiny'): Promise<void> {
    try {
      // Model should be placed in assets or downloaded
      this.modelPath = `${RNFS.DocumentDirectoryPath}/models/${modelName}.bin`;

      // Check if model exists
      const exists = await RNFS.exists(this.modelPath);
      if (!exists) {
        throw new Error(
          `Whisper model not found at ${this.modelPath}. Please download the model first.`
        );
      }

      // Initialize Whisper context
      this.whisperContext = await initWhisper({
        filePath: this.modelPath,
      });

      this.isInitialized = true;
      console.log('Whisper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Whisper:', error);
      throw error;
    }
  }

  async transcribe(
    audioPath: string,
    options?: {
      language?: string;
      maxLen?: number;
      tokenTimestamps?: boolean;
    }
  ): Promise<TranscriptionResult> {
    if (!this.isInitialized || !this.whisperContext) {
      throw new Error('Whisper not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      const result = await transcribeFile(this.whisperContext, audioPath, {
        language: options?.language || 'auto',
        maxLen: options?.maxLen || 0,
        tokenTimestamps: options?.tokenTimestamps ?? true,
        splitOnWord: true,
      });

      const duration = Date.now() - startTime;

      return {
        text: result.text,
        segments: result.segments || [],
        language: result.language,
        duration,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  async transcribeRealtime(
    audioPath: string,
    onSegment: (segment: TranscriptionSegment) => void
  ): Promise<TranscriptionResult> {
    const result = await this.transcribe(audioPath, {
      tokenTimestamps: true,
    });

    // Emit segments progressively
    result.segments.forEach((segment) => {
      onSegment(segment);
    });

    return result;
  }

  async downloadModel(modelName: string, url: string): Promise<void> {
    const modelDir = `${RNFS.DocumentDirectoryPath}/models`;
    const modelPath = `${modelDir}/${modelName}.bin`;

    // Create models directory if it doesn't exist
    const dirExists = await RNFS.exists(modelDir);
    if (!dirExists) {
      await RNFS.mkdir(modelDir);
    }

    // Download model
    console.log(`Downloading ${modelName} from ${url}...`);
    
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
    if (this.whisperContext) {
      // Release Whisper context
      this.whisperContext = null;
      this.isInitialized = false;
    }
  }
}

export default new STTService();
