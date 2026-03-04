import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import StorageService, { Meeting } from '../services/StorageService';
import AudioService from '../services/AudioService';
import { NavigationProp, useFocusEffect } from '@react-navigation/native';

interface HomeProps {
  navigation: NavigationProp<any>;
}

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalDuration: 0,
    averageDuration: 0,
  });

  useFocusEffect(
    useCallback(() => {
      loadMeetings();
      loadStats();
    }, [])
  );

  const loadMeetings = async () => {
    try {
      const allMeetings = await StorageService.getAllMeetings();
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Failed to load meetings:', error);
      Alert.alert('Error', 'Failed to load meetings');
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await StorageService.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeetings();
    await loadStats();
    setRefreshing(false);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const results = await StorageService.searchMeetings(searchQuery);
        setMeetings(results);
      } catch (error) {
        Alert.alert('Error', 'Search failed');
      }
    } else {
      loadMeetings();
    }
  };

  const handleDeleteMeeting = async (meeting: Meeting) => {
    Alert.alert(
      'Delete Meeting',
      `Are you sure you want to delete "${meeting.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.deleteMeeting(meeting.id!);
              await AudioService.deleteRecording(meeting.audioPath);
              loadMeetings();
              loadStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meeting');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (milliseconds: number): string => {
    return AudioService.formatTime(milliseconds);
  };

  const renderMeetingItem = ({ item }: { item: Meeting }) => (
    <TouchableOpacity
      style={styles.meetingCard}
      onPress={() => navigation.navigate('Summary', { meetingId: item.id })}
    >
      <View style={styles.meetingHeader}>
        <View style={styles.meetingInfo}>
          <Text style={styles.meetingTitle}>{item.title}</Text>
          <Text style={styles.meetingDate}>
            {format(new Date(item.recordedAt), 'MMM d, yyyy • h:mm a')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteMeeting(item)}
        >
          <Icon name="delete" size={24} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.meetingDetails}>
        <View style={styles.detailItem}>
          <Icon name="timer" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDuration(item.duration)}</Text>
        </View>
        {item.transcript && (
          <View style={styles.detailItem}>
            <Icon name="description" size={16} color="#666" />
            <Text style={styles.detailText}>Transcribed</Text>
          </View>
        )}
        {item.summary && (
          <View style={styles.detailItem}>
            <Icon name="auto-awesome" size={16} color="#666" />
            <Text style={styles.detailText}>Summarized</Text>
          </View>
        )}
      </View>

      {item.summary && (
        <Text style={styles.summaryPreview} numberOfLines={2}>
          {item.summary}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalMeetings}</Text>
          <Text style={styles.statLabel}>Meetings</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(stats.totalDuration)}
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(stats.averageDuration)}
          </Text>
          <Text style={styles.statLabel}>Avg Length</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search meetings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              loadMeetings();
            }}
          >
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Meetings List */}
      <FlatList
        data={meetings}
        renderItem={renderMeetingItem}
        keyExtractor={(item) => item.id!.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="mic-none" size={80} color="#CCC" />
            <Text style={styles.emptyText}>No meetings yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to start recording
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Record Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Recording')}
      >
        <Icon name="add" size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  meetingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  meetingDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  meetingDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  summaryPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default Home;
