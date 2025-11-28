"""
Local Transaction Monitor Service

This service runs locally and continuously monitors Firestore for new transactions.
When a new transaction is detected, it automatically triggers the AI categorization.

This is perfect for local development without needing to deploy Cloud Functions.

Usage:
    python transaction_monitor_service.py
"""

import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, Set
import firebase_admin
from firebase_admin import credentials, firestore
import asyncio
from collections import defaultdict

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the AI processing service
from crewai_service import process_transaction_ai

# Track processed transactions to avoid duplicates
processed_transactions: Set[str] = set()
user_last_processed: Dict[str, datetime] = {}

# Initialize Firebase
def initialize_firebase():
    """Initialize Firebase Admin SDK."""
    if not firebase_admin._apps:
        try:
            cred_path = os.path.join(
                os.path.dirname(__file__),
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

def get_all_users(db) -> list:
    """
    Get all user IDs from Firestore.
    Since user documents may not exist (only subcollections), 
    we need to scan for users with transactions.
    """
    try:
        # First try getting user documents
        users_ref = db.collection('users')
        users = users_ref.stream()
        user_ids = [user.id for user in users]
        
        # If no user documents exist, try to find users by scanning collection groups
        if not user_ids:
            print("⚠️  No user documents found, scanning for users with transactions...")
            # Get all transactions across all users using collection group query
            all_transactions = db.collection_group('transactions').limit(100).stream()
            user_ids_set = set()
            for txn in all_transactions:
                # Extract user_id from document path: users/{user_id}/transactions/{txn_id}
                path_parts = txn.reference.path.split('/')
                if len(path_parts) >= 2 and path_parts[0] == 'users':
                    user_ids_set.add(path_parts[1])
            user_ids = list(user_ids_set)
            if user_ids:
                print(f"✅ Found {len(user_ids)} user(s) with transactions: {user_ids}")
        
        return user_ids
    except Exception as e:
        print(f"⚠️  Error fetching users: {e}")
        import traceback
        traceback.print_exc()
        return []

def check_new_transactions(db, user_id: str) -> list:
    """
    Check for new transactions for a specific user.
    Returns list of new transactions that haven't been categorized.
    """
    try:
        transactions_ref = db.collection('users').document(user_id).collection('transactions')
        
        # Get all transactions and filter in memory
        # (Firestore can't efficiently query for missing fields)
        all_transactions = transactions_ref.stream()
        
        new_transactions = []
        for doc in all_transactions:
            txn_data = doc.to_dict()
            txn_id = doc.id
            
            # Skip if already processed
            if txn_id in processed_transactions:
                continue
            
            # Skip if it has a category (already categorized)
            if 'category' in txn_data:
                processed_transactions.add(txn_id)
                continue
            
            # Skip if it has categorized_at (already categorized)
            if 'categorized_at' in txn_data:
                processed_transactions.add(txn_id)
                continue
            
            new_transactions.append({
                'id': txn_id,
                'data': txn_data,
                'user_id': user_id
            })
        
        return new_transactions
        
    except Exception as e:
        print(f"⚠️  Error checking transactions for user {user_id}: {e}")
        import traceback
        traceback.print_exc()
        return []

async def process_transaction(user_id: str, transaction_id: str, transaction_data: Dict[str, Any], max_retries: int = 3):
    """Process a single transaction with AI categorization and anomaly detection."""
    retry_count = 0

    while retry_count <= max_retries:
        try:
            if retry_count == 0:
                print(f"\n🔔 New transaction detected!")
                print(f"   User: {user_id}")
                print(f"   Transaction: {transaction_id}")
                print(f"   Amount: ₹{transaction_data.get('amount', 0)}")
                print(f"   Merchant: {transaction_data.get('merchant', 'N/A')}")
                print(f"   Description: {transaction_data.get('description', 'N/A')[:60]}...")
            else:
                print(f"🔄 Retry attempt {retry_count}/{max_retries} for transaction {transaction_id}")

            # Use the centralized CrewAI service for sequential processing
            print(f"🤖 Starting AI processing (categorization + anomaly detection)...")
            result = await process_transaction_ai(user_id, transaction_id, transaction_data)

            # Check overall status
            if result.get('status') == 'completed':
                # Mark as processed only on success
                processed_transactions.add(transaction_id)
                print(f"✅ AI processing completed successfully!")
                print(f"   Categorization: ✅")
                if result.get('anomaly', {}).get('status') == 'completed':
                    print(f"   Anomaly Detection: ✅")
                else:
                    print(f"   Anomaly Detection: ⚠️ (Failed but retried)")
                print("-" * 70)
                return True
            else:
                error_msg = result.get('error', 'Unknown error')
                print(f"⚠️  AI processing failed: {error_msg}")

                # Check if it's a rate limit error that might be resolved with retry
                if "RATE_LIMIT_RETRY" in str(error_msg) or "429" in str(error_msg):
                    retry_count += 1
                    if retry_count <= max_retries:
                        print(f"⏳ Waiting 5 seconds before retry...")
                        await asyncio.sleep(5)
                        continue

                # For other errors, don't retry
                print(f"❌ AI processing failed permanently: {error_msg}")
                print("-" * 70)
                return False

        except Exception as e:
            error_str = str(e)
            print(f"⚠️  Error processing transaction {transaction_id}: {e}")

            # Check if we should retry
            if "RATE_LIMIT_RETRY" in error_str or "429" in error_str:
                retry_count += 1
                if retry_count <= max_retries:
                    print(f"⏳ Waiting 5 seconds before retry...")
                    await asyncio.sleep(5)
                    continue

            # For other errors, don't retry
            print(f"❌ Failed permanently")
            print("-" * 70)
            return False

    print(f"❌ Max retries ({max_retries}) exceeded for transaction {transaction_id}")
    print("-" * 70)
    return False

async def monitor_transactions(db, check_interval: int = 5):
    """
    Main monitoring loop that checks for new transactions periodically.
    
    Args:
        db: Firestore client
        check_interval: Seconds between checks (default: 5)
    """
    print(f"\n👀 Monitoring Firestore for new transactions...")
    print(f"   Check interval: {check_interval} seconds")
    print(f"   Press Ctrl+C to stop")
    print("=" * 70)
    
    iteration = 0
    
    while True:
        try:
            iteration += 1
            
            # Get all users
            user_ids = get_all_users(db)
            
            if not user_ids and iteration == 1:
                print("⚠️  No users found in Firestore")
            
            # Check each user for new transactions
            all_new_transactions = []
            for user_id in user_ids:
                new_txns = check_new_transactions(db, user_id)
                all_new_transactions.extend(new_txns)
            
            # Process new transactions
            if all_new_transactions:
                print(f"\n🎯 Found {len(all_new_transactions)} new transaction(s) to process")
                
                # Process transactions sequentially
                for txn in all_new_transactions:
                    await process_transaction(
                        txn['user_id'],
                        txn['id'],
                        txn['data']
                    )
            else:
                # Heartbeat - show we're still running
                if iteration % 12 == 0:  # Every minute (if check_interval=5)
                    print(f"💚 Monitoring... [{datetime.now().strftime('%H:%M:%S')}] - {len(processed_transactions)} transactions processed so far")
            
            # Wait before next check
            await asyncio.sleep(check_interval)
            
        except KeyboardInterrupt:
            print("\n\n⏹️  Stopping monitor service...")
            break
        except Exception as e:
            print(f"\n❌ Error in monitor loop: {e}")
            import traceback
            traceback.print_exc()
            print(f"   Retrying in {check_interval} seconds...")
            await asyncio.sleep(check_interval)

def main():
    """Main function to start the monitoring service."""
    print("=" * 70)
    print("🚀 Transaction Monitor Service - Local Development")
    print("=" * 70)
    print()
    
    # Check for API key
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("GOOGLE_API_KEY"):
        print("⚠️  WARNING: GEMINI_API_KEY or GOOGLE_API_KEY not found!")
        print("   Set it with: $env:GEMINI_API_KEY='your-key' (PowerShell)")
        print("   Or: export GEMINI_API_KEY='your-key' (Bash)")
        print()
        response = input("Continue anyway? (y/n): ").strip().lower()
        if response != 'y':
            print("Exiting...")
            return
    
    # Initialize Firebase
    initialize_firebase()
    db = firestore.client()
    
    # Get monitoring settings
    print("\n⚙️  Configuration:")
    check_interval = input("   Check interval in seconds (default: 5): ").strip()
    try:
        check_interval = int(check_interval) if check_interval else 5
    except ValueError:
        check_interval = 5
    
    print(f"   ✓ Will check for new transactions every {check_interval} seconds")
    print()
    
    # Start monitoring
    try:
        asyncio.run(monitor_transactions(db, check_interval))
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    
    print()
    print("=" * 70)
    print(f"✅ Service stopped. Processed {len(processed_transactions)} transactions total.")
    print("=" * 70)

if __name__ == "__main__":
    main()
