"""
Vercel serverless function for Receipt AI API.
"""

import json
from urllib.parse import parse_qs

def handler(request, context):
    """
    Vercel serverless function handler.
    """
    # Set CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': 'application/json'
    }

    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }

    # Get the path from the request
    path = request.url.path if hasattr(request.url, 'path') else request.get('path', '/')

    # Handle GET requests
    if request.method == 'GET':
        if path in ['/', '/api', '/health', '/api/health']:
            if 'health' in path:
                response = {
                    "status": "healthy",
                    "message": "Receipt AI API is operational on Vercel",
                    "categories": [
                        "Food", "Transportation", "Shopping", "Entertainment",
                        "Healthcare", "Utilities", "Other"
                    ]
                }
            else:
                response = {
                    "message": "Receipt AI API is running on Vercel!",
                    "version": "1.0.0",
                    "status": "operational",
                    "endpoints": ["/health", "/process-receipt"]
                }
        else:
            response = {"error": "Not found", "path": path}

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response)
        }

    # Handle POST requests
    elif request.method == 'POST':
        if path in ['/process-receipt', '/api/process-receipt']:
            # For now, return a test response
            response = {
                "message": "Receipt processing endpoint is working",
                "status": "Backend connection successful",
                "note": "AI processing implementation ready",
                "test_data": {
                    "merchant_name": "Test Store",
                    "total_amount": 25.99,
                    "transaction_date": "2024-01-15",
                    "category": "Food",
                    "confidence": 0.95
                }
            }
        else:
            response = {"error": "Endpoint not found", "path": path}

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(response)
        }

    # Method not allowed
    return {
        'statusCode': 405,
        'headers': headers,
        'body': json.dumps({"error": "Method not allowed"})
    }
