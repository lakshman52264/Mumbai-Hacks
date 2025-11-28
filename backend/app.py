from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import os
from datetime import datetime, timedelta

from setu_service import setu_service, SETU_REDIRECT_URL
from firestore_service import firestore_service

app = FastAPI(title="FinPath API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class InitiateConsentRequest(BaseModel):
    mobile: str
    userId: Optional[str] = None

class ConsentCallbackData(BaseModel):
    consentId: str
    status: str
    accounts: Optional[List[Dict[str, Any]]] = None
    transactions: Optional[List[Dict[str, Any]]] = None

class GoalData(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None
    description: Optional[str] = None
    duration_months: Optional[int] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    emoji: Optional[str] = None
    monthly_contribution: Optional[float] = None

class ReminderData(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str
    is_recurring: bool = False
    recurrence_type: Optional[str] = None

class ConfirmPaymentRequest(BaseModel):
    due_date: str
    amount: float

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Setu Integration Endpoints
@app.post("/setu/initiate-consent")
async def initiate_consent(request: InitiateConsentRequest):
    """Initiate consent for bank account linking"""
    try:
        result = await setu_service.initiate_consent(request.mobile, request.userId)
        
        # Save comprehensive consent to Firestore
        if request.userId:
            consent_data = {
                "consentId": result["consentId"],
                "status": result["status"],
                "mobile": request.mobile,
                "userId": request.userId,
                "consentUrl": result["consentUrl"],
                "initiatedAt": datetime.now(),
                "purpose": {
                    "code": "101",
                    "text": "Wealth management and financial planning",
                    "refUri": "https://api.rebit.org.in/aa/purpose/101.xml",
                    "category": {"type": "string"}
                },
                "consentTypes": ["TRANSACTIONS", "PROFILE", "SUMMARY"],
                "fiTypes": ["DEPOSIT"],
                "dataRange": {
                    "from": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%dT00:00:00Z"),
                    "to": datetime.now().strftime("%Y-%m-%dT00:00:00Z")
                },
                "consentDuration": {"unit": "MONTH", "value": 6},
                "dataLife": {"unit": "MONTH", "value": 1},
                "frequency": {"unit": "MONTH", "value": 1},
                "fetchType": "PERIODIC",
                "consentMode": "STORE",
                "redirectUrl": SETU_REDIRECT_URL
            }
            
            success = await firestore_service.save_consent(request.userId, consent_data)
            if not success:
                print(f"Warning: Failed to save consent data for user {request.userId}")
        
        # Return the result directly (don't wrap in success/data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate consent: {str(e)}")

@app.put("/setu/consent-status/{consent_id}")
async def update_consent_status(consent_id: str, status_data: Dict[str, Any]):
    """Update consent status with comprehensive data"""
    try:
        user_id = status_data.get("userId")
        status = status_data.get("status")
        
        if not user_id or not status:
            raise HTTPException(status_code=400, detail="userId and status are required")
        
        # Remove userId and status from additional data
        additional_data = {k: v for k, v in status_data.items() if k not in ['userId', 'status']}
        
        # Update consent status with additional data
        success = await firestore_service.update_consent_status(user_id, consent_id, status, additional_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update consent status")
        
        return {"message": "Consent status updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update consent status: {str(e)}")

@app.get("/setu/consent-status/{consent_id}")
async def get_consent_status(consent_id: str):
    """Get consent request status from Setu API"""
    try:
        result = await setu_service.get_consent_status(consent_id, expanded=True)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get consent status: {str(e)}")

@app.get("/users/{user_id}/consents")
async def get_user_consents(user_id: str):
    """Get user's consents"""
    try:
        # Get all consents for user
        consents_ref = firestore_service.db.collection('users').document(user_id).collection('consents')
        docs = consents_ref.stream()
        consents = []
        for doc in docs:
            consent_data = doc.to_dict()
            consents.append(consent_data)
        
        return consents
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get consents: {str(e)}")

@app.get("/setu/fetch-transactions/{consent_id}")
async def fetch_transactions(consent_id: str, user_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None):
    """Fetch transactions for a consent and store them in Firestore"""
    try:
        print(f"🔹 Step 1: Creating data session for consent: {consent_id} (user: {user_id})")
        
        # Fetch transactions from Setu API
        fi_data = await setu_service.fetch_transactions(consent_id, from_date, to_date)
        
        # Extract and transform transactions from FI data
        transactions = []
        fips = fi_data.get("fips", [])
        print(f"🔹 Step 4: Found {len(fips)} FIPs in response")
        
        for fip in fips:
            accounts = fip.get("accounts", [])
            print(f"  FIP has {len(accounts)} accounts")
            for account in accounts:
                data = account.get("data", {}).get("account", {})
                transactions_data = data.get("transactions", {}).get("transaction", [])
                print(f"  Account has {len(transactions_data)} transactions")
                
                for txn in transactions_data:
                    transformed_txn = {
                        'txnId': txn.get("txnId"),
                        'accountId': account.get("linkRefNumber"),
                        'valueDate': txn.get('valueDate'),
                        'type': txn.get('type'),
                        'narration': txn.get('narration'),
                        'amount': txn.get('amount'),
                        'description': txn.get('narration', ''),
                        'reference': txn.get('reference')
                    }
                    transactions.append(transformed_txn)
        
        print(f"🔹 Step 5: Extracted {len(transactions)} transactions")
        
        # Store transactions in Firestore if we got any
        if transactions:
            success = await firestore_service.save_transactions(user_id, transactions)
            if success:
                print(f"✅ Successfully stored {len(transactions)} transactions in Firestore for user {user_id}")
            else:
                print(f"❌ Warning: Failed to save transactions for user {user_id}")
        
        return {
            "success": True,
            "data": transactions,
            "count": len(transactions),
            "message": f"Successfully fetched and stored {len(transactions)} transactions"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in fetch_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@app.post("/setu/webhook")
async def setu_webhook(request: Request, background_tasks: BackgroundTasks):
    """Handle Setu webhook callbacks"""
    try:
        webhook_data = await request.json()
        print(f"Received webhook: {webhook_data}")

        # Extract consent information
        consent_id = webhook_data.get("consentId")
        status = webhook_data.get("status")

        if not consent_id:
            raise HTTPException(status_code=400, detail="Missing consentId in webhook")

        # Process webhook in background
        background_tasks.add_task(process_setu_webhook, webhook_data)

        return {"status": "received"}

    except Exception as e:
        print(f"Webhook processing error: {e}")
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

async def process_setu_webhook(webhook_data: Dict[str, Any]):
    """Process Setu webhook data in background"""
    try:
        consent_id = webhook_data.get("consentId")
        status = webhook_data.get("status")

        # Find user by consent ID (this is a simplified approach)
        # In production, you'd want a more robust way to map consent IDs to users
        user_id = webhook_data.get("userId")  # This should be passed in webhook data

        if not user_id:
            print(f"No userId found for consent {consent_id}")
            return

        # Update consent status
        await firestore_service.update_consent_status(user_id, consent_id, status, webhook_data)

        # If consent is approved, fetch and store account data
        if status == "ACTIVE":
            try:
                # Fetch FI data (accounts and transactions)
                fi_data = await setu_service.get_fi_data(consent_id)

                # Extract and save accounts
                accounts = fi_data.get("accounts", [])
                if accounts:
                    await firestore_service.save_bank_accounts(user_id, accounts)

                # Extract and save transactions
                transactions = fi_data.get("transactions", [])
                if transactions:
                    await firestore_service.save_transactions(user_id, transactions)

                print(f"Successfully processed data for user {user_id}, consent {consent_id}")

            except Exception as e:
                print(f"Error fetching FI data for consent {consent_id}: {e}")

    except Exception as e:
        print(f"Error processing webhook: {e}")

# User Management Endpoints
@app.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    """Get user profile"""
    try:
        user_data = await firestore_service.get_user(user_id)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        return user_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user profile: {str(e)}")

@app.put("/users/{user_id}/profile")
async def update_user_profile(user_id: str, profile_data: Dict[str, Any]):
    """Update user profile"""
    try:
        success = await firestore_service.update_user(user_id, profile_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user profile")
        return {"message": "Profile updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user profile: {str(e)}")

@app.delete("/users/{user_id}")
async def delete_user_account(user_id: str):
    """Delete user account and all associated data"""
    try:
        success = await firestore_service.delete_user(user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete user account")
        return {"message": "Account deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

# Bank Accounts Endpoints
@app.get("/users/{user_id}/accounts")
async def get_user_accounts(user_id: str):
    """Get user's bank accounts"""
    try:
        accounts = await firestore_service.get_bank_accounts(user_id)
        return accounts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get accounts: {str(e)}")

# Transactions Endpoints
@app.get("/users/{user_id}/transactions")
async def get_user_transactions(user_id: str, limit: int = 100, offset: int = 0):
    """Get user's transactions"""
    try:
        transactions = await firestore_service.get_transactions(user_id, limit, offset)
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transactions: {str(e)}")

# Goals Endpoints
# Goals Endpoints
@app.get("/users/{user_id}/goals")
async def get_user_goals(user_id: str):
    """Get user's financial goals"""
    try:
        goals = await firestore_service.get_goals(user_id)
        return goals
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get goals: {str(e)}")

@app.post("/users/{user_id}/goals")
async def create_goal(user_id: str, goal: GoalData, background_tasks: BackgroundTasks):
    """Create a new financial goal"""
    try:
        goal_data = goal.dict(exclude_none=True)
        goal_data["id"] = f"{user_id}_{datetime.now().isoformat()}"
        goal_data["ai_processing"] = True  # Mark as AI processing

        success = await firestore_service.save_goal(user_id, goal_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create goal")
        
        # Run AI analysis in background
        background_tasks.add_task(process_goal_analysis, user_id, goal_data, "create")
        
        return {
            "goal": goal_data,
            "ai": {"status": "processing", "message": "AI is analyzing your goal feasibility..."}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create goal: {str(e)}")


async def process_goal_analysis(user_id: str, goal_data: Dict[str, Any], context: str):
    """Background task to process goal AI analysis"""
    try:
        print(f"🚀 Triggering unified goal analysis for user {user_id} goal {goal_data.get('title')}")
        from agents.goals_agent import analyze_goal
        ai_result = await analyze_goal(user_id, goal_data, context)
        print(f"✅ Unified analysis result: {ai_result}")
        
        # Update goal with AI results
        mc = goal_data.get("monthly_contribution")
        updates: Dict[str, Any] = {
            "feasible": bool(ai_result.get("feasible")),
            "risk_level": ai_result.get("risk_level"),
            "completion_months": int(ai_result.get("completion_months") or 0),
            "ai_processing": False,
            "ai_insights": ai_result.get("ai_insights", ""),
            "recommendations": ai_result.get("recommendations", [])
        }
        if not mc or float(mc) <= 0:
            updates["monthly_contribution"] = float(ai_result.get("monthly_contribution") or 0)
        await firestore_service.update_goal_fields(user_id, goal_data["id"], updates)
    except Exception as e:
        print(f"❌ Unified analysis failed: {e}")
        # Mark as failed
        await firestore_service.update_goal_fields(user_id, goal_data["id"], {
            "ai_processing": False,
            "ai_error": str(e)
        })

@app.put("/users/{user_id}/goals/{goal_id}")
async def update_goal(user_id: str, goal_id: str, goal: GoalData, background_tasks: BackgroundTasks):
    """Update a financial goal"""
    try:
        goal_data = goal.dict(exclude_none=True)
        goal_data["id"] = goal_id
        goal_data["ai_processing"] = True  # Mark as AI processing

        success = await firestore_service.save_goal(user_id, goal_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update goal")

        # Run AI analysis in background
        background_tasks.add_task(process_goal_analysis, user_id, goal_data, "update")

        return {
            "message": "Goal updated successfully",
            "ai": {"status": "processing", "message": "AI is re-analyzing your goal feasibility..."}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update goal: {str(e)}")

@app.delete("/users/{user_id}/goals/{goal_id}")
async def delete_goal(user_id: str, goal_id: str):
    """Delete a financial goal"""
    try:
        success = await firestore_service.delete_goal(user_id, goal_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete goal")
        return {"message": "Goal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete goal: {str(e)}")

@app.post("/users/{user_id}/goals/{goal_id}/confirm-payment")
async def confirm_goal_payment(user_id: str, goal_id: str, req: ConfirmPaymentRequest, background_tasks: BackgroundTasks):
    try:
        goal = await firestore_service.get_goal(user_id, goal_id)
        current_amount = float((goal or {}).get("current_amount") or 0)
        new_amount = current_amount + float(req.amount)
        await firestore_service.update_goal_fields(user_id, goal_id, {
            "current_amount": new_amount,
            "ai_processing": True
        })
        reminder_id = f"{goal_id}_{req.due_date}"
        await firestore_service.save_reminder(user_id, reminder_id, {"id": reminder_id, "status": "completed"})
        
        # Run AI analysis in background
        background_tasks.add_task(process_goal_analysis, user_id, {**(goal or {}), "id": goal_id, "current_amount": new_amount}, "payment")
        
        return {
            "updated": True,
            "current_amount": new_amount,
            "ai": {"status": "processing", "message": "AI is re-analyzing your goal progress..."}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to confirm payment: {str(e)}")

# Alerts Endpoints
@app.get("/users/{user_id}/alerts")
async def get_user_alerts(user_id: str):
    """Get user's alerts"""
    try:
        alerts_ref = firestore_service.db.collection('users').document(user_id).collection('alerts')
        docs = alerts_ref.order_by('created_at', direction='DESCENDING').stream()
        
        alerts = []
        for doc in docs:
            alert_data = doc.to_dict()
            alert_data['id'] = doc.id
            
            # Convert Firestore timestamp to ISO string if needed
            if 'created_at' in alert_data and hasattr(alert_data['created_at'], 'isoformat'):
                alert_data['created_at'] = alert_data['created_at'].isoformat()
            if 'updated_at' in alert_data and hasattr(alert_data['updated_at'], 'isoformat'):
                alert_data['updated_at'] = alert_data['updated_at'].isoformat()
            
            # Ensure is_resolved field exists
            if 'is_resolved' not in alert_data:
                alert_data['is_resolved'] = False
            
            alerts.append(alert_data)
        
        return alerts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@app.put("/users/{user_id}/alerts/{alert_id}/resolve")
async def resolve_alert(user_id: str, alert_id: str):
    """Mark an alert as resolved"""
    try:
        alert_ref = firestore_service.db.collection('users').document(user_id).collection('alerts').document(alert_id)
        
        # Check if alert exists
        alert_doc = alert_ref.get()
        if not alert_doc.exists:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Update alert
        alert_ref.update({
            'is_resolved': True,
            'resolved_at': datetime.now(),
            'updated_at': datetime.now()
        })
        
        return {"message": "Alert resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {str(e)}")

@app.delete("/users/{user_id}/alerts/{alert_id}")
async def delete_alert(user_id: str, alert_id: str):
    """Delete an alert"""
    try:
        alert_ref = firestore_service.db.collection('users').document(user_id).collection('alerts').document(alert_id)
        
        # Check if alert exists
        alert_doc = alert_ref.get()
        if not alert_doc.exists:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Delete alert
        alert_ref.delete()
        
        return {"message": "Alert deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete alert: {str(e)}")


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)