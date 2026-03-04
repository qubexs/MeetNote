import {
  USBPrinter,
  NetPrinter,
  BLEPrinter,
} from 'react-native-thermal-receipt-printer';
import { Platform, PermissionsAndroid } from 'react-native';
import BleManager from 'react-native-ble-manager';

export interface PrinterDevice {
  id: string;
  name: string;
  address: string;
  type: 'bluetooth' | 'usb' | 'network';
}

export interface PrintOptions {
  fontSize?: number;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

class PrinterService {
  private connectedPrinter: PrinterDevice | null = null;
  private bleInitialized: boolean = false;

  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (permission) => permission === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          throw new Error('Bluetooth permissions denied');
        }
      }

      await BleManager.start({ showAlert: false });
      this.bleInitialized = true;
      console.log('Printer service initialized');
    } catch (error) {
      console.error('Failed to initialize printer service:', error);
      throw error;
    }
  }

  async scanForPrinters(timeout: number = 10000): Promise<PrinterDevice[]> {
    if (!this.bleInitialized) {
      await this.initialize();
    }

    try {
      // Scan for BLE devices
      await BleManager.scan([], timeout / 1000, true);

      return new Promise((resolve) => {
        setTimeout(async () => {
          const peripherals = await BleManager.getDiscoveredPeripherals();
          const printers: PrinterDevice[] = peripherals
            .filter((p) => p.name && p.name.toLowerCase().includes('printer'))
            .map((p) => ({
              id: p.id,
              name: p.name || 'Unknown Printer',
              address: p.id,
              type: 'bluetooth' as const,
            }));

          resolve(printers);
        }, timeout);
      });
    } catch (error) {
      console.error('Printer scan error:', error);
      return [];
    }
  }

  async connectToPrinter(printer: PrinterDevice): Promise<boolean> {
    try {
      if (printer.type === 'bluetooth') {
        await BLEPrinter.init();
        await BLEPrinter.connectPrinter(printer.address);
        this.connectedPrinter = printer;
        console.log('Connected to printer:', printer.name);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      return false;
    }
  }

  async disconnectPrinter(): Promise<void> {
    if (this.connectedPrinter) {
      try {
        if (this.connectedPrinter.type === 'bluetooth') {
          await BLEPrinter.closeConn();
        }
        this.connectedPrinter = null;
        console.log('Disconnected from printer');
      } catch (error) {
        console.error('Failed to disconnect from printer:', error);
      }
    }
  }

  async printMeetingSummary(
    title: string,
    summary: string,
    keyPoints: string[],
    actionItems: string[],
    date: string
  ): Promise<boolean> {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    try {
      // Build receipt content
      const content = this.buildPrintContent(title, summary, keyPoints, actionItems, date);

      if (this.connectedPrinter.type === 'bluetooth') {
        await BLEPrinter.printText(content);
        await BLEPrinter.printText('\n\n\n'); // Feed paper
        return true;
      }

      return false;
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  private buildPrintContent(
    title: string,
    summary: string,
    keyPoints: string[],
    actionItems: string[],
    date: string
  ): string {
    let content = '';

    // Header
    content += this.centerText('MEETING NOTES');
    content += this.separator();
    content += '\n';

    // Title
    content += this.boldText(title);
    content += '\n';
    content += `Date: ${date}\n`;
    content += this.separator();
    content += '\n';

    // Summary
    content += this.boldText('SUMMARY:');
    content += '\n';
    content += this.wrapText(summary);
    content += '\n\n';

    // Key Points
    if (keyPoints.length > 0) {
      content += this.boldText('KEY POINTS:');
      content += '\n';
      keyPoints.forEach((point, index) => {
        content += `${index + 1}. ${this.wrapText(point)}\n`;
      });
      content += '\n';
    }

    // Action Items
    if (actionItems.length > 0) {
      content += this.boldText('ACTION ITEMS:');
      content += '\n';
      actionItems.forEach((item, index) => {
        content += `[ ] ${this.wrapText(item)}\n`;
      });
      content += '\n';
    }

    // Footer
    content += this.separator();
    content += this.centerText('Generated by MeetNote');

    return content;
  }

  private centerText(text: string, width: number = 32): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text + '\n';
  }

  private boldText(text: string): string {
    // ESC/POS command for bold
    return `\x1B\x45\x01${text}\x1B\x45\x00`;
  }

  private separator(char: string = '-', width: number = 32): string {
    return char.repeat(width) + '\n';
  }

  private wrapText(text: string, width: number = 32): string {
    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  async printRawText(text: string): Promise<boolean> {
    if (!this.connectedPrinter) {
      throw new Error('No printer connected');
    }

    try {
      if (this.connectedPrinter.type === 'bluetooth') {
        await BLEPrinter.printText(text);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Print error:', error);
      throw error;
    }
  }

  getConnectedPrinter(): PrinterDevice | null {
    return this.connectedPrinter;
  }

  isConnected(): boolean {
    return this.connectedPrinter !== null;
  }
}

export default new PrinterService();
