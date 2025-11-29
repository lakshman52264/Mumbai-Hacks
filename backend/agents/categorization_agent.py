import os
import asyncio
import json
import re
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool
from pydantic import BaseModel, Field, ValidationError
from typing import Type
from crewai.project import CrewBase, agent, task, crew
from crewai_tools import SerperDevTool
from firebase_admin import firestore
import firebase_admin
from firebase_admin import credentials
from pydantic import BaseModel

# Load environment variables from .env file
load_dotenv()

# Initialize Firebase if not already initialized
if not firebase_admin._apps:
    try:
        cred_path = os.path.join(os.path.dirname(__file__), '..', 'mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json')
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()
    except Exception as e:
        print(f"Firebase initialization error: {e}")

db = firestore.client()

# API Key rotation for rate limiting
API_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY2"),
    os.getenv("GEMINI_API_KEY3"),
    os.getenv("GEMINI_API_KEY4")
]
API_KEYS = [key for key in API_KEYS if key]  # Filter out None values
current_api_key_index = 0

def get_next_api_key():
    """Rotate to next available API key."""
    global current_api_key_index
    if not API_KEYS:
        return None
    current_api_key_index = (current_api_key_index + 1) % len(API_KEYS)
    return API_KEYS[current_api_key_index]

def get_current_api_key():
    """Get current API key."""
    if not API_KEYS:
        return None
    return API_KEYS[current_api_key_index]


REQUIRED_RESULT_FIELDS = {
    "category",
    "refined_merchant",
    "is_recurring",
    "is_emi",
    "is_subscription",
    "confidence_score",
    "ai_insights"
}


def _model_to_dict(model_obj: Any) -> Dict[str, Any]:
    """Safely turn a Pydantic/BaseModel output into a plain dict."""
    if model_obj is None:
        return {}
    if isinstance(model_obj, dict):
        return model_obj
    if hasattr(model_obj, "model_dump"):
        return model_obj.model_dump()
    if hasattr(model_obj, "dict"):
        return model_obj.dict()
    return {}


def _find_last_json_object(text: str) -> str:
    """Extract the last JSON object ({...}) from a string."""
    if not text:
        return ""
    depth = 0
    start_idx = None
    last_obj = ""
    for idx, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start_idx = idx
            depth += 1
        elif ch == "}":
            if depth:
                depth -= 1
                if depth == 0 and start_idx is not None:
                    last_obj = text[start_idx : idx + 1]
    return last_obj.strip()


def _strip_code_fences(text: str) -> str:
    """Remove leading/trailing markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("\n", 1)
        text = parts[1] if len(parts) == 2 else ""
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    return text.strip()


def _extract_structured_output(raw_output: Any) -> Dict[str, Any]:
    """Best-effort extraction of JSON dicts from various CrewAI outputs."""
    if raw_output is None:
        return {}
    if isinstance(raw_output, BaseModel):
        return _model_to_dict(raw_output)
    if isinstance(raw_output, dict):
        return raw_output
    if isinstance(raw_output, list):
        # Walk backwards so the latest answer wins.
        for item in reversed(raw_output):
            parsed = _extract_structured_output(item)
            if parsed:
                return parsed
        return {}
    # Look for familiar attributes (TaskOutput, CrewResult, etc.)
    for attr in ("raw", "raw_output", "output", "final_output", "content", "response"):
        if hasattr(raw_output, attr):
            parsed = _extract_structured_output(getattr(raw_output, attr))
            if parsed:
                return parsed
    if isinstance(raw_output, str):
        cleaned = _strip_code_fences(raw_output.strip())
        candidate = _find_last_json_object(cleaned)
        if candidate:
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                return {}
    return {}


def _is_valid_categorization_payload(data: Dict[str, Any]) -> bool:
    """Ensure parsed dict contains all mandatory categorization fields."""
    if not data:
        return False
    return all(field in data for field in REQUIRED_RESULT_FIELDS)

llm = LLM(
    model="gemini/gemini-2.5-flash-lite",
    temperature=0.1,
    api_key=get_current_api_key()
)

# MISTRAL_API_KEY=os.getenv("MISTRAL_API_KEY"),
# llm = LLM(
#     model="mistral/mistral-small-latest",
#     temperature=0.2
# )

# -----------------------
# Tool input schemas
# -----------------------

class DetectRecurringInput(BaseModel):
    user_id: str = Field(description="The user ID for the transaction")
    transaction_data: dict = Field(description="The transaction data dictionary containing merchant, amount, etc.")

class UpdateTransactionInput(BaseModel):
    user_id: str = Field(description="The user ID for the transaction")
    transaction_id: str = Field(description="The transaction ID to update")
    updates: dict = Field(description="The updates to apply to the transaction document")

# -----------------------
# Tools
# -----------------------

class DetectRecurringTransactionTool(BaseTool):
    name: str = "detect_recurring_transaction"
    description: str = "Detect if this transaction is part of a recurring pattern by analyzing transaction history."
    args_schema: Type[BaseModel] = DetectRecurringInput

    def _run(self, user_id: str, transaction_data: dict) -> dict:
        """Detect if this transaction is part of a recurring pattern."""
        try:
            transactions_ref = db.collection('users').document(user_id).collection('transactions')
            
            merchant = transaction_data.get('merchant', '').lower().strip()
            amount = transaction_data.get('amount', 0)
            
            # Query for similar transactions
            similar_transactions = []
            docs = transactions_ref.where('merchant', '==', merchant).limit(10).stream()
            
            for doc in docs:
                trans = doc.to_dict()
                similar_transactions.append(trans)
            
            if len(similar_transactions) >= 2:
                return {
                    "is_recurring": True,
                    "frequency": len(similar_transactions),
                    "pattern": "Regular"
                }
            
            return {"is_recurring": False, "frequency": len(similar_transactions)}
        
        except Exception as e:
            print(f"Error detecting recurring pattern: {e}")
            return {"is_recurring": False, "error": str(e)}

class UpdateTransactionInFirestoreTool(BaseTool):
    name: str = "update_transaction_in_firestore"
    description: str = "Update transaction document in Firestore with categorization results."
    args_schema: Type[BaseModel] = UpdateTransactionInput

    def _run(self, user_id: str, transaction_id: str, updates: dict) -> dict:
        """Update transaction document in Firestore."""
        try:
            transaction_ref = db.collection('users').document(user_id).collection('transactions').document(transaction_id)
            
            updates['categorized_at'] = datetime.now().isoformat()
            updates['uncategorized'] = False
            
            transaction_ref.update(updates)
            
            return {
                "success": True,
                "message": "Transaction updated successfully"
            }
        except Exception as e:
            print(f"Error updating transaction: {e}")
            return {
                "success": False,
                "error": str(e)
            }

search_tool = SerperDevTool(
              country="in",
              location="India",
              n_results=2,
)

# -----------------------
# Output model
# -----------------------

class CategorizationResult(BaseModel):
    category: str
    refined_merchant: str
    is_recurring: bool
    is_emi: bool
    is_subscription: bool
    confidence_score: float
    ai_insights: str


# -----------------------
# CrewBase
# -----------------------

@CrewBase
class CategorizationCrew():
    """Categorization crew using YAML configuration"""

    agents_config = "../config/categorization_agents.yaml"
    tasks_config = "../config/categorization_tasks.yaml"

    @agent
    def recurring_detection_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['recurring_detection_agent'],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            tools=[DetectRecurringTransactionTool()],
            max_retry_limit=3
        )

    @agent
    def categorization_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['categorization_agent'],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            tools=[UpdateTransactionInFirestoreTool(),search_tool],
            max_retry_limit=3
        )

    @task
    def recurring_detection_task(self) -> Task:
        return Task(
            config=self.tasks_config['recurring_detection_task']
        )

    @task
    def categorization_task(self) -> Task:
        return Task(
            config=self.tasks_config['categorization_task']
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=[self.recurring_detection_agent(), self.categorization_agent()],
            tasks=[self.recurring_detection_task(), self.categorization_task()],
            process=Process.sequential
        )


async def categorize_transaction_agent(
    user_id: str,
    transaction_id: str,
    transaction_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main function to categorize a transaction using the CrewAI agent with Gemini.
    """
    try:
        # Extract transaction details
        narration = transaction_data.get('description', '')
        amount = transaction_data.get('amount', 0)
        transaction_type = transaction_data.get('type', 'debit')
        # Handle timestamp/date field, ensure it's a string
        date_raw = transaction_data.get('timestamp') or transaction_data.get('date') or datetime.now()
        if hasattr(date_raw, 'isoformat'):  # Handle datetime objects
            date = date_raw.isoformat()
        else:  # Already a string
            date = str(date_raw)
        
        print(f"🤖 Categorizing transaction: {narration}")
        
        # Create crew instance and kickoff
        crew_instance = CategorizationCrew()
        crew = crew_instance.crew()
        result = crew.kickoff(inputs={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'amount': amount,
            'type': transaction_type,
            'description': narration,
            'date': date
        })
        
        # Get the structured result with graceful fallbacks
        structured_output = _model_to_dict(getattr(result, "pydantic", None))
        if not _is_valid_categorization_payload(structured_output):
            structured_output = {}
            candidate_sources: List[Any] = [
                getattr(result, "raw", None),
                getattr(result, "raw_output", None),
                getattr(result, "output", None),
                getattr(result, "final_output", None)
            ]
            tasks_output = getattr(result, "tasks_output", None)
            if tasks_output:
                candidate_sources.append(tasks_output)
            for candidate in candidate_sources:
                parsed = _extract_structured_output(candidate)
                if _is_valid_categorization_payload(parsed):
                    structured_output = parsed
                    break
        
        if not structured_output:
            raise ValueError("Categorization agent did not return structured JSON output.")
        
        try:
            categorization = CategorizationResult(**structured_output)
        except ValidationError as e:
            raise ValueError(f"Categorization output validation failed: {e}") from e
        
        # Serialize the output to ensure valid JSON
        output = {
            "status": "completed",
            "success": True,
            "category": categorization.category,
            "merchant": categorization.refined_merchant,
            "is_recurring": categorization.is_recurring,
            "is_emi": categorization.is_emi,
            "is_subscription": categorization.is_subscription,
            "confidence": categorization.confidence_score,
            "insights": categorization.ai_insights,
            "model": "gemini-2.5-flash-lite"
        }
        
        # Ensure clean JSON serialization
        return json.loads(json.dumps(output))
    
    except Exception as e:
        print(f"❌ Error in categorization: {e}")
        return {
            "status": "failed",
            "success": False,
            "error": str(e)
        }

