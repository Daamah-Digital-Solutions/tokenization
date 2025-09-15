"""
Mock Web3 implementation for development when web3 package is not available.
This allows the system to run without blockchain functionality.
"""

class MockWeb3:
    """Mock Web3 class for development purposes."""
    
    @staticmethod
    def isConnected():
        return False
    
    @staticmethod
    def isAddress(address):
        return isinstance(address, str) and len(address) == 42
    
    def toChecksumAddress(self, address):
        return address
    
    def toWei(self, amount, unit):
        return int(amount * (10**18)) if unit == 'ether' else amount
    
    def fromWei(self, amount, unit):
        return amount / (10**18) if unit == 'ether' else amount

class MockContract:
    """Mock Contract class for development purposes."""
    
    def __init__(self, *args, **kwargs):
        pass
    
    def functions(self):
        return self
    
    def __getattr__(self, name):
        return lambda *args, **kwargs: self
    
    def call(self):
        return 0
    
    def transact(self, *args, **kwargs):
        return "0x0000000000000000000000000000000000000000000000000000000000000000"

class MockAccount:
    """Mock Account class for development purposes."""
    
    @staticmethod
    def create():
        return type('Account', (), {
            'address': '0x0000000000000000000000000000000000000000',
            'privateKey': '0x0000000000000000000000000000000000000000000000000000000000000000'
        })()
    
    @staticmethod
    def from_key(private_key):
        return MockAccount.create()

class ContractLogicError(Exception):
    """Mock ContractLogicError exception."""
    pass

class TransactionNotFound(Exception):
    """Mock TransactionNotFound exception."""
    pass

def to_checksum_address(address):
    """Mock checksum address function."""
    return address

# Mock Web3 instance
Web3 = MockWeb3()
Contract = MockContract
Account = MockAccount()