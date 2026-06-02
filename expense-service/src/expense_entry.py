"""
Expense entry/composition module.

Design Pattern: Facade (GoF Structural)

Why this pattern:
- API routes need one simple orchestrator instead of wiring db/filter/crud pieces inline.
- Facade reduces coupling and presents one clean entry point for app startup.

How it works:
- ExpenseApiFacade composes Settings + MongoConnectionManager + ExpenseRepository.
- Routes delegate to ExpenseService which depends on ExpenseCrudInterface.
- This preserves separation of concerns and testability.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.expense_crud import ExpenseCrudInterface, ExpenseRepository
from src.expense_db_singleton import MongoConnectionManager, Settings
from src.expense_filter import (
    AmountFilterStrategy,
    CategoryFilterStrategy,
    DateFilterStrategy,
    ExpenseFilterContext,
)


class ExpenseCreate(BaseModel):
    """Input DTO for creating an expense."""

    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    date: datetime


class ExpenseUpdate(BaseModel):
    """Input DTO for partial update operations."""

    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    reason: Optional[str] = None
    location: Optional[str] = None
    date: Optional[datetime] = None


class ExpenseSerializer:
    """Serializer for converting Mongo docs to API JSON shape."""

    @staticmethod
    def to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(doc["_id"]),
            "user_id": doc["user_id"],
            "amount": doc["amount"],
            "category": doc["category"],
            "reason": doc["reason"],
            "location": doc["location"],
            "date": doc["date"].isoformat(),
            "created_at": doc["created_at"].isoformat(),
            "updated_at": doc["updated_at"].isoformat(),
        }


class ExpenseService:
    """
    Application service (depends on CRUD interface, not concrete DB details).
    """

    def __init__(self, repository: ExpenseCrudInterface):
        self._repository = repository

    async def create(self, user_id: str, data: ExpenseCreate) -> Dict[str, Any]:
        doc = await self._repository.create(user_id, data)
        return ExpenseSerializer.to_dict(doc)

    async def list_all(self, user_id: str) -> List[Dict[str, Any]]:
        docs = await self._repository.find_all(user_id)
        return [ExpenseSerializer.to_dict(doc) for doc in docs]

    async def list_filtered(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        strategies = []
        if start_date or end_date:
            strategies.append(DateFilterStrategy(start_date, end_date))
        if min_amount is not None or max_amount is not None:
            strategies.append(AmountFilterStrategy(min_amount, max_amount))
        if category:
            strategies.append(CategoryFilterStrategy(category))

        filter_context = ExpenseFilterContext(strategies)
        docs = await self._repository.find_filtered(user_id, filter_context)
        return [ExpenseSerializer.to_dict(doc) for doc in docs]

    async def get_by_id(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        doc = await self._repository.find_by_id(user_id, expense_id)
        return ExpenseSerializer.to_dict(doc) if doc else None

    async def update(
        self, user_id: str, expense_id: str, data: ExpenseUpdate
    ) -> Optional[Dict[str, Any]]:
        doc = await self._repository.update(user_id, expense_id, data)
        return ExpenseSerializer.to_dict(doc) if doc else None

    async def delete(self, user_id: str, expense_id: str) -> bool:
        return await self._repository.delete(user_id, expense_id)


class ExpenseApiFacade:
    """
    Facade entry point for the entire expense-service module graph.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self._settings = settings or Settings()
        connection = MongoConnectionManager(self._settings.mongodb_uri)
        repository: ExpenseCrudInterface = ExpenseRepository(connection.get_collection())
        self._service = ExpenseService(repository)
        self.app = self._build_app()

    @property
    def settings(self) -> Settings:
        return self._settings

    def _require_user_id(self, x_user_id: Optional[str]) -> str:
        if not x_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-User-Id header — request must come through integration layer",
            )
        return x_user_id

    def _build_app(self) -> FastAPI:
        app = FastAPI(
            title="Ledger / Expense Service",
            description="Personal expense management microservice",
            version="1.0.0",
            redirect_slashes=False,
        )
        service = self._service

        @app.get("/health")
        async def health():
            return {"status": "ok", "service": "expense-service"}

        @app.post("/api/expenses", status_code=status.HTTP_201_CREATED)
        async def create_expense(payload: ExpenseCreate, x_user_id: Optional[str] = Header(None)):
            user_id = self._require_user_id(x_user_id)
            return await service.create(user_id, payload)

        @app.get("/api/expenses")
        async def list_expenses(
            x_user_id: Optional[str] = Header(None),
            start_date: Optional[datetime] = Query(None),
            end_date: Optional[datetime] = Query(None),
            min_amount: Optional[float] = Query(None),
            max_amount: Optional[float] = Query(None),
            category: Optional[str] = Query(None),
        ):
            user_id = self._require_user_id(x_user_id)
            if any([start_date, end_date, min_amount, max_amount, category]):
                return await service.list_filtered(
                    user_id, start_date, end_date, min_amount, max_amount, category
                )
            return await service.list_all(user_id)

        @app.get("/api/expenses/{expense_id}")
        async def get_expense(expense_id: str, x_user_id: Optional[str] = Header(None)):
            user_id = self._require_user_id(x_user_id)
            result = await service.get_by_id(user_id, expense_id)
            if not result:
                raise HTTPException(status_code=404, detail="Expense not found")
            return result

        @app.put("/api/expenses/{expense_id}")
        async def update_expense(
            expense_id: str,
            payload: ExpenseUpdate,
            x_user_id: Optional[str] = Header(None),
        ):
            user_id = self._require_user_id(x_user_id)
            result = await service.update(user_id, expense_id, payload)
            if not result:
                raise HTTPException(status_code=404, detail="Expense not found")
            return result

        @app.delete("/api/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
        async def delete_expense(expense_id: str, x_user_id: Optional[str] = Header(None)):
            user_id = self._require_user_id(x_user_id)
            if not await service.delete(user_id, expense_id):
                raise HTTPException(status_code=404, detail="Expense not found")

        return app
