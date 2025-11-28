import os
import httpx
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import base64
from dotenv import load_dotenv

load_dotenv()

# Setu API Configuration
SETU_BASE_URL = os.getenv("SETU_BASE_URL")
SETU_CLIENT_ID = os.getenv("SETU_CLIENT_ID")
SETU_CLIENT_SECRET = os.getenv("SETU_CLIENT_SECRET")
SETU_PRODUCT_INSTANCE_ID = os.getenv("SETU_PRODUCT_INSTANCE_ID")
SETU_REDIRECT_URL = os.getenv("SETU_REDIRECT_URL")

class SetuService:
    def __init__(self):
        self.base_url = SETU_BASE_URL
        self.client_id = SETU_CLIENT_ID
        self.client_secret = SETU_CLIENT_SECRET
        self.product_instance_id = SETU_PRODUCT_INSTANCE_ID
        self._access_token = None
        self._token_expires_at = None

    async def _get_access_token(self) -> str:
        """Get OAuth2 access token from Setu"""
        if self._access_token and self._token_expires_at and datetime.now() < self._token_expires_at:
            return self._access_token

        # Use the correct Setu OAuth endpoint
        url = "https://orgservice-prod.setu.co/v1/users/login"
        headers = {
            "Content-Type": "application/json",
            "client": "bridge"  # Required header
        }

        data = {
            "clientID": self.client_id,
            "grant_type": "client_credentials",
            "secret": self.client_secret
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)

        if response.status_code != 200:
            raise Exception(f"Failed to get access token: {response.status_code} - {response.text}")

        token_data = response.json()
        self._access_token = token_data["access_token"]
        # Token expires in 1 hour, set expiry to 50 minutes for safety
        self._token_expires_at = datetime.now() + timedelta(minutes=50)

        return self._access_token

    async def _make_api_call(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Make authenticated API call to Setu"""
        token = await self._get_access_token()
        url = f"{self.base_url}{endpoint}"

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "x-product-instance-id": self.product_instance_id
        }

        async with httpx.AsyncClient() as client:
            if method.upper() == "GET":
                response = await client.get(url, headers=headers)
            elif method.upper() == "POST":
                response = await client.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = await client.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

        if response.status_code not in [200, 201, 202]:
            raise Exception(f"Setu API call failed: {response.status_code} - {response.text}")

        return response.json()

    async def initiate_consent(self, mobile: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Initiate consent for bank account linking"""
        endpoint = "/consents"  # Use /consents endpoint

        # Format mobile number with @ handle if needed
        vua = mobile if "@" in mobile else f"{mobile}@onemoney"

        consent_data = {
            "vua": vua,
            "dataRange": {
                "from": (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%dT00:00:00Z"),
                "to": datetime.now().strftime("%Y-%m-%dT00:00:00Z")
            },
            "consentDuration": {
                "unit": "MONTH",
                "value": 6
            },
            "fetchType": "PERIODIC",
            "consentTypes": ["TRANSACTIONS", "PROFILE", "SUMMARY"],
            "fiTypes": ["DEPOSIT"],
            "dataLife": {
                "unit": "MONTH",
                "value": 1
            },
            "frequency": {
                "unit": "MONTH",
                "value": 1
            },
            "consentMode": "STORE",
            "redirectUrl": SETU_REDIRECT_URL
        }

        response = await self._make_api_call("POST", endpoint, consent_data)
        return {
            "consentId": response["id"],
            "consentUrl": response["url"],
            "status": response["status"]
        }

    async def get_consent_status(self, consent_id: str, expanded: bool = False) -> Dict[str, Any]:
        """Get consent request status"""
        endpoint = f"/consents/{consent_id}"
        if expanded:
            endpoint += "?expanded=true"
        response = await self._make_api_call("GET", endpoint)
        return response

    async def create_data_session(self, consent_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> Dict[str, Any]:
        """Create a data session to fetch financial data"""
        endpoint = "/sessions"

        if not from_date:
            from_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%dT00:00:00Z")
        if not to_date:
            to_date = datetime.now().strftime("%Y-%m-%dT00:00:00Z")

        session_data = {
            "consentId": consent_id,
            "dataRange": {
                "from": from_date,
                "to": to_date
            },
            "format": "json"
        }

        response = await self._make_api_call("POST", endpoint, session_data)
        return response

    async def fetch_fi_data(self, session_id: str) -> Dict[str, Any]:
        """Fetch FI data for a data session"""
        endpoint = f"/sessions/{session_id}"
        response = await self._make_api_call("GET", endpoint)
        return response

    async def fetch_transactions(self, consent_id: str, from_date: Optional[str] = None, to_date: Optional[str] = None) -> Dict[str, Any]:
        """Fetch transactions with polling until data is ready - Production Quality"""
        import asyncio
        
        try:
            # Step 1: Create data session (POST /v2/sessions)
            print(f"🔹 Step 1: Creating data session for consent: {consent_id}")
            session = await self.create_data_session(consent_id, from_date, to_date)
            session_id = session.get("id")

            if not session_id:
                raise Exception("Failed to create data session - no session ID returned")

            print(f"✅ Session created: {session_id}, Initial status: {session.get('status')}")

            # Step 2: Poll until session status is PARTIAL or COMPLETED
            status = session.get("status", "PENDING")
            retries = 20
            poll_data = session

            while retries > 0 and status in ["ACTIVE", "PENDING"]:
                print(f"🔹 Step 2: Polling... Status: {status}, Retries left: {retries}")
                await asyncio.sleep(3)  # Wait 3 seconds between polls
                
                poll_data = await self.fetch_fi_data(session_id)
                status = poll_data.get("status")
                
                if status in ["PARTIAL", "COMPLETED"]:
                    print(f"✅ Data ready! Status: {status}")
                    break
                    
                retries -= 1

            # Step 3: Check if we got data
            if status not in ["PARTIAL", "COMPLETED"]:
                raise Exception(f"❌ Timeout or failed to fetch FI data. Final status: {status}")

            print(f"🔹 Step 3: Successfully fetched FI data")
            # Return the final data
            return poll_data

        except Exception as e:
            print(f"❌ Error in fetch_transactions: {e}")
            raise

    async def get_active_fips(self, status: Optional[str] = None, aa: Optional[str] = None, expanded: bool = False) -> Dict[str, Any]:
        """Get list of active Financial Information Providers"""
        endpoint = "/fips"
        params = []
        if status:
            params.append(f"status={status}")
        if aa:
            params.append(f"aa={aa}")
        if expanded:
            params.append("expanded=true")

        if params:
            endpoint += "?" + "&".join(params)

        response = await self._make_api_call("GET", endpoint)
        return response

    async def get_fip_by_id(self, fip_id: str, aa: Optional[str] = None, expanded: bool = False) -> Dict[str, Any]:
        """Get specific FIP details by ID"""
        endpoint = f"/fips/{fip_id}"
        params = []
        if aa:
            params.append(f"aa={aa}")
        if expanded:
            params.append("expanded=true")

        if params:
            endpoint += "?" + "&".join(params)

        response = await self._make_api_call("GET", endpoint)
        return response

    async def revoke_consent(self, consent_id: str) -> Dict[str, Any]:
        """Revoke a consent"""
        endpoint = f"/consents/{consent_id}/revoke"
        response = await self._make_api_call("POST", endpoint)
        return response

    async def get_last_fetch_status(self, consent_id: str) -> Dict[str, Any]:
        """Get last fetch status for a consent"""
        endpoint = f"/consents/{consent_id}/fetch/status"
        response = await self._make_api_call("GET", endpoint)
        return response

    async def get_data_sessions_by_consent(self, consent_id: str) -> Dict[str, Any]:
        """Get all data sessions for a consent"""
        endpoint = f"/consents/{consent_id}/data-sessions"
        response = await self._make_api_call("GET", endpoint)
        return response

# Global instance
setu_service = SetuService()
