#!/usr/bin/env python
"""
UAT Server Startup Script
Starts both Django backend and React frontend servers on custom ports for UAT testing.
"""

import subprocess
import sys
import os
import time
from threading import Thread

def start_backend():
    """Start Django backend server on port 8080"""
    print("🚀 Starting Django Backend Server on port 8080...")

    backend_dir = os.path.join(os.path.dirname(__file__), 'capimax_backend')

    try:
        # Change to backend directory and start server
        subprocess.run([
            sys.executable, 'manage.py', 'runserver', '8080'
        ], cwd=backend_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting backend server: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Backend server stopped by user")

def start_frontend():
    """Start React frontend server on port 3030"""
    print("🚀 Starting React Frontend Server on port 3030...")

    frontend_dir = os.path.join(os.path.dirname(__file__), 'capimax-preview')

    try:
        # Change to frontend directory and start server
        env = os.environ.copy()
        env['PORT'] = '3030'  # Set port for Vite

        subprocess.run([
            'npm', 'run', 'dev', '--', '--port', '3030'
        ], cwd=frontend_dir, env=env, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting frontend server: {e}")
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped by user")

def main():
    """Main function to start both servers"""
    print("="*60)
    print("🎯 CAPIMAX UAT ENVIRONMENT STARTUP")
    print("="*60)
    print("Backend (Django): http://localhost:8080")
    print("Frontend (React): http://localhost:3030")
    print("API Endpoint: http://localhost:8080/api/v1")
    print("="*60)

    try:
        # Start backend in a separate thread
        backend_thread = Thread(target=start_backend, daemon=True)
        backend_thread.start()

        # Give backend time to start
        print("⏳ Waiting 5 seconds for backend to initialize...")
        time.sleep(5)

        # Start frontend (this will block)
        start_frontend()

    except KeyboardInterrupt:
        print("\n🛑 Shutting down UAT servers...")
        print("✅ UAT session completed successfully!")

if __name__ == "__main__":
    main()