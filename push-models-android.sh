#!/bin/bash

# MeetNote Mobile - Android Model Push Script
# Pushes downloaded models to Android device

set -e

echo "📱 MeetNote Mobile - Android Model Transfer"
echo "==========================================="
echo ""

# Check if adb is installed
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb is not installed"
    echo "   Install Android SDK Platform Tools"
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ Error: No Android device connected"
    echo "   Connect your device and enable USB debugging"
    exit 1
fi

echo "✅ Android device detected"
echo ""

# Check if models exist
if [ ! -d "models" ]; then
    echo "❌ Error: models/ directory not found"
    echo "   Run ./download-models.sh first"
    exit 1
fi

# Get app package name
PACKAGE_NAME="com.meetnotemobile"
MODEL_DIR="/data/data/$PACKAGE_NAME/files/models"

echo "📦 Creating models directory on device..."
adb shell "mkdir -p $MODEL_DIR" 2>/dev/null || true

echo ""
echo "📤 Transferring models to device..."
echo ""

# Function to push file with progress
push_file() {
    local filename=$1
    local size=$(ls -lh "models/$filename" | awk '{print $5}')
    
    echo "⬆️  Pushing $filename ($size)..."
    adb push "models/$filename" "$MODEL_DIR/$filename"
    echo "✅ Transferred $filename"
    echo ""
}

# Check which models exist and push them
if [ -f "models/whisper-tiny.bin" ]; then
    push_file "whisper-tiny.bin"
elif [ -f "models/whisper-base.bin" ]; then
    push_file "whisper-base.bin"
elif [ -f "models/whisper-small.bin" ]; then
    push_file "whisper-small.bin"
else
    echo "⚠️  No Whisper model found"
fi

if [ -f "models/phi3-mini-q4.gguf" ]; then
    push_file "phi3-mini-q4.gguf"
elif [ -f "models/tinyllama-q4.gguf" ]; then
    push_file "tinyllama-q4.gguf"
else
    echo "⚠️  No LLM model found"
fi

echo ""
echo "✅ All models transferred successfully!"
echo ""
echo "📊 Verifying models on device:"
echo "------------------------------"
adb shell "ls -lh $MODEL_DIR/" 2>/dev/null || echo "⚠️  Could not verify (app may need to run first)"
echo ""
echo "🚀 You can now launch the app!"
echo ""
