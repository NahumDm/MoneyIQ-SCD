"""
Expense CRUD module.

Design Pattern: Adapter (GoF Structural)

What:
- Defines an interface for expense CRUD operations and a Mongo implementation.

Why:
- Business/application layers should depend on an abstract CRUD contract.
- Swapping persistence backend should not require route/business changes.

How:
- ExpenseCrudInterface is the target interface expected by the application layer.
- ExpenseRepository adapts Motor collection APIs and BSON concerns to that target interface.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from pymongo import ReturnDocument

from src.expense_filter import ExpenseFilterContext


class ExpenseCrudInterface(ABC):
    """
    Adapter target interface for expense persistence.

    What:
    - Defines the CRUD contract the application layer uses.

    Why:
    - Keeps service logic independent from Motor's concrete API shape.

    How:
    - Concrete adapters implement these methods using any persistence backend.
    """

    @abstractmethod
    async def create(self, user_id: str, data: Any) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def find_all(self, user_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def find_filtered(
        self, user_id: str, filter_context: ExpenseFilterContext
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def find_by_id(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def update(
        self, user_id: str, expense_id: str, data: Any
    ) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    async def delete(self, user_id: str, expense_id: str) -> bool:
        pass


class ExpenseRepository(ExpenseCrudInterface):
    """
    Concrete Adapter from Motor/MongoDB APIs to ExpenseCrudInterface.

    What:
    - Implements CRUD operations expected by the application layer.

    Why:
    - Converts low-level Mongo details (ObjectId, find_one_and_update, delete_one)
      into stable domain-oriented operations.

    How:
    - Delegates to AsyncIOMotorCollection while enforcing user-scoped queries.
    """

    def __init__(self, collection: AsyncIOMotorCollection):
        self._collection = collection

    async def create(self, user_id: str, data: Any) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "amount": data.amount,
            "category": data.category,
            "reason": data.reason,
            "location": data.location,
            "date": data.date,
            "created_at": now,
            "updated_at": now,
        }
        result = await self._collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    async def find_all(self, user_id: str) -> List[Dict[str, Any]]:
        cursor = self._collection.find({"user_id": user_id}).sort("date", -1)
        return await cursor.to_list(length=1000)

    async def find_filtered(
        self,
        user_id: str,
        filter_context: ExpenseFilterContext,
    ) -> List[Dict[str, Any]]:
        query = filter_context.build_query(user_id)
        cursor = self._collection.find(query).sort("date", -1)
        return await cursor.to_list(length=1000)

    async def find_by_id(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(expense_id):
            return None
        return await self._collection.find_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )

    async def update(
        self, user_id: str, expense_id: str, data: Any
    ) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(expense_id):
            return None
        update_data = {
            k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
        }
        if not update_data:
            return await self.find_by_id(user_id, expense_id)
        update_data["updated_at"] = datetime.now(timezone.utc)
        return await self._collection.find_one_and_update(
            {"_id": ObjectId(expense_id), "user_id": user_id},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER,
        )

    async def delete(self, user_id: str, expense_id: str) -> bool:
        if not ObjectId.is_valid(expense_id):
            return False
        result = await self._collection.delete_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )
        return result.deleted_count > 0
