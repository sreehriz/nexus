import sys
import os

# Ensure the root directory is on the system path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the main ASGI application as "app"
from backend.main import asgi_app as app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
