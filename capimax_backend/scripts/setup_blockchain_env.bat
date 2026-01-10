@echo off
REM ============================================
REM Capimax Blockchain Environment Setup Script (Windows)
REM ============================================
REM This script sets up the Python 3.11 environment
REM required for blockchain integration

echo.
echo ================================================================
echo          Capimax Blockchain Environment Setup
echo ================================================================
echo.

REM Check Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i

echo Current Python Version: %PYTHON_VERSION%

REM Check if version starts with 3.11
echo %PYTHON_VERSION% | findstr /b "3.11" >nul
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo ERROR: Python 3.11.x is required for blockchain integration
    echo Current version: %PYTHON_VERSION%
    echo ========================================================
    echo.
    echo Installation Instructions:
    echo.
    echo   Option 1: Install Python 3.11 directly
    echo   ---------------------------------------
    echo   1. Download Python 3.11.9 from: https://www.python.org/downloads/
    echo   2. Install with "Add to PATH" option enabled
    echo   3. Restart this script
    echo.
    echo   Option 2: Use pyenv-win for version management
    echo   ----------------------------------------------
    echo   1. Install pyenv-win: https://github.com/pyenv-win/pyenv-win#installation
    echo   2. Run: pyenv install 3.11.9
    echo   3. Run: pyenv local 3.11.9
    echo   4. Restart this script
    echo.
    pause
    exit /b 1
)

echo ✅ Python version compatible
echo.

REM Check if virtual environment exists
if not exist "venv_blockchain" (
    echo 📦 Creating virtual environment...
    python -m venv venv_blockchain
    if %errorlevel% neq 0 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ⚠️  Virtual environment already exists
)

echo.
echo 🔌 Activating virtual environment...
call venv_blockchain\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo ❌ Failed to activate virtual environment
    pause
    exit /b 1
)

echo ✅ Virtual environment activated
echo.

echo 📦 Upgrading pip, setuptools, and wheel...
python -m pip install --upgrade pip setuptools wheel

echo.
echo 📦 Installing core dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ❌ Failed to install core dependencies
    pause
    exit /b 1
)

echo.
echo 📦 Installing blockchain dependencies...
pip install -r requirements_blockchain.txt

if %errorlevel% neq 0 (
    echo ❌ Failed to install blockchain dependencies
    pause
    exit /b 1
)

echo.
echo 🧪 Verifying Web3 imports...
python -c "from web3 import Web3; from eth_account import Account; print('✅ All blockchain imports successful')"

if %errorlevel% neq 0 (
    echo ❌ Web3 imports failed
    echo Please check the error messages above
    pause
    exit /b 1
)

echo.
echo ================================================================
echo                 ✨ Environment Setup Complete!
echo ================================================================
echo.
echo 📋 Next Steps:
echo    1. Keep this terminal open (virtual environment is active)
echo    2. Run migrations: python manage.py migrate
echo    3. Setup networks: python manage.py setup_networks
echo    4. Test connection: python scripts\test_web3_connection.py
echo.
echo To activate the environment in a new terminal:
echo    venv_blockchain\Scripts\activate.bat
echo.
pause
