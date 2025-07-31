# 🧾 Receipt AI Expense Tracker

An intelligent expense tracking application that uses AI to automatically scan and categorize receipts. Built with FastAPI, Streamlit, and Google's Gemini 2.0 Flash model.

## ✨ Features

- **AI-Powered OCR**: Automatically extract text and data from receipt images
- **Smart Categorization**: Intelligently categorize expenses into predefined categories
- **Structured Data Extraction**: Extract merchant name, date, amount, items, and more
- **Interactive Web Interface**: User-friendly Streamlit frontend for easy receipt upload
- **Real-time Processing**: Fast processing with confidence scoring
- **Expense Analytics**: Visualize spending patterns with charts and graphs
- **Local Data Storage**: Save and track expenses locally
- **Comprehensive API**: RESTful API with automatic documentation

## 🏗️ Architecture

```
receipt-ai-expense-tracker/
├── streamlit_app.py         # Main Streamlit app (entry point)
├── backend/                 # FastAPI backend (for local dev)
│   ├── main.py             # Main API server
│   └── ai_processor.py     # AI processing logic
├── frontend/               # Original frontend (for local dev)
│   └── app.py             # Web interface
├── .streamlit/             # Streamlit configuration
│   └── config.toml        # Cloud deployment settings
├── requirements.txt        # Dependencies for Streamlit Cloud
├── DEPLOYMENT.md          # Deployment guide
├── dataset/               # SROIE dataset for testing
├── test_system.py         # Comprehensive test suite
├── run_*.py              # Local development scripts
└── pyproject.toml        # Project dependencies (uv)
```

## 🚀 Quick Start

### 🌐 Streamlit Cloud Deployment (Recommended)

The easiest way to use this app is through Streamlit Cloud:

1. **Fork this repository** on GitHub
2. **Get Google AI Studio API Key** from [Google AI Studio](https://aistudio.google.com/)
3. **Deploy to Streamlit Cloud**:
   - Go to [share.streamlit.io](https://share.streamlit.io/)
   - Connect your GitHub repository
   - Set main file as `streamlit_app.py`
   - Add your API key in secrets: `GOOGLE_API_KEY = "your_key_here"`
4. **Start using the app** at your deployed URL

📖 **Detailed deployment steps**: See the deployment section below

### 💻 Local Development

For local development and testing:

#### Prerequisites

- Python 3.13+
- Google AI Studio API Key ([Get one here](https://aistudio.google.com/))
- uv package manager

#### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd receipt-ai-expense-tracker
   ```

2. **Install dependencies**

   ```bash
   uv sync
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   GOOGLE_API_KEY=your_google_ai_studio_api_key_here
   ```

4. **Run the Streamlit app**

   ```bash
   streamlit run streamlit_app.py
   ```

5. **Access the application**
   - Streamlit App: http://localhost:8501

#### Alternative: Full Stack Development

For backend API development:

```bash
# Terminal 1 - Backend API
python run_backend.py

# Terminal 2 - Frontend (original version)
python run_frontend.py
```

- Frontend: http://localhost:8501
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/docs

## 📖 Usage

### Web Interface

1. Open the Streamlit frontend at http://localhost:8501
2. Navigate to "Upload Receipt" page
3. Upload a receipt image (PNG, JPG, JPEG, GIF, BMP)
4. Choose processing mode (Advanced or Simple)
5. Click "Process Receipt" to extract data
6. View extracted information and save to local storage
7. Check "Analytics" page for spending insights

### API Usage

#### Process Receipt

```bash
curl -X POST "http://localhost:8080/process-receipt" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@receipt.jpg" \
     -F "advanced=true"
```

#### Health Check

```bash
curl http://localhost:8080/health
```

## 📊 API Response Format

The API returns structured JSON data with the following schema:

```json
{
  "merchant_name": "Store Name",
  "merchant_address": "123 Main St, City, State",
  "transaction_date": "2024-01-15",
  "transaction_time": "14:30",
  "total_amount": 25.99,
  "subtotal": 23.99,
  "tax_amount": 2.0,
  "tip_amount": 0.0,
  "discount_amount": 0.0,
  "currency": "USD",
  "category": "Food",
  "payment_method": "Card",
  "items": [
    {
      "name": "Coffee",
      "quantity": 2,
      "unit_price": 4.5,
      "total_price": 9.0
    }
  ],
  "receipt_number": "12345",
  "cashier": "John Doe",
  "confidence": 0.95,
  "extraction_notes": "High quality image",
  "filename": "receipt.jpg",
  "file_size": 1024000,
  "image_dimensions": [800, 600]
}
```

## 🏷️ Expense Categories

The system automatically categorizes expenses into these categories:

- **Food**: Restaurants, groceries, cafes, food delivery
- **Transport**: Gas stations, public transport, parking, car services
- **Utilities**: Phone, internet, electricity, water bills
- **Shopping**: Retail stores, clothing, electronics, general merchandise
- **Entertainment**: Movies, games, events, recreational activities
- **Healthcare**: Pharmacies, medical services, health products
- **Education**: Books, courses, educational materials
- **Other**: Services, fees, or unclear categories

## 🧪 Testing

Run the comprehensive test suite:

```bash
python test_system.py
```

This will:

- Test backend connectivity
- Process sample images from the SROIE dataset
- Validate JSON schema compliance
- Test error handling
- Generate performance metrics

## 🛠️ Development

### Project Structure

- **Backend (`backend/`)**

  - `main.py`: FastAPI application with endpoints
  - `ai_processor.py`: Advanced AI processing logic with Gemini integration

- **Frontend (`frontend/`)**

  - `app.py`: Streamlit web interface with file upload and analytics

- **Testing**
  - `test_system.py`: Comprehensive test suite
  - `dataset/`: SROIE dataset for testing

### Adding New Features

1. **New API Endpoints**: Add to `backend/main.py`
2. **AI Improvements**: Modify `backend/ai_processor.py`
3. **UI Enhancements**: Update `frontend/app.py`
4. **New Categories**: Update the category list in `ai_processor.py`

## 📦 Dependencies

### Core Dependencies

- **FastAPI**: Modern web framework for building APIs
- **Streamlit**: Web app framework for data science
- **Google Generative AI**: Gemini 2.0 Flash model integration
- **Pillow**: Image processing library
- **Pandas**: Data manipulation and analysis
- **Plotly**: Interactive visualizations
- **Uvicorn**: ASGI server for FastAPI

### Development Dependencies

- **python-dotenv**: Environment variable management
- **python-multipart**: File upload support
- **requests**: HTTP client for testing

## 🔧 Configuration

### Environment Variables

| Variable         | Description              | Default     |
| ---------------- | ------------------------ | ----------- |
| `GOOGLE_API_KEY` | Google AI Studio API key | Required    |
| `DEBUG`          | Enable debug mode        | `True`      |
| `HOST`           | Server host address      | `127.0.0.1` |
| `PORT`           | Server port              | `8080`      |

### AI Processing Modes

- **Advanced Mode**: Detailed extraction with items, taxes, tips
- **Simple Mode**: Basic extraction for quick processing

## 📈 Performance

- **Processing Time**: 3-8 seconds per receipt (depending on image complexity)
- **Accuracy**: 95%+ confidence on clear, well-lit receipts
- **Supported Formats**: JPG, PNG, GIF, BMP, WebP
- **Max File Size**: Limited by available memory
- **Concurrent Requests**: Supports multiple simultaneous uploads

## 🔒 Security

- API keys stored in environment variables
- Input validation for file uploads
- CORS enabled for frontend integration
- No sensitive data stored in logs

## 🐛 Troubleshooting

### Common Issues

1. **Backend won't start**

   - Check if port 8080 is available
   - Verify Google API key is set correctly
   - Ensure all dependencies are installed

2. **Low confidence scores**

   - Use high-quality, well-lit images
   - Ensure receipt text is clearly visible
   - Try different image formats

3. **Category misclassification**
   - The AI learns from context and merchant names
   - Manual correction may be needed for edge cases

### Getting Help

1. Check the logs in the terminal
2. Verify API connectivity with health check
3. Test with sample images from the dataset
4. Review the test results in `test_results.json`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **SROIE Dataset**: Used for testing and validation
- **Google AI Studio**: Gemini 2.0 Flash model
- **FastAPI & Streamlit**: Excellent frameworks for rapid development

## 🚀 Streamlit Cloud Deployment

### Step-by-Step Deployment

1. **Fork this repository** to your GitHub account

2. **Get Google AI Studio API Key**:

   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key
   - Copy the key for later use

3. **Deploy to Streamlit Cloud**:

   - Go to [share.streamlit.io](https://share.streamlit.io/)
   - Sign in with your GitHub account
   - Click "New app"
   - Select your forked repository
   - Set main file path: `streamlit_app.py`
   - Click "Deploy!"

4. **Configure Secrets**:

   - In your deployed app, click "Settings" (gear icon)
   - Go to "Secrets" in the left sidebar
   - Add your API key in TOML format:

   ```toml
   GOOGLE_API_KEY = "your_google_ai_studio_api_key_here"
   ```

   - Click "Save"

5. **Test Your Deployment**:
   - Your app will be available at the provided URL
   - Upload a receipt image to test functionality
   - Verify AI processing and analytics work correctly

### Deployment Configuration

The project includes optimized configuration for Streamlit Cloud:

- **Entry Point**: `streamlit_app.py` (standalone app)
- **Dependencies**: `requirements.txt` (cloud-compatible versions)
- **Configuration**: `.streamlit/config.toml` (performance optimized)
- **Secrets Management**: Built-in Streamlit secrets for API keys

### Troubleshooting Deployment

- **"AI model not initialized"**: Check that `GOOGLE_API_KEY` is correctly set in secrets
- **Module errors**: Verify all dependencies are in `requirements.txt`
- **Slow processing**: Large images may take longer; consider resizing
- **Session data lost**: Data is temporary; consider adding persistent storage

## 🔮 Future Enhancements

- [ ] Database integration (PostgreSQL/SQLite)
- [ ] User authentication and multi-user support
- [ ] Export to CSV/Excel
- [ ] Mobile app integration
- [ ] Batch processing for multiple receipts
- [ ] Integration with accounting software
- [ ] Receipt image enhancement preprocessing
- [ ] Multi-language support
- [ ] Persistent data storage
