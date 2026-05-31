import os
from pathlib import Path

import uvicorn

# Ensure .env in expense-service/ is loaded regardless of cwd
os.chdir(Path(__file__).resolve().parent)

from src.ExpenseModule import app, settings

if __name__ == "__main__":
    uvicorn.run(app, host=settings.host, port=settings.port)
