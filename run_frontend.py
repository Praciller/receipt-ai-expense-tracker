#!/usr/bin/env python3
"""
Script to run the Streamlit frontend
"""

import os
import sys
import subprocess
from pathlib import Path
import time
import requests

def check_backend():
    """Check if backend is running."""
    try:
        response = requests.get("http://localhost:8080/health", timeout=2)
        return response.status_code == 200
    except:
        return False

def main():
    """Run the frontend application."""
    print("🎨 Starting Receipt AI Frontend")
    print("=" * 40)
    
    # Check if we're in the right directory
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        print("Make sure you're running this from the project root directory.")
        return 1
    
    # Check if backend is running
    print("Checking backend status...")
    if not check_backend():
        print("⚠️  Backend is not running!")
        print("Please start the backend first:")
        print("   python run_backend.py")
        print("\nOr run both with:")
        print("   python run_all.py")
        
        # Ask if user wants to continue anyway
        try:
            response = input("\nContinue anyway? (y/N): ").strip().lower()
            if response != 'y':
                return 1
        except KeyboardInterrupt:
            print("\n👋 Cancelled by user")
            return 0
    else:
        print("✅ Backend is running")
    
    # Change to frontend directory
    os.chdir(frontend_dir)
    
    try:
        print("\nStarting Streamlit app...")
        print("Frontend will be available at: http://localhost:8501")
        print("\nPress Ctrl+C to stop the app")
        print("-" * 40)
        
        # Run Streamlit
        subprocess.run([
            sys.executable, "-m", "streamlit", "run", "app.py",
            "--server.port", "8501",
            "--server.address", "localhost"
        ], check=True)
        
    except KeyboardInterrupt:
        print("\n👋 App stopped by user")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running app: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
