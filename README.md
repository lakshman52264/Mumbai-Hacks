# FinPath - AI-Powered Personal Finance Management Platform

<div align="center">

![FinPath Logo](https://img.shields.io/badge/FinPath-Financial_Intelligence-4F46E5?style=for-the-badge)

**Smart financial management powered by AI to help you achieve your money goals**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=white)](https://firebase.google.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [AI Agents](#ai-agents)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 Overview

FinPath is an intelligent personal finance management platform that leverages AI to provide:
- **Automated transaction categorization** using advanced AI models
- **Real-time anomaly detection** to protect against fraudulent activities
- **Smart financial goal tracking** with AI-powered feasibility analysis
- **Personalized financial coaching** through AI-driven insights
- **Bank account integration** via Setu's Account Aggregator API
- **Intelligent alerts and reminders** for bills, goals, and suspicious activities

---

## ✨ Features

### 🏦 Bank Integration
- **Account Aggregator Integration** via Setu API
- Secure consent-based bank account linking
- Automatic transaction synchronization
- Multi-bank support with real-time data fetching

### 🤖 AI-Powered Intelligence

#### Transaction Categorization
- Automatic categorization of transactions into 20+ categories
- Smart merchant name extraction and refinement
- Recurring transaction detection (subscriptions, EMIs, bills)
- Confidence scoring for each categorization

#### Anomaly Detection
- Real-time fraud detection using pattern analysis
- Risk level assessment (Low/Medium/High)
- Time-based anomaly detection (unusual hours, weekends)
- Amount-based anomaly detection (unusual transaction sizes)
- Merchant verification and duplicate transaction detection

#### Financial Goal Management
- AI-powered goal feasibility analysis
- Smart monthly contribution recommendations
- Automatic goal rebalancing based on priority
- Progress tracking with AI insights
- Risk assessment for goal completion

#### AI Financial Coach
- Conversational AI assistant using LangGraph
- Personalized financial advice based on transaction history
- Spending pattern analysis and recommendations
- Budget optimization suggestions
- Natural language query support

### 📊 Dashboard & Analytics
- Real-time financial overview
- Spending trends and category breakdowns
- Income vs. expense visualization
- Goal progress tracking
- Custom date range analysis

### 🔔 Smart Alerts & Reminders
- Security alerts for suspicious transactions
- Goal milestone notifications
- Bill payment reminders
- Email notifications with detailed insights
- Alert management (resolve/delete)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   React UI      │
│  (Frontend)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  FastAPI        │
│  (Backend)      │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌──────┐  ┌──────────┐
│Setu  │  │Firebase  │
│ AA   │  │Firestore │
└──────┘  └────┬─────┘
               │
        ┌──────┴──────┐
        ↓             ↓
   ┌────────┐    ┌────────┐
   │CrewAI  │    │LangGraph│
   │Agents  │    │AI Coach│
   └────────┘    └────────┘
```

### AI Agent Workflow

```
Transaction → Categorization Agent → Recurring Detection → Anomaly Detection
                                                                    ↓
                                                            Alert Creation
                                                                    ↓
                                                            Email Notification
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2 with TypeScript
- **Styling**: Tailwind CSS 4.1
- **UI Components**: Radix UI primitives
- **Animations**: Motion 12
- **Charts**: Recharts 3.4
- **Authentication**: Firebase Auth
- **Build Tool**: Vite 7.2

### Backend
- **Framework**: FastAPI 0.104
- **Runtime**: Python 3.9+
- **Database**: Firebase Firestore
- **AI Framework**: CrewAI + LangGraph
- **LLM**: Google Gemini / OpenAI GPT-4
- **Bank Integration**: Setu Account Aggregator API
- **Server**: Uvicorn

### AI & ML
- **CrewAI**: Multi-agent orchestration
- **LangGraph**: Conversational AI workflows
- **LangChain**: LLM integration and tooling
- **Google Generative AI**: Gemini models
- **OpenAI**: GPT-4 models
- **LiteLLM**: Multi-provider LLM gateway

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (3.9 or higher)
- **npm** or **yarn**
- **Git**
- **Firebase Account** with Firestore enabled
- **Setu Developer Account** (for Account Aggregator API)
- **Google AI Studio API Key** or **OpenAI API Key**

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/lakshman52264/MumbaiHacks.git
cd MumbaiHacks
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

#### 1. Create `.env` file in `backend/` directory:

```env
# Setu API Configuration
SETU_CLIENT_ID=your_setu_client_id
SETU_CLIENT_SECRET=your_setu_client_secret
SETU_REDIRECT_URL=http://localhost:5173/setu-callback

# AI Model Configuration
GOOGLE_API_KEY=your_google_ai_api_key
OPENAI_API_KEY=your_openai_api_key

# LangSmith (Optional - for debugging)
LANGSMITH_API_KEY=your_langsmith_api_key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=finpath

# Server Configuration
PORT=8000
```

#### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable Firestore Database
4. Download service account key JSON
5. Save as `backend/mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json`

#### 3. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Frontend Configuration

#### Create `.env` file in `frontend/` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Backend API URL
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🎯 Running the Application

### Start Backend Server

```bash
cd backend
python app.py
```

The backend API will be available at `http://localhost:8000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Access the Application

1. Open your browser and navigate to `http://localhost:5173`
2. Sign in with Google authentication
3. Link your bank account via Setu integration
4. Start managing your finances with AI assistance!

---

## 📚 API Documentation

### Interactive API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Authentication & Users
- `GET /users/{user_id}/profile` - Get user profile
- `PUT /users/{user_id}/profile` - Update user profile

#### Bank Integration
- `POST /setu/initiate-consent` - Initiate bank account consent
- `GET /setu/consent-status/{consent_id}` - Check consent status
- `GET /setu/fetch-transactions/{consent_id}` - Fetch transactions
- `GET /users/{user_id}/accounts` - Get linked bank accounts
- `GET /users/{user_id}/transactions` - Get user transactions

#### Financial Goals
- `GET /users/{user_id}/goals` - Get all goals
- `POST /users/{user_id}/goals` - Create new goal
- `PUT /users/{user_id}/goals/{goal_id}` - Update goal
- `DELETE /users/{user_id}/goals/{goal_id}` - Delete goal
- `POST /users/{user_id}/goals/{goal_id}/confirm-payment` - Confirm payment

#### Alerts & Reminders
- `GET /users/{user_id}/alerts` - Get all alerts
- `PUT /users/{user_id}/alerts/{alert_id}/resolve` - Resolve alert
- `DELETE /users/{user_id}/alerts/{alert_id}` - Delete alert

#### AI Coach
- `POST /ai/chat` - Chat with AI financial coach

---

## 🤖 AI Agents

### 1. Categorization Agent
**Purpose**: Automatically categorize transactions and extract merchant information

**Tools**:
- `detect_recurring_transaction`: Check transaction history for recurring patterns
- `update_transaction_in_firestore`: Save categorization results

**Categories**:
- Food & Dining
- Groceries
- Transportation
- Shopping
- Entertainment
- Bills & Utilities
- Healthcare
- Education
- Travel
- Insurance
- Investments
- EMI/Loan
- Subscriptions
- Transfers
- Cash Withdrawal
- Recharge & Bill Payments
- Online Shopping
- Fuel
- Rent
- Other

### 2. Recurring Detection Agent
**Purpose**: Identify subscription services, EMIs, and recurring payments

**Analysis**:
- Frequency detection (daily, weekly, monthly, quarterly)
- Pattern recognition (Netflix, Spotify, EMIs, etc.)
- Confidence scoring
- Historical evidence gathering

### 3. Anomaly Detection Agent
**Purpose**: Detect suspicious transactions and potential fraud

**Detection Criteria**:
- Unusual amounts (extremely high/low, round numbers)
- Suspicious timing (late night, unusual hours)
- Unusual merchants or unclear descriptions
- Duplicate transactions
- Pattern deviations from user history

**Risk Levels**:
- **Low**: Minor deviations, likely legitimate
- **Medium**: Notable anomalies requiring attention
- **High**: Critical alerts, potential fraud

### 4. Goals Analysis Agent
**Purpose**: Analyze financial goal feasibility and provide recommendations

**Analysis**:
- Feasibility assessment based on income/expenses
- Monthly contribution recommendations
- Risk level evaluation
- Completion timeline estimation
- Personalized recommendations

### 5. AI Financial Coach (LangGraph)
**Purpose**: Provide conversational financial guidance

**Capabilities**:
- Natural language query understanding
- Transaction history analysis
- Spending pattern insights
- Budget recommendations
- Goal achievement strategies
- Personalized financial advice

---

## 📁 Project Structure

```
MumbaiHacks/
├── backend/
│   ├── agents/
│   │   ├── categorization_agent.py      # Transaction categorization
│   │   ├── anomaly_agent.py             # Fraud detection
│   │   ├── goals_agent.py               # Goal feasibility analysis
│   │   ├── recurring_detection_agent.py # Recurring transaction detection
│   │   └── ai_coach_langgraph.py        # Conversational AI coach
│   ├── config/
│   │   ├── categorization_agents.yaml   # Agent configurations
│   │   ├── categorization_tasks.yaml    # Task definitions
│   │   ├── anomaly_agents.yaml
│   │   ├── anomaly_tasks.yaml
│   │   ├── goals_agents.yaml
│   │   └── goals_tasks.yaml
│   ├── scripts/
│   │   ├── test_transaction_trigger.py  # Test script for transactions
│   │   └── transactions.json            # Sample transaction data
│   ├── app.py                           # FastAPI application
│   ├── firestore_service.py             # Firestore operations
│   ├── setu_service.py                  # Setu API integration
│   ├── transaction_monitor_service.py   # Real-time monitoring
│   ├── crewai_service.py                # CrewAI orchestration
│   ├── requirements.txt                 # Python dependencies
│   └── .env                             # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── HomePage.tsx             # Landing page
│   │   │   ├── DashboardPage.tsx        # Main dashboard
│   │   │   ├── TransactionsPage.tsx     # Transaction list
│   │   │   ├── GoalsPage.tsx            # Financial goals
│   │   │   ├── RemindersPage.tsx        # Alerts & notifications
│   │   │   ├── AICoachPage.tsx          # AI coach chat
│   │   │   ├── SettingsPage.tsx         # User settings
│   │   │   ├── LoginPage.tsx            # Authentication
│   │   │   ├── SetuCallback.tsx         # Setu redirect handler
│   │   │   └── ui/                      # Reusable UI components
│   │   ├── contexts/
│   │   │   ├── AuthContext.ts           # Authentication state
│   │   │   └── BankContext.ts           # Bank data state
│   │   ├── api.ts                       # API client
│   │   ├── firebase.ts                  # Firebase config
│   │   ├── App.tsx                      # Main app component
│   │   └── main.tsx                     # Entry point
│   ├── package.json                     # Node dependencies
│   ├── vite.config.ts                   # Vite configuration
│   ├── tailwind.config.js               # Tailwind CSS config
│   └── .env                             # Environment variables
│
└── README.md                            # This file
```

---

## 🧪 Testing

### Test Transaction Script

Add test transactions to Firestore and trigger AI categorization:

```bash
cd backend/scripts
python test_transaction_trigger.py
```

**Options**:
1. Add a single test transaction
2. Add multiple test transactions (5 transactions)
3. Add many test transactions (10+ transactions)

### Transaction Monitor Service

Run the real-time transaction monitor:

```bash
cd backend
python transaction_monitor_service.py
```

This service:
- Listens for new transactions in Firestore
- Triggers AI categorization automatically
- Runs anomaly detection
- Creates alerts for suspicious activities

---

## 🔐 Security Features

- **Firebase Authentication**: Secure user authentication with Google Sign-In
- **Firestore Security Rules**: Row-level security for user data
- **Consent-based Banking**: AA framework for secure bank data access
- **Anomaly Detection**: Real-time fraud detection and alerts
- **CORS Protection**: Configured for trusted origins only
- **API Rate Limiting**: Protection against abuse
- **Encrypted Communication**: HTTPS for all API calls

---

## 🎨 UI Components

Built with modern, accessible UI components:
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Motion**: Smooth animations and transitions
- **Recharts**: Interactive data visualizations
- **Lucide Icons**: Beautiful, consistent icons

---

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## 📈 Future Enhancements

- [ ] Mobile application (React Native)
- [ ] Investment tracking and analysis
- [ ] Tax planning assistance
- [ ] Multi-currency support
- [ ] Voice-based AI coach
- [ ] Advanced analytics and predictions
- [ ] Social features (shared goals, challenges)
- [ ] Integration with more banks
- [ ] Automated bill payments
- [ ] Credit score monitoring

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Project Contributors**:
- Developer: Lakshman
- Project: MumbaiHacks Hackathon Submission

---

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@finpath.example.com
- Documentation: [Wiki](https://github.com/lakshman52264/MumbaiHacks/wiki)

---

## 🙏 Acknowledgments

- **Setu**: For providing the Account Aggregator API
- **Firebase**: For backend infrastructure
- **CrewAI**: For multi-agent AI framework
- **LangChain**: For LLM integration tools
- **Google**: For Gemini AI models
- **OpenAI**: For GPT models
- **Radix UI**: For accessible components
- **Tailwind Labs**: For Tailwind CSS

---

<div align="center">

**Made with ❤️ for better financial wellness**

[⬆ Back to Top](#finpath---ai-powered-personal-finance-management-platform)

</div>
