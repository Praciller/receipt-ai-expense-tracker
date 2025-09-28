# 🧾 Receipt AI Expense Tracker

An AI-powered expense tracking application that extracts structured data from receipt images using Google's Gemini AI.

## 🌟 Features

- **AI-Powered Receipt Processing**: Upload receipt images and get structured expense data
- **Smart Categorization**: Automatic expense categorization (Food, Transport, Shopping, etc.)
- **Modern UI**: Beautiful, responsive interface built with Next.js and shadcn/ui
- **Real-time Analytics**: Visual dashboards showing spending patterns and trends
- **Multi-format Support**: Supports JPG, PNG, GIF, BMP, and WebP image formats

## 🏗️ Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **UI Library**: shadcn/ui with Tailwind CSS
- **Theme**: Scaled design system
- **Deployment**: Vercel
- **Live URL**: [https://receipt-ai-expense-tracker.vercel.app/](https://receipt-ai-expense-tracker.vercel.app/)

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.13+
- **AI Engine**: Google Gemini 2.0 Flash
- **Image Processing**: PIL (Pillow)
- **API Documentation**: Auto-generated with FastAPI

## 🚀 Quick Start

### Prerequisites
- Python 3.13+
- Node.js 18+
- Google AI Studio API Key

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Praciller/receipt-ai-expense-tracker.git
   cd receipt-ai-expense-tracker
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file
   GOOGLE_API_KEY=your_google_ai_studio_api_key
   DEBUG=True
   HOST=127.0.0.1
   PORT=8080
   ```

4. **Run the backend**
   ```bash
   python run_backend.py
   ```
   Backend will be available at: http://localhost:8080

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```
   Frontend will be available at: http://localhost:3000

### Run Both Services
```bash
python run_all.py
```

## 📁 Project Structure

```
receipt-ai-expense-tracker/
├── backend/                 # FastAPI backend
│   ├── main.py             # FastAPI application
│   └── ai_processor.py     # AI processing logic
├── frontend/               # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   └── lib/              # Utility functions
├── run_backend.py         # Backend runner script
├── run_frontend.py        # Frontend runner script
├── run_all.py            # Run both services
├── requirements.txt       # Python dependencies
└── .env                  # Environment variables
```

## 🔧 API Endpoints

### Backend API (FastAPI)

- `GET /` - API information
- `GET /health` - Health check with available categories
- `POST /process-receipt` - Process receipt image
  - **Parameters**: 
    - `file`: Image file (multipart/form-data)
    - `advanced`: Boolean (optional, default: true)
  - **Response**: Structured JSON with expense data

### Example API Response
```json
{
  "merchant_name": "Starbucks Coffee",
  "transaction_date": "2024-01-15",
  "total_amount": 4.50,
  "currency": "USD",
  "category": "Food",
  "items": [
    {
      "name": "Grande Latte",
      "quantity": 1,
      "unit_price": 4.50,
      "total_price": 4.50
    }
  ],
  "confidence": 0.95
}
```

## 🎨 UI Components

The frontend uses shadcn/ui components with the Scaled theme:
- **Upload Interface**: Drag-and-drop file upload
- **Analytics Dashboard**: Charts and spending insights
- **Settings Panel**: Configuration and preferences
- **Responsive Design**: Works on desktop and mobile

## 🚀 Deployment

### Frontend (Vercel)
The frontend is automatically deployed to Vercel:
- **Production URL**: https://receipt-ai-expense-tracker.vercel.app/
- **Auto-deployment**: Triggered on push to main branch
- **Build Command**: `cd frontend && npm run build`

### Backend (Ready for Deployment)
The backend is ready for deployment to platforms like:
- **Render** (Recommended for Python)
- **Railway**
- **Heroku**
- **Google Cloud Run**

## 🔑 Environment Variables

```bash
# Required
GOOGLE_API_KEY=your_google_ai_studio_api_key

# Optional
DEBUG=True
HOST=127.0.0.1
PORT=8080
ENVIRONMENT=development
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🐛 Issues

If you encounter any issues, please create an issue on GitHub with:
- Detailed description
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## 🙏 Acknowledgments

- **Google AI Studio** for Gemini AI API
- **shadcn/ui** for beautiful UI components
- **Vercel** for frontend hosting
- **Next.js** and **FastAPI** teams for excellent frameworks
