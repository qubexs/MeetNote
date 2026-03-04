import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioService from '../services/AudioService';
import STTService from '../services/STTService';
import LLMService from '../services/LLMService';
import StorageService from '../services/StorageService';
import { NavigationProp } from '@react-navigation/native';

interface RecordingProps {
  navigation: NavigationProp<any>;
}

const Recording: React.FC<RecordingProps> = ({ navigation }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioPath, setAudioPath] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setDuration((prev) => prev + 100);
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const path = await AudioService.startRecording((currentPosition) => {
        setDuration(currentPosition);
      });
      setAudioPath(path);
      setIsRecording(true);
      setDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please check permissions.');
    }
  };

  const pauseRecording = async () => {
    try {
      await AudioService.pauseRecording();
      setIsPaused(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to pause recording');
    }
  };

  const resumeRecording = async () => {
    try {
      await AudioService.resumeRecording();
      setIsPaused(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to resume recording');
    }
  };

  const stopRecording = async () => {
    try {
      const path = await AudioService.stopRecording();
      setIsRecording(false);
      setAudioPath(path);
      setShowSaveDialog(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const cancelRecording = () => {
    Alert.alert(
      'Cancel Recording',
      'Are you sure you want to discard this recording?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            if (isRecording) {
              await AudioService.stopRecording();
            }
            if (audioPath) {
              await AudioService.deleteRecording(audioPath);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const processAndSave = async () => {
    if (!meetingTitle.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    setIsProcessing(true);
    setShowSaveDialog(false);

    try {
      // Step 1: Transcribe audio (AUTO-DETECTS if batch needed)
      setProcessingStatus('Transcribing audio...');
      if (!STTService.isReady()) {
        await STTService.initialize();
      }

      // Use transcribeAuto - it handles both short and long recordings
      const transcriptionResult = await STTService.transcribeAuto(audioPath, {
        onProgress: (progress) => {
          // Update status with batch progress
          setProcessingStatus(
            `Transcribing: Chunk ${progress.currentChunk}/${progress.totalChunks} ` +
            `(${Math.round(progress.overallProgress)}%) - ` +
            `ETA: ${Math.floor(progress.estimatedTimeRemaining / 60)}m ${progress.estimatedTimeRemaining % 60}s`
          );
        },
      });
      const transcript = transcriptionResult.text;

      // Step 2: Generate summary
      setProcessingStatus('Generating summary...');
      if (!LLMService.isReady()) {
        await LLMService.initialize();
      }

      const summaryResult = await LLMService.generateSummary(transcript);

      // Step 3: Save to database
      setProcessingStatus('Saving...');
      const meetingId = await StorageService.saveMeeting({
        title: meetingTitle,
        audioPath,
        transcript,
        summary: summaryResult.summary,
        keyPoints: JSON.stringify(summaryResult.keyPoints),
        actionItems: JSON.stringify(summaryResult.actionItems),
        duration,
        recordedAt: new Date().toISOString(),
      });

      setIsProcessing(false);
      
      // Navigate to summary screen
      navigation.replace('Summary', { meetingId });
    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
      Alert.alert(
        'Processing Error',
        'Failed to process the recording. The audio has been saved, but transcription/summary may be incomplete.',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Save basic meeting without transcript/summary
              const meetingId = await StorageService.saveMeeting({
                title: meetingTitle,
                audioPath,
                transcript: '',
                summary: '',
                keyPoints: '',
                actionItems: '',
                duration,
                recordedAt: new Date().toISOString(),
              });
              navigation.replace('Transcript', { meetingId });
            },
          },
        ]
      );
    }
  };

  const formatTime = (milliseconds: number): string => {
    return AudioService.formatTime(milliseconds);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={cancelRecording}>
          <Icon name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isRecording ? 'Recording' : 'Ready to Record'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Recording Indicator */}
      <View style={styles.recordingContainer}>
        <View style={[styles.recordingIndicator, isRecording && styles.recording]}>
          {isRecording && !isPaused && <View style={styles.pulse} />}
          <Icon
            name={isRecording ? 'mic' : 'mic-none'}
            size={80}
            color={isRecording ? '#FF4444' : '#999'}
          />
        </View>

        <Text style={styles.duration}>{formatTime(duration)}</Text>

        {isPaused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRecording ? (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <Icon name="fiber-manual-record" size={48} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.activeControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              <Icon
                name={isPaused ? 'play-arrow' : 'pause'}
                size={36}
                color="#007AFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={stopRecording}
            >
              <Icon name="stop" size={36} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Tips */}
      {!isRecording && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for better recording:</Text>
          <Text style={styles.tipText}>• Find a quiet location</Text>
          <Text style={styles.tipText}>• Speak clearly and at a normal pace</Text>
          <Text style={styles.tipText}>• Keep phone close to speakers</Text>
        </View>
      )}

      {/* Save Dialog */}
      <Modal
        visible={showSaveDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Meeting</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Enter meeting title"
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowSaveDialog(false);
                  cancelRecording();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={processAndSave}
              >
                <Text style={styles.saveButtonText}>Save & Process</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Dialog */}
      <Modal visible={isProcessing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.processingModal}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.processingText}>{processingStatus}</Text>
            <Text style={styles.processingSubtext}>
              This may take a few moments...
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  recordingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicator: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  recording: {
    backgroundColor: '#FFE5E5',
  },
  pulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF4444',
    opacity: 0.3,
  },
  duration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 32,
    fontVariant: ['tabular-nums'],
  },
  pausedBadge: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  pausedText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  controls: {
    padding: 32,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 24,
  },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  stopButton: {
    backgroundColor: '#FF4444',
  },
  tipsContainer: {
    padding: 24,
    backgroundColor: '#F8F8F8',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  processingModal: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  processingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default Recording;
