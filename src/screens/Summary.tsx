import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import StorageService, { Meeting } from '../services/StorageService';
import LLMService from '../services/LLMService';
import PrinterService, { PrinterDevice } from '../services/PrinterService';
import { NavigationProp, RouteProp } from '@react-navigation/native';

interface SummaryProps {
  navigation: NavigationProp<any>;
  route: RouteProp<{ params: { meetingId: number; regenerate?: boolean } }, 'params'>;
}

const Summary: React.FC<SummaryProps> = ({ navigation, route }) => {
  const { meetingId, regenerate } = route.params;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);

  useEffect(() => {
    loadMeeting();
  }, [meetingId]);

  useEffect(() => {
    if (regenerate && meeting && meeting.transcript) {
      generateSummary();
    }
  }, [meeting, regenerate]);

  const loadMeeting = async () => {
    try {
      const loadedMeeting = await StorageService.getMeeting(meetingId);
      if (loadedMeeting) {
        setMeeting(loadedMeeting);
        
        if (loadedMeeting.keyPoints) {
          try {
            setKeyPoints(JSON.parse(loadedMeeting.keyPoints));
          } catch (e) {
            setKeyPoints([]);
          }
        }
        
        if (loadedMeeting.actionItems) {
          try {
            setActionItems(JSON.parse(loadedMeeting.actionItems));
          } catch (e) {
            setActionItems([]);
          }
        }

        // Check if summary exists, if not generate it
        if (!loadedMeeting.summary && loadedMeeting.transcript) {
          generateSummary();
        }
      }
    } catch (error) {
      console.error('Failed to load meeting:', error);
      Alert.alert('Error', 'Failed to load meeting');
    }
  };

  const generateSummary = async () => {
    if (!meeting || !meeting.transcript) {
      Alert.alert('Error', 'No transcript available to summarize');
      return;
    }

    setIsGenerating(true);
    try {
      if (!LLMService.isReady()) {
        await LLMService.initialize();
      }

      const result = await LLMService.generateSummary(meeting.transcript);

      await StorageService.updateMeeting(meeting.id!, {
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        actionItems: JSON.stringify(result.actionItems),
      });

      setMeeting({
        ...meeting,
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        actionItems: JSON.stringify(result.actionItems),
      });
      setKeyPoints(result.keyPoints);
      setActionItems(result.actionItems);

      Alert.alert('Success', 'Summary generated!');
    } catch (error) {
      console.error('Summary generation error:', error);
      Alert.alert(
        'Error',
        'Failed to generate summary. Make sure the LLM model is installed.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const scanForPrinters = async () => {
    setIsScanning(true);
    try {
      await PrinterService.initialize();
      const foundPrinters = await PrinterService.scanForPrinters(10000);
      setPrinters(foundPrinters);
      
      if (foundPrinters.length === 0) {
        Alert.alert('No Printers Found', 'Make sure your Bluetooth printer is turned on and nearby');
      }
    } catch (error) {
      console.error('Printer scan error:', error);
      Alert.alert('Error', 'Failed to scan for printers');
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (printer: PrinterDevice) => {
    try {
      const connected = await PrinterService.connectToPrinter(printer);
      if (connected) {
        setConnectedPrinter(printer);
        Alert.alert('Success', `Connected to ${printer.name}`);
        setShowPrinterModal(false);
      } else {
        Alert.alert('Error', 'Failed to connect to printer');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to printer');
    }
  };

  const printSummary = async () => {
    if (!meeting) return;

    if (!connectedPrinter) {
      setShowPrinterModal(true);
      await scanForPrinters();
      return;
    }

    setIsPrinting(true);
    try {
      const dateStr = format(new Date(meeting.recordedAt), 'MMM d, yyyy h:mm a');
      
      await PrinterService.printMeetingSummary(
        meeting.title,
        meeting.summary || 'No summary available',
        keyPoints,
        actionItems,
        dateStr
      );

      Alert.alert('Success', 'Printed successfully!');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print. Make sure the printer is still connected.');
    } finally {
      setIsPrinting(false);
    }
  };

  const shareSummary = () => {
    // In a real app, this would use Share API
    Alert.alert('Share', 'Share functionality would open native share sheet');
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
        <Text style={styles.headerTitle}>Summary</Text>
        <TouchableOpacity onPress={shareSummary}>
          <Icon name="share" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Meeting Info */}
        <View style={styles.meetingInfo}>
          <Text style={styles.meetingTitle}>{meeting.title}</Text>
          <Text style={styles.meetingDate}>
            {format(new Date(meeting.recordedAt), 'MMMM d, yyyy • h:mm a')}
          </Text>
        </View>

        {isGenerating ? (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.generatingText}>Generating summary...</Text>
          </View>
        ) : (
          <>
            {/* Summary */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="description" size={24} color="#007AFF" />
                <Text style={styles.sectionTitle}>Summary</Text>
              </View>
              <Text style={styles.summaryText}>
                {meeting.summary || 'No summary available'}
              </Text>
            </View>

            {/* Key Points */}
            {keyPoints.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="lightbulb" size={24} color="#FFA500" />
                  <Text style={styles.sectionTitle}>Key Points</Text>
                </View>
                {keyPoints.map((point, index) => (
                  <View key={index} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Items */}
            {actionItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="check-circle" size={24} color="#4CAF50" />
                  <Text style={styles.sectionTitle}>Action Items</Text>
                </View>
                {actionItems.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.actionItem}>
                    <Icon name="check-box-outline-blank" size={24} color="#999" />
                    <Text style={styles.listText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('Transcript', { meetingId })}
        >
          <Icon name="article" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>View Transcript</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={generateSummary}
          disabled={isGenerating}
        >
          <Icon name="refresh" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Regenerate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.printButton]}
          onPress={printSummary}
          disabled={isPrinting}
        >
          {isPrinting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon name="print" size={24} color="#FFF" />
              <Text style={styles.printButtonText}>Print</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Printer Selection Modal */}
      <Modal
        visible={showPrinterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrinterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.printerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Printer</Text>
              <TouchableOpacity onPress={() => setShowPrinterModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isScanning ? (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.scanningText}>Scanning for printers...</Text>
              </View>
            ) : printers.length > 0 ? (
              <FlatList
                data={printers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.printerItem}
                    onPress={() => connectToPrinter(item)}
                  >
                    <Icon name="print" size={32} color="#007AFF" />
                    <View style={styles.printerInfo}>
                      <Text style={styles.printerName}>{item.name}</Text>
                      <Text style={styles.printerAddress}>{item.address}</Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#CCC" />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.noPrintersContainer}>
                <Icon name="print-disabled" size={64} color="#CCC" />
                <Text style={styles.noPrintersText}>No printers found</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.scanButton}
              onPress={scanForPrinters}
              disabled={isScanning}
            >
              <Icon name="refresh" size={20} color="#FFF" />
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Scanning...' : 'Scan Again'}
              </Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  meetingInfo: {
    padding: 20,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  meetingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  meetingDate: {
    fontSize: 14,
    color: '#666',
  },
  generatingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  generatingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    marginTop: 9,
    marginRight: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
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
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  printButton: {
    flex: 1.5,
    backgroundColor: '#007AFF',
  },
  printButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  printerModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scanningContainer: {
    padding: 48,
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  printerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  printerInfo: {
    flex: 1,
  },
  printerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  printerAddress: {
    fontSize: 14,
    color: '#666',
  },
  noPrintersContainer: {
    padding: 48,
    alignItems: 'center',
  },
  noPrintersText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Summary;
