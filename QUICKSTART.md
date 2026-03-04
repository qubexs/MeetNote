# Quick Start Guide - MeetNote Mobile

## Step-by-Step Setup (15 minutes)

### 1. Install Dependencies (2 minutes)

```bash
cd meetnote-mobile
npm install

# For iOS only:
cd ios && pod install && cd ..
```

### 2. Download AI Models (5-10 minutes)

Create a `models/` directory and download:

```bash
mkdir -p models
cd models

# Download Whisper Tiny (75MB) - Fastest option
curl -L -o whisper-tiny.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin

# Download Phi-3 Mini Q4 (2.3GB) - Best quality
curl -L -o phi3-mini-q4.gguf https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

cd ..
```

**Alternative smaller model (if storage limited):**
```bash
# Download TinyLlama instead (669MB)
curl -L -o models/tinyllama-q4.gguf https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
```

### 3. Configure Native Projects

#### Android Configuration

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application ...>
        ...
    </application>
</manifest>
```

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    
    // Increase memory for model loading
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
    }
    
    defaultConfig {
        ...
        minSdkVersion 24  // Required for Bluetooth LE
    }
}
```

#### iOS Configuration

Edit `ios/MeetNoteMobile/Info.plist`:

```xml
<dict>
    ...
    
    <!-- Add these permissions -->
    <key>NSMicrophoneUsageDescription</key>
    <string>This app needs access to your microphone to record meetings</string>
    
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>This app needs Bluetooth to connect to printers</string>
    
    <key>NSBluetoothPeripheralUsageDescription</key>
    <string>This app needs Bluetooth to connect to printers</string>
    
    <key>UIFileSharingEnabled</key>
    <true/>
    <key>LSSupportsOpeningDocumentsInPlace</key>
    <true/>
</dict>
```

### 4. Install Models on Device

#### Android:

```bash
# Start app first to create directories
npm run android

# Wait for app to launch, then in another terminal:
adb shell mkdir -p /data/data/com.meetnotemobile/files/models
adb push models/whisper-tiny.bin /data/data/com.meetnotemobile/files/models/
adb push models/phi3-mini-q4.gguf /data/data/com.meetnotemobile/files/models/

# Verify files
adb shell ls -lh /data/data/com.meetnotemobile/files/models/
```

#### iOS:

1. Run the app: `npm run ios`
2. In Xcode, go to Window > Devices and Simulators
3. Select your device/simulator
4. Find "MeetNote Mobile" in the apps list
5. Drag and drop the models folder into the Documents directory

**Or use iTunes File Sharing (for physical devices):**
1. Connect iPhone to computer
2. Open iTunes/Finder
3. Select your device
4. Go to File Sharing
5. Select "MeetNote Mobile"
6. Drag models into the Documents folder

### 5. Run the App

```bash
# Android
npm run android

# iOS
npm run ios
```

### 6. Test the Setup

1. **Grant Permissions**: Allow microphone and Bluetooth when prompted
2. **Record Test**: Tap + button, record 10 seconds of speech
3. **Wait for Processing**: Should take 30 seconds - 2 minutes
4. **Check Results**: Verify transcript and summary appear

## Common Issues & Fixes

### "Model not found" error

**Solution:**
```bash
# Verify models are in correct location
adb shell ls -lh /data/data/com.meetnotemobile/files/models/

# If missing, push again:
adb push models/whisper-tiny.bin /data/data/com.meetnotemobile/files/models/whisper-tiny.bin
adb push models/phi3-mini-q4.gguf /data/data/com.meetnotemobile/files/models/phi3-mini-q4.gguf
```

### "Permission denied" errors

**Solution:**
```bash
# Reinstall app to grant permissions
npm run android -- --reset-cache
# Then grant ALL permissions when app starts
```

### Bluetooth printer not connecting

**Solution:**
1. Turn printer OFF and ON
2. Unpair from phone Bluetooth settings
3. In app, tap "Scan Again"
4. Move phone closer to printer
5. Make sure printer is in pairing mode (usually flashing blue light)

### App crashes on launch

**Solution:**
```bash
# Clear app data
adb shell pm clear com.meetnotemobile

# Clear React Native cache
npm start -- --reset-cache

# Rebuild
npm run android
```

## Performance Optimization

### Choose Models Based on Device:

**Low-end devices (< 4GB RAM):**
- Whisper: Tiny (75MB)
- LLM: TinyLlama (669MB)
- Expected: 1-2 min transcription, 10s summary

**Mid-range devices (4-6GB RAM):**
- Whisper: Base (142MB)
- LLM: Phi-3 Mini Q4 (2.3GB)
- Expected: 2-3 min transcription, 30s summary

**High-end devices (8GB+ RAM):**
- Whisper: Small (466MB)
- LLM: Phi-3 Mini Q4 (2.3GB)
- Expected: 3-5 min transcription, 30s summary

## Tips for Best Results

1. **Record in quiet environments** - reduces background noise
2. **Keep phone 30cm from speakers** - optimal audio quality
3. **Speak clearly** - helps transcription accuracy
4. **Keep meetings under 30 minutes** - faster processing
5. **Edit transcripts** before summarizing - improves summary quality

## Next Steps

- Try recording your first meeting!
- Connect a Bluetooth printer
- Explore transcript editing
- Customize summary prompts in `src/utils/prompts.ts`

## Need Help?

Check the main README.md for detailed troubleshooting and architecture information.
