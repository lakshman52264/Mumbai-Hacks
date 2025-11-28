import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

def initialize_firebase():
    """Initialize Firebase with service account credentials"""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
    except ValueError:
        # Initialize Firebase
        cred = credentials.Certificate('mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json')
        firebase_admin.initialize_app(cred)
        print("Firebase initialized successfully with service account")

def ingest_transactions_from_json(user_id, json_file_path):
    """Ingest transactions from JSON file to Firestore"""
    # Initialize Firebase
    initialize_firebase()

    # Initialize Firestore client
    db = firestore.client()

    # Load transactions from JSON file
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            transactions = json.load(f)
        print(f"Loaded {len(transactions)} transactions from JSON file")
    except FileNotFoundError:
        print(f"Error: JSON file '{json_file_path}' not found")
        return
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        return

    if not transactions:
        print("No transactions found in JSON file")
        return

    # Save transactions to Firestore (each as separate document in user subcollection)
    batch = db.batch()
    transactions_ref = db.collection('users').document(user_id).collection('transactions')

    for transaction in transactions:
        # Prepare transaction data for Firestore
        date_str = transaction.get('date')
        if date_str:
            try:
                # Parse ISO format date
                date_obj = datetime.fromisoformat(date_str)
            except:
                date_obj = datetime.now()
        else:
            date_obj = datetime.now()

        # Generate a unique transaction ID
        txn_id = f"{user_id}_{date_str}_{transaction.get('merchant', 'unknown').replace(' ', '_')}_{abs(transaction.get('amount', 0))}"

        transaction_data = {
            'id': txn_id,
            'accountId': 'primary_account',  # Default account ID
            'date': date_obj,
            'type': transaction.get('type', 'debit'),
            'merchant': transaction.get('merchant', 'Unknown Merchant'),
            'category': transaction.get('category', 'other'),
            'amount': float(transaction.get('amount', 0)),
            'description': transaction.get('description', ''),
            'user_id': user_id,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }

        transaction_ref = transactions_ref.document(txn_id)
        batch.set(transaction_ref, transaction_data)

    # Commit the batch
    try:
        batch.commit()
        print(f"Successfully ingested {len(transactions)} transactions for user {user_id}")
        print("Each transaction stored as a separate document in the user's transactions subcollection")
    except Exception as e:
        print(f"Error committing transactions to Firestore: {e}")

# Example usage
if __name__ == "__main__":
    # Replace with actual user ID
    user_id = "X39Jaj9TgnaADkjjz3qsg7xmdGE2"  # Example user ID

    # Path to the JSON file
    json_file_path = "transactions.json"

    ingest_transactions_from_json(user_id, json_file_path)