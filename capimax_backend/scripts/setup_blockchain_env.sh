#!/bin/bash
# ============================================
# Capimax Blockchain Environment Setup Script
# ============================================
# This script sets up the Python 3.11 environment
# required for blockchain integration

echo "🔧 Setting up Capimax Blockchain Environment"
echo "============================================"

# Check Python version
PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.11"

if [[ $PYTHON_VERSION != $REQUIRED_VERSION* ]]; then
    echo ""
    echo "❌ ERROR: Python 3.11.x is required for blockchain integration"
    echo "   Current version: $PYTHON_VERSION"
    echo ""
    echo "📋 Installation Instructions:"
    echo ""
    echo "   Windows (using pyenv-win):"
    echo "   ---------------------------"
    echo "   1. Install pyenv-win: https://github.com/pyenv-win/pyenv-win#installation"
    echo "   2. Run: pyenv install 3.11.9"
    echo "   3. Run: pyenv local 3.11.9"
    echo ""
    echo "   Linux (Ubuntu/Debian):"
    echo "   ----------------------"
    echo "   sudo apt update"
    echo "   sudo apt install python3.11 python3.11-venv python3.11-dev"
    echo "   python3.11 -m venv venv_blockchain"
    echo "   source venv_blockchain/bin/activate"
    echo ""
    echo "   macOS (using pyenv):"
    echo "   --------------------"
    echo "   brew install pyenv"
    echo "   pyenv install 3.11.9"
    echo "   pyenv local 3.11.9"
    echo ""
    exit 1
fi

echo "✅ Python version: $PYTHON_VERSION"
echo ""

# Check if virtual environment exists
if [ ! -d "venv_blockchain" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv_blockchain
    echo "✅ Virtual environment created"
else
    echo "⚠️  Virtual environment already exists"
fi

echo ""
echo "🔌 Activating virtual environment..."
echo "   Run: source venv_blockchain/bin/activate  (Linux/Mac)"
echo "   Or:  venv_blockchain\\Scripts\\activate    (Windows)"
echo ""

# Activate virtual environment (works in script context)
if [ -f "venv_blockchain/bin/activate" ]; then
    source venv_blockchain/bin/activate
elif [ -f "venv_blockchain/Scripts/activate" ]; then
    source venv_blockchain/Scripts/activate
fi

echo "📦 Installing core dependencies..."
pip install --upgrade pip setuptools wheel

echo ""
echo "📦 Installing Django dependencies..."
pip install -r requirements.txt

echo ""
echo "📦 Installing blockchain dependencies..."
pip install -r requirements_blockchain.txt

echo ""
echo "🧪 Verifying Web3 imports..."
python -c "from web3 import Web3; from eth_account import Account; from brownie import accounts; print('✅ All blockchain imports successful')" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Environment setup complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Activate the environment: source venv_blockchain/bin/activate"
    echo "   2. Run migrations: python manage.py migrate"
    echo "   3. Setup networks: python manage.py setup_networks"
    echo "   4. Test connection: python scripts/test_web3_connection.py"
    echo ""
else
    echo ""
    echo "❌ Error: Web3 imports failed"
    echo "   Please check the error messages above"
    exit 1
fi
