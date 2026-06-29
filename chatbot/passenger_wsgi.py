import os
import sys

# Ensure the application directory is in the Python search path
sys.path.insert(0, os.path.dirname(__file__))

# Import the WSGI adapter from a2wsgi
try:
    from a2wsgi import ASGIMiddleware
except ImportError:
    # A helpful fallback/error message if requirements aren't installed yet
    class ASGIMiddleware:
        def __init__(self, app):
            self.app = app
        def __call__(self, environ, start_response):
            start_response('500 Internal Server Error', [('Content-Type', 'text/plain')])
            return [b"Error: a2wsgi is not installed in the virtual environment. Please run 'pip install a2wsgi'."]

from main import app

# Adapt the FastAPI ASGI application to WSGI for cPanel's Phusion Passenger
application = ASGIMiddleware(app)
