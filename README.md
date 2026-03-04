# MeetNote Mobile 🎙️

A React Native mobile app for recording meetings with **local AI** processing - speech-to-text using Whisper and summarization using Llama.cpp (Phi-3). Supports direct printing to Bluetooth thermal printers.

## Features ✨

- 🎤 **Audio Recording** - Record meetings with pause/resume
- 🗣️ **Local Speech-to-Text** - Whisper.cpp running on-device
- 🤖 **Local AI Summarization** - Phi-3 mini model for summaries
- 📝 **Edit Transcripts** - Review and edit transcriptions
- 💾 **SQLite Storage** - All data stored locally
- 🖨️ **Bluetooth Printing** - Print summaries directly to thermal printers
- 📊 **Meeting Statistics** - Track your meeting time and history

## Tech Stack 🛠️

- **React Native 0.73** - Cross-platform mobile framework
- **Whisper.rn** - Local speech-to-text (Whisper.cpp bindings)
- **react-native-llama** - Local LLM inference (Llama.cpp bindings)
- **SQLite** - Local database storage
- **Bluetooth Thermal Printer** - ESC/POS receipt printing

## Prerequisites 📋

- Node.js 18+
- React Native development environment set up
- Android Studio (for Android) or Xcode (for iOS)
- At least 4GB free storage for AI models

## Installation 🚀

### 1. Clone and Install Dependencies

```bash
cd meetnote-mobile
npm install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Download AI Models

You need to download two models and place them in the app:

#### Whisper Model (Speech-to-Text)
Download one of these models:

- **Whisper Tiny** (75MB, fastest, decent accuracy)
  - https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin
  
- **Whisper Base** (142MB, balanced)
  - https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin

- **Whisper Small** (466MB, better accuracy)
  - https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin

#### LLM Model (Summarization)
Download one of these models:

- **Phi-3 Mini 4K Q4** (2.3GB, recommended)
  - https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

- **TinyLlama 1.1B Q4** (669MB, smaller/faster)
  - https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf

#### Place Models in App

**Android:**
```bash
# Create models directory
adb shell mkdir -p /data/data/com.meetnotemobile/files/models

# Push models
adb push ggml-tiny.bin /data/data/com.meetnotemobile/files/models/whisper-tiny.bin
adb push Phi-3-mini-4k-instruct-q4.gguf /data/data/com.meetnotemobile/files/models/phi3-mini-q4.gguf
```

**iOS:**
Place models in the app's Documents directory via Xcode or iTunes file sharing.

### 4. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 5. iOS Permissions

Add to `ios/MeetNoteMobile/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to your microphone to record meetings</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to printers</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth to connect to printers</string>
```

## Running the App 🏃

### Android
```bash
npm run android
```

### iOS
```bash
npm run ios
```

## Usage Guide 📱

### Recording a Meeting

1. **Start Recording**
   - Tap the **+** button on the home screen
   - Grant microphone permissions if prompted
   - Tap the red record button to start
   - The timer shows recording duration

2. **During Recording**
   - Tap **Pause** to pause recording
   - Tap **Play** to resume
   - Tap **Stop** when done

3. **Save & Process**
   - Enter a meeting title
   - Tap "Save & Process"
   - App will:
     - Transcribe audio using Whisper (may take 1-5 minutes)
     - Generate summary using Phi-3 (~30 seconds)
     - Save everything to local database

### Viewing Transcripts

- Tap a meeting from the home screen
- View the full transcript
- Edit transcript if needed (tap edit icon)
- Regenerate transcript (tap refresh)
- Copy transcript to clipboard

### Viewing Summaries

After processing, you'll see:
- **Summary** - AI-generated overview
- **Key Points** - Main discussion points
- **Action Items** - Tasks identified from meeting

Actions:
- **View Transcript** - See full text
- **Regenerate** - Create new summary
- **Print** - Send to Bluetooth printer
- **Share** - Export via native share

### Printing to Bluetooth Printer

1. **Connect Printer**
   - Tap **Print** button
   - Tap **Scan** to find printers
   - Select your printer from the list
   - Wait for connection confirmation

2. **Print**
   - Once connected, tap **Print** again
   - Summary will print to thermal printer
   - Prints include: title, date, summary, key points, action items

**Supported Printers:**
- Most ESC/POS thermal printers (58mm/80mm)
- Common brands: GOOJPRT, iMin, MUNBYN, Rongta

## Model Performance ⚡

### Whisper Models
| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| Tiny | 75MB | Fast (~1min/10min audio) | Good |
| Base | 142MB | Medium (~2min/10min) | Better |
| Small | 466MB | Slower (~4min/10min) | Best |

### LLM Models
| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| TinyLlama | 669MB | Fast (~10s) | Basic |
| Phi-3 Mini | 2.3GB | Medium (~30s) | Excellent |

**Note:** Times are approximate and vary by device.

## Troubleshooting 🔧

### Models Not Loading
- Ensure models are in correct directory: `/data/data/com.meetnotemobile/files/models/`
- Check file names match exactly: `whisper-tiny.bin` and `phi3-mini-q4.gguf`
- Verify models downloaded completely (check file sizes)

### Transcription Errors
- Make sure audio quality is good (quiet environment)
- Try Base or Small model for better accuracy
- Check that Whisper model file is not corrupted

### Bluetooth Printer Not Found
- Ensure printer is turned on and in pairing mode
- Check Bluetooth is enabled on phone
- Grant all Bluetooth permissions
- Try moving closer to printer

### App Crashes
- Check available storage (need ~5GB free)
- Clear app data and reinstall models
- Check device logs: `adb logcat | grep ReactNative`

## Architecture 🏗️

```
meetnote-mobile/
├── src/
│   ├── services/
│   │   ├── AudioService.ts      # Recording/playback
│   │   ├── STTService.ts        # Whisper integration
│   │   ├── LLMService.ts        # Phi-3 integration
│   │   ├── StorageService.ts    # SQLite database
│   │   └── PrinterService.ts    # Bluetooth printer
│   ├── screens/
│   │   ├── Home.tsx             # Meeting list
│   │   ├── Recording.tsx        # Record screen
│   │   ├── Transcript.tsx       # View/edit transcript
│   │   └── Summary.tsx          # View/print summary
│   ├── components/              # Reusable UI components
│   └── utils/
│       └── prompts.ts           # LLM prompt templates
```

## Performance Tips 💡

1. **Use Tiny Whisper** for faster transcription (still 95%+ accurate for English)
2. **Close other apps** during transcription/summarization
3. **Keep meetings under 30 minutes** for best processing speed
4. **Edit transcripts** before summarizing to improve quality
5. **Regenerate summaries** if first attempt isn't satisfactory

## Offline Usage 📴

✅ **Everything works offline:**
- Recording audio
- Speech-to-text transcription
- AI summarization
- Bluetooth printing
- All data storage

⚠️ **Requires one-time setup:**
- Download models once (requires internet)
- After that, fully offline capable

## Future Enhancements 🚀

- [ ] Real-time transcription during recording
- [ ] Multi-language support
- [ ] Speaker diarization (who said what)
- [ ] Cloud sync (optional)
- [ ] Custom summary templates
- [ ] Export to PDF/DOCX
- [ ] Meeting search by content

## License 📄

MIT License - Feel free to use in your own projects!

## Credits 🙏

- Whisper.cpp by Georgi Gerganov
- Llama.cpp by Georgi Gerganov
- Phi-3 model by Microsoft
- React Native community

## Support 💬

For issues or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Refer to troubleshooting section above

---

**Built with ❤️ for productivity and privacy**
