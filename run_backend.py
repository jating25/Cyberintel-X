import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set the PYTHONPATH
os.environ['PYTHONPATH'] = os.path.join(os.path.dirname(__file__), 'backend')

try:
    from app.main import app
    import uvicorn
    
    if __name__ == "__main__":
        uvicorn.run(app, host="0.0.0.0", port=8000)
except ImportError as e:
    print(f"Import error: {e}")
    print("Please make sure all dependencies are installed.")
    print("You can install them using: pip install -r backend/requirements.txt")