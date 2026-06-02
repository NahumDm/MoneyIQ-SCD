"""
Expense filtering module.

Design Pattern: Strategy (GoF Behavioral)

Why this pattern:
- Expense filtering criteria are variable (date, amount, category).
- Strategy allows each criterion to be implemented independently and composed.

How it works:
- ExpenseFilterStrategy defines apply(query) contract.
- Concrete strategies mutate a shared Mongo query dict.
- ExpenseFilterContext runs selected strategies in sequence.
"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional


class ExpenseFilterStrategy(ABC):
    """
    Filter strategy interface.

    What:
    - Contract for one query mutation algorithm.

    Why:
    - New filter types can be added without changing callers.

    How:
    - Subclasses implement apply(query) and return updated query.
    """

    @abstractmethod
    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Apply this filter strategy to query."""


class DateFilterStrategy(ExpenseFilterStrategy):
    """Strategy for date-range filtering."""

    def __init__(self, start: Optional[datetime] = None, end: Optional[datetime] = None):
        self._start = start
        self._end = end

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        date_filter: Dict[str, Any] = {}
        if self._start:
            date_filter["$gte"] = self._start
        if self._end:
            date_filter["$lte"] = self._end
        if date_filter:
            query["date"] = date_filter
        return query


class AmountFilterStrategy(ExpenseFilterStrategy):
    """Strategy for min/max amount filtering."""

    def __init__(
        self,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
    ):
        self._min_amount = min_amount
        self._max_amount = max_amount

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        amount_filter: Dict[str, Any] = {}
        if self._min_amount is not None:
            amount_filter["$gte"] = self._min_amount
        if self._max_amount is not None:
            amount_filter["$lte"] = self._max_amount
        if amount_filter:
            query["amount"] = amount_filter
        return query


class CategoryFilterStrategy(ExpenseFilterStrategy):
    """Strategy for category text filtering."""

    def __init__(self, category: str):
        self._category = category

    def apply(self, query: Dict[str, Any]) -> Dict[str, Any]:
        query["category"] = {"$regex": self._category, "$options": "i"}
        return query


class ExpenseFilterContext:
    """
    Context that composes multiple filter strategies.

    What:
    - Builds a final Mongo query scoped to user_id plus optional filters.

    Why:
    - Central composition point keeps service/repository code clean.

    How:
    - Starts with {"user_id": user_id} and applies each strategy.
    """

    def __init__(self, strategies: List[ExpenseFilterStrategy]):
        self._strategies = strategies

    def build_query(self, user_id: str) -> Dict[str, Any]:
        query: Dict[str, Any] = {"user_id": user_id}
        for strategy in self._strategies:
            query = strategy.apply(query)
        return query
