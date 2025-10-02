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

# Vercel expects a handler function
def handler(request, response):
    """Vercel serverless function handler."""
    return app(request, response)

# For Vercel, we need to export the app
# Vercel will automatically detect this as the ASGI application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
