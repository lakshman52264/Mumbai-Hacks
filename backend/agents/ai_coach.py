"""
AI Financial Coach - Complete Implementation
3-Agent System with Mem0 Integration

Author: Abhay (NTT Data)
Date: November 2025
"""

import os
import asyncio
import json
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, ValidationError
from typing import Type
from crewai_tools import SerperDevTool
import yaml

import firebase_admin
from firebase_admin import credentials, firestore

# Import Mem0 integration (relative import within agents package)
from .memo_database import get_memory_client

# Load environment variables
load_dotenv()

# Initialize Firebase
if not firebase_admin._apps:
    try:
        cred_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json'
        )
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase initialization error: {e}")

db = firestore.client()

# Initialize Mem0 client
memory_client = get_memory_client()

# # API Key rotation for Gemini
# API_KEYS = [
#     os.getenv("GEMINI_API_KEY"),
#     os.getenv("GEMINI_API_KEY2"),
#     os.getenv("GEMINI_API_KEY3"),
#     os.getenv("GEMINI_API_KEY4")
# ]
# API_KEYS = [key for key in API_KEYS if key]
# current_api_key_index = 0


# def get_next_api_key():
#     """Rotate to next available API key."""
#     global current_api_key_index
#     if not API_KEYS:
#         return None
#     current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
#     return API_KEYS[current_api_key_index]


# def get_current_api_key():
#     """Get current API key."""
#     if not API_KEYS:
#         return None
#     return API_KEYS[current_api_key_index]


# Initialize LLM
llm = LLM(
    model="openai/gpt-5-nano"
)

# Initialize web search
search_tool = SerperDevTool(
    country="in",
    location="India",
    n_results=3
)


# ===========================
# TOOL INPUT SCHEMAS
# ===========================

class GetTransactionsInput(BaseModel):
    """Input schema for GetTransactionsTool"""
    user_id: str = Field(description="The user ID to fetch transactions for")
    filters: dict = Field(
        default={},
        description="Filters: category, date_range, merchant, min_amount, max_amount, transaction_type, anomaly_flag, limit"
    )


class GetAnomaliesInput(BaseModel):
    """Input schema for GetAnomaliesTool"""
    user_id: str = Field(description="The user ID to fetch alerts for")
    filters: dict = Field(
        default={},
        description="Filters: severity, alert_type, date_range, resolved, limit"
    )


class GetGoalsInput(BaseModel):
    """Input schema for GetGoalsTool"""
    user_id: str = Field(description="The user ID to fetch goals for")
    goal_id: Optional[str] = Field(default=None, description="Specific goal ID (optional)")


class GetEMIInput(BaseModel):
    """(Deprecated) Input schema for EMI tool - kept for backward compatibility only"""
    user_id: str = Field(description="The user ID to fetch EMI data for (deprecated)")


class GetCashflowProjectionInput(BaseModel):
    """Input schema for GetCashflowProjectionTool"""
    user_id: str = Field(description="The user ID")
    months: int = Field(default=6, description="Number of months to project (1-12)")


class ReadMemoryInput(BaseModel):
    """Input schema for reading Mem0 memory"""
    query: str = Field(description="The search query or context to retrieve")
    user_id: str = Field(description="The user ID")


class WriteMemoryInput(BaseModel):
    """Input schema for writing to Mem0 memory"""
    query: str = Field(description="The user query that was answered")
    user_id: str = Field(description="The user ID")
    messages: list = Field(description="Conversation messages to store")


class CallFinancialAnalystInput(BaseModel):
    """Input for delegating to financial analyst agent"""
    user_id: str = Field(description="User ID")
    query: str = Field(description="Financial query (spending, goals, or comprehensive)")
    context: dict = Field(default={}, description="Additional context")


# ===========================
# FIRESTORE TOOLS
# ===========================

class GetTransactionsTool(BaseTool):
    """Fetch user transactions from Firestore"""
    name: str = "get_transactions"
    description: str = "Fetch user transactions with filters (category, date_range, merchant, amount, anomaly_flag)"
    args_schema: Type[BaseModel] = GetTransactionsInput
   
    def _run(self, user_id: str, filters: dict = None) -> dict:
        try:
            if filters is None:
                filters = {}
           
            transactions_ref = db.collection('users').document(user_id).collection('transactions')
            query = transactions_ref
           
            # Apply filters
            if 'category' in filters and filters['category']:
                query = query.where('category', '==', filters['category'])
            if 'transaction_type' in filters:
                query = query.where('type', '==', filters['transaction_type'])
            if 'anomaly_flag' in filters and filters['anomaly_flag']:
                query = query.where('is_anomaly', '==', True)
           
            # Date range
            if 'date_range' in filters:
                dr = filters['date_range']
                if 'start' in dr:
                    query = query.where('timestamp', '>=', datetime.fromisoformat(dr['start']))
                if 'end' in dr:
                    query = query.where('timestamp', '<=', datetime.fromisoformat(dr['end']))
           
            limit = min(filters.get('limit', 100), 500)
            query = query.limit(limit)
            query = query.order_by('timestamp', direction=firestore.Query.DESCENDING)
           
            docs = query.stream()
            transactions = []
            for doc in docs:
                trans_data = doc.to_dict()
                trans_data['transaction_id'] = doc.id
                transactions.append(trans_data)
           
            # Post-query filters
            if 'merchant' in filters and filters['merchant']:
                merchant_filter = filters['merchant'].lower()
                transactions = [t for t in transactions if merchant_filter in t.get('merchant', '').lower()]
            if 'min_amount' in filters:
                transactions = [t for t in transactions if t.get('amount', 0) >= filters['min_amount']]
            if 'max_amount' in filters:
                transactions = [t for t in transactions if t.get('amount', 0) <= filters['max_amount']]
           
            # Aggregations
            total_amount = sum(t.get('amount', 0) for t in transactions)
            total_count = len(transactions)
            avg_amount = total_amount / total_count if total_count > 0 else 0
           
            by_category = {}
            by_merchant = {}
            for t in transactions:
                cat = t.get('category', 'Uncategorized')
                by_category[cat] = by_category.get(cat, 0) + t.get('amount', 0)
               
                merchant = t.get('merchant', 'Unknown')
                if merchant not in by_merchant:
                    by_merchant[merchant] = {'amount': 0, 'count': 0}
                by_merchant[merchant]['amount'] += t.get('amount', 0)
                by_merchant[merchant]['count'] += 1
           
            top_merchants = sorted(by_merchant.items(), key=lambda x: x[1]['amount'], reverse=True)[:10]
            by_merchant = dict(top_merchants)
           
            return {
                "success": True,
                "transactions": transactions,
                "aggregations": {
                    "total_count": total_count,
                    "total_amount": round(total_amount, 2),
                    "avg_amount": round(avg_amount, 2),
                    "by_category": by_category,
                    "by_merchant": by_merchant
                }
            }
        except Exception as e:
            print(f"❌ Error fetching transactions: {e}")
            return {"success": False, "error": str(e), "transactions": [], "aggregations": {}}


class GetAnomaliesTool(BaseTool):
    """Fetch user alerts/anomalies from Firestore"""
    name: str = "get_anomalies"
    description: str = "Fetch user alerts and anomalies (fraud, unusual spending, threshold breaches)"
    args_schema: Type[BaseModel] = GetAnomaliesInput
   
    def _run(self, user_id: str, filters: dict = None) -> dict:
        try:
            if filters is None:
                filters = {}
           
            alerts_ref = db.collection('users').document(user_id).collection('alerts')
            query = alerts_ref
           
            if 'severity' in filters:
                query = query.where('severity', '==', filters['severity'])
            if 'alert_type' in filters:
                query = query.where('alert_type', '==', filters['alert_type'])
            if 'resolved' in filters:
                query = query.where('resolved', '==', filters['resolved'])
           
            limit = filters.get('limit', 50)
            query = query.limit(limit)
            query = query.order_by('created_at', direction=firestore.Query.DESCENDING)
           
            docs = query.stream()
            alerts = []
            for doc in docs:
                alert_data = doc.to_dict()
                alert_data['alert_id'] = doc.id
                alerts.append(alert_data)
           
            total_count = len(alerts)
            unresolved_count = sum(1 for a in alerts if not a.get('resolved', False))
           
            by_severity = {}
            by_type = {}
            for alert in alerts:
                severity = alert.get('severity', 'unknown')
                alert_type = alert.get('alert_type', 'unknown')
                by_severity[severity] = by_severity.get(severity, 0) + 1
                by_type[alert_type] = by_type.get(alert_type, 0) + 1
           
            return {
                "success": True,
                "alerts": alerts,
                "summary": {
                    "total_count": total_count,
                    "unresolved_count": unresolved_count,
                    "by_severity": by_severity,
                    "by_type": by_type
                }
            }
        except Exception as e:
            print(f"❌ Error fetching anomalies: {e}")
            return {"success": False, "error": str(e), "alerts": [], "summary": {}}


class GetGoalsTool(BaseTool):
    """Fetch user financial goals from Firestore"""
    name: str = "get_goals"
    description: str = "Fetch user's financial goals with progress, targets, deadlines, and status"
    args_schema: Type[BaseModel] = GetGoalsInput
   
    def _calculate_goal_status(self, goal_data: dict) -> dict:
        """Calculate goal status"""
        target = goal_data.get('target_amount', 0)
        saved = goal_data.get('current_amount', 0)
        remaining = target - saved
        progress = (saved / target * 100) if target > 0 else 0
       
        deadline_str = goal_data.get('deadline')
        if deadline_str:
            deadline = datetime.fromisoformat(str(deadline_str).replace('Z', '+00:00'))
            months_remaining = max(0, (deadline - datetime.now()).days / 30)
        else:
            months_remaining = 0
            deadline = None
       
        required_monthly = remaining / months_remaining if months_remaining > 0 else remaining
       
        # Determine status
        if progress >= 100:
            status = "completed"
            risk_level = "none"
        elif months_remaining <= 0:
            status = "overdue"
            risk_level = "high"
        else:
            contribution_history = goal_data.get('contribution_history', [])
            if contribution_history:
                recent = contribution_history[-3:]
                avg_monthly = sum(c.get('amount', 0) for c in recent) / len(recent)
            else:
                created_at = goal_data.get('created_at')
                if created_at:
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    months_elapsed = max(1, (datetime.now() - created_at).days / 30)
                    avg_monthly = saved / months_elapsed
                else:
                    avg_monthly = 0
           
            shortfall = required_monthly - avg_monthly
            if shortfall <= 0:
                status = "on_track"
                risk_level = "low"
            elif shortfall < required_monthly * 0.3:
                status = "slightly_behind"
                risk_level = "medium"
            else:
                status = "at_risk"
                risk_level = "high"
       
        return {
            "status": status,
            "risk_level": risk_level,
            "progress_percentage": round(progress, 2),
            "amount_saved": round(saved, 2),
            "amount_remaining": round(remaining, 2),
            "months_remaining": round(months_remaining, 1),
            "required_monthly_contribution": round(required_monthly, 2),
            "estimated_current_monthly": round(avg_monthly, 2) if 'avg_monthly' in locals() else 0,
            "shortfall": round(shortfall, 2) if 'shortfall' in locals() else 0,
            "deadline": deadline.isoformat() if deadline else None
        }
   
    def _run(self, user_id: str, goal_id: Optional[str] = None) -> dict:
        try:
            goals_ref = db.collection('users').document(user_id).collection('goals')
           
            if goal_id:
                doc = goals_ref.document(goal_id).get()
                if not doc.exists:
                    return {"success": False, "error": f"Goal {goal_id} not found", "goals": []}
                goal_data = doc.to_dict()
                goal_data['goal_id'] = doc.id
                goal_data['status_details'] = self._calculate_goal_status(goal_data)
                goals = [goal_data]
            else:
                docs = goals_ref.stream()
                goals = []
                for doc in docs:
                    goal_data = doc.to_dict()
                    goal_data['goal_id'] = doc.id
                    goal_data['status_details'] = self._calculate_goal_status(goal_data)
                    goals.append(goal_data)
           
            total_goals = len(goals)
            total_target = sum(g.get('target_amount', 0) for g in goals)
            total_saved = sum(g.get('current_amount', 0) for g in goals)
            overall_progress = (total_saved / total_target * 100) if total_target > 0 else 0
           
            status_counts = {"completed": 0, "on_track": 0, "slightly_behind": 0, "at_risk": 0, "overdue": 0}
            for goal in goals:
                status = goal['status_details']['status']
                status_counts[status] = status_counts.get(status, 0) + 1
           
            return {
                "success": True,
                "goals": goals,
                "summary": {
                    "total_goals": total_goals,
                    "completed": status_counts['completed'],
                    "on_track": status_counts['on_track'],
                    "at_risk": status_counts['at_risk'] + status_counts['overdue'],
                    "slightly_behind": status_counts['slightly_behind'],
                    "total_target": round(total_target, 2),
                    "total_saved": round(total_saved, 2),
                    "overall_progress": round(overall_progress, 2)
                }
            }
        except Exception as e:
            print(f"❌ Error fetching goals: {e}")
            return {"success": False, "error": str(e), "goals": [], "summary": {}}

class GetCashflowProjectionTool(BaseTool):
    """Project future cashflow"""
    name: str = "get_cashflow_projection"
    description: str = "Project cashflow for 1-12 months based on transaction history, EMIs, and recurring expenses"
    args_schema: Type[BaseModel] = GetCashflowProjectionInput
   
    def _run(self, user_id: str, months: int = 6) -> dict:
        try:
            if months < 1 or months > 12:
                months = 6
           
            # Fetch last 3 months transactions
            three_months_ago = datetime.now() - timedelta(days=90)
            transactions_ref = db.collection('users').document(user_id).collection('transactions')
            query = transactions_ref.where('timestamp', '>=', three_months_ago)
            docs = query.stream()
            transactions = [doc.to_dict() for doc in docs]
           
            income_transactions = [t for t in transactions if t.get('type') == 'credit']
            expense_transactions = [t for t in transactions if t.get('type') == 'debit']
           
            total_income = sum(t.get('amount', 0) for t in income_transactions)
            total_expenses = sum(t.get('amount', 0) for t in expense_transactions)
           
            avg_monthly_income = total_income / 3
            avg_monthly_expenses = total_expenses / 3
           
            # Fetch EMI data
            emi_ref = db.collection('users').document(user_id).collection('emi')
            emi_docs = emi_ref.where('status', '==', 'active').stream()
            monthly_emi = sum(doc.to_dict().get('monthly_amount', 0) for doc in emi_docs)
           
            # Recurring expenses
            recurring_expenses = [t for t in expense_transactions if t.get('is_recurring') or t.get('is_subscription')]
            recurring_by_merchant = {}
            for t in recurring_expenses:
                merchant = t.get('merchant', 'Unknown')
                if merchant not in recurring_by_merchant:
                    recurring_by_merchant[merchant] = []
                recurring_by_merchant[merchant].append(t.get('amount', 0))
           
            monthly_recurring = sum(sum(amounts) / len(amounts) for amounts in recurring_by_merchant.values())
           
            # Project
            projection = []
            current_date = datetime.now()
           
            for i in range(months):
                month_date = current_date + timedelta(days=30 * i)
                projected_income = avg_monthly_income
                projected_fixed = monthly_emi + monthly_recurring
                projected_variable = (avg_monthly_expenses - projected_fixed) * random.uniform(0.9, 1.1)
                projected_expenses = projected_fixed + projected_variable
                projected_savings = projected_income - projected_expenses
               
                projection.append({
                    "month": month_date.strftime("%b %Y"),
                    "month_number": i + 1,
                    "projected_income": round(projected_income, 2),
                    "projected_expenses": round(projected_expenses, 2),
                    "projected_fixed_expenses": round(projected_fixed, 2),
                    "projected_variable_expenses": round(projected_variable, 2),
                    "projected_savings": round(projected_savings, 2),
                    "savings_rate": round((projected_savings / projected_income * 100) if projected_income > 0 else 0, 2)
                })
           
            avg_savings = sum(p['projected_savings'] for p in projection) / len(projection)
            avg_savings_rate = sum(p['savings_rate'] for p in projection) / len(projection)
            confidence = min(1.0, len(transactions) / 100)
           
            return {
                "success": True,
                "projection": projection,
                "summary": {
                    "avg_monthly_income": round(avg_monthly_income, 2),
                    "avg_monthly_expenses": round(avg_monthly_expenses, 2),
                    "avg_monthly_fixed": round(monthly_emi + monthly_recurring, 2),
                    "avg_monthly_savings": round(avg_savings, 2),
                    "savings_rate": round(avg_savings_rate, 2)
                },
                "confidence": round(confidence, 2)
            }
        except Exception as e:
            print(f"❌ Error projecting cashflow: {e}")
            return {"success": False, "error": str(e), "projection": [], "summary": {}}


# ===========================
# MEM0 TOOLS
# ===========================

class ReadMemoryTool(BaseTool):
    """Read user memory from Mem0 using advanced search"""
    name: str = "read_memory"
    description: str = "Read user's financial memory including priorities, past insights, preferences, and behavioral patterns from Mem0. Uses semantic search with filters."
    args_schema: Type[BaseModel] = ReadMemoryInput
   
    def _run(self, query: str, user_id: str) -> dict:
        """
        Read memories using the updated mem0_integration.py methods.
        Now supports advanced filtering and semantic search.
        """
        try:
            # Use the new get_user_context method from updated mem0_integration.py
            result = memory_client.get_user_context(
                user_id=user_id,
                query=query,
                limit=10
            )
           
            if result.get('success'):
                print(f"✅ Retrieved memory for user {user_id}: {result['memory_count']} memories")
                return result['context']
            else:
                print(f"⚠️ No memories found for user {user_id}")
                return {
                    "financial_priorities": [],
                    "past_insights": [],
                    "behavioral_patterns": [],
                    "user_preferences": []
                }
        except Exception as e:
            print(f"❌ Error reading memory: {e}")
            return {
                "financial_priorities": [],
                "past_insights": [],
                "behavioral_patterns": [],
                "user_preferences": []
            }


class WriteMemoryTool(BaseTool):
    """Write to user memory in Mem0 with session management"""
    name: str = "write_memory"
    description: str = "Store coaching session insights, recommendations, and context in Mem0 for future personalization. Supports session-based and user-based memory."
    args_schema: Type[BaseModel] = WriteMemoryInput
   
    def _run(self, query: str, user_id: str, messages: list) -> dict:
        """
        Write memories using the updated mem0_integration.py methods.
        Now supports session_id, metadata, and automatic inference.
        """
        try:
            # Extract response from messages
            response = ""
            for msg in messages:
                if msg.get('role') == 'assistant':
                    response = msg.get('content', '')
           
            if not response:
                response = "Coaching session completed"
           
            # Use the new add_coaching_session method with all features
            result = memory_client.add_coaching_session(
                user_id=user_id,
                query=query,
                response=response,
                session_id=f"coach_session_{datetime.now().strftime('%Y%m%d')}",  # Daily session grouping
                agent_id="financial_coach_meta_agent",
                metadata={
                    "session_type": "financial_coaching",
                    "timestamp": datetime.now().isoformat(),
                    "query_type": "general"  # Can be enhanced with intent classification
                },
                infer=True  # Enable automatic memory extraction
            )
           
            if result.get('success'):
                print(f"✅ Stored memory for user {user_id} (Memory IDs: {len(result.get('memory_ids', []))})")
                return {"success": True, "message": "Memory stored successfully", "memory_ids": result.get('memory_ids', [])}
            else:
                print(f"⚠️ Failed to store memory for user {user_id}")
                return {"success": False, "error": result.get('error', 'Unknown error')}
        except Exception as e:
            print(f"❌ Error writing memory: {e}")
            return {"success": False, "error": str(e)}


# ===========================
# AGENT DELEGATION TOOLS
# ===========================

# This will be initialized after crew definitions
call_financial_analyst_tool = None


# ===========================
# OUTPUT EXTRACTION HELPERS
# ===========================

def _model_to_dict(model_obj: Any) -> Dict[str, Any]:
    """Convert Pydantic model to dict"""
    if model_obj is None:
        return {}
    if isinstance(model_obj, dict):
        return model_obj
    if hasattr(model_obj, "model_dump"):
        return model_obj.model_dump()
    if hasattr(model_obj, "dict"):
        return model_obj.dict()
    return {}


def _extract_structured_output(raw_output: Any) -> Dict[str, Any]:
    """Extract JSON from CrewAI output"""
    if raw_output is None:
        return {}
    if isinstance(raw_output, dict):
        return raw_output

    # Try to get json_dict first (CrewAI TaskOutput attribute)
    if hasattr(raw_output, 'json_dict') and raw_output.json_dict:
        result = getattr(raw_output, 'json_dict')
        if isinstance(result, dict):
            return result

    # Try pydantic model
    if hasattr(raw_output, 'pydantic'):
        pydantic_obj = getattr(raw_output, 'pydantic')
        if pydantic_obj is not None:
            return _model_to_dict(pydantic_obj)

    # Try other common attributes
    for attr in ("raw", "raw_output", "output", "final_output", "content", "response"):
        if hasattr(raw_output, attr):
            attr_value = getattr(raw_output, attr)
            if attr_value:
                parsed = _extract_structured_output(attr_value)
                if parsed:
                    return parsed

    # If it's a string, try to parse JSON from it
    if isinstance(raw_output, str):
        try:
            cleaned = raw_output.strip()
            # Remove markdown code blocks
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                cleaned = "\n".join(lines)
            if cleaned.endswith("```"):
                cleaned = "\n".join(cleaned.split("\n")[:-1])

            cleaned = cleaned.strip()

            # Try direct JSON parse first
            try:
                return json.loads(cleaned)
            except:
                pass

            # Find the last complete JSON object
            depth = 0
            start_idx = None
            last_obj = ""
            for idx, ch in enumerate(cleaned):
                if ch == "{":
                    if depth == 0:
                        start_idx = idx
                    depth += 1
                elif ch == "}":
                    if depth:
                        depth -= 1
                        if depth == 0 and start_idx is not None:
                            last_obj = cleaned[start_idx : idx + 1]

            if last_obj:
                return json.loads(last_obj)
        except Exception as e:
            print(f"⚠️ Warning: Failed to parse JSON from string: {e}")

    return {}


# ===========================
# CONFIG LOADING HELPER
# ===========================

def _load_yaml_config(relative_path: str) -> dict:
    """Load YAML config file with proper path resolution"""
    try:
        config_path = os.path.join(os.path.dirname(__file__), relative_path)
        print(f"🔍 Attempting to load config from: {config_path}")

        if not os.path.exists(config_path):
            print(f"⚠️ WARNING: Config file not found at {config_path}")
            return {}

        with open(config_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
            print(f"✅ Successfully loaded config with {len(data)} top-level keys")
            return data
    except Exception as e:
        print(f"❌ ERROR loading YAML config from {relative_path}: {e}")
        import traceback
        traceback.print_exc()
        return {}

# Load configs once at module level
_AGENTS_CONFIG = _load_yaml_config('../config/ai_coach_agents.yaml')
_TASKS_CONFIG = _load_yaml_config('../config/ai_coach_tasks.yaml')

print(f"\n{'='*80}")
print(f"🔧 AI Coach Module Loading...")
print(f"✅ Loaded agent configs with keys: {list(_AGENTS_CONFIG.keys())}")
print(f"✅ Loaded task configs with keys: {list(_TASKS_CONFIG.keys())}")
print(f"{'='*80}\n")


# ===========================
# CREW 1: FINANCIAL ANALYST (Combined Spending + Goals)
# ===========================

class FinancialAnalystCrew:
    """Comprehensive financial analyst crew - handles spending, goals, and cashflow analysis"""

    def __init__(self):
        self.agents_config = _AGENTS_CONFIG
        self.tasks_config = _TASKS_CONFIG

    def financial_analyst_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['financial_analyst_agent'],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            tools=[
                GetTransactionsTool(),
                GetAnomaliesTool(),
                GetGoalsTool(),
                GetCashflowProjectionTool(),
                search_tool
            ],
            max_retry_limit=3
        )

    def financial_analysis_task(self) -> Task:
        return Task(
            config=self.tasks_config['financial_analysis_task'],
            agent=self.financial_analyst_agent()
        )

    def crew(self) -> Crew:
        return Crew(
            agents=[self.financial_analyst_agent()],
            tasks=[self.financial_analysis_task()],
            process=Process.sequential,
            verbose=True
        )


# ===========================
# DELEGATION CALLBACKS
# ===========================

def execute_financial_analyst_agent(user_id: str, query: str, context: dict) -> dict:
    """Execute comprehensive financial analyst agent"""
    try:
        print(f"📊 Executing Financial Analyst Agent for: {query}")
        crew_instance = FinancialAnalystCrew()
        crew_obj = crew_instance.crew()
        inputs = {'user_query': query, 'user_id': user_id, 'analysis_context': json.dumps(context)}
        result = crew_obj.kickoff(inputs=inputs)
        output = _extract_structured_output(result)
        if not output:
            output = {
                "analysis_type": "comprehensive_financial_analysis",
                "user_query": query,
                "spending_insights": {"summary": str(result)},
                "goals_insights": {},
                "confidence_score": 0.7
            }
        return output
    except Exception as e:
        print(f"❌ Error in financial analyst agent: {e}")
        return {"analysis_type": "comprehensive_financial_analysis", "error": str(e), "success": False}


# ===========================
# DELEGATION TOOLS
# ===========================

class CallFinancialAnalystAgentTool(BaseTool):
    """Delegate to comprehensive financial analyst agent"""
    name: str = "call_financial_analyst_agent"
    description: str = """Delegate financial queries to the financial analyst agent.
    Use for ANY financial analysis including:
    - Spending patterns, transactions, categories, merchants, anomalies
    - Financial goals, savings, progress tracking, EMI, projections, timelines
    - Comprehensive financial health and cashflow analysis
    The analyst will fetch all necessary data and provide complete analysis connecting spending and goals."""
    args_schema: Type[BaseModel] = CallFinancialAnalystInput

    def _run(self, user_id: str, query: str, context: dict = None) -> dict:
        if context is None:
            context = {}
        result = execute_financial_analyst_agent(user_id=user_id, query=query, context=context)
        return {"success": True, "agent_type": "financial_analyst", "result": result}


# Initialize delegation tool
call_financial_analyst_tool = CallFinancialAnalystAgentTool()


# ===========================
# CREW 3: META FINANCIAL COACH
# ===========================

class FinancialCoachCrew:
    """Meta financial coach orchestrator"""

    def __init__(self):
        self.agents_config = _AGENTS_CONFIG
        self.tasks_config = _TASKS_CONFIG

    def financial_coach_meta_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['financial_coach_meta_agent'],
            llm=llm,
            verbose=True,
            allow_delegation=True,
            tools=[
                call_financial_analyst_tool,
                search_tool,
                ReadMemoryTool(),
                WriteMemoryTool()
            ],
            max_retry_limit=3
        )

    def coach_synthesis_task(self) -> Task:
        return Task(
            config=self.tasks_config['coach_synthesis_task'],
            agent=self.financial_coach_meta_agent()
        )

    def crew(self) -> Crew:
        return Crew(
            agents=[self.financial_coach_meta_agent()],
            tasks=[self.coach_synthesis_task()],
            process=Process.sequential,
            verbose=True
        )


# ===========================
# MAIN EXECUTION FUNCTION
# ===========================

async def get_financial_coaching(
    user_id: str,
    user_query: str,
    conversation_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main function to get AI financial coaching.
   
    Args:
        user_id: User ID
        user_query: User's question
        conversation_context: Optional conversation history
   
    Returns:
        dict: Financial coaching response with insights and recommendations
    """
    try:
        print(f"\n{'='*80}")
        print(f"🤖 AI Financial Coach Processing Query")
        print(f"User: {user_id}")
        print(f"Query: {user_query}")
        print(f"{'='*80}\n")
       
        if conversation_context is None:
            conversation_context = {}

        # Create meta coach crew
        print("🔧 DEBUG: About to instantiate FinancialCoachCrew")

        coach_crew_instance = FinancialCoachCrew()

        print(f"🔧 DEBUG: Instance created, type of agents_config: {type(coach_crew_instance.agents_config)}")
        print(f"🔧 DEBUG: agents_config keys: {list(coach_crew_instance.agents_config.keys())}")


        coach_crew_instance = FinancialCoachCrew()

        print(f"🔧 DEBUG: Instance created, type of agents_config: {type(coach_crew_instance.agents_config)}")
        print(f"🔧 DEBUG: agents_config value: {coach_crew_instance.agents_config if isinstance(coach_crew_instance.agents_config, str) else f'Dict with {len(coach_crew_instance.agents_config)} keys'}")

        coach_crew = coach_crew_instance.crew()
       
        # Prepare inputs
        inputs = {
            'user_query': user_query,
            'user_id': user_id,
            'conversation_context': json.dumps(conversation_context)
        }
       
        # Execute
        result = coach_crew.kickoff(inputs=inputs)

        print(f"🔍 DEBUG: Result type: {type(result)}")
        print(f"🔍 DEBUG: Result attributes: {dir(result) if hasattr(result, '__dict__') else 'N/A'}")

        # Extract output
        structured_output = _extract_structured_output(result)

        print(f"🔍 DEBUG: Extracted output type: {type(structured_output)}")
        print(f"🔍 DEBUG: Extracted output keys: {list(structured_output.keys()) if isinstance(structured_output, dict) else 'Not a dict'}")

        if not structured_output:
            # Enhanced error message with debugging info
            error_msg = f"Meta coach did not return structured output.\n"
            error_msg += f"Result type: {type(result)}\n"
            if hasattr(result, '__dict__'):
                error_msg += f"Available attributes: {list(result.__dict__.keys())}\n"
            error_msg += f"Raw result: {str(result)[:500]}"
            raise ValueError(error_msg)
       
        output = {
            "status": "completed",
            "success": True,
            "coach_response": structured_output,
            "model": "gemini-2.0-flash-exp",
            "timestamp": datetime.now().isoformat()
        }
       
        print(f"\n{'='*80}")
        print(f"✅ Financial Coaching Completed")
        print(f"Response Type: {structured_output.get('response_type', 'unknown')}")
        print(f"Confidence: {structured_output.get('confidence_score', 0)}")
        print(f"{'='*80}\n")
       
        return json.loads(json.dumps(output))
   
    except Exception as e:
        print(f"\n{'='*80}")
        print(f"❌ Error in Financial Coaching: {e}")
        print(f"{'='*80}\n")
       
        return {
            "status": "failed",
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


# ===========================
# TESTING
# ===========================

async def test_financial_coach():
    """Test function for the refactored AI coach with combined financial analyst"""

    print("\n" + "="*80)
    print("TEST 1: COMPREHENSIVE FINANCIAL QUERY (Spending + Goals)")
    print("="*80)
    result1 = await get_financial_coaching(
        user_id="X39Jaj9TgnaADkjjz3qsg7xmdGE2",
        user_query="How is my spending affecting my savings goals?"
    )
    print(json.dumps(result1, indent=2))

    print("\n" + "="*80)
    print("TEST 2: SPECIFIC GOAL QUERY")
    print("="*80)
    result2 = await get_financial_coaching(
        user_id="X39Jaj9TgnaADkjjz3qsg7xmdGE2",
        user_query="Am I on track for my car goal?"
    )
    print(json.dumps(result2, indent=2))

    print("\n" + "="*80)
    print("TEST 3: GENERAL GREETING")
    print("="*80)
    result3 = await get_financial_coaching(
        user_id="X39Jaj9TgnaADkjjz3qsg7xmdGE2",
        user_query="Hi! Give me a quick financial summary"
    )
    print(json.dumps(result3, indent=2))


if __name__ == "__main__":
    asyncio.run(test_financial_coach())