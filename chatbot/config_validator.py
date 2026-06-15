import os
import sys
from dotenv import load_dotenv

# Load environment variables early
load_dotenv()

def validate_environment():
    """
    Validates required environment variables for the chatbot tutor service.
    Exits the process with an error code if validation fails.
    """
    required_vars = {
        "MONGODB_URI": "MongoDB connection string for conversation memory and tutor logs",
        "DATABASE_URL": "PostgreSQL connection string containing target schema mapping",
        "JWT_SECRET": "Verification key matching backend configuration signature",
    }
    
    errors = []
    
    for var, description in required_vars.items():
        val = os.getenv(var)
        if not val or val.strip() == "":
            errors.append(f"{var} is missing or empty ({description}).")
            
    # Check port
    port = os.getenv("PORT")
    if port:
        try:
            int(port)
        except ValueError:
            errors.append(f"PORT must be a valid integer, received: '{port}'")
            
    if errors:
        print("❌ Configuration error: Chatbot environment validation failed!", file=sys.stderr)
        for err in errors:
            print(f"   - {err}", file=sys.stderr)
        sys.exit(1)

# Run validation automatically on import
validate_environment()
