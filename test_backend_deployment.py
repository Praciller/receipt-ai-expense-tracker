#!/usr/bin/env python3
"""
Test script to verify the backend deployment works correctly.
"""

import requests
import json
import os
from PIL import Image, ImageDraw, ImageFont
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_receipt():
    """Create a test receipt image for testing."""
    # Create a simple receipt image
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
    y = 20
    draw.text((50, y), "STARBUCKS COFFEE", fill='black', font=font)
    y += 30
    draw.text((50, y), "123 Main Street", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "City, State 12345", fill='black', font=small_font)
    y += 40
    draw.text((50, y), "Date: 2024-01-15", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "Time: 14:30", fill='black', font=small_font)
    y += 40
    
    # Items
    draw.text((50, y), "Grande Latte        $4.50", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "Blueberry Muffin    $2.79", fill='black', font=small_font)
    y += 40
    
    # Totals
    draw.text((50, y), "Subtotal:           $7.29", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "Tax:                $0.58", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "TOTAL:              $7.87", fill='black', font=font)
    y += 40
    
    draw.text((50, y), "Payment: Credit Card", fill='black', font=small_font)
    y += 20
    draw.text((50, y), "Thank you!", fill='black', font=small_font)
    
    return img

def test_backend(base_url):
    """Test the backend endpoints."""
    logger.info(f"Testing backend at: {base_url}")
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            logger.info("✅ Health check passed")
            logger.info(f"   Response: {response.json()}")
        else:
            logger.error(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return False
    
    # Test 2: Process receipt
    try:
        # Create test receipt
        test_image = create_test_receipt()
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        test_image.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Send request
        files = {'file': ('test_receipt.jpg', img_bytes, 'image/jpeg')}
        data = {'advanced': 'true'}
        
        response = requests.post(
            f"{base_url}/process-receipt", 
            files=files, 
            data=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Receipt processing passed")
            logger.info(f"   Merchant: {result.get('merchant_name')}")
            logger.info(f"   Total: ${result.get('total_amount')}")
            logger.info(f"   Date: {result.get('transaction_date')}")
            logger.info(f"   Category: {result.get('category')}")
            logger.info(f"   Confidence: {result.get('confidence')}")
            
            # Validate results
            if result.get('merchant_name') and result.get('total_amount') > 0:
                logger.info("✅ Receipt processing returned valid data")
                return True
            else:
                logger.warning("⚠️  Receipt processing returned incomplete data")
                return False
        else:
            logger.error(f"❌ Receipt processing failed: {response.status_code}")
            logger.error(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Receipt processing failed: {e}")
        return False

def main():
    """Main test function."""
    # Test local backend first
    local_url = "http://localhost:8080"
    logger.info("Testing local backend...")
    
    if test_backend(local_url):
        logger.info("🎉 Local backend test passed!")
    else:
        logger.error("❌ Local backend test failed!")
        return 1
    
    # Test deployed backend if URL is provided
    deployed_url = os.getenv('DEPLOYED_BACKEND_URL')
    if deployed_url:
        logger.info(f"Testing deployed backend at: {deployed_url}")
        if test_backend(deployed_url):
            logger.info("🎉 Deployed backend test passed!")
        else:
            logger.error("❌ Deployed backend test failed!")
            return 1
    else:
        logger.info("No deployed backend URL provided (set DEPLOYED_BACKEND_URL env var)")
    
    logger.info("✅ All tests completed successfully!")
    return 0

if __name__ == "__main__":
    exit(main())
