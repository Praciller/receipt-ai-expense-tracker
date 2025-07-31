import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Any

# Configure Streamlit page
st.set_page_config(
    page_title="Receipt AI Expense Tracker",
    page_icon="🧾",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Backend API configuration
BACKEND_URL = "http://localhost:8080"

def check_backend_health():
    """Check if backend is running."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def process_receipt_api(image_file, advanced_mode=True):
    """Send image to backend API for processing."""
    try:
        files = {"file": image_file}
        params = {"advanced": advanced_mode}
        response = requests.post(
            f"{BACKEND_URL}/process-receipt",
            files=files,
            params=params,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json(), None
        else:
            return None, f"API Error: {response.status_code} - {response.text}"
    except requests.exceptions.Timeout:
        return None, "Request timed out. Please try again."
    except Exception as e:
        return None, f"Error: {str(e)}"

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
    """Save expense data to local storage (JSON file)."""
    expenses_file = "expenses.json"
    
    # Load existing data
    if os.path.exists(expenses_file):
        with open(expenses_file, 'r') as f:
            expenses = json.load(f)
    else:
        expenses = []
    
    # Add new expense
    expense_record = {
        "id": len(expenses) + 1,
        "timestamp": datetime.now().isoformat(),
        "merchant_name": data.get("merchant_name"),
        "transaction_date": data.get("transaction_date"),
        "total_amount": data.get("total_amount"),
        "currency": data.get("currency"),
        "category": data.get("category"),
        "confidence": data.get("confidence"),
        "filename": data.get("filename")
    }
    
    expenses.append(expense_record)
    
    # Save back to file
    with open(expenses_file, 'w') as f:
        json.dump(expenses, f, indent=2)
    
    return len(expenses)

def load_expense_data() -> List[Dict[str, Any]]:
    """Load expense data from local storage."""
    expenses_file = "expenses.json"
    if os.path.exists(expenses_file):
        with open(expenses_file, 'r') as f:
            return json.load(f)
    return []

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
    
    # Sidebar
    st.sidebar.title("Navigation")
    page = st.sidebar.selectbox("Choose a page", ["Upload Receipt", "Analytics", "Settings"])
    
    # Check backend status
    if not check_backend_health():
        st.error("⚠️ Backend API is not running. Please start the backend server first.")
        st.code("cd backend && python main.py")
        return
    
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
                                  help="Automatically save processed receipts to local storage")
        
        if uploaded_file is not None:
            # Display uploaded image
            col1, col2 = st.columns([1, 2])
            
            with col1:
                st.image(uploaded_file, caption="Uploaded Receipt", use_container_width=True)
            
            with col2:
                if st.button("🔍 Process Receipt", type="primary"):
                    with st.spinner("Processing receipt with AI..."):
                        # Reset file pointer
                        uploaded_file.seek(0)
                        
                        # Process with API
                        result, error = process_receipt_api(uploaded_file, advanced_mode)
                        
                        if error:
                            st.error(f"Processing failed: {error}")
                        else:
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
    
    elif page == "Analytics":
        st.header("📊 Expense Analytics")
        display_expense_analytics()
    
    elif page == "Settings":
        st.header("⚙️ Settings")
        
        st.subheader("Backend Configuration")
        st.info(f"Backend URL: {BACKEND_URL}")
        
        if st.button("🔄 Test Backend Connection"):
            if check_backend_health():
                st.success("✅ Backend is running and accessible")
            else:
                st.error("❌ Cannot connect to backend")
        
        st.subheader("Data Management")
        expenses = load_expense_data()
        st.info(f"Total stored expenses: {len(expenses)}")
        
        if st.button("🗑️ Clear All Data", type="secondary"):
            if os.path.exists("expenses.json"):
                os.remove("expenses.json")
                st.success("All expense data cleared!")
                st.experimental_rerun()

if __name__ == "__main__":
    main()
