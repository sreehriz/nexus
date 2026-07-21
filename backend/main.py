import sys
import os

# Ensure the backend directory is on the system path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import asgi_app as app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
#Ok what do you want me to do now?