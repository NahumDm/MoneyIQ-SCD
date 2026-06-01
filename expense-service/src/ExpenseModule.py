"""
Expense Module — Ledger / Expense Service (single cohesive OOP module)

OOP Principles Applied:
- Encapsulation: each class owns its data and behaviour (repository, service, filters).
- Abstraction: ExpenseFilterStrategy defines a contract for all filter algorithms.
- Inheritance: DateFilterStrategy, AmountFilterStrategy, CategoryFilterStrategy extend ABC.
- Polymorphism: strategies are interchangeable via the common apply() interface.
- Composition: ExpenseService composes ExpenseRepository and ExpenseFilterContext.
- Single Responsibility: repository handles persistence; service handles business rules.

Design Pattern: Strategy (GoF Behavioral)

Reason: Expense filtering supports multiple criteria (date range, amount range, category).
Strategy encapsulates each criterion as a separate algorithm so new filters can be added
without modifying repository or route code — satisfying Open/Closed principle.

Authentication is NOT handled here. The integration layer validates JWT via auth-service
and forwards trusted user identity via X-User-Id header.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import FastAPI, Header, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from pymongo import ReturnDocument


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/expense_db"
    host: str = "0.0.0.0"
    port: int = 8082

    class Config:
        env_file = ".env"


class ExpenseCreate(BaseModel):
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1)
    reason: str = Field(..., min_length=1)
    location: str = Field(..., min_length=1)
    date: datetime


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    reason: Optional[str] = None
    location: Optional[str] = None
    date: Optional[datetime] = None


class ExpenseFilterStrategy(ABC):
    """
    What: Contract for mutating a MongoDB query with one filter dimension.
    Why: New filter types (e.g. location) can be added without changing repository or routes.
    How: Subclasses implement apply() to merge criteria into the shared query dict.
    """

    @abstractmethod
    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        pass


class DateFilterStrategy(ExpenseFilterStrategy):
    """What: Filters expenses by date range. Why: Common ledger reporting window. How: Adds $gte/$lte on date field when bounds set."""

    def __init__(self, start: Optional[datetime] = None, end: Optional[datetime] = None):
        self._start = start
        self._end = end

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """What: Applies optional start/end to query['date']. Why: Strategy pattern entry point. How: Builds Mongo comparison operators."""
        date_filter: Dict[str, Any] = {}
        if self._start:
            date_filter["$gte"] = self._start
        if self._end:
            date_filter["$lte"] = self._end
        if date_filter:
            query["date"] = date_filter
        return query


class AmountFilterStrategy(ExpenseFilterStrategy):
    """What: Filters by min/max amount. Why: Budget and spending-band queries. How: Adds $gte/$lte on amount when bounds provided."""

    def __init__(
        self,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
    ):
        self._min_amount = min_amount
        self._max_amount = max_amount

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """What: Applies amount bounds to query. Why: Composable with other strategies. How: Merges $gte/$lte under query['amount']."""
        amount_filter: Dict[str, Any] = {}
        if self._min_amount is not None:
            amount_filter["$gte"] = self._min_amount
        if self._max_amount is not None:
            amount_filter["$lte"] = self._max_amount
        if amount_filter:
            query["amount"] = amount_filter
        return query


class CategoryFilterStrategy(ExpenseFilterStrategy):
    """What: Filters by category substring. Why: Users search by partial category names. How: Case-insensitive regex on category field."""

    def __init__(self, category: str):
        self._category = category

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """What: Sets case-insensitive category match. Why: Strategy interface. How: $regex with 'i' option on category."""
        query["category"] = {"$regex": self._category, "$options": "i"}
        return query


class ExpenseFilterContext:
    """
    What: Composes multiple filter strategies into one MongoDB query scoped to a user.
    Why: Callers pass a list of active filters without knowing merge order details.
    How: Starts with user_id equality, then applies each strategy's apply() in sequence.
    """

    def __init__(self, strategies: List[ExpenseFilterStrategy]):
        self._strategies = strategies

    def build_query(self, user_id: str) -> Dict[str, Any]:
        """What: Produces the final find filter. Why: Repository uses one query object. How: Reduces strategies over base user_id query."""
        query: Dict[str, Any] = {"user_id": user_id}
        for strategy in self._strategies:
            query = strategy.apply(query)
        return query


class MongoConnectionManager:
    """Singleton — one MongoDB client per expense service process."""

    _instance: Optional["MongoConnectionManager"] = None
    _client: Optional[AsyncIOMotorClient] = None

    def __new__(cls, uri: str) -> "MongoConnectionManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._uri = uri
        return cls._instance

    def get_collection(self, name: str = "expenses") -> AsyncIOMotorCollection:
        if self._client is None:
            self._client = AsyncIOMotorClient(self._uri)
        return self._client.get_default_database()[name]


class ExpenseRepository:
    """What: Persistence layer for expense documents in MongoDB. Why: Isolates Motor/async IO from HTTP and filtering logic."""

    def __init__(self, collection: AsyncIOMotorCollection):
        self._collection = collection

    async def create(self, user_id: str, data: ExpenseCreate) -> Dict[str, Any]:
        """What: Inserts a new expense for the user. Why: Create API. How: Builds doc with timestamps and returns inserted document."""
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
        """What: Lists all expenses for a user, newest date first. Why: Unfiltered list endpoint. How: find on user_id, sort date descending."""
        cursor = self._collection.find({"user_id": user_id}).sort("date", -1)
        return await cursor.to_list(length=1000)

    async def find_filtered(
        self,
        user_id: str,
        filter_context: ExpenseFilterContext,
    ) -> List[Dict[str, Any]]:
        """What: Lists expenses matching composed strategy filters. Why: Query params drive Strategy pattern. How: Uses filter_context.build_query then find."""
        query = filter_context.build_query(user_id)
        cursor = self._collection.find(query).sort("date", -1)
        return await cursor.to_list(length=1000)

    async def find_by_id(self, user_id: str, expense_id: str) -> Optional[Dict[str, Any]]:
        """What: Fetches one expense by id if owned by user. Why: Get/update/delete precondition. How: Validates ObjectId and matches user_id."""
        if not ObjectId.is_valid(expense_id):
            return None
        return await self._collection.find_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )

    async def update(
        self, user_id: str, expense_id: str, data: ExpenseUpdate
    ) -> Optional[Dict[str, Any]]:
        """What: Partially updates fields on an expense. Why: PUT with optional fields. How: $set only provided non-null fields and updated_at."""
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
        """What: Removes an expense document. Why: DELETE endpoint. How: delete_one on _id + user_id; returns whether count > 0."""
        if not ObjectId.is_valid(expense_id):
            return False
        result = await self._collection.delete_one(
            {"_id": ObjectId(expense_id), "user_id": user_id}
        )
        return result.deleted_count > 0


class ExpenseSerializer:
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
    """What: Business façade over repository with API-shaped dict responses. Why: Routes depend on serialized expenses, not raw BSON."""

    def __init__(self, repository: ExpenseRepository):
        self._repository = repository

    async def create(self, user_id: str, data: ExpenseCreate) -> Dict[str, Any]:
        """What: Creates expense and returns serialized dict. Why: POST handler. How: repository.create + ExpenseSerializer."""
        doc = await self._repository.create(user_id, data)
        return ExpenseSerializer.to_dict(doc)

    async def list_all(self, user_id: str) -> List[Dict[str, Any]]:
        """What: Returns all user expenses as API dicts. Why: List without query params. How: find_all then map serializer."""
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
        """
        What: Lists expenses matching optional date, amount, and category filters.
        Why: Query string params map to Strategy instances without route knowing Mongo syntax.
        How: Builds strategy list, wraps ExpenseFilterContext, calls find_filtered.
        """
        strategies: List[ExpenseFilterStrategy] = []
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
        """What: Single expense or None. Why: GET by id. How: find_by_id + serializer if found."""
        doc = await self._repository.find_by_id(user_id, expense_id)
        return ExpenseSerializer.to_dict(doc) if doc else None

    async def update(
        self, user_id: str, expense_id: str, data: ExpenseUpdate
    ) -> Optional[Dict[str, Any]]:
        """What: Updates expense and returns dict, or None if missing. Why: PUT handler. How: repository.update + serializer."""
        doc = await self._repository.update(user_id, expense_id, data)
        return ExpenseSerializer.to_dict(doc) if doc else None

    async def delete(self, user_id: str, expense_id: str) -> bool:
        """What: Deletes expense if present. Why: DELETE handler. How: Passthrough to repository.delete."""
        return await self._repository.delete(user_id, expense_id)


class ExpenseModule:
    """Root module — wires OOP components and exposes the FastAPI application."""

    def __init__(self, settings: Optional[Settings] = None):
        self._settings = settings or Settings()
        connection = MongoConnectionManager(self._settings.mongodb_uri)
        repository = ExpenseRepository(connection.get_collection())
        self._service = ExpenseService(repository)
        self.app = self._build_app()

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
            """Liveness probe for orchestration."""
            return {"status": "ok", "service": "expense-service"}

        @app.post("/api/expenses", status_code=status.HTTP_201_CREATED)
        async def create_expense(payload: ExpenseCreate, x_user_id: Optional[str] = Header(None)):
            """Create expense for X-User-Id from integration layer."""
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
            """List all or filtered expenses (date, amount, category query params)."""
            user_id = self._require_user_id(x_user_id)
            if any([start_date, end_date, min_amount, max_amount, category]):
                return await service.list_filtered(
                    user_id, start_date, end_date, min_amount, max_amount, category
                )
            return await service.list_all(user_id)

        @app.get("/api/expenses/{expense_id}")
        async def get_expense(expense_id: str, x_user_id: Optional[str] = Header(None)):
            """Get one expense by id; 404 if not found."""
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
            """Partial update of an expense; 404 if not found."""
            user_id = self._require_user_id(x_user_id)
            result = await service.update(user_id, expense_id, payload)
            if not result:
                raise HTTPException(status_code=404, detail="Expense not found")
            return result

        @app.delete("/api/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
        async def delete_expense(expense_id: str, x_user_id: Optional[str] = Header(None)):
            """Delete expense; 404 if not found."""
            user_id = self._require_user_id(x_user_id)
            if not await service.delete(user_id, expense_id):
                raise HTTPException(status_code=404, detail="Expense not found")

        return app


module = ExpenseModule()
app = module.app
settings = module._settings
