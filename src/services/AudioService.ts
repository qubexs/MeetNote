import AudioRecorderPlayer, {
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
} from 'react-native-audio-recorder-player';
import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

class AudioService {
  private audioRecorderPlayer: AudioRecorderPlayer;
  private recordingPath: string = '';
  private isRecording: boolean = false;

  constructor() {
    this.audioRecorderPlayer = new AudioRecorderPlayer();
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        return (
          grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
          grants['android.permission.WRITE_EXTERNAL_STORAGE'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const result = await request(PERMISSIONS.IOS.MICROPHONE);
        return result === RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }

  async startRecording(onProgress?: (currentPosition: number) => void): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Audio recording permission denied');
    }

    const timestamp = Date.now();
    const path = `${RNFS.DocumentDirectoryPath}/recording_${timestamp}.wav`;
    this.recordingPath = path;

    const audioSet = {
      AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
      AudioSourceAndroid: AudioSourceAndroidType.MIC,
      AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
      AVNumberOfChannelsKeyIOS: 1,
      AVFormatIDKeyIOS: AVEncodingOption.lpcm,
      AVSampleRateKeyIOS: 16000, // Whisper works best with 16kHz
    };

    await this.audioRecorderPlayer.startRecorder(path, audioSet);
    this.isRecording = true;

    if (onProgress) {
      this.audioRecorderPlayer.addRecordBackListener((e) => {
        onProgress(e.currentPosition);
      });
    }

    return path;
  }

  async stopRecording(): Promise<string> {
    if (!this.isRecording) {
      throw new Error('No active recording');
    }

    const result = await this.audioRecorderPlayer.stopRecorder();
    this.audioRecorderPlayer.removeRecordBackListener();
    this.isRecording = false;

    return this.recordingPath;
  }

  async pauseRecording(): Promise<void> {
    await this.audioRecorderPlayer.pauseRecorder();
  }

  async resumeRecording(): Promise<void> {
    await this.audioRecorderPlayer.resumeRecorder();
  }

  async playAudio(path: string, onProgress?: (currentPosition: number) => void): Promise<void> {
    await this.audioRecorderPlayer.startPlayer(path);

    if (onProgress) {
      this.audioRecorderPlayer.addPlayBackListener((e) => {
        onProgress(e.currentPosition);
      });
    }
  }

  async stopPlaying(): Promise<void> {
    await this.audioRecorderPlayer.stopPlayer();
    this.audioRecorderPlayer.removePlayBackListener();
  }

  async deleteRecording(path: string): Promise<void> {
    const exists = await RNFS.exists(path);
    if (exists) {
      await RNFS.unlink(path);
    }
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default new AudioService();
