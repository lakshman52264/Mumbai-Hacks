import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, TypedDict
from dotenv import load_dotenv
import yaml
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore import FieldFilter
import logging
try:
    from .memo_database import get_memory_client
except Exception:
    get_memory_client = None

try:
    from .mutual_funds_knowledge import get_mutual_fund_recommendations
except Exception:
    get_mutual_fund_recommendations = None

load_dotenv()
from openai import OpenAI

if not firebase_admin._apps:
    try:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        pass

db = firestore.client()
memory_client = None
try:
    if get_memory_client:
        memory_client = get_memory_client()
except Exception:
    memory_client = None

# OpenAI setup (uses env var OPENAI_API_KEY and optional OPENAI_MODEL)
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
DEFAULT_OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')

# Logger for backend diagnostics
logger = logging.getLogger(__name__)
if not logger.handlers:
    # Avoid configuring basicConfig if the application has already set logging
    logging.basicConfig(level=logging.INFO)

def _call_openai_chat(messages, model: Optional[str] = None, max_tokens: int = 512, temperature: float = 0.0) -> str:
    try:
        model_to_use = model or DEFAULT_OPENAI_MODEL
        resp = openai_client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        return resp.choices[0].message.content
    except Exception as e:
        raise

def _load_yaml_config(relative_path: str) -> dict:
    try:
        config_path = os.path.join(os.path.dirname(__file__), relative_path)
        if not os.path.exists(config_path):
            return {}
        with open(config_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
            return data
    except Exception:
        return {}

_AGENTS_CONFIG = _load_yaml_config('../config/ai_coach_agents.yaml')
_TASKS_CONFIG = _load_yaml_config('../config/ai_coach_tasks.yaml')

class CoachState(TypedDict, total=False):
    user_id: str
    user_query: str
    conversation_context: Dict[str, Any]
    filters: Dict[str, Any]
    intent_category: str
    memory_context: Dict[str, Any]
    analyst_output: Dict[str, Any]
    coach_response: Dict[str, Any]
    route: str
    errors: List[str]

def _classify_intent(state: CoachState) -> CoachState:
    # Use OpenAI to classify intent into categories A (greeting), B (lookup), C (financial coaching)
    q = (state.get('user_query') or '').strip()
    if not q:
        state['intent_category'] = 'C'
        return state
    system = {
        "role": "system",
        "content": (
            "You are an intent classifier. Classify the user's query into one of three categories:\n"
            "A: greeting (simple salutations and thanks),\nB: information lookup (asks for definition/explanation),\n"
            "C: financial coaching/analytics (spending, goals, transactions, anomalies).\n"
            "Return only the single letter A, B, or C as the answer, nothing else."
        )
    }
    user = {"role": "user", "content": q}
    try:
        out = _call_openai_chat([system, user], temperature=0.0, max_tokens=10)
        lbl = (out or '').strip().upper()[:1]
        if lbl not in ('A', 'B', 'C'):
            raise ValueError('invalid label')
        state['intent_category'] = lbl
    except Exception:
        # fallback to deterministic heuristic
        qq = q.lower()
        greet = any(x in qq for x in ["hi", "hello", "hey", "thanks", "thank you", "bye", "ok", "okay", "got it", "namaste", "good morning"]) 
        lookup = qq.startswith("what is") or qq.startswith("who is") or qq.startswith("explain") or ("what does" in qq)
        financial = any(x in qq for x in ["spending", "spent", "transactions", "goal", "goals", "save", "savings", "track", "progress", "budget", "overspend", "afford", "summary", "financial health", "anomaly", "alerts", "emi", "cashflow"])
        if greet:
            state['intent_category'] = 'A'
        elif lookup:
            state['intent_category'] = 'B'
        elif financial:
            state['intent_category'] = 'C'
        else:
            state['intent_category'] = 'C'
    return state

def _respond_greeting(state: CoachState) -> CoachState:
    resp = {
        "response_type": "greeting",
        "user_query": state.get('user_query'),
        "direct_answer": "Hey! I'm your FinPath AI Coach. I can help you track spending, monitor goals, and make smarter money decisions. What would you like to know?",
        "tone": "friendly"
    }
    state['coach_response'] = resp
    return state

def _web_search_lookup(state: CoachState) -> CoachState:
    query = state.get('user_query') or ''
    try:
        system = {"role": "system", "content": "You are a helpful assistant that answers factual questions concisely and cites sources when possible. If you don't know, say so."}
        user = {"role": "user", "content": f"Answer the following query concisely for an end user: {query}\nProvide a short direct answer and a brief 1-2 sentence explanation."}
        out = _call_openai_chat([system, user], temperature=0.2, max_tokens=600)
        resp = {
            "response_type": "information_lookup",
            "user_query": query,
            "direct_answer": out,
            "tone": "informative"
        }
        state['coach_response'] = resp
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
        state['coach_response'] = {
            "response_type": "information_lookup",
            "user_query": query,
            "direct_answer": "",
            "tone": "informative"
        }
    return state

def _read_memory(state: CoachState) -> CoachState:
    try:
        if memory_client:
            res = memory_client.get_user_context(user_id=state.get('user_id'), query=state.get('user_query'), limit=10)
            if res.get('success'):
                state['memory_context'] = res.get('context', {})
            else:
                state['memory_context'] = {"financial_priorities": [], "past_insights": [], "behavioral_patterns": [], "user_preferences": []}
        else:
            state['memory_context'] = {"financial_priorities": [], "past_insights": [], "behavioral_patterns": [], "user_preferences": []}
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
        state['memory_context'] = {"financial_priorities": [], "past_insights": [], "behavioral_patterns": [], "user_preferences": []}
    return state

def _analyst_router(state: CoachState) -> CoachState:
    q = (state.get('user_query') or '').lower()
    spending = any(x in q for x in ["spending", "spent", "transactions", "food", "merchant", "shopping", "groceries", "upi", "analyze", "budget", "expense"])
    goals = any(x in q for x in ["goal", "goals", "progress", "save", "savings", "deadline", "laptop", "vacation", "car", "house"])
    anomalies = any(x in q for x in ["anomaly", "fraud", "alert", "unusual"])
    investments = any(x in q for x in ["mutual fund", "mf", "invest", "sip", "lumpsum", "portfolio", "stock", "equity", "debt", "elss", "recommend fund"])
    comprehensive = any(x in q for x in ["summary", "financial health", "overall", "spending and goals"]) or (spending and goals)
    
    # Auto-detect time ranges
    filters = {}
    if "last month" in q or "this month" in q or "past month" in q:
        now = datetime.now()
        month_start = now.replace(day=1)
        filters['date_range'] = {'start': month_start.isoformat(), 'end': now.isoformat()}
    elif "last 3 months" in q or "past 3 months" in q:
        now = datetime.now()
        three_months_ago = now - timedelta(days=90)
        filters['date_range'] = {'start': three_months_ago.isoformat(), 'end': now.isoformat()}
    elif "last week" in q or "this week" in q:
        now = datetime.now()
        week_start = now - timedelta(days=now.weekday())
        filters['date_range'] = {'start': week_start.isoformat(), 'end': now.isoformat()}
    elif "today" in q:
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        filters['date_range'] = {'start': today_start.isoformat(), 'end': now.isoformat()}
    
    state['filters'] = filters

    if comprehensive:
        state['route'] = 'comprehensive'
    elif investments:
        state['route'] = 'investments'
    elif anomalies:
        state['route'] = 'anomalies'
    elif goals:
        state['route'] = 'goals'
    elif spending:
        state['route'] = 'spending'
    else:
        state['route'] = 'spending'
    return state

def _fetch_mutual_fund_recommendations(state: CoachState) -> CoachState:
    """Fetch mutual fund recommendations based on user query and profile using AI to understand intent"""
    try:
        if not get_mutual_fund_recommendations:
            state.setdefault('errors', []).append("Mutual fund module not available")
            return state

        user_id = state.get('user_id')
        user_query = state.get('user_query', '')

        # Use AI to extract investment parameters from the user's query
        extraction_prompt = {
            "role": "system",
            "content": """You are a financial advisor assistant. Extract investment parameters from user queries.

Available fund categories in the database:
- nifty_50_index (Nifty 50 Index Funds)
- nifty_100_index (Nifty 100 Index Funds)
- large_cap_active (Large Cap Active Funds)
- flexi_cap (Flexi Cap Funds)
- mid_cap (Mid Cap Funds)
- small_cap (Small Cap Funds)
- it_technology (IT/Technology Sector Funds)
- defence (Defence Sector Funds)
- real_estate (Real Estate/Realty Funds)
- gold (Gold Funds)
- silver (Silver Funds)
- elss_tax_saver (ELSS Tax Saver Funds)
- momentum (Momentum/Factor Funds)

Respond with ONLY a JSON object with these fields:
{
  "risk_tolerance": "low" | "moderate" | "high" | "very_high",
  "investment_horizon": "short" | "medium" | "long",
  "investment_amount": number (in rupees),
  "preferred_categories": ["category_id1", "category_id2"] or null,
  "preferred_sectors": ["sector1", "sector2"] or null,
  "category_preference": "equity" | "debt" | "hybrid" | "commodity" | null
}

Examples:
User: "I want to invest in nifty and small cap funds"
Response: {"risk_tolerance": "moderate", "investment_horizon": "medium", "investment_amount": 10000, "preferred_categories": ["nifty_50_index", "small_cap"], "preferred_sectors": null, "category_preference": "equity"}

User: "Suggest low risk gold funds"
Response: {"risk_tolerance": "low", "investment_horizon": "medium", "investment_amount": 10000, "preferred_categories": ["gold"], "preferred_sectors": null, "category_preference": "commodity"}

User: "Technology sector funds for long term aggressive growth"
Response: {"risk_tolerance": "high", "investment_horizon": "long", "investment_amount": 10000, "preferred_categories": ["it_technology"], "preferred_sectors": ["technology", "it"], "category_preference": "equity"}"""
        }

        user_msg = {"role": "user", "content": f"Extract parameters from: {user_query}"}

        try:
            ai_response = _call_openai_chat([extraction_prompt, user_msg], temperature=0.0, max_tokens=200)
            import json
            extracted = json.loads(ai_response)

            risk_profile = extracted.get('risk_tolerance', 'moderate')
            horizon = extracted.get('investment_horizon', 'medium')
            investment_amount = extracted.get('investment_amount', 10000.0)
            preferred_categories = extracted.get('preferred_categories')
            sectors = extracted.get('preferred_sectors')
            category = extracted.get('category_preference')

        except Exception as e:
            logger.warning(f"AI extraction failed, using defaults: {e}")
            risk_profile = 'moderate'
            horizon = 'medium'
            investment_amount = 10000.0
            preferred_categories = None
            sectors = None
            category = None

        user_profile = {
            'risk_tolerance': risk_profile,
            'investment_horizon': horizon,
            'investment_amount': investment_amount,
            'preferred_sectors': sectors,
            'category_preference': category,
            'specific_categories': preferred_categories
        }

        result = get_mutual_fund_recommendations(
            user_id=user_id,
            user_profile=user_profile,
            query=state.get('user_query')
        )

        if result.get('success'):
            state.setdefault('analyst_output', {})['mutual_fund_recommendations'] = {
                'recommendations': result.get('recommendations', []),
                'criteria': result.get('criteria', {}),
                'total_found': result.get('total_found', 0)
            }
        else:
            state.setdefault('errors', []).append(result.get('error', 'Failed to get recommendations'))

    except Exception as e:
        logger.error(f"Error in _fetch_mutual_fund_recommendations: {e}")
        state.setdefault('errors', []).append(str(e))

    return state
def _categorize_transaction(transaction: dict) -> str:
    """Intelligently categorize a transaction based on merchant/description."""
    merchant = (transaction.get('merchant') or transaction.get('description') or '').upper()
    category = transaction.get('category', 'other').lower()

    # If already categorized (not 'other'), keep it
    if category and category != 'other':
        return category

    # Categorize based on merchant patterns
    if any(x in merchant for x in ['ATM/', 'CASH', 'WITHDRAWAL']):
        return 'cash_withdrawal'
    elif any(x in merchant for x in ['FT/', 'FUND TRANSFER', 'NEFT', 'IMPS', 'RTGS']):
        return 'transfers'
    elif any(x in merchant for x in ['UPI/', 'PAYTM', 'PHONEPE', 'GPAY', 'GOOGLEPAY']):
        return 'upi_payments'
    elif any(x in merchant for x in ['GROCERY', 'SUPERMARKET', 'MART', 'STORE', 'BIGBASKET', 'DMART']):
        return 'groceries'
    elif any(x in merchant for x in ['RESTAURANT', 'CAFE', 'ZOMATO', 'SWIGGY', 'FOOD', 'DINING']):
        return 'food_dining'
    elif any(x in merchant for x in ['UBER', 'OLA', 'RAPIDO', 'PETROL', 'FUEL', 'TRANSPORT']):
        return 'transportation'
    elif any(x in merchant for x in ['AMAZON', 'FLIPKART', 'MYNTRA', 'SHOPPING', 'MALL']):
        return 'shopping'
    elif any(x in merchant for x in ['NETFLIX', 'SPOTIFY', 'PRIME', 'ENTERTAINMENT', 'MOVIE', 'CINEMA']):
        return 'entertainment'
    elif any(x in merchant for x in ['ELECTRIC', 'WATER', 'GAS', 'BILL', 'UTILITY']):
        return 'utilities'
    elif any(x in merchant for x in ['MEDICAL', 'HOSPITAL', 'PHARMACY', 'DOCTOR', 'HEALTH']):
        return 'healthcare'
    else:
        return 'other'

def _fetch_transactions(state: CoachState) -> CoachState:
    try:
        # Fetch transactions without applying any filters (server-side or client-side)
        transactions_ref = db.collection('users').document(state.get('user_id')).collection('transactions')

        # Determine a sensible limit (default 200, cap 500). Conversation context may include a desired limit.
        limit_val = 200
        try:
            # prefer explicit conversation_context limit, otherwise fallback to filters if present
            limit_val = int(state.get('conversation_context', {}).get('limit', state.get('filters', {}).get('limit', 200)))
            limit_val = min(limit_val, 500)
        except Exception:
            limit_val = 200

        # Try ordering by commonly used timestamp fields in documents. Some datasets use
        # `timestamp`, others `date` or `created_at`. Attempt each one until we get actual data.
        order_fields = ['timestamp', 'date', 'created_at']
        docs_list = None
        used_order = None
        for of in order_fields:
            try:
                temp_docs = list(transactions_ref.order_by(of, direction=firestore.Query.DESCENDING).limit(limit_val).stream())
                # Only use this ordering if we actually got documents
                if temp_docs:
                    docs_list = temp_docs
                    used_order = of
                    break
                else:
                    logger.debug(f"_fetch_transactions: ordering by {of} returned 0 docs, trying next field")
            except Exception as e:
                logger.debug(f"_fetch_transactions: ordering by {of} failed: {e}")
                continue

        if docs_list is None:
            # Fall back to unordered fetch (may be less predictable)
            try:
                docs_list = list(transactions_ref.limit(limit_val).stream())
            except Exception as e:
                state.setdefault('errors', []).append(str(e))
                docs_list = []

        transactions = []
        for doc in docs_list:
            d = doc.to_dict()
            d['transaction_id'] = doc.id
            transactions.append(d)

        logger.info(f"_fetch_transactions: user_id={state.get('user_id')} fetched={len(transactions)} limit={limit_val} ordered_by={used_order}")

        # Aggregations (operate on the full fetched set)
        total_amount = sum(float(t.get('amount', 0) or 0) for t in transactions)
        total_count = len(transactions)
        avg_amount = total_amount / total_count if total_count > 0 else 0

        by_category: Dict[str, float] = {}
        by_merchant: Dict[str, Dict[str, float]] = {}
        for t in transactions:
            # Use intelligent categorization
            c = _categorize_transaction(t)
            amt = float(t.get('amount', 0) or 0)
            by_category[c] = by_category.get(c, 0) + amt
            # Prefer `refined_merchant` if available, else fall back to `merchant` or description
            m = t.get('refined_merchant') or t.get('merchant') or (t.get('description') and str(t.get('description')).split('/')[0]) or 'Unknown'
            if m not in by_merchant:
                by_merchant[m] = {"amount": 0.0, "count": 0}
            by_merchant[m]["amount"] += amt
            by_merchant[m]["count"] += 1

        top_merchants = sorted(by_merchant.items(), key=lambda x: x[1]['amount'], reverse=True)[:10]
        by_merchant_top = {k: v for k, v in top_merchants}
        spending_insights = {
            "summary": "Spending analysis",
            "total_spending": round(total_amount, 2),
            "transaction_count": total_count,
            "top_category": max(by_category, key=by_category.get) if by_category else None,
            "top_merchant": next(iter(top_merchants))[0] if top_merchants else None,
            "key_findings": [],
            "by_category": by_category,
            "by_merchant": [{"merchant": k, "amount": v["amount"], "count": v["count"]} for k, v in by_merchant_top.items()]
        }

        charts = []
        if by_category:
            labels = list(by_category.keys())[:8]
            values = [round(by_category[l], 2) for l in labels]
            charts.append({"type": "bar", "title": "Spending by Category", "data": {"labels": labels, "values": values}})

        state.setdefault('analyst_output', {})['spending_insights'] = spending_insights
        if charts:
            state.setdefault('analyst_output', {})['charts'] = charts

        # Log a small summary of top merchants for debugging
        try:
            top_summary = [(k, v['amount'], v['count']) for k, v in top_merchants]
            logger.info(f"_fetch_transactions: top_merchants={top_summary[:5]}")
        except Exception:
            pass
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _fetch_goals(state: CoachState) -> CoachState:
    try:
        goals_ref = db.collection('users').document(state.get('user_id')).collection('goals')
        docs = goals_ref.stream()
        goals = []
        for doc in docs:
            g = doc.to_dict()
            g['goal_id'] = doc.id
            g['status_details'] = _calculate_goal_status(g)
            goals.append(g)
        total_goals = len(goals)
        total_target = sum(g.get('target_amount', 0) for g in goals)
        total_saved = sum(g.get('current_amount', 0) for g in goals)
        overall_progress = (total_saved / total_target * 100) if total_target > 0 else 0
        status_counts = {"completed": 0, "on_track": 0, "slightly_behind": 0, "at_risk": 0, "overdue": 0}
        for g in goals:
            s = g['status_details']['status']
            status_counts[s] = status_counts.get(s, 0) + 1
        goals_insights = {
            "summary": "Goals analysis",
            "total_goals": total_goals,
            "on_track_count": status_counts.get('on_track', 0),
            "at_risk_count": status_counts.get('at_risk', 0) + status_counts.get('overdue', 0),
            "overall_progress": round(overall_progress, 2),
            "goal_details": goals
        }
        state.setdefault('analyst_output', {})['goals_insights'] = goals_insights
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _calculate_goal_status(goal_data: dict) -> dict:
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
    if progress >= 100:
        status = "completed"
        risk_level = "none"
        shortfall = 0
        avg_monthly = 0
    elif months_remaining <= 0:
        status = "overdue"
        risk_level = "high"
        shortfall = required_monthly
        avg_monthly = 0
    else:
        contribution_history = goal_data.get('contribution_history', [])
        if contribution_history:
            recent = contribution_history[-3:]
            avg_monthly = sum(c.get('amount', 0) for c in recent) / len(recent)
        else:
            created_at = goal_data.get('created_at')
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
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

def _run_comprehensive(state: CoachState) -> CoachState:
    try:
        s1 = dict(state)
        s2 = dict(state)
        s3 = dict(state)
        _fetch_transactions(s1)
        _fetch_goals(s2)
        _cashflow_projection(s3)
        ao = {}
        for src in (s1, s2, s3):
            for k, v in (src.get('analyst_output') or {}).items():
                ao[k] = v
        state['analyst_output'] = ao
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _connect_spending_goals(state: CoachState) -> CoachState:
    try:
        si = (state.get('analyst_output') or {}).get('spending_insights') or {}
        gi = (state.get('analyst_output') or {}).get('goals_insights') or {}
        cf = (state.get('analyst_output') or {}).get('cashflow_projection') or {}
        total_spending = float(si.get('total_spending', 0))
        total_goals = gi.get('total_goals', 0)
        avg_income = float(((cf.get('summary') or {}).get('avg_monthly_income') or 0))
        avg_expenses = float(((cf.get('summary') or {}).get('avg_monthly_expenses') or 0))
        savings_capacity = max(0.0, avg_income - avg_expenses)
        recommendations = []
        if total_goals and savings_capacity > 0:
            recommendations.append({"action": "allocate_savings", "amount": round(savings_capacity, 2)})
        connection = {"savings_capacity": round(savings_capacity, 2), "total_spending": round(total_spending, 2), "goal_count": total_goals}
        state.setdefault('analyst_output', {})['spending_goals_connection'] = connection
        if recommendations:
            state.setdefault('analyst_output', {})['recommendations'] = recommendations
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _fetch_anomalies(state: CoachState) -> CoachState:
    try:
        alerts_ref = db.collection('users').document(state.get('user_id')).collection('alerts')
        docs = alerts_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(50).stream()
        alerts = []
        for doc in docs:
            a = doc.to_dict()
            a['alert_id'] = doc.id
            alerts.append(a)
        by_severity: Dict[str, int] = {}
        by_type: Dict[str, int] = {}
        for a in alerts:
            s = a.get('severity', 'unknown')
            t = a.get('alert_type', 'unknown')
            by_severity[s] = by_severity.get(s, 0) + 1
            by_type[t] = by_type.get(t, 0) + 1
        anomalies = {"alerts": alerts, "summary": {"total_count": len(alerts), "by_severity": by_severity, "by_type": by_type}}
        state.setdefault('analyst_output', {})['anomalies'] = anomalies
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _cashflow_projection(state: CoachState) -> CoachState:
    try:
        three_months_ago = datetime.now() - timedelta(days=90)
        transactions_ref = db.collection('users').document(state.get('user_id')).collection('transactions')
        docs = transactions_ref.where(filter=FieldFilter('timestamp', '>=', three_months_ago)).stream()
        transactions = [doc.to_dict() for doc in docs]
        income = [t for t in transactions if t.get('type') == 'credit']
        expense = [t for t in transactions if t.get('type') == 'debit']
        total_income = sum(t.get('amount', 0) for t in income)
        total_expenses = sum(t.get('amount', 0) for t in expense)
        avg_income = total_income / 3 if total_income else 0
        avg_expenses = total_expenses / 3 if total_expenses else 0
        emi_ref = db.collection('users').document(state.get('user_id')).collection('emi')
        emi_docs = emi_ref.where(filter=FieldFilter('status', '==', 'active')).stream()
        monthly_emi = sum(doc.to_dict().get('monthly_amount', 0) for doc in emi_docs)
        projection = []
        for i in range(6):
            projected_fixed = monthly_emi
            projected_variable = max(0.0, (avg_expenses - projected_fixed))
            projected_expenses = projected_fixed + projected_variable
            projected_savings = avg_income - projected_expenses
            projection.append({"month": (datetime.now() + timedelta(days=30*i)).strftime("%b %Y"), "month_number": i+1, "projected_income": round(avg_income,2), "projected_expenses": round(projected_expenses,2), "projected_savings": round(projected_savings,2), "savings_rate": round((projected_savings/avg_income*100) if avg_income>0 else 0,2)})
        cf = {"projection": projection, "summary": {"avg_monthly_income": round(avg_income,2), "avg_monthly_expenses": round(avg_expenses,2)}, "confidence": round(min(1.0, len(transactions)/100),2)}
        state.setdefault('analyst_output', {})['cashflow_projection'] = cf
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def _synthesize_response(state: CoachState) -> CoachState:
    # Use OpenAI to produce a user-facing response using analyst outputs and memory context
    intent = state.get('intent_category', 'C')
    ao = state.get('analyst_output', {}) or {}
    mem = state.get('memory_context') or {}
    user_q = state.get('user_query') or ''
    
    # Build detailed context from analyst output
    context_parts = []
    
    if ao.get('spending_insights'):
        si = ao['spending_insights']
        context_parts.append(f"**Spending Analysis:**\n- Total spending: ₹{si.get('total_spending', 0)}\n- Transactions count: {si.get('transaction_count', 0)}\n- Top category: {si.get('top_category', 'N/A')}\n- Top merchant: {si.get('top_merchant', 'N/A')}")
        if si.get('by_category'):
            cat_str = ", ".join([f"{k}: ₹{v}" for k, v in list(si['by_category'].items())[:5]])
            context_parts.append(f"- Breakdown: {cat_str}")
    
    if ao.get('goals_insights'):
        gi = ao['goals_insights']
        context_parts.append(f"**Goals Status:**\n- Total goals: {gi.get('total_goals', 0)}\n- On track: {gi.get('on_track_count', 0)}\n- At risk: {gi.get('at_risk_count', 0)}\n- Overall progress: {gi.get('overall_progress', 0)}%")
    
    if ao.get('cashflow_projection'):
        cf = ao['cashflow_projection']
        summary = cf.get('summary', {})
        context_parts.append(f"**Cashflow Projection:**\n- Avg monthly income: ₹{summary.get('avg_monthly_income', 0)}\n- Avg monthly expenses: ₹{summary.get('avg_monthly_expenses', 0)}")
    
    if ao.get('anomalies'):
        an = ao['anomalies']
        context_parts.append(f"**Alerts:**\n- Total alerts: {an.get('summary', {}).get('total_count', 0)}")
    
    if ao.get('spending_goals_connection'):
        sgc = ao['spending_goals_connection']
        context_parts.append(f"**Savings Capacity:**\n- Available for goals: ₹{sgc.get('savings_capacity', 0)}")

    if ao.get('mutual_fund_recommendations'):
        mfr = ao['mutual_fund_recommendations']
        recs = mfr.get('recommendations', [])
        if recs:
            top_3 = recs[:3]
            fund_details = []
            for i, r in enumerate(top_3):
                returns = r.get('returns', {})
                ret_str = f"{returns.get('3y', returns.get('1y', 'N/A'))}%"
                fund_details.append(f"{i+1}. {r.get('fund_name')} - {r.get('category')} ({ret_str} returns)")
            context_parts.append(f"**Mutual Fund Recommendations (Top {len(top_3)}):**\n" + "\n".join(fund_details))

    context_text = "\n\n".join(context_parts) if context_parts else "No financial data available yet. Start tracking transactions to get insights."

    # Build prompt for the AI agent
    if intent == 'A':
        # For greetings, just return a friendly response
        response = {
            "response_type": "greeting",
            "user_query": user_q,
            "direct_answer": "Hey! I'm your FinPath AI Coach. I can help you track spending, monitor goals, and make smarter money decisions. What would you like to know?",
            "detailed_insights": {},
            "visualizations": [],
            "recommendations": [],
            "encouragement": "",
            "confidence_score": 1.0,
            "tone": "friendly"
        }
        state['coach_response'] = response
        return state

    # For mutual fund queries, use specialized prompt with disclaimers
    if ao.get('mutual_fund_recommendations'):
        system = {"role": "system", "content": "You are a helpful financial advisor. Provide investment advice with proper disclaimers. Start with financial guidance based on user's query, then suggest 2-3 funds. Always include: 1) Risk disclaimer, 2) Advice to assess goals/risk tolerance, 3) Recommendation to consult financial advisor, 4) Statement that mutual funds are subject to market risks and this is advice not a decision."}
        user_content = f"User asked: '{user_q}'\n\nRecommended funds:\n{context_text}\n\nProvide financial advice with disclaimers:"
    else:
        # For other financial coaching, use standard prompt
        system = {"role": "system", "content": "You are a friendly financial coaching assistant. Generate a helpful, actionable response based on the user's question and their financial data. Be specific and encouraging. Keep it concise (2-4 sentences max)."}
        user_content = f"User asked: '{user_q}'\n\nTheir financial data:\n{context_text}\n\nProvide a helpful coaching response:"

    user = {"role": "user", "content": user_content}
    
    try:
        direct_answer = _call_openai_chat([system, user], temperature=0.3, max_tokens=300)
        direct_answer = (direct_answer or '').strip()
        if not direct_answer:
            direct_answer = context_text[:200] + "..." if len(context_text) > 200 else context_text
    except Exception as e:
        print(f"[_synthesize_response] OpenAI call failed: {e}")
        direct_answer = context_text[:300]
    
    response = {
        "response_type": "financial_coaching",
        "user_query": user_q,
        "direct_answer": direct_answer,
        "detailed_insights": {k: v for k, v in ao.items() if k in ["spending_insights", "goals_insights", "cashflow_projection", "anomalies", "spending_goals_connection", "mutual_fund_recommendations"]},
        "visualizations": ao.get('charts', []),
        "recommendations": ao.get('recommendations', []),
        "encouragement": "Keep tracking your spending to improve your financial health!",
        "confidence_score": 0.8,
        "tone": "friendly"
    }
    state['coach_response'] = response
    return state

def _write_memory(state: CoachState) -> CoachState:
    try:
        if memory_client:
            response = json.dumps(state.get('coach_response', {}))
            memory_client.add_coaching_session(user_id=state.get('user_id'), query=state.get('user_query'), response=response, session_id=f"coach_session_{datetime.now().strftime('%Y%m%d')}", agent_id="financial_coach_meta_agent", metadata={"session_type": "financial_coaching", "timestamp": datetime.now().isoformat(), "query_type": "general"}, infer=True)
    except Exception as e:
        state.setdefault('errors', []).append(str(e))
    return state

def build_coach_pipeline():
    """
    Manual orchestration of the financial coaching pipeline using AI agents.
    This replaces the LangGraph StateGraph for compatibility with langgraph 0.0.51.
    """
    def pipeline(state: CoachState) -> CoachState:
        # Step 1: Classify intent using AI agent
        state = _classify_intent(state)
        
        # Step 2: Route based on intent
        intent = state.get('intent_category', 'C')
        if intent == 'A':
            state = _respond_greeting(state)
            return state
        elif intent == 'B':
            state = _web_search_lookup(state)
            return state
        
        # Step 3: For financial coaching, read memory and analyze
        state = _read_memory(state)
        state = _analyst_router(state)
        
        # Step 4: Route to appropriate analyst
        route = state.get('route', 'spending')
        if route == 'spending':
            state = _fetch_transactions(state)
        elif route == 'goals':
            state = _fetch_goals(state)
        elif route == 'anomalies':
            state = _fetch_anomalies(state)
        elif route == 'investments':
            state = _fetch_mutual_fund_recommendations(state)
        else:  # comprehensive
            state = _run_comprehensive(state)
            state = _connect_spending_goals(state)
        
        # Step 5: Synthesize response using AI agent
        state = _synthesize_response(state)
        
        # Step 6: Write to memory
        state = _write_memory(state)
        
        return state
    
    return pipeline

# Build the pipeline (callable orchestrator)
compiled_graph = build_coach_pipeline()

def get_financial_coaching_langgraph(user_id: str, user_query: str, conversation_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if conversation_context is None:
        conversation_context = {}
    initial: CoachState = {"user_id": user_id, "user_query": user_query, "conversation_context": conversation_context}
    result = compiled_graph(initial)
    coach_response = result.get('coach_response', {})

    def _to_iso(val):
        try:
            if val is None:
                return None
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return val
        except Exception:
            return str(val)

    def _sanitize(obj):
        if isinstance(obj, dict):
            return {k: _sanitize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [_sanitize(v) for v in obj]
        return _to_iso(obj)

    safe_coach_response = _sanitize(coach_response)
    output = {"status": "completed", "success": True, "coach_response": safe_coach_response, "model": "langgraph", "timestamp": datetime.now().isoformat()}
    return json.loads(json.dumps(output))