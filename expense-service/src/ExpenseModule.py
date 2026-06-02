"""
Expense service composition root.

This file is intentionally thin and keeps the original import surface used by run.py:
    from src.ExpenseModule import app, settings

Internals are split into 4 cohesive modules:
1) expense_db_singleton.py -> Singleton pattern (GoF) for Mongo connection
2) expense_crud.py         -> CRUD interface + repository implementation
3) expense_filter.py       -> Strategy pattern (GoF) for dynamic filtering
4) expense_entry.py        -> Facade pattern (GoF) as composition entry point
"""

from src.expense_entry import ExpenseApiFacade

module = ExpenseApiFacade()
app = module.app
settings = module.settings
