#!/usr/bin/env python3
"""
Test script to verify AI processing improvements
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

from ai_processor import ReceiptAIProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_receipt_image() -> Image.Image:
    """Create a simple test receipt image for testing."""
    # Create a white image
    img = Image.new('RGB', (400, 600), color='white')
    draw = ImageDraw.Draw(img)
    
    # Try to use a default font, fallback to basic if not available
    try:
        font = ImageFont.truetype("arial.ttf", 16)
        small_font = ImageFont.truetype("arial.ttf", 12)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw receipt content
    y_pos = 20
    
    # Header
    draw.text((50, y_pos), "STARBUCKS COFFEE", fill='black', font=font)
    y_pos += 30
    draw.text((50, y_pos), "123 Main Street", fill='black', font=small_font)
    y_pos += 20
    draw.text((50, y_pos), "City, State 12345", fill='black', font=small_font)
    y_pos += 40
    
    # Date and time
    draw.text((50, y_pos), "Date: 2024-01-15", fill='black', font=small_font)
    draw.text((250, y_pos), "Time: 14:30", fill='black', font=small_font)
    y_pos += 40
    
    # Items
    draw.text((50, y_pos), "Grande Latte", fill='black', font=font)
    draw.text((300, y_pos), "$4.50", fill='black', font=font)
    y_pos += 30
    
    draw.text((50, y_pos), "Blueberry Muffin", fill='black', font=font)
    draw.text((300, y_pos), "$2.25", fill='black', font=font)
    y_pos += 40
    
    # Totals
    draw.text((50, y_pos), "Subtotal:", fill='black', font=font)
    draw.text((300, y_pos), "$6.75", fill='black', font=font)
    y_pos += 25
    
    draw.text((50, y_pos), "Tax:", fill='black', font=font)
    draw.text((300, y_pos), "$0.54", fill='black', font=font)
    y_pos += 25
    
    draw.text((50, y_pos), "TOTAL:", fill='black', font=font)
    draw.text((300, y_pos), "$7.29", fill='black', font=font)
    y_pos += 40
    
    # Payment info
    draw.text((50, y_pos), "Card Payment", fill='black', font=small_font)
    y_pos += 20
    draw.text((50, y_pos), "Receipt #: 12345", fill='black', font=small_font)
    
    return img

async def test_ai_processor():
    """Test the AI processor with improvements."""
    # Load API key
    from dotenv import load_dotenv
    load_dotenv()
    
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("GOOGLE_API_KEY not found in environment variables")
        return False
    
    try:
        # Initialize processor
        logger.info("Initializing AI processor...")
        processor = ReceiptAIProcessor(api_key)
        
        # Create test image
        logger.info("Creating test receipt image...")
        test_image = create_test_receipt_image()
        
        # Test advanced processing
        logger.info("Testing advanced processing...")
        result_advanced = await processor.process_receipt(test_image, use_advanced=True)
        
        logger.info("Advanced processing result:")
        logger.info(f"  Merchant: {result_advanced.get('merchant_name')}")
        logger.info(f"  Total: ${result_advanced.get('total_amount')}")
        logger.info(f"  Date: {result_advanced.get('transaction_date')}")
        logger.info(f"  Category: {result_advanced.get('category')}")
        logger.info(f"  Confidence: {result_advanced.get('confidence')}")
        logger.info(f"  Items count: {len(result_advanced.get('items', []))}")
        
        # Test simple processing
        logger.info("\nTesting simple processing...")
        result_simple = await processor.process_receipt(test_image, use_advanced=False)
        
        logger.info("Simple processing result:")
        logger.info(f"  Merchant: {result_simple.get('merchant_name')}")
        logger.info(f"  Total: ${result_simple.get('total_amount')}")
        logger.info(f"  Date: {result_simple.get('transaction_date')}")
        logger.info(f"  Category: {result_simple.get('category')}")
        logger.info(f"  Confidence: {result_simple.get('confidence')}")
        
        # Validate results
        success = True
        
        # Check if we got reasonable results
        if result_advanced.get('confidence', 0) < 0.1:
            logger.warning("Advanced processing confidence is very low")
            success = False
        
        if result_simple.get('confidence', 0) < 0.1:
            logger.warning("Simple processing confidence is very low")
            success = False
        
        if result_advanced.get('merchant_name') == "Unknown":
            logger.warning("Could not extract merchant name")
        
        if result_advanced.get('total_amount', 0) == 0:
            logger.warning("Could not extract total amount")
        
        logger.info(f"\nTest completed. Success: {success}")
        return success
        
    except Exception as e:
        logger.error(f"Test failed with error: {e}", exc_info=True)
        return False

async def main():
    """Main test function."""
    logger.info("Starting AI processor improvement tests...")
    
    success = await test_ai_processor()
    
    if success:
        logger.info("✅ All tests passed!")
        return 0
    else:
        logger.error("❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
