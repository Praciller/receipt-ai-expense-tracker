"""
Vercel serverless function wrapper for FastAPI backend.
This file adapts the FastAPI application to run as a Vercel serverless function.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

# Create a simple test app first
app = FastAPI(title="Receipt AI API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://receipt-ai-expense-tracker.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Receipt AI API is running on Vercel!", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "Receipt AI API is operational",
        "categories": [
            "Food", "Transportation", "Shopping", "Entertainment",
            "Healthcare", "Utilities", "Other"
        ]
    }

# Try to import the full backend functionality
try:
    from main import app as backend_app
    # Copy routes from backend app
    for route in backend_app.routes:
        if hasattr(route, 'path') and route.path not in ['/', '/health']:
            app.routes.append(route)
except Exception as e:
    print(f"Warning: Could not import full backend: {e}")

    # Add a simple process-receipt endpoint as fallback
    @app.post("/process-receipt")
    async def process_receipt_fallback():
        return {
            "error": "Backend import failed",
            "message": "Full AI processing not available",
            "details": str(e)
        }
