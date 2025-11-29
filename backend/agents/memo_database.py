"""
Mem0 Integration for AI Financial Coach
Handles memory storage and retrieval using Mem0 Platform API

Official Documentation: https://docs.mem0.ai/
- Memory Types: Conversation, Session, User, Organizational
- Operations: Add, Search, Update, Delete (single & batch)
- Filters: Complex AND/OR logic with comparison operators
"""

import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from mem0 import MemoryClient
from dotenv import load_dotenv

load_dotenv()


class FinancialCoachMemory:
    """
    Complete Mem0 wrapper for financial coaching with all CRUD operations.
   
    Features:
    - Add memories (conversation-based inference)
    - Search with advanced filters
    - Update single or batch memories
    - Delete with filters or batch
    - Session and user-level memory management
   
    Memory Types Used:
    - User Memory: Long-term preferences, priorities, behavioral patterns
    - Session Memory: Short-term context for ongoing conversations
    """
   
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Mem0 Platform client.
       
        Args:
            api_key: Mem0 API key (get from https://app.mem0.ai/settings/api-keys)
                    Falls back to MEM0_API_KEY environment variable
       
        Raises:
            ValueError: If no API key is provided or found in environment
        """
        self.api_key = api_key or os.getenv("MEM0_API_KEY")
        if not self.api_key:
            raise ValueError(
                "MEM0_API_KEY not found. Get your API key from https://app.mem0.ai/settings/api-keys "
                "and set it in .env or pass as argument"
            )
       
        self.client = MemoryClient(api_key=self.api_key)
        print(f"✅ Mem0 client initialized")
   
    # ===========================
    # ADD MEMORY OPERATIONS
    # ===========================
   
    def add_coaching_session(
        self,
        user_id: str,
        query: str,
        response: str,
        session_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        run_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        infer: bool = True
    ) -> Dict[str, Any]:
        """
        Store a coaching session in Mem0 with automatic memory inference.
       
        From Official Docs:
        - Mem0 extracts structured memories from conversation (default: infer=True)
        - Use session_id for short-term context that expires
        - Use user_id for long-term personalization
        - metadata enables advanced filtering
       
        Args:
            user_id: User identifier (required for user-level memory)
            query: User's question
            response: Coach's response
            session_id: Optional session identifier for short-term memory
            agent_id: Optional agent identifier
            run_id: Optional run identifier for specific execution context
            metadata: Additional metadata for filtering (e.g., {"category": "spending"})
            infer: If True (default), Mem0 extracts structured memories.
                   If False, stores raw messages without inference.
       
        Returns:
            dict: {
                "success": bool,
                "memory_ids": list,  # IDs of created memories
                "user_id": str
            }
       
        Example:
            >>> memory.add_coaching_session(
            ...     user_id="user_123",
            ...     query="Why did I overspend?",
            ...     response="You spent ₹4,500 on food...",
            ...     session_id="chat-2025-11",
            ...     metadata={"category": "spending_analysis"}
            ... )
        """
        try:
            # Format messages for Mem0 (conversation format)
            messages = [
                {"role": "user", "content": query},
                {"role": "assistant", "content": response}
            ]
           
            # Prepare request parameters
            request_params = {
                "messages": messages,
                "user_id": user_id,
                "infer": infer
            }
           
            # Add optional identifiers
            if session_id:
                request_params["session_id"] = session_id
            if agent_id:
                request_params["agent_id"] = agent_id
            if run_id:
                request_params["run_id"] = run_id
           
            # Add metadata
            if metadata:
                request_params["metadata"] = metadata
            else:
                request_params["metadata"] = {
                    "session_type": "financial_coaching",
                    "timestamp": datetime.now().isoformat()
                }
           
            # Add to Mem0 Platform
            result = self.client.add(**request_params)
           
            # Extract memory IDs from response
            memory_ids = []
            if isinstance(result, dict):
                memory_ids = result.get("results", [])
                if isinstance(memory_ids, list):
                    memory_ids = [m.get("id") if isinstance(m, dict) else m for m in memory_ids]
           
            print(f"✅ Stored {len(memory_ids)} memories for user: {user_id}")
           
            return {
                "success": True,
                "memory_ids": memory_ids,
                "user_id": user_id,
                "inferred": infer
            }
       
        except Exception as e:
            print(f"❌ Error storing memory in Mem0: {e}")
            return {
                "success": False,
                "error": str(e),
                "user_id": user_id
            }
   
    # ===========================
    # SEARCH MEMORY OPERATIONS
    # ===========================
   
    def search_memories(
        self,
        query: str,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None,
        run_id: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
        rerank: bool = True
    ) -> Dict[str, Any]:
        """
        Search memories using semantic search with advanced filtering.
       
        From Official Docs:
        - Natural language queries with vector similarity search
        - Complex filters with AND/OR logic
        - Automatic reranking for better precision (default: True)
        - Results include memory text, metadata, timestamps, scores
       
        Args:
            query: Natural language search query
            user_id: Filter by user ID (recommended to scope results)
            agent_id: Filter by agent ID
            session_id: Filter by session ID
            run_id: Filter by run ID
            filters: Advanced filters with AND/OR logic
                Example: {
                    "AND": [
                        {"user_id": "alice"},
                        {"categories": {"contains": "spending"}},
                        {"created_at": {"gte": "2025-11-01"}}
                    ]
                }
            limit: Maximum number of results (default: 10)
            rerank: Enable reranking for better precision (default: True)
       
        Returns:
            dict: {
                "success": bool,
                "results": list,  # List of memory objects
                "count": int
            }
       
        Filter Operators:
        - Comparison: eq, ne, gt, gte, lt, lte
        - String: contains, in
        - Logic: AND, OR
       
        Example:
            >>> memory.search_memories(
            ...     query="What are my food preferences?",
            ...     user_id="user_123",
            ...     filters={
            ...         "AND": [
            ...             {"categories": {"contains": "food"}},
            ...             {"created_at": {"gte": "2025-11-01"}}
            ...         ]
            ...     }
            ... )
        """
        try:
            # Build filters dict
            search_filters = filters or {}
           
            # Add ID filters to filters dict (Platform API style)
            if not search_filters and user_id:
                search_filters = {"user_id": user_id}
            elif user_id and "AND" not in search_filters and "OR" not in search_filters:
                search_filters["user_id"] = user_id
           
            # Add other identifiers if provided
            if agent_id:
                if "AND" in search_filters:
                    search_filters["AND"].append({"agent_id": agent_id})
                else:
                    search_filters["agent_id"] = agent_id
           
            if session_id:
                if "AND" in search_filters:
                    search_filters["AND"].append({"session_id": session_id})
                else:
                    search_filters["session_id"] = session_id
           
            if run_id:
                if "AND" in search_filters:
                    search_filters["AND"].append({"run_id": run_id})
                else:
                    search_filters["run_id"] = run_id
           
            # Execute search
            results = self.client.search(
                query=query,
                filters=search_filters,
                limit=limit,
                rerank=rerank
            )
           
            # Extract results
            memories = []
            if isinstance(results, dict):
                memories = results.get("results", [])
            elif isinstance(results, list):
                memories = results
           
            print(f"✅ Found {len(memories)} memories for query: '{query[:50]}...'")
           
            return {
                "success": True,
                "results": memories,
                "count": len(memories),
                "query": query
            }
       
        except Exception as e:
            print(f"❌ Error searching memories: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "count": 0
            }
   
    def get_user_context(
        self,
        user_id: str,
        query: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Retrieve user's financial context with categorization.
       
        This is a high-level wrapper that:
        1. Searches for relevant memories
        2. Categorizes them into financial context types
        3. Returns structured context for personalization
       
        Args:
            user_id: User identifier
            query: Optional query to find relevant memories
            limit: Maximum memories to retrieve
       
        Returns:
            dict: {
                "success": bool,
                "context": {
                    "financial_priorities": list,
                    "past_insights": list,
                    "behavioral_patterns": list,
                    "user_preferences": list
                },
                "memory_count": int,
                "raw_memories": list
            }
        """
        try:
            # Search memories
            if query:
                search_result = self.search_memories(
                    query=query,
                    user_id=user_id,
                    limit=limit
                )
            else:
                # Get all memories for user
                search_result = self.client.get_all(
                    user_id=user_id,
                    limit=limit
                )
                if isinstance(search_result, dict):
                    memories = search_result.get("results", [])
                else:
                    memories = search_result if isinstance(search_result, list) else []
                search_result = {"success": True, "results": memories}
           
            if not search_result.get("success"):
                raise Exception(search_result.get("error", "Search failed"))
           
            memories = search_result.get("results", [])
           
            # Categorize memories
            context = {
                "financial_priorities": [],
                "past_insights": [],
                "behavioral_patterns": [],
                "user_preferences": [],
                "recent_queries": []
            }
           
            for memory in memories:
                memory_text = memory.get("memory", "")
                categories = memory.get("categories", [])
               
                # Categorize based on content and categories
                if any(kw in memory_text.lower() for kw in ["goal", "target", "saving for", "priority"]):
                    context["financial_priorities"].append(memory_text)
                elif any(kw in memory_text.lower() for kw in ["overspend", "pattern", "habit", "behavior"]):
                    context["behavioral_patterns"].append(memory_text)
                elif any(kw in memory_text.lower() for kw in ["prefer", "like", "visual", "chart", "style"]):
                    context["user_preferences"].append(memory_text)
                else:
                    context["past_insights"].append(memory_text)
           
            print(f"✅ Retrieved and categorized {len(memories)} memories for user: {user_id}")
           
            return {
                "success": True,
                "context": context,
                "memory_count": len(memories),
                "raw_memories": memories
            }
       
        except Exception as e:
            print(f"❌ Error retrieving user context: {e}")
            return {
                "success": False,
                "error": str(e),
                "context": {
                    "financial_priorities": [],
                    "past_insights": [],
                    "behavioral_patterns": [],
                    "user_preferences": [],
                    "recent_queries": []
                },
                "memory_count": 0
            }
   
    # ===========================
    # UPDATE MEMORY OPERATIONS
    # ===========================
   
    def update_memory(
        self,
        memory_id: str,
        text: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Update a single memory's content or metadata.
       
        From Official Docs:
        - Modifies existing memory without deleting
        - Can update text, metadata, or both
        - Immutable memories must be deleted and re-added
       
        Args:
            memory_id: Unique memory identifier (from add or search results)
            text: New memory content (optional)
            metadata: New or updated metadata (optional)
       
        Returns:
            dict: {
                "success": bool,
                "memory_id": str,
                "message": str
            }
       
        Example:
            >>> memory.update_memory(
            ...     memory_id="mem_abc123",
            ...     text="User prefers vegetarian food",
            ...     metadata={"category": "food_preferences", "updated": "2025-11-26"}
            ... )
        """
        try:
            update_params = {"memory_id": memory_id}
           
            if text:
                update_params["text"] = text
            if metadata:
                update_params["metadata"] = metadata
           
            if not text and not metadata:
                return {
                    "success": False,
                    "error": "Must provide either text or metadata to update"
                }
           
            result = self.client.update(**update_params)
           
            print(f"✅ Updated memory: {memory_id}")
           
            return {
                "success": True,
                "memory_id": memory_id,
                "message": "Memory updated successfully",
                "result": result
            }
       
        except Exception as e:
            print(f"❌ Error updating memory: {e}")
            return {
                "success": False,
                "error": str(e),
                "memory_id": memory_id
            }
   
    def batch_update_memories(
        self,
        updates: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Update multiple memories in a single request (up to 1000).
       
        From Official Docs:
        - Batch operation for efficiency
        - Each update requires memory_id
        - Can update text, metadata, or both per memory
       
        Args:
            updates: List of update dicts, each containing:
                - memory_id: str (required)
                - text: str (optional)
                - metadata: dict (optional)
       
        Returns:
            dict: {
                "success": bool,
                "updated_count": int,
                "results": list
            }
       
        Example:
            >>> memory.batch_update_memories([
            ...     {"memory_id": "mem_1", "text": "Likes cricket"},
            ...     {"memory_id": "mem_2", "metadata": {"category": "sports"}}
            ... ])
        """
        try:
            if len(updates) > 1000:
                return {
                    "success": False,
                    "error": "Batch update limited to 1000 memories. Please split into multiple batches."
                }
           
            result = self.client.batch_update(updates)
           
            print(f"✅ Batch updated {len(updates)} memories")
           
            return {
                "success": True,
                "updated_count": len(updates),
                "results": result
            }
       
        except Exception as e:
            print(f"❌ Error in batch update: {e}")
            return {
                "success": False,
                "error": str(e),
                "updated_count": 0
            }
   
    # ===========================
    # DELETE MEMORY OPERATIONS
    # ===========================
   
    def delete_memory(
        self,
        memory_id: str
    ) -> Dict[str, Any]:
        """
        Delete a single memory by ID.
       
        From Official Docs:
        - Permanent deletion (cannot be undone)
        - Use for GDPR/CCPA compliance
        - Dashboard reflects removal immediately
       
        Args:
            memory_id: Unique memory identifier
       
        Returns:
            dict: {
                "success": bool,
                "memory_id": str,
                "message": str
            }
       
        Example:
            >>> memory.delete_memory("mem_abc123")
        """
        try:
            result = self.client.delete(memory_id=memory_id)
           
            print(f"✅ Deleted memory: {memory_id}")
           
            return {
                "success": True,
                "memory_id": memory_id,
                "message": "Memory deleted successfully",
                "result": result
            }
       
        except Exception as e:
            print(f"❌ Error deleting memory: {e}")
            return {
                "success": False,
                "error": str(e),
                "memory_id": memory_id
            }
   
    def batch_delete_memories(
        self,
        memory_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Delete multiple memories in a single request (up to 1000).
       
        From Official Docs:
        - Efficient bulk deletion
        - Each memory_id must exist
        - Useful for cleanup operations
       
        Args:
            memory_ids: List of memory IDs to delete
       
        Returns:
            dict: {
                "success": bool,
                "deleted_count": int,
                "results": list
            }
       
        Example:
            >>> memory.batch_delete_memories(["mem_1", "mem_2", "mem_3"])
        """
        try:
            if len(memory_ids) > 1000:
                return {
                    "success": False,
                    "error": "Batch delete limited to 1000 memories. Please split into multiple batches."
                }
           
            # Format for batch delete
            delete_list = [{"memory_id": mid} for mid in memory_ids]
           
            result = self.client.batch_delete(delete_list)
           
            print(f"✅ Batch deleted {len(memory_ids)} memories")
           
            return {
                "success": True,
                "deleted_count": len(memory_ids),
                "results": result
            }
       
        except Exception as e:
            print(f"❌ Error in batch delete: {e}")
            return {
                "success": False,
                "error": str(e),
                "deleted_count": 0
            }
   
    def delete_user_memories(
        self,
        user_id: str,
        agent_id: Optional[str] = None,
        run_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Delete all memories for a user (GDPR compliance).
       
        From Official Docs:
        - Filter-based deletion
        - Requires at least one filter to prevent accidental data loss
        - Can combine with agent_id, run_id, session_id for scoped deletion
       
        Args:
            user_id: User identifier (required)
            agent_id: Optional agent filter
            run_id: Optional run filter
            session_id: Optional session filter
       
        Returns:
            dict: {
                "success": bool,
                "deleted_count": int
            }
       
        Example:
            >>> # Delete all memories for a user
            >>> memory.delete_user_memories(user_id="user_123")
           
            >>> # Delete only session memories
            >>> memory.delete_user_memories(
            ...     user_id="user_123",
            ...     session_id="session_xyz"
            ... )
        """
        try:
            delete_params = {"user_id": user_id}
           
            if agent_id:
                delete_params["agent_id"] = agent_id
            if run_id:
                delete_params["run_id"] = run_id
            if session_id:
                delete_params["session_id"] = session_id
           
            result = self.client.delete_all(**delete_params)
           
            print(f"✅ Deleted all memories for user: {user_id}")
           
            return {
                "success": True,
                "message": f"All memories deleted for user: {user_id}",
                "result": result
            }
       
        except Exception as e:
            print(f"❌ Error deleting user memories: {e}")
            return {
                "success": False,
                "error": str(e)
            }
   
    # ===========================
    # HELPER METHODS
    # ===========================
   
    def update_behavioral_pattern(
        self,
        user_id: str,
        pattern: str,
        evidence: List[str],
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a behavioral pattern observation.
       
        This is a high-level helper that creates a new memory
        specifically for behavioral patterns.
       
        Args:
            user_id: User identifier
            pattern: Observed pattern (e.g., "Overspends on weekends")
            evidence: Supporting evidence
            session_id: Optional session identifier
       
        Returns:
            dict: Result of add operation
        """
        try:
            pattern_text = f"Behavioral pattern: {pattern}. Evidence: {', '.join(evidence)}"
           
            messages = [
                {"role": "assistant", "content": pattern_text}
            ]
           
            request_params = {
                "messages": messages,
                "user_id": user_id,
                "metadata": {
                    "pattern_type": "behavioral",
                    "timestamp": datetime.now().isoformat()
                }
            }
           
            if session_id:
                request_params["session_id"] = session_id
           
            result = self.client.add(**request_params)
           
            print(f"✅ Stored behavioral pattern for user: {user_id}")
            return {
                "success": True,
                "memory_ids": result.get("results", []) if isinstance(result, dict) else []
            }
       
        except Exception as e:
            print(f"❌ Error storing behavioral pattern: {e}")
            return {
                "success": False,
                "error": str(e)
            }
   
    def _format_insights(self, insights: Dict[str, Any]) -> str:
        """
        Format insights dict into readable text for memory storage.
       
        Args:
            insights: Insights dictionary
       
        Returns:
            str: Formatted insights text
        """
        formatted = []
       
        if "spending_summary" in insights:
            spending = insights["spending_summary"]
            formatted.append(f"Spending: ₹{spending.get('total_spent', 0)}")
            if "top_category" in spending:
                formatted.append(f"Top category: {spending['top_category']}")
       
        if "goals_summary" in insights:
            goals = insights["goals_summary"]
            formatted.append(f"Goals: {goals.get('on_track_count', 0)} on track, {goals.get('at_risk_count', 0)} at risk")
       
        if "recommendations" in insights:
            recs = insights["recommendations"]
            if recs:
                formatted.append(f"Recommendations given: {len(recs)}")
       
        return "; ".join(formatted) if formatted else "Session completed"


# ===========================
# SINGLETON INSTANCE
# ===========================

_memory_instance = None

def get_memory_client(api_key: Optional[str] = None) -> FinancialCoachMemory:
    """
    Get or create singleton memory client instance.
   
    Args:
        api_key: Optional API key (uses env var if not provided)
   
    Returns:
        FinancialCoachMemory: Memory client instance
    """
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = FinancialCoachMemory(api_key=api_key)
    return _memory_instance


# ===========================
# USAGE EXAMPLES
# ===========================

if __name__ == "__main__":
    """
    Example usage of FinancialCoachMemory class.
    Run: python mem0_integration.py
    """
   
    # Initialize client
    memory = get_memory_client()
   
    # Example 1: Add coaching session
    print("\n" + "="*60)
    print("Example 1: Add Coaching Session")
    print("="*60)
   
    result = memory.add_coaching_session(
        user_id="demo_user_123",
        query="Why did I overspend on food last week?",
        response="You spent ₹4,500 on food (30% over budget). Main contributors: Swiggy (₹2,100) and Zomato (₹1,800).",
        session_id="demo_session_nov_2025",
        metadata={
            "category": "spending_analysis",
            "confidence": 0.92
        }
    )
    print(f"Result: {result}")
   
    # Example 2: Search memories
    print("\n" + "="*60)
    print("Example 2: Search Memories")
    print("="*60)
   
    search_result = memory.search_memories(
        query="food spending patterns",
        user_id="demo_user_123",
        limit=5
    )
    print(f"Found {search_result['count']} memories")
   
    # Example 3: Get user context
    print("\n" + "="*60)
    print("Example 3: Get User Context")
    print("="*60)
   
    context_result = memory.get_user_context(
        user_id="demo_user_123",
        query="financial preferences"
    )
    print(f"Context categories: {list(context_result['context'].keys())}")
    print(f"Total memories: {context_result['memory_count']}")
   
    # Example 4: Update memory (if you have a memory_id)
    # print("\n" + "="*60)
    # print("Example 4: Update Memory")
    # print("="*60)
    #
    # update_result = memory.update_memory(
    #     memory_id="mem_abc123",
    #     text="Updated: User prefers home-cooked meals",
    #     metadata={"category": "food_preferences", "updated": "2025-11-26"}
    # )
    # print(f"Update result: {update_result}")
   
    # Example 5: Delete specific memories (commented out for safety)
    # print("\n" + "="*60)
    # print("Example 5: Delete Memory")
    # print("="*60)
    #
    # delete_result = memory.delete_memory("mem_abc123")
    # print(f"Delete result: {delete_result}")
   
    print("\n" + "="*60)
    print("✅ All examples completed successfully!")
    print("="*60)