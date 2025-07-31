#!/usr/bin/env python3
"""
Script to run the FastAPI backend server
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Run the backend server."""
    print("🚀 Starting Receipt AI Backend Server")
    print("=" * 40)
    
    # Check if we're in the right directory
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        print("Make sure you're running this from the project root directory.")
        return 1
    
    # Check if .env file exists
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found!")
        print("Please create a .env file with your GOOGLE_API_KEY")
        return 1
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    try:
        print("Starting FastAPI server...")
        print("Backend will be available at: http://localhost:8080")
        print("API docs will be available at: http://localhost:8080/docs")
        print("\nPress Ctrl+C to stop the server")
        print("-" * 40)
        
        # Run the server
        subprocess.run([
            sys.executable, "main.py"
        ], check=True)
        
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running server: {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
