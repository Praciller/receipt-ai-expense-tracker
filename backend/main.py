import os
import logging
from typing import Dict, Any
from io import BytesIO
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import uvicorn

# Import our AI processor
from ai_processor import ReceiptAIProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure Google AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is required")

# Initialize AI processor
ai_processor = ReceiptAIProcessor(GOOGLE_API_KEY)

# Initialize FastAPI app
app = FastAPI(
    title="Receipt AI Expense Tracker",
    description="AI-powered receipt scanning and expense categorization API",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Receipt AI Expense Tracker API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "categories": ai_processor.get_category_list()}

@app.post("/process-receipt")
async def process_receipt(
    file: UploadFile = File(...),
    advanced: bool = Query(True, description="Use advanced processing mode")
):
    """Process uploaded receipt image and extract expense information."""

    # Validate file size (max 10MB)
    max_file_size = 10 * 1024 * 1024  # 10MB

    # Validate file type - check both content type and file extension
    valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    file_extension = Path(file.filename).suffix.lower() if file.filename else ""

    content_type_valid = file.content_type and file.content_type.startswith("image/")
    extension_valid = file_extension in valid_extensions

    if not (content_type_valid or extension_valid):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPG, PNG, GIF, BMP, or WebP)"
        )

    try:
        # Read and validate image data
        image_data = await file.read()

        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")

        if len(image_data) > max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {max_file_size // (1024*1024)}MB"
            )

        logger.info(f"Processing receipt: {file.filename}, size: {len(image_data)} bytes")

        # Open and validate image
        try:
            image = Image.open(BytesIO(image_data))
            image.verify()  # Verify it's a valid image

            # Reopen for processing (verify() closes the image)
            image = Image.open(BytesIO(image_data))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")
            logger.info(f"Converted image from {image.mode} to RGB")

        # Process with AI
        logger.info(f"Starting AI processing with advanced={advanced}")
        result = await ai_processor.process_receipt(image, use_advanced=advanced)

        # Add processing metadata
        result["processing_metadata"] = {
            "filename": file.filename,
            "file_size": len(image_data),
            "image_dimensions": list(image.size),
            "processing_mode": "advanced" if advanced else "simple",
            "processed_at": datetime.now().isoformat()
        }

        logger.info(f"Successfully processed receipt with confidence: {result.get('confidence', 0)}")
        return JSONResponse(content=result)

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing file {file.filename}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the receipt. Please try again."
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )
