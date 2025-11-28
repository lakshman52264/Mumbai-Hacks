"""
CrewAI Service - Sequential AI Processing for Transaction Analysis

This service provides sequential processing:
1. Transaction categorization
2. Anomaly detection (only if categorization succeeds)

Used by transaction_monitor_service for clean separation of concerns.
"""

import asyncio
from typing import Dict, Any

# Import crew functions
from agents.categorization_agent import categorize_transaction_agent
from agents.anomaly_agent import detect_anomaly_agent


class TransactionCrewService:
    """
    Service for sequential transaction AI processing.
    """

    def __init__(self):
        self.max_anomaly_retries = 2

    async def process_transaction_sequential(
        self,
        user_id: str,
        transaction_id: str,
        transaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process transaction sequentially: categorization first, then anomaly detection.

        Args:
            user_id: User identifier
            transaction_id: Transaction identifier
            transaction_data: Transaction data dictionary

        Returns:
            Dict containing processing results
        """
        print(f"🔄 Sequential AI processing for transaction {transaction_id}")

        # Step 1: Categorization
        print(f"🤖 Step 1: Running categorization...")
        categorization_result = await categorize_transaction_agent(
            user_id, transaction_id, transaction_data
        )

        if categorization_result.get('status') != 'completed':
            return {
                'status': 'failed',
                'stage': 'categorization',
                'error': categorization_result.get('error', 'Categorization failed'),
                'categorization': categorization_result,
                'anomaly': None
            }

        # Step 2: Anomaly Detection (with retry logic)
        print(f"🔍 Step 2: Running anomaly detection...")
        anomaly_result = await self._run_anomaly_detection_with_retry(
            user_id, transaction_id, transaction_data
        )

        return {
            'status': 'completed',
            'stage': 'both',
            'categorization': categorization_result,
            'anomaly': anomaly_result
        }

    async def _run_anomaly_detection_with_retry(
        self,
        user_id: str,
        transaction_id: str,
        transaction_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Run anomaly detection with retry logic.

        Args:
            user_id: User identifier
            transaction_id: Transaction identifier
            transaction_data: Transaction data

        Returns:
            Anomaly detection result
        """
        for attempt in range(self.max_anomaly_retries + 1):  # +1 for initial attempt
            try:
                if attempt > 0:
                    print(f"   🔄 Retry attempt {attempt}/{self.max_anomaly_retries}")
                    await asyncio.sleep(2 ** (attempt - 1))  # Exponential backoff

                result = await detect_anomaly_agent(
                    user_id, transaction_id, transaction_data
                )

                if result.get('status') == 'completed':
                    if attempt > 0:
                        print(f"   ✅ Anomaly detection succeeded on retry!")
                    return result

            except Exception as e:
                print(f"   ⚠️  Anomaly detection attempt {attempt + 1} failed: {e}")
                if attempt == self.max_anomaly_retries:
                    return {'status': 'error', 'error': str(e)}
                continue

        return {'status': 'failed', 'error': f'Failed after {self.max_anomaly_retries + 1} attempts'}


# Global service instance
transaction_crew_service = TransactionCrewService()


async def process_transaction_ai(
    user_id: str,
    transaction_id: str,
    transaction_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Main entry point for sequential AI transaction processing.

    Args:
        user_id: User identifier
        transaction_id: Transaction identifier
        transaction_data: Transaction data dictionary

    Returns:
        Dict containing processing results
    """
    return await transaction_crew_service.process_transaction_sequential(
        user_id, transaction_id, transaction_data
    )