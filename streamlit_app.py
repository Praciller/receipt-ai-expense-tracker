import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Any
from io import BytesIO
import logging

# Import AI processor directly
import google.generativeai as genai
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Streamlit page
st.set_page_config(
    page_title="Receipt AI Expense Tracker",
    page_icon="🧾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize AI processor
@st.cache_resource
def initialize_ai():
    """Initialize the AI processor with API key from secrets."""
    try:
        api_key = st.secrets["GOOGLE_API_KEY"]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        return model
    except Exception as e:
        st.error(f"Failed to initialize AI: {e}")
        return None

# Expense categories
EXPENSE_CATEGORIES = [
    "Food", "Transport", "Utilities", "Shopping", 
    "Entertainment", "Healthcare", "Education", "Other"
]

def create_receipt_prompt():
    """Create a sophisticated prompt for receipt processing."""
    categories_str = ", ".join(EXPENSE_CATEGORIES)
    
    return f"""You are an intelligent OCR assistant for expense tracking. Analyze this receipt image and extract the following information into a strict JSON format.

IMPORTANT: You must respond with ONLY a valid JSON object, no additional text or explanation.

Required JSON format:
{{
    "merchant_name": "string - Name of the store/merchant",
    "merchant_address": "string - Full address if visible, null if not",
    "transaction_date": "YYYY-MM-DD - Date of transaction",
    "transaction_time": "HH:MM - Time if visible, null if not",
    "total_amount": float - Total amount paid (numeric value only),
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

Guidelines:
1. For 'category', analyze the merchant and items to choose the most appropriate category
2. Extract individual items when clearly visible
3. Convert all amounts to numeric values (remove currency symbols)
4. Use ISO date format (YYYY-MM-DD)
5. If information is unclear, use reasonable defaults but lower the confidence score
6. Ensure the JSON is valid and parseable

Respond with ONLY the JSON object."""

def validate_and_enhance_result(result: Dict[str, Any]) -> Dict[str, Any]:
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
    if result["category"] not in EXPENSE_CATEGORIES:
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

def clean_response_text(text: str) -> str:
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

def process_receipt_image(model, image: Image.Image) -> Dict[str, Any]:
    """Process receipt image using Gemini AI."""
    try:
        prompt = create_receipt_prompt()
        
        # Generate content using Gemini
        response = model.generate_content([prompt, image])
        response_text = response.text.strip()
        
        # Clean up response text
        response_text = clean_response_text(response_text)
        
        # Parse JSON
        result = json.loads(response_text)
        
        # Validate and enhance result
        result = validate_and_enhance_result(result)
        
        return result
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        logger.error(f"Response text: {response_text}")
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
    except Exception as e:
        logger.error(f"Error processing receipt: {e}")
        return {
            "merchant_name": "Unknown",
            "transaction_date": datetime.now().strftime("%Y-%m-%d"),
            "total_amount": 0.0,
            "currency": "USD",
            "category": "Other",
            "confidence": 0.1,
            "extraction_notes": f"Error processing receipt: {str(e)}"
        }

def display_receipt_data(data: Dict[str, Any]):
    """Display extracted receipt data in a formatted way."""
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📋 Receipt Information")
        
        # Basic info
        st.metric("Merchant", data.get("merchant_name", "Unknown"))
        st.metric("Date", data.get("transaction_date", "Unknown"))
        st.metric("Total Amount", f"{data.get('currency', 'USD')} {data.get('total_amount', 0):.2f}")
        st.metric("Category", data.get("category", "Other"))
        
        # Additional info if available
        if data.get("payment_method"):
            st.metric("Payment Method", data.get("payment_method"))
        
        if data.get("receipt_number"):
            st.metric("Receipt Number", data.get("receipt_number"))
    
    with col2:
        st.subheader("📊 Analysis Details")
        
        # Confidence score
        confidence = data.get("confidence", 0)
        st.metric("AI Confidence", f"{confidence:.1%}")
        
        # Progress bar for confidence
        st.progress(confidence)
        
        # Breakdown if available
        if data.get("subtotal"):
            st.metric("Subtotal", f"{data.get('currency', 'USD')} {data.get('subtotal', 0):.2f}")
        if data.get("tax_amount"):
            st.metric("Tax", f"{data.get('currency', 'USD')} {data.get('tax_amount', 0):.2f}")
        if data.get("tip_amount"):
            st.metric("Tip", f"{data.get('currency', 'USD')} {data.get('tip_amount', 0):.2f}")
    
    # Items table if available
    if data.get("items") and len(data["items"]) > 0:
        st.subheader("🛒 Items")
        items_df = pd.DataFrame(data["items"])
        st.dataframe(items_df, use_container_width=True)
    
    # Extraction notes
    if data.get("extraction_notes"):
        st.info(f"Notes: {data.get('extraction_notes')}")

def save_expense_data(data: Dict[str, Any]):
    """Save expense data to session state."""
    if "expenses" not in st.session_state:
        st.session_state.expenses = []
    
    # Add new expense
    expense_record = {
        "id": len(st.session_state.expenses) + 1,
        "timestamp": datetime.now().isoformat(),
        "merchant_name": data.get("merchant_name"),
        "transaction_date": data.get("transaction_date"),
        "total_amount": data.get("total_amount"),
        "currency": data.get("currency"),
        "category": data.get("category"),
        "confidence": data.get("confidence"),
        "filename": data.get("filename")
    }
    
    st.session_state.expenses.append(expense_record)
    return len(st.session_state.expenses)

def load_expense_data() -> List[Dict[str, Any]]:
    """Load expense data from session state."""
    return st.session_state.get("expenses", [])

def display_expense_analytics():
    """Display expense analytics and visualizations."""
    expenses = load_expense_data()
    
    if not expenses:
        st.info("No expense data available. Upload some receipts to see analytics!")
        return
    
    df = pd.DataFrame(expenses)
    df['transaction_date'] = pd.to_datetime(df['transaction_date'])
    df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce')
    
    # Summary metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Expenses", f"${df['total_amount'].sum():.2f}")
    with col2:
        st.metric("Number of Receipts", len(df))
    with col3:
        st.metric("Average Amount", f"${df['total_amount'].mean():.2f}")
    with col4:
        st.metric("Most Common Category", df['category'].mode().iloc[0] if not df.empty else "N/A")
    
    # Category breakdown
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("💰 Expenses by Category")
        category_totals = df.groupby('category')['total_amount'].sum().reset_index()
        fig_pie = px.pie(
            category_totals, 
            values='total_amount', 
            names='category',
            title="Expense Distribution"
        )
        st.plotly_chart(fig_pie, use_container_width=True)
    
    with col2:
        st.subheader("📈 Spending Trend")
        daily_spending = df.groupby('transaction_date')['total_amount'].sum().reset_index()
        fig_line = px.line(
            daily_spending,
            x='transaction_date',
            y='total_amount',
            title="Daily Spending"
        )
        st.plotly_chart(fig_line, use_container_width=True)
    
    # Recent expenses table
    st.subheader("📋 Recent Expenses")
    recent_df = df.sort_values('timestamp', ascending=False).head(10)
    display_columns = ['merchant_name', 'transaction_date', 'total_amount', 'category', 'confidence']
    st.dataframe(recent_df[display_columns], use_container_width=True)

def main():
    """Main Streamlit application."""
    st.title("🧾 Receipt AI Expense Tracker")
    st.markdown("Upload receipt images to automatically extract and categorize your expenses!")
    
    # Initialize AI model
    model = initialize_ai()
    
    if model is None:
        st.error("❌ AI model not initialized. Please check your Google API key in secrets.")
        st.info("To configure secrets in Streamlit Cloud:")
        st.code("""
1. Go to your app settings in Streamlit Cloud
2. Click on 'Secrets' in the left sidebar
3. Add your Google API key:

GOOGLE_API_KEY = "your_google_ai_studio_api_key_here"
        """)
        return
    
    # Sidebar
    st.sidebar.title("Navigation")
    page = st.sidebar.selectbox("Choose a page", ["Upload Receipt", "Analytics", "Settings"])
    
    if page == "Upload Receipt":
        st.header("📤 Upload Receipt")
        
        # File uploader
        uploaded_file = st.file_uploader(
            "Choose a receipt image",
            type=['png', 'jpg', 'jpeg', 'gif', 'bmp'],
            help="Upload a clear image of your receipt"
        )
        
        # Processing options
        col1, col2 = st.columns(2)
        with col1:
            advanced_mode = st.checkbox("Advanced Processing", value=True, 
                                      help="Use advanced AI processing for more detailed extraction")
        with col2:
            auto_save = st.checkbox("Auto-save results", value=True,
                                  help="Automatically save processed receipts to session storage")
        
        if uploaded_file is not None:
            # Display uploaded image
            col1, col2 = st.columns([1, 2])
            
            with col1:
                st.image(uploaded_file, caption="Uploaded Receipt", use_container_width=True)
            
            with col2:
                if st.button("🔍 Process Receipt", type="primary"):
                    with st.spinner("Processing receipt with AI..."):
                        try:
                            # Process image
                            image = Image.open(uploaded_file)
                            
                            # Convert to RGB if necessary
                            if image.mode != "RGB":
                                image = image.convert("RGB")
                            
                            # Process with AI
                            result = process_receipt_image(model, image)
                            
                            # Add metadata
                            result["filename"] = uploaded_file.name
                            result["file_size"] = len(uploaded_file.getvalue())
                            result["image_dimensions"] = image.size
                            
                            st.success("✅ Receipt processed successfully!")
                            
                            # Display results
                            display_receipt_data(result)
                            
                            # Save option
                            if auto_save:
                                record_id = save_expense_data(result)
                                st.success(f"💾 Expense saved as record #{record_id}")
                            else:
                                if st.button("💾 Save Expense"):
                                    record_id = save_expense_data(result)
                                    st.success(f"💾 Expense saved as record #{record_id}")
                            
                            # Show raw JSON
                            with st.expander("🔍 View Raw Data"):
                                st.json(result)
                                
                        except Exception as e:
                            st.error(f"Error processing receipt: {str(e)}")
    
    elif page == "Analytics":
        st.header("📊 Expense Analytics")
        display_expense_analytics()
    
    elif page == "Settings":
        st.header("⚙️ Settings")
        
        st.subheader("AI Configuration")
        if model:
            st.success("✅ AI model initialized successfully")
        else:
            st.error("❌ AI model not initialized")
        
        st.subheader("Data Management")
        expenses = load_expense_data()
        st.info(f"Total stored expenses: {len(expenses)}")
        
        if st.button("🗑️ Clear All Data", type="secondary"):
            st.session_state.expenses = []
            st.success("All expense data cleared!")
            st.rerun()

if __name__ == "__main__":
    main()
