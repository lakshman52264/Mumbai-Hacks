from firebase_admin import firestore
import firebase_admin
from firebase_admin import credentials
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
from crewai.tools import BaseTool
from crewai.project import CrewBase, agent, task, crew
from typing import Type
import os
from datetime import datetime
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

# Initialize Google Gemini using CrewAI's LLM with current API key
llm = LLM(
    model="gemini/gemini-2.5-flash-lite",
    temperature=0.1,
    api_key=get_current_api_key()
)



class DetectPastTransactionsInput(BaseModel):
    user_id: str = Field(description="The user ID to fetch past transactions for")

class AddAnomalyInput(BaseModel):
    user_id: str = Field(description="The user ID")
    transaction_id: str = Field(description="The transaction ID")
    anomaly_details: dict = Field(description="Details of the anomaly detected")

class DetectPastTransactionsTool(BaseTool):
    name: str = "detect_past_transactions"
    description: str = "Fetch the past 10 transactions for a user from Firestore, including date, amount, category, and AI insights."
    args_schema: Type[BaseModel] = DetectPastTransactionsInput

    def _run(self, user_id: str) -> list:
        """Fetch past 10 transactions for the user."""
        try:
            transactions_ref = db.collection('users').document(user_id).collection('transactions')
            # Order by created_at field (most common timestamp field in Firestore)
            docs = transactions_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(10).stream()
            
            past_transactions = []
            for doc in docs:
                trans = doc.to_dict()
                # Convert date/timestamp to string to avoid DatetimeWithNanoseconds issues
                date_raw = trans.get('timestamp') or trans.get('date') or trans.get('created_at')
                if hasattr(date_raw, 'isoformat'):
                    date_str = date_raw.isoformat()
                else:
                    date_str = str(date_raw) if date_raw else None

                past_transactions.append({
                    'date': date_str,
                    'amount': trans.get('amount'),
                    'category': trans.get('category'),
                    'ai_insights': trans.get('ai_insights'),
                    'description': trans.get('description', '')[:50]  # Truncate for readability
                })

            print(f"✅ Fetched {len(past_transactions)} past transactions for user {user_id}")
            return past_transactions
        except Exception as e:
            print(f"❌ Error fetching past transactions: {e}")
            import traceback
            traceback.print_exc()
            return []

class AddAnomalyTool(BaseTool):
    name: str = "add_anomaly"
    description: str = "Add an anomaly document to Firestore 'anomalies' collection and 'alerts' collection when an anomaly is detected."
    args_schema: Type[BaseModel] = AddAnomalyInput

    def _run(self, user_id: str, transaction_id: str, anomaly_details: dict) -> dict:
        """Add anomaly to Firestore."""
        try:
            # Add to anomalies collection under user
            anomaly_ref = db.collection('users').document(user_id).collection('anomalies').document()
            anomaly_data = {
                'user_id': user_id,
                'transaction_id': transaction_id,
                'detected_at': datetime.now().isoformat(),
                'is_anomalous': True,  # Always true since tool is only called for anomalies
                'reason': anomaly_details.get('reason', ''),
                'risk_level': anomaly_details.get('risk_level', 'unknown'),
                'email_content': anomaly_details.get('email_content', ''),
                'email_sent': anomaly_details.get('email_sent', False),
                **anomaly_details
            }
            anomaly_ref.set(anomaly_data)

            # Add to alerts collection top level
            alert_ref = db.collection('alerts').document()
            alert_data = {
                'user_id': user_id,
                'type': 'anomaly',
                'message': f"Anomaly detected ({anomaly_details.get('risk_level', 'unknown')} risk): {anomaly_details.get('reason', '')}",
                'created_at': datetime.now().isoformat(),
                'risk_level': anomaly_details.get('risk_level', 'unknown'),
                'read': False,
                'email_content': anomaly_details.get('email_content', ''),
                'email_sent': anomaly_details.get('email_sent', False)
            }
            alert_ref.set(alert_data)
            
            # Add to alerts collection under user
            alert_ref = db.collection('users').document(user_id).collection('alerts').document()
            alert_data = {
                'user_id': user_id,
                'type': 'anomaly',
                'message': f"Anomaly detected ({anomaly_details.get('risk_level', 'unknown')} risk): {anomaly_details.get('reason', '')}",
                'created_at': datetime.now().isoformat(),
                'read': False,
                'risk_level': anomaly_details.get('risk_level', 'unknown'),
                'email_content': anomaly_details.get('email_content', ''),
                'email_sent': anomaly_details.get('email_sent', False)
            }
            alert_ref.set(alert_data)
            
            print(f"✅ Anomaly and alert added to Firestore for transaction {transaction_id}")
            return {
                "success": True,
                "message": "Anomaly and alert added successfully"
            }
        except Exception as e:
            print(f"❌ Error adding anomaly: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }

class AnomalyDetectionResult(BaseModel):
    is_anomalous: bool
    reason: str
    risk_level: str
    email_content: str
    email_sent: bool


@CrewBase
class AnomalyDetectionCrew():
    """Anomaly detection crew using YAML configuration"""

    agents_config = "../config/anomaly_agents.yaml"
    tasks_config = "../config/anomaly_tasks.yaml"

    @agent
    def anomaly_detection_agent(self) -> Agent:
        return Agent(
            config=self.agents_config['anomaly_detection_agent'],
            llm=llm,
            verbose=True,
            allow_delegation=False,
            tools=[DetectPastTransactionsTool(), AddAnomalyTool()]
        )

    @task
    def anomaly_detection_task(self) -> Task:
        return Task(
            config=self.tasks_config['anomaly_detection_task'],
            output_pydantic=AnomalyDetectionResult
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=[self.anomaly_detection_task()],
            process=Process.sequential
        )


async def detect_anomaly_agent(
    user_id: str,
    transaction_id: str,
    transaction_data: dict
) -> dict:
    """
    Main function to detect anomalies in a transaction using the CrewAI agent with Gemini.
    """
    try:
        # Extract transaction details
        narration = transaction_data.get('description', '')
        amount = transaction_data.get('amount', 0)
        transaction_type = transaction_data.get('type', 'debit')
        # Handle both 'timestamp' and 'date' fields, ensure it's a string
        date_raw = transaction_data.get('timestamp') or transaction_data.get('date') or datetime.now()
        if hasattr(date_raw, 'isoformat'):  # Handle datetime objects
            date = date_raw.isoformat()
        else:  # Already a string
            date = str(date_raw)
        
        print(f"🔍 Detecting anomalies for transaction: {narration}")
        print(f"   Amount: ₹{amount}, Type: {transaction_type}, Date: {date}")
        
        # Create crew instance and kickoff
        crew_instance = AnomalyDetectionCrew()
        crew = crew_instance.crew()
        result = crew.kickoff(inputs={
            'transaction_id': transaction_id,
            'user_id': user_id,
            'amount': amount,
            'type': transaction_type,
            'description': narration,
            'date': date
        })
        
        # Get the structured result
        anomaly_result = result.pydantic
        
        return {
            "status": "completed",
            "success": True,
            "is_anomalous": anomaly_result.is_anomalous,
            "reason": anomaly_result.reason,
            "risk_level": anomaly_result.risk_level,
            "email_content": anomaly_result.email_content,
            "email_sent": anomaly_result.email_sent,
            "model": "gemini-2.5-flash-lite"
        }
    
    except Exception as e:
        print(f"❌ Error in anomaly detection: {e}")
        import traceback
        traceback.print_exc()
        return {
            "status": "failed",
            "success": False,
            "error": str(e)
        }
