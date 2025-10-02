"""
Vercel serverless function wrapper for FastAPI backend.
This file adapts the FastAPI application to run as a Vercel serverless function.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import the FastAPI app from backend
from main import app

# Export the app for Vercel
# Vercel will automatically detect this as the ASGI application
# The variable name must be 'app' for Vercel to recognize it
__all__ = ["app"]
