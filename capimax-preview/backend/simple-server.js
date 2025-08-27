const express = require('express');
const cors = require('cors');
const app = express();

// Basic middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Capimax Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic auth endpoints
app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'User registration endpoint - Backend under development',
    data: {
      message: 'Registration will be available once database is configured'
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'User login endpoint - Backend under development',
    data: {
      message: 'Login will be available once authentication system is complete'
    }
  });
});

// Basic property endpoints
app.get('/api/properties', (req, res) => {
  res.json({
    success: true,
    message: 'Properties endpoint - Backend under development',
    data: {
      properties: [],
      pagination: { page: 1, limit: 10, total: 0, pages: 0 },
      message: 'Property listings will be available once database is configured'
    }
  });
});

app.get('/api/properties/:id', (req, res) => {
  res.json({
    success: true,
    message: 'Property details endpoint - Backend under development',
    data: {
      property: null,
      message: `Property ${req.params.id} will be available once database is configured`
    }
  });
});

// Basic investment endpoints
app.post('/api/investments', (req, res) => {
  res.json({
    success: true,
    message: 'Investment creation endpoint - Backend under development',
    data: {
      message: 'Investment processing will be available once payment system is complete'
    }
  });
});

app.get('/api/investments/portfolio/:userId', (req, res) => {
  res.json({
    success: true,
    message: 'Portfolio endpoint - Backend under development',
    data: {
      portfolio_summary: {
        total_invested: 0,
        current_value: 0,
        total_return: 0,
        return_percentage: 0,
        properties_count: 0,
        monthly_income: 0
      },
      investments: [],
      message: 'Portfolio data will be available once database is configured'
    }
  });
});

// Basic KYC endpoints
app.post('/api/kyc/documents/upload', (req, res) => {
  res.json({
    success: true,
    message: 'KYC document upload endpoint - Backend under development',
    data: {
      message: 'Document upload will be available once file handling is configured'
    }
  });
});

app.get('/api/kyc/status/:userId', (req, res) => {
  res.json({
    success: true,
    message: 'KYC status endpoint - Backend under development',
    data: {
      user_id: req.params.userId,
      overall_status: 'pending',
      documents: [],
      message: 'KYC status will be available once verification system is complete'
    }
  });
});

// Basic payment endpoints
app.post('/api/payments/crypto', (req, res) => {
  res.json({
    success: true,
    message: 'Crypto payment endpoint - Backend under development',
    data: {
      message: 'Crypto payments will be available once blockchain integration is complete'
    }
  });
});

app.post('/api/payments/fiat', (req, res) => {
  res.json({
    success: true,
    message: 'Fiat payment endpoint - Backend under development',
    data: {
      message: 'Fiat payments will be available once Stripe/PayPal integration is complete'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    available_routes: [
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'GET /api/properties',
      'GET /api/properties/:id',
      'POST /api/investments',
      'GET /api/investments/portfolio/:userId',
      'POST /api/kyc/documents/upload',
      'GET /api/kyc/status/:userId',
      'POST /api/payments/crypto',
      'POST /api/payments/fiat'
    ]
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Capimax Backend API Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💻 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('📝 Status: Backend API scaffold running');
  console.log('🔄 Next: Complete TypeScript implementation with database');
  console.log('');
});