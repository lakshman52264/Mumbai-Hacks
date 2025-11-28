"""
Test script to add transactions to Firestore and trigger AI categorization.

This script adds test transactions to the Firestore users/{userId}/transactions collection,
which will automatically trigger the Cloud Function for AI-based categorization.

Usage:
    python scripts/test_transaction_trigger.py
"""

import os
import sys
from datetime import datetime, timedelta
import random
import pytz
import firebase_admin
from firebase_admin import credentials, firestore

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    if not firebase_admin._apps:
        try:
            cred_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'mumbaihacks-63c0c-firebase-adminsdk-fbsvc-a7a6cd0780.json'
            )
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase initialized with credentials")
            else:
                firebase_admin.initialize_app()
                print("✅ Firebase initialized with default credentials")
        except Exception as e:
            print(f"❌ Firebase initialization error: {e}")
            sys.exit(1)

# Sample test transactions from real bank statement
TEST_TRANSACTIONS = [
    {
        "type": "debit",
        "amount": 45.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/693403196804/INSTANT /YESB/BHARATPE5O/Pay T"
    },
    {
        "type": "debit",
        "amount": 57.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/068170442912/Compass /YESB/paytm-3334/Payme"
    },
    {
        "type": "debit",
        "amount": 40.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/228835689820/Compass /YESB/paytm-3334/Payme"
    },
    {
        "type": "debit",
        "amount": 57.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/114320155584/INSTANT /YESB/BHARATPE5O/Pay T"
    },
    {
        "type": "credit",
        "amount": 1000.00,
        "description": "TRANSFER FROM 4897736162097 UPI/CR/155534436447/JERILJOSHY/I CIC/7899945731/NO"
    },
    {
        "type": "debit",
        "amount": 1748.24,
        "description": "TRANSFER TO 4897695162091 UPI/DR/193186136880/Simpl/UTIB/si mpl@axb/UPI Inten"
    },
    {
        "type": "debit",
        "amount": 480.00,
        "description": "TRANSFER TO 4897690162095 UPI/DR/825024607576/RAMESH/YES B/paytmqr6hl/Payment"
    },
    {
        "type": "debit",
        "amount": 49.00,
        "description": "TRANSFER TO 4897690162095 UPI/DR/872019610878/LENSKART/IN DB/lenskart.p/UPIIn"
    },
    {
        "type": "debit",
        "amount": 6345.00,
        "description": "TRANSFER TO 4897690162095 UPI/DR/567141260201/LENSKART/Y ESB/lenskartof/Payme"
    },
    {
        "type": "debit",
        "amount": 1000.00,
        "description": "TRANSFER TO 4897691162095 UPI/DR/262238071036/J H Serv/PPIW/ombk.AACK8/Payme"
    },
    {
        "type": "debit",
        "amount": 54.00,
        "description": "TRANSFER TO 4897691162095 UPI/DR/240031500218/Compass /YESB/paytm-3334/Payme"
    },
    {
        "type": "debit",
        "amount": 45.00,
        "description": "TRANSFER TO 4897691162095 UPI/DR/712380334280/INSTANT /YESB/BHARATPE5O/Pay T"
    },
    {
        "type": "debit",
        "amount": 450.00,
        "description": "TRANSFER TO 4897692162094 UPI/DR/905982785639/PAVITHRA A/YESB/paytmqr6cw/Pay"
    },
    {
        "type": "debit",
        "amount": 59.00,
        "description": "TRANSFER TO 4897693162093 UPI/DR/560493908919/Spotify /ICIC/spotify.bd/Manda"
    },
    {
        "type": "debit",
        "amount": 57.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/275569164530/Compass /YESB/paytm-3334/Payme"
    },
    {
        "type": "credit",
        "amount": 2000.00,
        "description": "TRANSFER FROM 4897736162097 UPI/CR/698348284335/BRAHMAIA/H DFC/9962274924/Payme"
    },
    {
        "type": "debit",
        "amount": 51.00,
        "description": "TRANSFER TO 4897694162092 UPI/DR/532353734682/Compass /YESB/paytm-3334/Payme"
    },
    {
        "type": "credit",
        "amount": 82667.00,
        "description": "TRANSFER FROM 99509044300 NEFT*HDFC0000240*HDFCH004476 78824*TMF SERVICES IND"
    },
    {
        "type": "debit",
        "amount": 228.00,
        "description": "TRANSFER TO 4897695162091 UPI/DR/365336087200/AMBARISH/U BIN/kumarambar/Payme"
    },
    {
        "type": "debit",
        "amount": 20.00,
        "description": "TRANSFER TO 4897695162091 UPI/DR/352562105458/WONDER V/YESB/paytmqr13s/Payme"
    }
]

def add_test_transaction(user_id: str, transaction_data: dict, delay_days: int = 0) -> str:
    """
    Add a test transaction to Firestore.
    
    Args:
        user_id: User ID
        transaction_data: Transaction data dictionary
        delay_days: Number of days to backdate the transaction (default: 0)
    
    Returns:
        Transaction document ID
    """
    db = firestore.client()
    
    # Create transaction document
    transaction_ref = db.collection('users').document(user_id).collection('transactions').document()
    transaction_id = transaction_ref.id
    
    # Calculate transaction date
    ist = pytz.timezone('Asia/Kolkata')
    transaction_date = datetime.now(ist) - timedelta(days=delay_days)
    
    # Prepare transaction data
    transaction = {
        'id': transaction_id,
        'accountId': f'acc_{random.randint(1000, 9999)}',
        'date': transaction_date,
        'type': transaction_data['type'],
        'amount': transaction_data['amount'],
        'description': transaction_data['description'],
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
        'source': 'test_script'
    }
    
    # Add to Firestore (this will trigger the Cloud Function)
    transaction_ref.set(transaction)
    
    print(f"✅ Added transaction: {transaction_id}")
    print(f"   Type: {transaction_data['type']}")
    print(f"   Amount: ₹{transaction_data['amount']}")
    print(f"   Description: {transaction_data['description'][:60]}...")
    print()
    
    return transaction_id

def add_multiple_transactions(user_id: str, count: int = 5, spread_days: int = 30):
    """
    Add multiple test transactions spread over a time period.
    
    Args:
        user_id: User ID
        count: Number of transactions to add
        spread_days: Number of days to spread transactions over
    """
    print(f"🚀 Adding {count} test transactions for user: {user_id}\n")
    
    # Select random transactions
    selected_transactions = random.sample(TEST_TRANSACTIONS, min(count, len(TEST_TRANSACTIONS)))
    
    transaction_ids = []
    for i, txn_data in enumerate(selected_transactions):
        # Spread transactions over the time period
        delay = random.randint(0, spread_days)
        txn_id = add_test_transaction(user_id, txn_data, delay_days=delay)
        transaction_ids.append(txn_id)
    
    print(f"\n✅ Successfully added {len(transaction_ids)} transactions")
    print(f"   User ID: {user_id}")
    print(f"   Transaction IDs: {transaction_ids[:3]}{'...' if len(transaction_ids) > 3 else ''}")
    print(f"\n⏳ Cloud Function will automatically categorize these transactions using AI")
    print(f"   Check Firestore to see the categorized results after a few minutes.")
    
    return transaction_ids

def add_single_transaction(user_id: str, transaction_index: int = 0):
    """
    Add a single test transaction.
    
    Args:
        user_id: User ID
        transaction_index: Index of transaction from TEST_TRANSACTIONS
    """
    print(f"🚀 Adding single test transaction for user: {user_id}\n")
    
    if transaction_index >= len(TEST_TRANSACTIONS):
        print(f"❌ Invalid transaction index. Max: {len(TEST_TRANSACTIONS) - 1}")
        return None
    
    txn_data = TEST_TRANSACTIONS[transaction_index]
    txn_id = add_test_transaction(user_id, txn_data)
    
    print(f"\n⏳ Cloud Function will automatically categorize this transaction using AI")
    print(f"   Check Firestore in a few minutes for categorization results.")
    
    return txn_id

def main():
    """Main function to run the test script."""
    print("=" * 70)
    print("🧪 Transaction Trigger Test Script")
    print("=" * 70)
    print()
    
    # Initialize Firebase
    initialize_firebase()
    
    # Get user ID (you can customize this)
    user_id = input("\nEnter User ID (or press Enter for default 'test_user_123'): ").strip()
    if not user_id:
        user_id = "test_user_123"
    
    print(f"\nUsing User ID: {user_id}")
    
    # Ask user what to do
    print("\nOptions:")
    print("1. Add a single test transaction")
    print("2. Add multiple test transactions (5 transactions)")
    print("3. Add many test transactions (10+ transactions)")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        # List available transactions
        print("\nAvailable test transactions:")
        for i, txn in enumerate(TEST_TRANSACTIONS[:10]):  # Show first 10
            print(f"  {i}. {txn['type'].upper()} ₹{txn['amount']} - {txn['description'][:50]}...")
        
        txn_index = input(f"\nEnter transaction index (0-{len(TEST_TRANSACTIONS)-1}): ").strip()
        try:
            txn_index = int(txn_index)
            add_single_transaction(user_id, txn_index)
        except ValueError:
            print("❌ Invalid input. Using default transaction.")
            add_single_transaction(user_id, 0)
    
    elif choice == "2":
        add_multiple_transactions(user_id, count=5, spread_days=30)
    
    elif choice == "3":
        count = input("Enter number of transactions to add (default: 10): ").strip()
        try:
            count = int(count) if count else 10
        except ValueError:
            count = 10
        
        add_multiple_transactions(user_id, count=count, spread_days=60)
    
    elif choice == "4":
        print("\n👋 Exiting...")
        return
    
    else:
        print("\n❌ Invalid choice. Exiting...")
        return
    
    print("\n" + "=" * 70)
    print("✅ Test script completed!")
    print("=" * 70)

if __name__ == "__main__":
    main()
