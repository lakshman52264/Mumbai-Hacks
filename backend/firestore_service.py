import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

load_dotenv()

class FirestoreService:
    def __init__(self):
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            try:
                # Try to use service account file if available
                cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
                if cred_path:
                    # Convert relative path to absolute path
                    if not os.path.isabs(cred_path):
                        cred_path = os.path.join(os.path.dirname(__file__), cred_path)

                    print(f"Loading Firebase credentials from: {cred_path}")
                    if os.path.exists(cred_path):
                        print("Service account file found, initializing Firebase...")
                        cred = credentials.Certificate(cred_path)
                        firebase_admin.initialize_app(cred)
                        print("Firebase initialized successfully with service account")
                    else:
                        print(f"Service account file not found at: {cred_path}")
                        raise FileNotFoundError(f"Service account file not found: {cred_path}")
                else:
                    print("No FIREBASE_SERVICE_ACCOUNT_PATH provided, trying default credentials...")
                    # Try default credentials
                    firebase_admin.initialize_app()
                    print("Firebase initialized with default credentials")

            except Exception as e:
                print(f"Firebase initialization error: {e}")
                print("Trying to initialize without credentials for development...")
                try:
                    # Last resort - initialize without credentials (for development)
                    firebase_admin.initialize_app(options={'projectId': 'mumbaihacks-63c0c'})
                    print("Firebase initialized without credentials (development mode)")
                except Exception as e2:
                    print(f"Failed to initialize Firebase even in development mode: {e2}")
                    raise e

        self.db = firestore.client()

    # User Management
    async def create_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Create or update user profile"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_data['created_at'] = datetime.now()
            user_data['updated_at'] = datetime.now()
            user_ref.set(user_data, merge=True)
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False

    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            doc = user_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    async def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Update user profile"""
        try:
            user_ref = self.db.collection('users').document(user_id)
            user_data['updated_at'] = datetime.now()
            user_ref.update(user_data)
            return True
        except Exception as e:
            print(f"Error updating user: {e}")
            return False

    # Bank Accounts Management
    async def save_bank_accounts(self, user_id: str, accounts: List[Dict[str, Any]]) -> bool:
        """Save user's bank accounts"""
        try:
            batch = self.db.batch()

            # Delete existing accounts
            accounts_ref = self.db.collection('users').document(user_id).collection('accounts')
            existing_accounts = accounts_ref.stream()
            for account in existing_accounts:
                batch.delete(account.reference)

            # Add new accounts
            for account in accounts:
                account_id = account.get('id', f"{user_id}_{account.get('accountNumber', 'unknown')}")
                account_ref = accounts_ref.document(account_id)
                account_data = {
                    **account,
                    'user_id': user_id,
                    'created_at': datetime.now(),
                    'updated_at': datetime.now()
                }
                batch.set(account_ref, account_data)

            batch.commit()
            return True
        except Exception as e:
            print(f"Error saving bank accounts: {e}")
            return False

    async def get_bank_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's bank accounts"""
        try:
            accounts_ref = self.db.collection('users').document(user_id).collection('accounts')
            docs = accounts_ref.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error getting bank accounts: {e}")
            return []

    # Transactions Management
    async def save_transactions(self, user_id: str, transactions: List[Dict[str, Any]]) -> bool:
        """Save user's transactions"""
        try:
            batch = self.db.batch()
            transactions_ref = self.db.collection('users').document(user_id).collection('transactions')

            for transaction in transactions:
                # Handle both direct transaction objects and transformed Setu data
                if 'txnId' in transaction:
                    # Transformed Setu transaction data
                    transaction_id = transaction.get('txnId')
                    # Parse the valueDate and convert to datetime
                    value_date_str = transaction.get('valueDate')
                    if value_date_str:
                        try:
                            # Try ISO format first
                            date_obj = datetime.fromisoformat(value_date_str.replace('Z', '+00:00'))
                        except:
                            # Fallback to other formats if needed
                            date_obj = datetime.now()
                    else:
                        date_obj = datetime.now()
                    
                    transaction_data = {
                        'id': transaction_id,
                        'accountId': transaction.get('accountId', ''),
                        'date': date_obj,
                        'type': 'credit' if transaction.get('type') == 'CREDIT' else 'debit',
                        'merchant': transaction.get('narration', transaction.get('description', 'Unknown Merchant')),
                        'category': self._categorize_transaction(transaction.get('narration', '')),
                        'amount': float(transaction.get('amount', 0)),
                        'description': transaction.get('narration', ''),
                        'setuTransactionId': transaction_id,
                        'user_id': user_id,
                        'created_at': datetime.now(),
                        'updated_at': datetime.now()
                    }
                else:
                    # Fallback for other formats
                    transaction_id = transaction.get('id', f"{user_id}_{transaction.get('reference', datetime.now().isoformat())}")
                    transaction_data = {
                        **transaction,
                        'user_id': user_id,
                        'created_at': datetime.now(),
                        'updated_at': datetime.now()
                    }
                
                transaction_ref = transactions_ref.document(transaction_id)
                batch.set(transaction_ref, transaction_data)

            batch.commit()
            return True
        except Exception as e:
            print(f"Error saving transactions: {e}")
            return False

    def _categorize_transaction(self, narration: str) -> str:
        """Categorize transaction based on narration"""
        narration_lower = narration.lower()
        
        if any(keyword in narration_lower for keyword in ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'dining']):
            return 'dining'
        elif any(keyword in narration_lower for keyword in ['uber', 'ola', 'taxi', 'auto', 'transport']):
            return 'transport'
        elif any(keyword in narration_lower for keyword in ['amazon', 'flipkart', 'shopping', 'store']):
            return 'shopping'
        elif any(keyword in narration_lower for keyword in ['salary', 'income', 'credit']):
            return 'income'
        elif any(keyword in narration_lower for keyword in ['grocery', 'supermarket', 'bigbasket']):
            return 'groceries'
        elif any(keyword in narration_lower for keyword in ['entertainment', 'movie', 'netflix', 'hotstar']):
            return 'entertainment'
        else:
            return 'other'

    async def get_transactions(self, user_id: str, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Get user's transactions"""
        try:
            transactions_ref = self.db.collection('users').document(user_id).collection('transactions')
            query = transactions_ref.order_by('date', direction=firestore.Query.DESCENDING).limit(limit)
            if offset > 0:
                # This is a simplified offset implementation
                docs = list(query.stream())[offset:]
            else:
                docs = query.stream()
            
            transactions = []
            for doc in docs:
                data = doc.to_dict()
                # Ensure date is properly serialized
                if 'date' in data and hasattr(data['date'], 'isoformat'):
                    data['date'] = data['date'].isoformat()
                transactions.append(data)
            
            return transactions
        except Exception as e:
            print(f"Error getting transactions: {e}")
            return []

    # Consent Management
    async def save_consent(self, user_id: str, consent_data: Dict[str, Any]) -> bool:
        """Save consent information"""
        try:
            consent_ref = self.db.collection('users').document(user_id).collection('consents').document(consent_data['consentId'])
            consent_data['user_id'] = user_id
            consent_data['created_at'] = datetime.now()
            consent_data['updated_at'] = datetime.now()
            consent_ref.set(consent_data)
            return True
        except Exception as e:
            print(f"Error saving consent: {e}")
            return False

    async def get_consent(self, user_id: str, consent_id: str) -> Optional[Dict[str, Any]]:
        """Get consent information"""
        try:
            consent_ref = self.db.collection('users').document(user_id).collection('consents').document(consent_id)
            doc = consent_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting consent: {e}")
            return None

    async def update_consent_status(self, user_id: str, consent_id: str, status: str, additional_data: Optional[Dict] = None) -> bool:
        """Update consent status and merge additional data"""
        try:
            consent_ref = self.db.collection('users').document(user_id).collection('consents').document(consent_id)
            
            update_data = {
                'status': status,
                'updated_at': datetime.now()
            }
            
            # Merge all additional data into the update
            if additional_data:
                # Flatten the additional_data to avoid nested structures that might cause issues
                for key, value in additional_data.items():
                    if key not in ['userId', 'status']:  # Don't overwrite these
                        update_data[key] = value
            
            consent_ref.update(update_data)
            return True
        except Exception as e:
            print(f"Error updating consent status: {e}")
            return False

    # Process FI Data
    async def process_fi_data(self, user_id: str, consent_id: str, fi_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and store FI data from Setu"""
        try:
            accounts_saved = 0
            transactions_saved = 0
            
            fips = fi_data.get("fips", [])
            
            for fip in fips:
                fip_id = fip.get("fipID")
                accounts = fip.get("accounts", [])
                
                for account in accounts:
                    # Extract account data
                    data = account.get("data", {}).get("account", {})
                    if not data:
                        continue
                    
                    # Save account information
                    account_info = {
                        "id": account.get("linkRefNumber"),
                        "maskedAccNumber": account.get("maskedAccNumber"),
                        "fipID": fip_id,
                        "consent_id": consent_id,
                        "status": account.get("status"),
                        "profile": data.get("profile", {}),
                        "summary": data.get("summary", {}),
                        "type": data.get("type"),
                        "user_id": user_id,
                        "created_at": datetime.now(),
                        "updated_at": datetime.now()
                    }
                    
                    # Save account
                    account_ref = self.db.collection('users').document(user_id).collection('accounts').document(account_info["id"])
                    account_ref.set(account_info, merge=True)
                    accounts_saved += 1
                    
                    # Save transactions
                    transactions_data = data.get("transactions", {}).get("transaction", [])
                    if transactions_data:
                        batch = self.db.batch()
                        for txn in transactions_data:
                            txn_id = txn.get("txnId") or txn.get("reference")
                            if txn_id:
                                txn_ref = self.db.collection('users').document(user_id).collection('transactions').document(txn_id)
                                txn_data = {
                                    **txn,
                                    "user_id": user_id,
                                    "account_id": account.get("linkRefNumber"),
                                    "fipID": fip_id,
                                    "created_at": datetime.now()
                                }
                                batch.set(txn_ref, txn_data, merge=True)
                                transactions_saved += 1
                        
                        batch.commit()
            
            return {
                "success": True,
                "accounts_saved": accounts_saved,
                "transactions_saved": transactions_saved
            }
        except Exception as e:
            print(f"Error processing FI data: {e}")
            return {
                "success": False,
                "error": str(e),
                "accounts_saved": 0,
                "transactions_saved": 0
            }

    # Goals Management
    async def save_goal(self, user_id: str, goal_data: Dict[str, Any]) -> bool:
        """Save a financial goal"""
        try:
            goals_ref = self.db.collection('users').document(user_id).collection('goals')
            goal_id = goal_data.get('id', f"{user_id}_{datetime.now().isoformat()}")
            goal_ref = goals_ref.document(goal_id)
            goal_data['user_id'] = user_id
            goal_data['created_at'] = datetime.now()
            goal_data['updated_at'] = datetime.now()
            goal_ref.set(goal_data)
            return True
        except Exception as e:
            print(f"Error saving goal: {e}")
            return False

    async def get_goals(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's financial goals"""
        try:
            goals_ref = self.db.collection('users').document(user_id).collection('goals')
            docs = goals_ref.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            print(f"Error getting goals: {e}")
            return []

    async def update_goal_fields(self, user_id: str, goal_id: str, updates: Dict[str, Any]) -> bool:
        try:
            goal_ref = self.db.collection('users').document(user_id).collection('goals').document(goal_id)
            updates['updated_at'] = datetime.now()
            goal_ref.set(updates, merge=True)
            return True
        except Exception as e:
            print(f"Error updating goal: {e}")
            return False

    async def get_goal(self, user_id: str, goal_id: str) -> Optional[Dict[str, Any]]:
        try:
            goal_ref = self.db.collection('users').document(user_id).collection('goals').document(goal_id)
            doc = goal_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting goal: {e}")
            return None

    async def delete_goal(self, user_id: str, goal_id: str) -> bool:
        try:
            goal_ref = self.db.collection('users').document(user_id).collection('goals').document(goal_id)
            goal_ref.delete()
            return True
        except Exception as e:
            print(f"Error deleting goal: {e}")
            return False

    async def save_reminder(self, user_id: str, reminder_id: str, reminder_data: Dict[str, Any]) -> bool:
        try:
            rem_ref = self.db.collection('users').document(user_id).collection('reminders').document(reminder_id)
            reminder_data['user_id'] = user_id
            reminder_data['created_at'] = datetime.now()
            rem_ref.set(reminder_data, merge=True)
            return True
        except Exception as e:
            print(f"Error saving reminder: {e}")
            return False

    async def get_reminders(self, user_id: str) -> List[Dict[str, Any]]:
        try:
            rem_ref = self.db.collection('users').document(user_id).collection('reminders')
            docs = rem_ref.stream()
            reminders = []
            for doc in docs:
                data = doc.to_dict()
                reminders.append(data)
            return reminders
        except Exception as e:
            print(f"Error getting reminders: {e}")
            return []

    # Analytics helpers
    async def get_transaction_summary(self, user_id: str, period: str = 'month') -> Dict[str, Any]:
        """Get transaction summary for analytics"""
        try:
            transactions = await self.get_transactions(user_id, limit=1000)

            # Calculate date range based on period
            now = datetime.now()
            if period == 'month':
                start_date = now.replace(day=1)
            elif period == 'quarter':
                quarter = (now.month - 1) // 3 + 1
                start_date = datetime(now.year, (quarter - 1) * 3 + 1, 1)
            elif period == 'year':
                start_date = now.replace(month=1, day=1)
            else:
                start_date = now - timedelta(days=30)

            # Filter transactions by date
            filtered_transactions = [
                t for t in transactions
                if datetime.fromisoformat(t.get('date', '2000-01-01')) >= start_date
            ]

            # Calculate summary
            total_income = sum(float(t.get('amount', 0)) for t in filtered_transactions if t.get('type') == 'credit')
            total_expenses = sum(float(t.get('amount', 0)) for t in filtered_transactions if t.get('type') == 'debit')

            return {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_amount': total_income - total_expenses,
                'transaction_count': len(filtered_transactions),
                'period': period
            }
        except Exception as e:
            print(f"Error getting transaction summary: {e}")
            return {}

# Global instance
firestore_service = FirestoreService()