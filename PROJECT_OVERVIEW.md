# MeetNote Mobile - Project Overview

## 🎯 Project Summary

MeetNote Mobile is a **fully offline** React Native app that records meetings, transcribes them using local AI (Whisper), generates summaries using local LLM (Phi-3), and can print directly to Bluetooth thermal printers. All processing happens on-device - no internet required after initial setup.

## 🏗️ Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────┐
│         React Native App (0.73)         │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │        Service Layer             │  │
│  │                                  │  │
│  │  • AudioService                  │  │
│  │    - Record/Pause/Stop           │  │
│  │    - WAV format @ 16kHz          │  │
│  │                                  │  │
│  │  • STTService (Whisper.cpp)      │  │
│  │    - Local speech-to-text        │  │
│  │    - Multiple model sizes        │  │
│  │                                  │  │
│  │  • LLMService (Llama.cpp)        │  │
│  │    - Local summarization         │  │
│  │    - Phi-3 / TinyLlama           │  │
│  │                                  │  │
│  │  • StorageService (SQLite)       │  │
│  │    - Meeting database            │  │
│  │    - Full-text search            │  │
│  │                                  │  │
│  │  • PrinterService                │  │
│  │    - Bluetooth ESC/POS           │  │
│  │    - Thermal receipt printers    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │          UI Screens              │  │
│  │                                  │  │
│  │  Home → Recording → Transcript   │  │
│  │             ↓                    │  │
│  │          Summary                 │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Data Flow

```
1. Recording Phase:
   User → Recording Screen → AudioService → WAV file saved

2. Processing Phase:
   WAV file → STTService (Whisper) → Transcript text
   Transcript → LLMService (Phi-3) → Summary + Key Points + Action Items
   All data → StorageService (SQLite)

3. Viewing Phase:
   SQLite → Meeting list/details → UI screens

4. Printing Phase:
   Summary → PrinterService → Bluetooth → Thermal Printer
```

## 📁 Project Structure

```
meetnote-mobile/
├── src/
│   ├── services/              # Core business logic
│   │   ├── AudioService.ts    # 🎤 Audio recording
│   │   ├── STTService.ts      # 🗣️ Whisper integration
│   │   ├── LLMService.ts      # 🤖 LLM summarization
│   │   ├── StorageService.ts  # 💾 SQLite database
│   │   └── PrinterService.ts  # 🖨️ Bluetooth printer
│   │
│   ├── screens/               # UI screens
│   │   ├── Home.tsx           # Meeting list + stats
│   │   ├── Recording.tsx      # Record meetings
│   │   ├── Transcript.tsx     # View/edit transcripts
│   │   └── Summary.tsx        # View/print summaries
│   │
│   ├── components/            # Reusable UI components
│   │
│   └── utils/
│       └── prompts.ts         # LLM prompt templates
│
├── models/                    # AI models (downloaded)
│   ├── whisper-tiny.bin       # 75MB - Speech-to-text
│   └── phi3-mini-q4.gguf      # 2.3GB - Summarization
│
├── android/                   # Android native config
├── ios/                       # iOS native config
│
├── App.tsx                    # App entry point
├── package.json               # Dependencies
│
└── Documentation:
    ├── README.md              # Full documentation
    ├── QUICKSTART.md          # Quick setup guide
    ├── download-models.sh     # Model download script
    └── push-models-android.sh # Android deployment script
```

## 🔧 Key Features Breakdown

### 1. Audio Recording (AudioService.ts)
- **Format**: WAV, 16kHz, mono
- **Features**: Record, pause, resume, stop
- **Permissions**: Auto-requests microphone access
- **Storage**: Local filesystem with timestamps

### 2. Speech-to-Text (STTService.ts)
- **Engine**: Whisper.cpp (local inference)
- **Models**: Tiny (75MB), Base (142MB), Small (466MB)
- **Features**: Timestamped segments, language detection
- **Performance**: ~1-5 minutes for 10-minute recording

### 3. AI Summarization (LLMService.ts)
- **Engine**: Llama.cpp (local inference)
- **Models**: Phi-3 Mini (2.3GB), TinyLlama (669MB)
- **Output**: Summary, key points, action items
- **Performance**: ~30 seconds per summary

### 4. Database (StorageService.ts)
- **Engine**: SQLite (react-native-sqlite-storage)
- **Schema**: Meetings table with full-text search
- **Features**: CRUD operations, date filtering, statistics

### 5. Bluetooth Printing (PrinterService.ts)
- **Protocol**: ESC/POS thermal printer commands
- **Features**: Device scanning, connection, formatted receipts
- **Output**: Title, date, summary, key points, action items

## 📊 Performance Characteristics

### Model Processing Times (on mid-range device)

| Operation | Model | Time | Notes |
|-----------|-------|------|-------|
| Transcription (10 min audio) | Whisper Tiny | ~1 min | Fast, 95% accurate |
| Transcription (10 min audio) | Whisper Base | ~2 min | Better accuracy |
| Transcription (10 min audio) | Whisper Small | ~4 min | Best accuracy |
| Summary generation | Phi-3 Mini | ~30s | Excellent quality |
| Summary generation | TinyLlama | ~10s | Good for quick summaries |

### Storage Requirements

| Component | Size | Notes |
|-----------|------|-------|
| Whisper Tiny | 75 MB | Minimum viable |
| Whisper Base | 142 MB | Recommended |
| Whisper Small | 466 MB | High accuracy |
| Phi-3 Mini Q4 | 2.3 GB | Best quality |
| TinyLlama Q4 | 669 MB | Fast option |
| 1 hour recording | ~20 MB | WAV format |
| Database | < 100 MB | For 1000 meetings |

## 🔐 Privacy & Security

✅ **100% Local Processing**
- No data sent to cloud
- No internet required (after setup)
- All AI runs on-device

✅ **Data Storage**
- SQLite database on device
- File system for audio
- No external sync

✅ **Permissions Required**
- Microphone (for recording)
- Bluetooth (for printing)
- Storage (for files)

## 🚀 Deployment Considerations

### Device Requirements

**Minimum:**
- Android 7.0 (API 24) / iOS 13.0
- 2 GB RAM
- 3 GB free storage
- Dual-core processor

**Recommended:**
- Android 10+ / iOS 14+
- 4 GB+ RAM
- 5 GB+ free storage
- Quad-core processor

### Battery Impact

- **Recording**: Low impact (~5% per hour)
- **Transcription**: High impact (~20% per 10 min audio)
- **Summarization**: Medium impact (~5% per summary)
- **Recommendation**: Plug in during processing

### Network Usage

- **Initial setup**: ~3 GB (model downloads)
- **Runtime**: 0 bytes (fully offline)

## 🛠️ Development Guide

### Adding New Features

1. **New Prompt Templates** → Edit `src/utils/prompts.ts`
2. **Custom Summaries** → Modify `LLMService.generateSummary()`
3. **Additional Storage** → Extend `StorageService` schema
4. **UI Customization** → Edit screen components in `src/screens/`

### Testing Strategy

1. **Unit Tests**: Service layer functions
2. **Integration Tests**: End-to-end workflows
3. **Device Testing**: Multiple Android/iOS versions
4. **Performance Tests**: Large audio files

### Debugging Tips

```bash
# View logs
adb logcat | grep ReactNative

# Check model files
adb shell ls -lh /data/data/com.meetnotemobile/files/models/

# Clear app data
adb shell pm clear com.meetnotemobile

# Monitor memory
adb shell dumpsys meminfo com.meetnotemobile
```

## 📈 Scalability

### Current Limitations

- Single meeting processing at a time
- 2-hour maximum recording length (memory)
- Models fixed at initialization

### Future Enhancements

1. **Background Processing**: Process while app backgrounded
2. **Model Switching**: Change models without restart
3. **Batch Processing**: Queue multiple recordings
4. **Cloud Sync**: Optional backup/sync
5. **Real-time Transcription**: Live transcription during recording

## 🤝 Contributing

Key areas for contribution:
- Additional LLM prompt templates
- UI/UX improvements
- Performance optimizations
- Additional export formats (PDF, DOCX)
- Multi-language support

## 📚 References

### Libraries Used

- **whisper.rn**: React Native Whisper.cpp bindings
- **react-native-llama**: React Native Llama.cpp bindings
- **react-native-audio-recorder-player**: Audio recording
- **react-native-sqlite-storage**: Local database
- **react-native-thermal-receipt-printer**: Bluetooth printing

### AI Models

- **Whisper**: OpenAI's speech recognition model
- **Phi-3 Mini**: Microsoft's small language model
- **TinyLlama**: Open-source 1.1B parameter model

### Documentation

- Whisper.cpp: https://github.com/ggerganov/whisper.cpp
- Llama.cpp: https://github.com/ggerganov/llama.cpp
- React Native: https://reactnative.dev

---

**Built with ❤️ for productivity, privacy, and offline capability**
