import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

import google.generativeai as genai
from PIL import Image

logger = logging.getLogger(__name__)

class ReceiptAIProcessor:
    """Advanced AI processor for receipt analysis and expense categorization."""
    
    def __init__(self, api_key: str):
        """Initialize the AI processor with Google API key."""
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Enhanced expense categories with subcategories
        self.expense_categories = {
            "Food": ["Restaurant", "Grocery", "Fast Food", "Coffee", "Delivery"],
            "Transport": ["Gas", "Public Transport", "Taxi", "Parking", "Car Maintenance"],
            "Utilities": ["Electricity", "Water", "Internet", "Phone", "Gas Bill"],
            "Shopping": ["Clothing", "Electronics", "Home Goods", "Personal Care", "Books"],
            "Entertainment": ["Movies", "Games", "Sports", "Music", "Events"],
            "Healthcare": ["Pharmacy", "Doctor", "Dental", "Medical Supplies", "Insurance"],
            "Education": ["Books", "Courses", "Supplies", "Tuition", "Training"],
            "Other": ["Miscellaneous", "Unknown", "Services", "Fees", "Donations"]
        }
    
    def get_category_list(self) -> List[str]:
        """Get list of main categories."""
        return list(self.expense_categories.keys())
    
    def create_advanced_prompt(self) -> str:
        """Create an advanced prompt for receipt processing with detailed instructions."""
        categories_str = ", ".join(self.get_category_list())
        
        return f"""You are an expert OCR and financial analysis AI. Analyze this receipt image with extreme precision and extract ALL visible information into a structured JSON format.

CRITICAL INSTRUCTIONS:
1. Respond with ONLY a valid JSON object - no explanations, no markdown, no additional text
2. Be extremely accurate with numbers and dates
3. Analyze the merchant type and items to determine the most appropriate category
4. Extract individual line items when clearly visible
5. Handle multiple languages and currencies
6. Account for taxes, discounts, and tips separately

REQUIRED JSON STRUCTURE:
{{
    "merchant_name": "string - Exact name as shown on receipt",
    "merchant_address": "string - Full address if visible, null if not",
    "transaction_date": "YYYY-MM-DD - Date of transaction",
    "transaction_time": "HH:MM - Time if visible, null if not",
    "total_amount": float - Final total amount paid (numeric only)",
    "subtotal": float - Subtotal before tax (if visible)",
    "tax_amount": float - Tax amount (if visible)",
    "tip_amount": float - Tip amount (if visible)",
    "discount_amount": float - Discount amount (if visible)",
    "currency": "string - Currency code (USD, EUR, THB, etc.)",
    "category": "string - Choose ONE from: {categories_str}",
    "payment_method": "string - Cash, Card, Mobile, etc. (if visible)",
    "items": [
        {{
            "name": "string - Item description",
            "quantity": int - Quantity purchased,
            "unit_price": float - Price per unit,
            "total_price": float - Total for this item
        }}
    ],
    "receipt_number": "string - Receipt/transaction number (if visible)",
    "cashier": "string - Cashier name/ID (if visible)",
    "confidence": float - Your overall confidence (0.0 to 1.0),
    "extraction_notes": "string - Any issues or uncertainties"
}}

CATEGORY SELECTION GUIDELINES:
- Food: Restaurants, groceries, cafes, food delivery
- Transport: Gas stations, public transport, parking, car services
- Utilities: Phone, internet, electricity, water bills
- Shopping: Retail stores, clothing, electronics, general merchandise
- Entertainment: Movies, games, events, recreational activities
- Healthcare: Pharmacies, medical services, health products
- Education: Books, courses, educational materials
- Other: Services, fees, or unclear categories

PROCESSING RULES:
1. If text is unclear, make reasonable assumptions but lower confidence
2. Convert all monetary values to numbers (remove currency symbols)
3. Use ISO date format (YYYY-MM-DD)
4. If items are not clearly itemized, create a single item with the total
5. Handle partial or damaged receipts gracefully
6. For non-English text, translate merchant names to English when possible

Remember: Respond with ONLY the JSON object."""

    def create_simple_prompt(self) -> str:
        """Create a simpler prompt for basic receipt processing."""
        categories_str = ", ".join(self.get_category_list())
        
        return f"""Analyze this receipt image and extract key information into JSON format.

Respond with ONLY this JSON structure:
{{
    "merchant_name": "store name",
    "transaction_date": "YYYY-MM-DD",
    "total_amount": 0.00,
    "currency": "USD",
    "category": "choose from: {categories_str}",
    "confidence": 0.95
}}

Choose the category that best matches the type of store or items purchased."""

    async def process_receipt(self, image: Image.Image, use_advanced: bool = True) -> Dict[str, Any]:
        """Process receipt image and extract structured data."""
        try:
            # Choose prompt based on complexity preference
            prompt = self.create_advanced_prompt() if use_advanced else self.create_simple_prompt()
            
            # Generate content using Gemini
            response = self.model.generate_content([prompt, image])
            response_text = response.text.strip()
            
            # Clean up response text
            response_text = self._clean_response_text(response_text)
            
            # Parse JSON
            result = json.loads(response_text)
            
            # Validate and enhance result
            result = self._validate_and_enhance_result(result)
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            logger.error(f"Response text: {response_text}")
            # Try to extract JSON from malformed response
            return self._extract_json_from_text(response_text)
            
        except Exception as e:
            logger.error(f"Error processing receipt: {e}")
            raise
    
    def _clean_response_text(self, text: str) -> str:
        """Clean up AI response text to extract valid JSON."""
        # Remove markdown formatting
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        
        if text.endswith("```"):
            text = text[:-3]
        
        # Find JSON object boundaries
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1:
            text = text[start_idx:end_idx + 1]
        
        return text.strip()
    
    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Attempt to extract JSON from malformed text."""
        try:
            # Try to find and extract JSON object
            start = text.find('{')
            end = text.rfind('}') + 1
            
            if start != -1 and end > start:
                json_str = text[start:end]
                return json.loads(json_str)
        except:
            pass
        
        # Return minimal fallback structure
        return {
            "merchant_name": "Unknown",
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": 0.0,
            "currency": "USD",
            "category": "Other",
            "confidence": 0.1,
            "extraction_notes": "Failed to parse AI response"
        }
    
    def _validate_and_enhance_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enhance the extracted result."""
        # Ensure required fields exist and handle None values
        required_fields = {
            "merchant_name": "Unknown",
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": 0.0,
            "currency": "USD",
            "category": "Other",
            "confidence": 0.5
        }

        for field, default in required_fields.items():
            if field not in result or result[field] is None:
                result[field] = default
        
        # Validate category
        if result["category"] not in self.get_category_list():
            logger.warning(f"Invalid category: {result['category']}, defaulting to 'Other'")
            result["category"] = "Other"
        
        # Ensure numeric fields are properly typed
        numeric_fields = ["total_amount", "subtotal", "tax_amount", "tip_amount", "discount_amount", "confidence"]
        for field in numeric_fields:
            if field in result:
                try:
                    # Handle None values and convert to float
                    if result[field] is None:
                        if field == "confidence":
                            result[field] = 0.5
                        else:
                            result[field] = 0.0
                    else:
                        result[field] = float(result[field])
                except (ValueError, TypeError):
                    if field == "confidence":
                        result[field] = 0.5
                    else:
                        result[field] = 0.0
        
        # Validate date format
        try:
            # Check if transaction_date is None or empty
            if result["transaction_date"] is None or result["transaction_date"] == "":
                raise ValueError("Date is None or empty")

            # Try to parse the date
            datetime.strptime(result["transaction_date"], "%Y-%m-%d")
        except (ValueError, TypeError):
            # If parsing fails or date is None/invalid, use current date
            result["transaction_date"] = datetime.now().strftime("%Y-%m-%d")
            result["confidence"] = max(0.0, result["confidence"] - 0.2)
        
        return result
