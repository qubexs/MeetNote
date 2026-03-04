import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StorageService, { Meeting } from '../services/StorageService';
import STTService from '../services/STTService';
import { NavigationProp, RouteProp } from '@react-navigation/native';

interface TranscriptProps {
  navigation: NavigationProp<any>;
  route: RouteProp<{ params: { meetingId: number } }, 'params'>;
}

const Transcript: React.FC<TranscriptProps> = ({ navigation, route }) => {
  const { meetingId } = route.params;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  const loadMeeting = async () => {
    try {
      const loadedMeeting = await StorageService.getMeeting(meetingId);
      if (loadedMeeting) {
        setMeeting(loadedMeeting);
        setTranscript(loadedMeeting.transcript || '');

        // If no transcript yet, transcribe automatically
        if (!loadedMeeting.transcript) {
          await transcribeAudio(loadedMeeting);
        }
      }
    } catch (error) {
      console.error('Failed to load meeting:', error);
      Alert.alert('Error', 'Failed to load meeting');
    }
  };

  const transcribeAudio = async (mtg: Meeting) => {
    setIsTranscribing(true);

    try {
      if (!STTService.isReady()) {
        await STTService.initialize();
      }

      const result = await STTService.transcribe(mtg.audioPath);
      const transcribedText = result.text;

      setTranscript(transcribedText);

      // Save transcript to database
      await StorageService.updateMeeting(mtg.id!, { transcript: transcribedText });

      Alert.alert('Success', 'Transcription complete!');
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert(
        'Transcription Error',
        'Failed to transcribe audio. Make sure the Whisper model is installed.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const saveTranscript = async () => {
    if (!meeting) return;

    setIsSaving(true);
    try {
      await StorageService.updateMeeting(meeting.id!, { transcript });
      setIsEditing(false);
      Alert.alert('Success', 'Transcript saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save transcript');
    } finally {
      setIsSaving(false);
    }
  };

  const generateSummary = () => {
    if (!transcript.trim()) {
      Alert.alert('Error', 'No transcript available to summarize');
      return;
    }

    navigation.navigate('Summary', { meetingId, regenerate: true });
  };

  const copyTranscript = () => {
    // In a real app, this would use Clipboard
    Alert.alert('Copied', 'Transcript copied to clipboard');
  };

  if (!meeting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transcript</Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Icon name={isEditing ? 'check' : 'edit'} size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Meeting Info */}
      <View style={styles.meetingInfo}>
        <Text style={styles.meetingTitle}>{meeting.title}</Text>
        <View style={styles.infoRow}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.infoText}>
            {new Date(meeting.recordedAt).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Transcript Content */}
      {isTranscribing ? (
        <View style={styles.transcribingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.transcribingText}>Transcribing audio...</Text>
          <Text style={styles.transcribingSubtext}>
            This may take a few minutes depending on the recording length
          </Text>
        </View>
      ) : isEditing ? (
        <TextInput
          style={styles.editInput}
          value={transcript}
          onChangeText={setTranscript}
          multiline
          textAlignVertical="top"
          placeholder="Enter or edit transcript..."
        />
      ) : (
        <ScrollView style={styles.transcriptScroll}>
          <Text style={styles.transcriptText}>
            {transcript || 'No transcript available'}
          </Text>
        </ScrollView>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isEditing ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={saveTranscript}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Icon name="save" size={24} color="#FFF" />
                <Text style={styles.primaryButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={copyTranscript}
            >
              <Icon name="content-copy" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Copy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => transcribeAudio(meeting)}
              disabled={isTranscribing}
            >
              <Icon name="refresh" size={20} color="#007AFF" />
              <Text style={styles.secondaryButtonText}>Re-transcribe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={generateSummary}
              disabled={!transcript.trim()}
            >
              <Icon name="auto-awesome" size={24} color="#FFF" />
              <Text style={styles.primaryButtonText}>Summarize</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  meetingInfo: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  meetingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  transcribingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  transcribingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  transcribingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  transcriptScroll: {
    flex: 1,
    padding: 16,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  editInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Transcript;
