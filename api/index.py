"""
Vercel serverless function for Receipt AI API.
Simple HTTP handler that works with Vercel's Python runtime.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

        if path == '/' or path == '/api':
            response = {
                "message": "Receipt AI API is running on Vercel!",
                "version": "1.0.0",
                "status": "operational"
            }
        elif path == '/health' or path == '/api/health':
            response = {
                "status": "healthy",
                "message": "Receipt AI API is operational",
                "categories": [
                    "Food", "Transportation", "Shopping", "Entertainment",
                    "Healthcare", "Utilities", "Other"
                ]
            }
        else:
            response = {"error": "Not found", "path": path}

        self.wfile.write(json.dumps(response).encode())

    def do_POST(self):
        """Handle POST requests."""
        parsed_path = urlparse(self.path)
        path = parsed_path.path

        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

        if path == '/process-receipt' or path == '/api/process-receipt':
            # Try to import and use the AI processor
            try:
                # Add the backend directory to Python path
                backend_dir = Path(__file__).parent.parent / "backend"
                sys.path.insert(0, str(backend_dir))

                from ai_processor import ReceiptProcessor

                # Get the uploaded file data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)

                # For now, return a success response indicating the backend is working
                response = {
                    "message": "AI processor loaded successfully",
                    "status": "Backend is operational",
                    "note": "File processing implementation in progress"
                }

            except Exception as e:
                response = {
                    "error": "AI processing not available",
                    "message": str(e),
                    "status": "Backend connection failed"
                }
        else:
            response = {"error": "Endpoint not found", "path": path}

        self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()
