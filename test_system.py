#!/usr/bin/env python3
"""
Test script for Receipt AI Expense Tracker
Tests the backend API with sample images from the SROIE dataset
"""

import os
import sys
import json
import time
import requests
from pathlib import Path
from PIL import Image
import random

# Configuration
BACKEND_URL = "http://localhost:8080"
DATASET_PATH = "dataset/test/img"
MAX_TEST_IMAGES = 5  # Limit for testing

def check_backend():
    """Check if backend is running."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            data = response.json()
            print(f"   Categories: {data.get('categories', [])}")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

def test_single_image(image_path, advanced=True):
    """Test processing a single image."""
    print(f"\n🔍 Testing: {os.path.basename(image_path)}")
    
    try:
        # Open and validate image
        with Image.open(image_path) as img:
            print(f"   Image size: {img.size}")
            print(f"   Image mode: {img.mode}")
        
        # Send to API
        with open(image_path, 'rb') as f:
            files = {"file": f}
            params = {"advanced": advanced}
            
            start_time = time.time()
            response = requests.post(
                f"{BACKEND_URL}/process-receipt",
                files=files,
                params=params,
                timeout=60
            )
            processing_time = time.time() - start_time
        
        print(f"   Processing time: {processing_time:.2f}s")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Processing successful")
            
            # Validate required fields
            required_fields = ["merchant_name", "transaction_date", "total_amount", "category", "confidence"]
            missing_fields = [field for field in required_fields if field not in result]
            
            if missing_fields:
                print(f"⚠️  Missing fields: {missing_fields}")
            else:
                print("✅ All required fields present")
            
            # Display key results
            print(f"   Merchant: {result.get('merchant_name', 'N/A')}")
            print(f"   Date: {result.get('transaction_date', 'N/A')}")
            print(f"   Amount: {result.get('currency', 'USD')} {result.get('total_amount', 0)}")
            print(f"   Category: {result.get('category', 'N/A')}")
            print(f"   Confidence: {result.get('confidence', 0):.2%}")
            
            if result.get('items'):
                print(f"   Items extracted: {len(result['items'])}")
            
            return True, result
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False, None

def validate_json_schema(result):
    """Validate the JSON schema of the result."""
    required_fields = {
        "merchant_name": str,
        "transaction_date": str,
        "total_amount": (int, float),
        "category": str,
        "confidence": (int, float)
    }
    
    issues = []
    
    for field, expected_type in required_fields.items():
        if field not in result:
            issues.append(f"Missing field: {field}")
        elif not isinstance(result[field], expected_type):
            issues.append(f"Wrong type for {field}: expected {expected_type}, got {type(result[field])}")
    
    # Validate confidence range
    if "confidence" in result:
        confidence = result["confidence"]
        if not (0 <= confidence <= 1):
            issues.append(f"Confidence out of range: {confidence} (should be 0-1)")
    
    # Validate date format
    if "transaction_date" in result:
        date_str = result["transaction_date"]
        try:
            from datetime import datetime
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            issues.append(f"Invalid date format: {date_str} (should be YYYY-MM-DD)")
    
    return issues

def run_comprehensive_test():
    """Run comprehensive testing with multiple images."""
    print("🧪 Starting comprehensive test suite")
    print("=" * 50)
    
    # Check backend
    if not check_backend():
        print("\n❌ Backend check failed. Please start the backend first:")
        print("   cd backend && python main.py")
        return False
    
    # Get test images
    image_dir = Path(DATASET_PATH)
    if not image_dir.exists():
        print(f"❌ Dataset directory not found: {DATASET_PATH}")
        return False
    
    image_files = list(image_dir.glob("*.jpg"))[:MAX_TEST_IMAGES]
    
    if not image_files:
        print(f"❌ No images found in {DATASET_PATH}")
        return False
    
    print(f"\n📁 Found {len(image_files)} test images")
    
    # Test results
    results = []
    successful_tests = 0
    
    for i, image_path in enumerate(image_files, 1):
        print(f"\n--- Test {i}/{len(image_files)} ---")
        
        success, result = test_single_image(image_path, advanced=True)
        
        if success and result:
            successful_tests += 1
            
            # Validate schema
            schema_issues = validate_json_schema(result)
            if schema_issues:
                print("⚠️  Schema validation issues:")
                for issue in schema_issues:
                    print(f"     - {issue}")
            else:
                print("✅ Schema validation passed")
            
            results.append({
                "image": os.path.basename(image_path),
                "success": True,
                "result": result,
                "schema_issues": schema_issues
            })
        else:
            results.append({
                "image": os.path.basename(image_path),
                "success": False,
                "result": None,
                "schema_issues": []
            })
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    print(f"Total tests: {len(image_files)}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {len(image_files) - successful_tests}")
    print(f"Success rate: {successful_tests/len(image_files)*100:.1f}%")
    
    # Category distribution
    categories = [r["result"]["category"] for r in results if r["success"] and r["result"]]
    if categories:
        from collections import Counter
        category_counts = Counter(categories)
        print(f"\nCategory distribution:")
        for category, count in category_counts.items():
            print(f"  {category}: {count}")
    
    # Average confidence
    confidences = [r["result"]["confidence"] for r in results if r["success"] and r["result"]]
    if confidences:
        avg_confidence = sum(confidences) / len(confidences)
        print(f"\nAverage confidence: {avg_confidence:.2%}")
    
    # Save detailed results
    with open("test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n💾 Detailed results saved to test_results.json")
    
    return successful_tests == len(image_files)

def test_error_handling():
    """Test error handling with invalid inputs."""
    print("\n🔧 Testing error handling")
    
    # Test with non-image file
    print("Testing with text file...")
    try:
        with open("test_file.txt", "w") as f:
            f.write("This is not an image")
        
        with open("test_file.txt", "rb") as f:
            files = {"file": f}
            response = requests.post(f"{BACKEND_URL}/process-receipt", files=files)
        
        if response.status_code == 400:
            print("✅ Correctly rejected non-image file")
        else:
            print(f"⚠️  Unexpected response for non-image: {response.status_code}")
        
        os.remove("test_file.txt")
    except Exception as e:
        print(f"❌ Error in non-image test: {e}")

def main():
    """Main test function."""
    print("🧾 Receipt AI Expense Tracker - Test Suite")
    print("=" * 50)
    
    # Run comprehensive tests
    success = run_comprehensive_test()
    
    # Test error handling
    test_error_handling()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 All tests passed!")
    else:
        print("⚠️  Some tests failed. Check the output above.")
    
    print("\nTo start the application:")
    print("1. Backend: cd backend && python main.py")
    print("2. Frontend: cd frontend && streamlit run app.py")

if __name__ == "__main__":
    main()
