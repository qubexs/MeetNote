#!/bin/bash

# MeetNote Mobile - Model Download Script
# This script downloads the required AI models for the app

set -e

echo "🎙️ MeetNote Mobile - Model Download Script"
echo "=========================================="
echo ""

# Create models directory
mkdir -p models
cd models

echo "📦 Downloading AI models..."
echo ""

# Function to download with progress
download_with_progress() {
    local url=$1
    local filename=$2
    local description=$3
    
    echo "⬇️  Downloading $description..."
    echo "   File: $filename"
    
    if command -v wget &> /dev/null; then
        wget --progress=bar:force -O "$filename" "$url"
    elif command -v curl &> /dev/null; then
        curl -L --progress-bar -o "$filename" "$url"
    else
        echo "❌ Error: Neither wget nor curl is installed"
        exit 1
    fi
    
    echo "✅ Downloaded $filename"
    echo ""
}

# Ask user which models to download
echo "Select model size preference:"
echo ""
echo "1) Fast & Small (800MB total) - Good for low-end devices"
echo "   - Whisper Tiny (75MB)"
echo "   - TinyLlama 1.1B (669MB)"
echo ""
echo "2) Balanced (2.5GB total) - Recommended for most devices"
echo "   - Whisper Base (142MB)"
echo "   - Phi-3 Mini Q4 (2.3GB)"
echo ""
echo "3) Best Quality (2.8GB total) - For high-end devices"
echo "   - Whisper Small (466MB)"
echo "   - Phi-3 Mini Q4 (2.3GB)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "📥 Downloading FAST & SMALL models..."
        echo ""
        
        # Whisper Tiny
        download_with_progress \
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin" \
            "whisper-tiny.bin" \
            "Whisper Tiny (Speech-to-Text)"
        
        # TinyLlama
        download_with_progress \
            "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" \
            "tinyllama-q4.gguf" \
            "TinyLlama 1.1B (Summarization)"
        
        # Create symlink for LLM service
        ln -sf tinyllama-q4.gguf phi3-mini-q4.gguf
        ;;
        
    2)
        echo ""
        echo "📥 Downloading BALANCED models..."
        echo ""
        
        # Whisper Base
        download_with_progress \
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin" \
            "whisper-base.bin" \
            "Whisper Base (Speech-to-Text)"
        
        # Create symlink for STT service
        ln -sf whisper-base.bin whisper-tiny.bin
        
        # Phi-3 Mini
        download_with_progress \
            "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf" \
            "phi3-mini-q4.gguf" \
            "Phi-3 Mini Q4 (Summarization)"
        ;;
        
    3)
        echo ""
        echo "📥 Downloading BEST QUALITY models..."
        echo ""
        
        # Whisper Small
        download_with_progress \
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin" \
            "whisper-small.bin" \
            "Whisper Small (Speech-to-Text)"
        
        # Create symlink for STT service
        ln -sf whisper-small.bin whisper-tiny.bin
        
        # Phi-3 Mini
        download_with_progress \
            "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf" \
            "phi3-mini-q4.gguf" \
            "Phi-3 Mini Q4 (Summarization)"
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

cd ..

echo ""
echo "✅ All models downloaded successfully!"
echo ""
echo "📊 Model Summary:"
echo "----------------"
ls -lh models/
echo ""
echo "📱 Next Steps:"
echo ""
echo "For Android:"
echo "  1. Run: npm run android"
echo "  2. Run: adb shell mkdir -p /data/data/com.meetnotemobile/files/models"
echo "  3. Run: adb push models/* /data/data/com.meetnotemobile/files/models/"
echo ""
echo "For iOS:"
echo "  1. Run: npm run ios"
echo "  2. Use Xcode to transfer models to app Documents folder"
echo ""
echo "📖 See QUICKSTART.md for detailed instructions"
echo ""
