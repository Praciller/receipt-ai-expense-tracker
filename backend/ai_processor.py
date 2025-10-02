import os
import json
import logging
import re
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

        # Use stable model with optimized generation config
        generation_config = genai.types.GenerationConfig(
            temperature=0.1,  # Low temperature for consistent, accurate results
            top_p=0.8,
            top_k=40,
            max_output_tokens=2048
        )

        # Configure safety settings to be less restrictive for receipt content
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        self.model = genai.GenerativeModel(
            'gemini-2.0-flash-exp',  # Use the original working model
            generation_config=generation_config,
            safety_settings=safety_settings
        )

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
        """Create an optimized prompt for receipt processing with clear instructions."""
        categories_str = ", ".join(self.get_category_list())

        return f"""Extract receipt information into JSON format. Be precise with numbers and text.

EXAMPLE OUTPUT:
{{
    "merchant_name": "Starbucks Coffee",
    "merchant_address": "123 Main St, City, State 12345",
    "transaction_date": "2024-01-15",
    "transaction_time": "14:30",
    "total_amount": 4.75,
    "subtotal": 4.50,
    "tax_amount": 0.25,
    "tip_amount": 0.00,
    "discount_amount": 0.00,
    "currency": "USD",
    "category": "Food",
    "payment_method": "Card",
    "items": [
        {{
            "name": "Grande Latte",
            "quantity": 1,
            "unit_price": 4.50,
            "total_price": 4.50
        }}
    ],
    "receipt_number": "12345",
    "cashier": "John",
    "confidence": 0.95,
    "extraction_notes": "Clear receipt, all information visible"
}}

RULES:
1. Extract exact text as shown on receipt
2. Use numbers only for amounts (no currency symbols)
3. Date format: YYYY-MM-DD, Time format: HH:MM
4. Category must be one of: {categories_str}
5. If information is unclear or missing, use null
6. Confidence: 0.9+ for clear receipts, 0.7+ for readable, 0.5+ for unclear
7. For items: if not itemized, create one item with total amount
8. Currency: detect from symbols ($=USD, €=EUR, £=GBP, ¥=JPY, etc.)

CATEGORY GUIDELINES:
- Food: Restaurants, grocery stores, cafes, food delivery
- Transport: Gas stations, parking, public transport, car services
- Shopping: Retail stores, clothing, electronics, general merchandise
- Entertainment: Movies, games, events, recreational activities
- Healthcare: Pharmacies, medical services, health products
- Utilities: Phone, internet, electricity, water bills
- Education: Books, courses, educational materials
- Other: Services, fees, unclear categories

Return only valid JSON."""

    def create_simple_prompt(self) -> str:
        """Create a simpler prompt for basic receipt processing."""
        categories_str = ", ".join(self.get_category_list())

        return f"""Extract basic receipt information as JSON:

{{
    "merchant_name": "exact store name from receipt",
    "transaction_date": "YYYY-MM-DD format",
    "total_amount": 0.00,
    "currency": "USD",
    "category": "one of: {categories_str}",
    "confidence": 0.95
}}

Be accurate with merchant name and total amount. Use current date if date unclear."""

    async def process_receipt(self, image: Image.Image, use_advanced: bool = True) -> Dict[str, Any]:
        """Process receipt image and extract structured data with retry logic."""
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                logger.info(f"Processing receipt attempt {attempt + 1}/{max_retries}")

                # Choose prompt based on complexity preference
                prompt = self.create_advanced_prompt() if use_advanced else self.create_simple_prompt()

                # Optimize image for better OCR
                processed_image = self._optimize_image_for_ocr(image)

                # Generate content using Gemini with retry
                response = self.model.generate_content([prompt, processed_image])

                if not response.text:
                    raise ValueError("Empty response from AI model")

                response_text = response.text.strip()
                logger.info(f"AI Response length: {len(response_text)} characters")

                # Clean up response text
                response_text = self._clean_response_text(response_text)

                # Parse JSON with enhanced error handling
                result = self._parse_json_response(response_text)

                # Validate and enhance result
                result = self._validate_and_enhance_result(result)

                # Cross-validate data consistency
                result = self._cross_validate_data(result)

                logger.info(f"Successfully processed receipt with confidence: {result.get('confidence', 0)}")
                return result

            except json.JSONDecodeError as e:
                last_error = e
                logger.warning(f"JSON parsing error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    continue
                # Final attempt: try to extract JSON from malformed response
                return self._extract_json_from_text(response_text)

            except Exception as e:
                last_error = e
                logger.error(f"Error processing receipt on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    continue

        # If all retries failed, return fallback result
        logger.error(f"All processing attempts failed. Last error: {last_error}")
        return self._create_fallback_result(str(last_error))

    def _optimize_image_for_ocr(self, image: Image.Image) -> Image.Image:
        """Optimize image for better OCR results."""
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Resize if too large (max 2048px on longest side)
            max_size = 2048
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            # Ensure minimum size for readability
            min_size = 300
            if min(image.size) < min_size:
                ratio = min_size / min(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            return image
        except Exception as e:
            logger.warning(f"Image optimization failed: {e}, using original")
            return image

    def _clean_response_text(self, text: str) -> str:
        """Clean up AI response text to extract valid JSON."""
        if not text:
            return "{}"

        # Remove markdown formatting
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)

        # Remove any leading/trailing text before/after JSON
        # Find the first { and last }
        start_idx = text.find('{')
        end_idx = text.rfind('}')

        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            text = text[start_idx:end_idx + 1]

        # Clean up common formatting issues
        text = text.strip()
        text = re.sub(r',\s*}', '}', text)  # Remove trailing commas
        text = re.sub(r',\s*]', ']', text)  # Remove trailing commas in arrays

        return text

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON response with enhanced error handling."""
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"Initial JSON parse failed: {e}")

            # Try to fix common JSON issues
            fixed_text = self._fix_common_json_issues(text)
            try:
                return json.loads(fixed_text)
            except json.JSONDecodeError:
                logger.warning("JSON fix attempts failed, trying extraction")
                return self._extract_json_from_text(text)

    def _fix_common_json_issues(self, text: str) -> str:
        """Fix common JSON formatting issues."""
        # Fix unescaped quotes in strings
        text = re.sub(r'(?<!\\)"(?=[^,}\]]*[,}\]])', '\\"', text)

        # Fix missing quotes around keys
        text = re.sub(r'(\w+):', r'"\1":', text)

        # Fix single quotes to double quotes
        text = re.sub(r"'([^']*)'", r'"\1"', text)

        # Remove trailing commas
        text = re.sub(r',(\s*[}\]])', r'\1', text)

        return text

    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Attempt to extract JSON from malformed text."""
        try:
            # Try to find and extract JSON object
            start = text.find('{')
            end = text.rfind('}') + 1

            if start != -1 and end > start:
                json_str = text[start:end]
                # Try parsing the extracted JSON
                return json.loads(json_str)
        except Exception as e:
            logger.warning(f"JSON extraction failed: {e}")

        # Return fallback structure
        return self._create_fallback_result("Failed to parse AI response")

    def _create_fallback_result(self, error_message: str) -> Dict[str, Any]:
        """Create a fallback result when processing fails."""
        return {
            "merchant_name": "Unknown",
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": 0.0,
            "currency": "USD",
            "category": "Other",
            "confidence": 0.1,
            "extraction_notes": f"Processing failed: {error_message}"
        }

    def _validate_and_enhance_result(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enhance the extracted result with comprehensive checks."""
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
            if field not in result or result[field] is None or result[field] == "":
                result[field] = default

        # Clean and validate merchant name
        if isinstance(result["merchant_name"], str):
            result["merchant_name"] = result["merchant_name"].strip()
            if not result["merchant_name"]:
                result["merchant_name"] = "Unknown"

        # Validate and normalize category
        if result["category"] not in self.get_category_list():
            # Try to map common variations
            category_mapping = {
                "food & dining": "Food",
                "restaurant": "Food",
                "grocery": "Food",
                "gas": "Transport",
                "fuel": "Transport",
                "medical": "Healthcare",
                "pharmacy": "Healthcare",
                "retail": "Shopping",
                "store": "Shopping"
            }

            category_lower = result["category"].lower() if isinstance(result["category"], str) else ""
            mapped_category = category_mapping.get(category_lower)

            if mapped_category:
                result["category"] = mapped_category
            else:
                logger.warning(f"Invalid category: {result['category']}, defaulting to 'Other'")
                result["category"] = "Other"

        # Validate and clean numeric fields
        numeric_fields = ["total_amount", "subtotal", "tax_amount", "tip_amount", "discount_amount", "confidence"]
        for field in numeric_fields:
            if field in result:
                result[field] = self._clean_numeric_value(result[field], field)

        # Validate date format
        result["transaction_date"] = self._validate_date(result["transaction_date"])

        # Validate time format if present
        if "transaction_time" in result and result["transaction_time"]:
            result["transaction_time"] = self._validate_time(result["transaction_time"])

        # Normalize currency code
        result["currency"] = self._normalize_currency(result.get("currency", "USD"))

        # Validate items array
        if "items" in result and isinstance(result["items"], list):
            result["items"] = self._validate_items(result["items"])

        return result

    def _clean_numeric_value(self, value: Any, field_name: str) -> float:
        """Clean and validate numeric values."""
        if value is None or value == "":
            return 0.5 if field_name == "confidence" else 0.0

        try:
            # Handle string values with currency symbols
            if isinstance(value, str):
                # Remove currency symbols and whitespace
                cleaned = re.sub(r'[^\d.-]', '', value.replace(',', ''))
                if not cleaned:
                    return 0.5 if field_name == "confidence" else 0.0
                value = float(cleaned)
            else:
                value = float(value)

            # Validate confidence is between 0 and 1
            if field_name == "confidence":
                return max(0.0, min(1.0, value))

            # Ensure non-negative for monetary values
            return max(0.0, value)

        except (ValueError, TypeError):
            logger.warning(f"Invalid numeric value for {field_name}: {value}")
            return 0.5 if field_name == "confidence" else 0.0

    def _validate_date(self, date_str: Any) -> str:
        """Validate and normalize date string."""
        if not date_str or not isinstance(date_str, str):
            return datetime.now().strftime("%Y-%m-%d")

        # Try different date formats
        date_formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%m-%d-%Y",
            "%d-%m-%Y",
            "%Y/%m/%d"
        ]

        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_str.strip(), fmt)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                continue

        logger.warning(f"Invalid date format: {date_str}")
        return datetime.now().strftime("%Y-%m-%d")

    def _validate_time(self, time_str: Any) -> Optional[str]:
        """Validate and normalize time string."""
        if not time_str or not isinstance(time_str, str):
            return None

        # Try different time formats
        time_formats = ["%H:%M", "%I:%M %p", "%H:%M:%S"]

        for fmt in time_formats:
            try:
                parsed_time = datetime.strptime(time_str.strip(), fmt)
                return parsed_time.strftime("%H:%M")
            except ValueError:
                continue

        logger.warning(f"Invalid time format: {time_str}")
        return None

    def _normalize_currency(self, currency: Any) -> str:
        """Normalize currency code."""
        if not currency or not isinstance(currency, str):
            return "USD"

        # Common currency symbol to code mapping
        currency_mapping = {
            "$": "USD",
            "€": "EUR",
            "£": "GBP",
            "¥": "JPY",
            "₹": "INR",
            "₽": "RUB",
            "¢": "USD"
        }

        currency = currency.strip().upper()

        # If it's a symbol, convert to code
        if currency in currency_mapping:
            return currency_mapping[currency]

        # If it's already a valid 3-letter code
        if len(currency) == 3 and currency.isalpha():
            return currency

        return "USD"  # Default fallback

    def _validate_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and clean items array."""
        validated_items = []

        for item in items:
            if not isinstance(item, dict):
                continue

            # Ensure required fields
            validated_item = {
                "name": str(item.get("name", "Unknown Item")).strip(),
                "quantity": max(1, int(item.get("quantity", 1))),
                "unit_price": self._clean_numeric_value(item.get("unit_price", 0), "unit_price"),
                "total_price": self._clean_numeric_value(item.get("total_price", 0), "total_price")
            }

            # Skip items with no name or zero price
            if validated_item["name"] and validated_item["name"] != "Unknown Item":
                validated_items.append(validated_item)

        return validated_items

    def _cross_validate_data(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Cross-validate data for consistency and adjust confidence accordingly."""
        original_confidence = result.get("confidence", 0.5)
        confidence_adjustments = []

        # Check if items total matches receipt total
        if "items" in result and result["items"]:
            items_total = sum(item.get("total_price", 0) for item in result["items"])
            receipt_total = result.get("total_amount", 0)

            if items_total > 0 and receipt_total > 0:
                difference_ratio = abs(items_total - receipt_total) / receipt_total
                if difference_ratio > 0.1:  # More than 10% difference
                    confidence_adjustments.append(-0.2)
                    result["extraction_notes"] = result.get("extraction_notes", "") + " Items total doesn't match receipt total."

        # Check if subtotal + tax ≈ total
        subtotal = result.get("subtotal", 0)
        tax = result.get("tax_amount", 0)
        total = result.get("total_amount", 0)

        if subtotal > 0 and total > 0:
            expected_total = subtotal + tax + result.get("tip_amount", 0) - result.get("discount_amount", 0)
            difference_ratio = abs(expected_total - total) / total
            if difference_ratio > 0.05:  # More than 5% difference
                confidence_adjustments.append(-0.1)

        # Check for reasonable values
        if result.get("total_amount", 0) > 10000:  # Very high amount
            confidence_adjustments.append(-0.1)

        if result.get("merchant_name") == "Unknown":
            confidence_adjustments.append(-0.2)

        # Apply confidence adjustments
        final_confidence = original_confidence + sum(confidence_adjustments)
        result["confidence"] = max(0.0, min(1.0, final_confidence))

        return result