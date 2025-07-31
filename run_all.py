#!/usr/bin/env python3
"""
Script to run both backend and frontend simultaneously
"""

import os
import sys
import subprocess
import time
import threading
from pathlib import Path

def run_backend():
    """Run the backend in a separate thread."""
    try:
        print("🚀 Starting backend server...")
        os.chdir("backend")
        subprocess.run([sys.executable, "main.py"], check=True)
    except Exception as e:
        print(f"❌ Backend error: {e}")

def run_frontend():
    """Run the frontend after a delay."""
    try:
        # Wait for backend to start
        print("⏳ Waiting for backend to start...")
        time.sleep(5)
        
        print("🎨 Starting frontend...")
        os.chdir("../frontend")
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "app.py",
            "--server.port", "8501",
            "--server.address", "localhost"
        ], check=True)
    except Exception as e:
        print(f"❌ Frontend error: {e}")

def main():
    """Run both backend and frontend."""
    print("🧾 Receipt AI Expense Tracker - Full Stack Startup")
    print("=" * 50)
    
    # Check directories
    if not Path("backend").exists() or not Path("frontend").exists():
        print("❌ Backend or frontend directory not found!")
        print("Make sure you're running this from the project root directory.")
        return 1
    
    # Check .env file
    if not Path(".env").exists():
        print("⚠️  .env file not found!")
        print("Please create a .env file with your GOOGLE_API_KEY")
        return 1
    
    print("Starting both backend and frontend...")
    print("Backend: http://localhost:8080")
    print("Frontend: http://localhost:8501")
    print("\nPress Ctrl+C to stop both services")
    print("-" * 50)
    
    try:
        # Start backend in a separate thread
        backend_thread = threading.Thread(target=run_backend, daemon=True)
        backend_thread.start()
        
        # Start frontend in main thread
        run_frontend()
        
    except KeyboardInterrupt:
        print("\n👋 Services stopped by user")
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
