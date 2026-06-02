"""
Expense DB connection module.

Design Pattern: Singleton (GoF Creational)

Why this pattern:
- Creating multiple MongoDB clients per process is costly and unnecessary.
- A single shared client keeps connection pooling efficient and predictable.

How it works:
- MongoConnectionManager overrides __new__ and stores one instance in _instance.
- get_collection() lazily creates one AsyncIOMotorClient and reuses it.
"""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application configuration object.

    What:
    - Holds runtime config for DB URI and API bind host/port.

    Why:
    - Centralized configuration avoids hardcoded values in business logic.

    How:
    - Pydantic Settings reads values from .env with safe defaults.
    """

    mongodb_uri: str = "mongodb://localhost:27017/expense_db"
    host: str = "0.0.0.0"
    port: int = 8082

    class Config:
        env_file = ".env"


class MongoConnectionManager:
    """
    Singleton manager for one MongoDB client per expense-service process.

    What:
    - Provides collection access via one shared AsyncIOMotorClient.

    Why:
    - Prevents duplicate connection pools and improves resource usage.

    How:
    - __new__ ensures only one manager instance exists.
    - get_collection() lazily initializes _client once.
    """

    _instance: Optional["MongoConnectionManager"] = None
    _client: Optional[AsyncIOMotorClient] = None

    def __new__(cls, uri: str) -> "MongoConnectionManager":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._uri = uri
        return cls._instance

    def get_collection(self, name: str = "expenses") -> AsyncIOMotorCollection:
        """
        Return target Mongo collection using the shared client.
        """
        if self._client is None:
            self._client = AsyncIOMotorClient(self._uri)
        return self._client.get_default_database()[name]
