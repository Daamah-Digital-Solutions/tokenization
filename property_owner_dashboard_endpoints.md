# Property Owner Dashboard API Endpoints

This document outlines the comprehensive backend API endpoints implemented for the Property Owner Dashboard to replace all mock data with real database queries.

## Implemented Endpoints

### 1. **`GET /api/v1/properties/owner/`** - Owned Properties
**Description:** Get all properties owned by the authenticated user with comprehensive metrics.

**Authentication:** Required (Property Owner role)

**Response Data:**
```json
{
  "properties": [
    {
      "id": "uuid",
      "title": "Property Name",
      "location": "City, Country",
      "property_type": "residential",
      "status": "active",
      "total_value": "1000000.00",
      "current_value": "1050000.00",
      "funding_amount": "750000.00",
      "funding_percentage": 75.0,
      "total_tokens": 1000,
      "tokens_sold": 750,
      "tokens_available": 250,
      "token_price": "1000.00",
      "expected_return": "8.5",
      "rental_yield": "6.2",
      "investor_count": 45,
      "total_revenue": "125000.00",
      "monthly_rental_income": "5200.00",
      "occupancy_rate": "95.00",
      "construction_progress": "100.00",
      "image_url": "http://domain.com/media/image.jpg",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "total_properties": 5,
  "total_value": "5000000.00",
  "total_funding": "3750000.00",
  "average_funding_percentage": 75.0
}
```

### 2. **`GET /api/v1/properties/owner/revenue-analytics/`** - Revenue Analytics
**Description:** Monthly revenue data for dashboard charts over the last 12 months.

**Response Data:**
```json
{
  "monthly_data": [
    {
      "month": "2024-01",
      "rental_income": 25000.0,
      "investment_income": 150000.0,
      "total_revenue": 175000.0,
      "platform_fees": 1250.0,
      "net_revenue": 173750.0
    }
  ],
  "summary": {
    "total_rental_income": 300000.0,
    "total_investment_income": 1800000.0,
    "total_revenue": 2100000.0,
    "average_monthly_revenue": 175000.0,
    "revenue_growth_percentage": 12.5
  }
}
```

### 3. **`GET /api/v1/properties/owner/tokenization-analytics/`** - Tokenization Analytics
**Description:** Token sales progression data showing funding velocity and completion estimates.

**Response Data:**
```json
{
  "progression_data": [
    {
      "date": "2024-01-01",
      "cumulative_tokens_sold": 2500,
      "cumulative_funding": 2500000.0,
      "active_properties": 3
    }
  ],
  "summary": {
    "total_tokens": 5000,
    "total_tokens_sold": 3750,
    "total_funding_target": "5000000.00",
    "current_funding": "3750000.00",
    "overall_funding_percentage": 75.0,
    "funding_velocity_daily": 25.5,
    "estimated_completion_days": 49
  }
}
```

### 4. **`GET /api/v1/properties/owner/revenue-stats/`** - Revenue Distribution Stats
**Description:** Revenue breakdown by property type, location, and monthly performance metrics.

**Response Data:**
```json
{
  "revenue_by_property_type": [
    {
      "property_type": "residential",
      "rental_income": 180000.0,
      "investment_income": 1200000.0,
      "total_revenue": 1380000.0,
      "property_count": 3
    }
  ],
  "revenue_by_location": [
    {
      "location": "New York, USA",
      "revenue": 850000.0,
      "percentage": 40.5
    }
  ],
  "monthly_performance": {
    "current_month_revenue": 28500.0,
    "last_month_revenue": 25200.0,
    "month_over_month_change": 13.1
  },
  "total_revenue": 2100000.0
}
```

### 5. **`GET /api/v1/properties/owner/investors/`** - Top Investors
**Description:** Top 20 investors across all owned properties with detailed metrics.

**Response Data:**
```json
{
  "top_investors": [
    {
      "investor_id": "uuid",
      "investor_name": "John Doe",
      "investor_email": "john@example.com",
      "total_invested": 125000.0,
      "total_tokens": 125,
      "properties_count": 3,
      "investment_count": 5,
      "average_investment": 25000.0,
      "first_investment_date": "2024-01-15T10:30:00Z",
      "last_investment_date": "2024-03-20T14:45:00Z",
      "country": "United States",
      "investor_since_days": 65
    }
  ],
  "summary": {
    "total_unique_investors": 150,
    "total_investment_amount": 3750000.0,
    "average_investment_per_investor": 25000.0,
    "top_investor_contribution": 125000.0,
    "top_investor_percentage": 3.33
  }
}
```

### 6. **`GET /api/v1/properties/owner/investor-analytics/`** - Investor Analytics
**Description:** Investor segmentation, geographic distribution, and acquisition trends.

**Response Data:**
```json
{
  "investor_segmentation": {
    "whale_investors": {
      "count": 5,
      "investors": [...],
      "total_invested": 750000.0
    },
    "large_investors": {
      "count": 25,
      "investors": [...],
      "total_invested": 1500000.0
    },
    "medium_investors": {
      "count": 75,
      "total_invested": 1200000.0
    },
    "small_investors": {
      "count": 45,
      "total_invested": 300000.0
    }
  },
  "geographic_distribution": [
    {
      "country": "United States",
      "unique_investors": 85,
      "total_invested": 2100000.0,
      "investment_count": 240,
      "average_investment": 24705.88
    }
  ],
  "investor_acquisition": [
    {
      "month": "2024-01",
      "new_investors": 12,
      "total_cumulative": 45
    }
  ],
  "summary": {
    "total_unique_investors": 150,
    "average_investment_per_investor": 25000.0,
    "top_countries_count": 15,
    "investor_retention_rate": 85.5
  }
}
```

### 7. **`GET /api/v1/properties/owner/investment-metrics/`** - Investment Performance
**Description:** Comprehensive investment performance metrics including ROI, property performance, and trends.

**Response Data:**
```json
{
  "portfolio_overview": {
    "total_property_value": 5000000.0,
    "total_funding_raised": 3750000.0,
    "funding_percentage": 75.0,
    "total_tokens_sold": 3750,
    "total_tokens_available": 5000,
    "average_funding_percentage": 75.0,
    "total_rental_revenue": 300000.0,
    "property_count": 5
  },
  "performance_metrics": {
    "ytd_funding": 1200000.0,
    "ytd_rental_income": 85000.0,
    "ytd_total_revenue": 1285000.0,
    "average_property_roi": 8.5,
    "best_performing_property": {...},
    "worst_performing_property": {...}
  },
  "property_performance": [
    {
      "property_id": "uuid",
      "property_title": "Property Name",
      "original_value": 1000000.0,
      "current_value": 1050000.0,
      "appreciation": 50000.0,
      "appreciation_percentage": 5.0,
      "rental_income": 62400.0,
      "total_returns": 112400.0,
      "total_return_percentage": 11.24,
      "funding_percentage": 75.0,
      "investor_count": 45
    }
  ],
  "monthly_trends": [
    {
      "month": "2024-01",
      "funding_raised": 250000.0,
      "rental_income": 25000.0,
      "total_revenue": 275000.0
    }
  ]
}
```

### 8. **`GET /api/v1/properties/owner/documents/`** - Property Documents
**Description:** All documents across owned properties with pagination and filtering.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Results per page (default: 20)

**Response Data:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "name": "Property Deed",
      "document_type": "legal",
      "description": "Original property deed document",
      "size": 2048576,
      "uploaded_at": "2024-01-15T10:30:00Z",
      "download_url": "http://domain.com/media/document.pdf",
      "property": {
        "id": "uuid",
        "title": "Property Name",
        "location": "City, Country"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_documents": 55,
    "has_next": true,
    "has_previous": false
  },
  "summary": {
    "total_documents": 55,
    "total_size_mb": 125.8,
    "document_types": [
      {
        "document_type": "legal",
        "count": 15,
        "total_size_mb": 45.2
      }
    ],
    "properties_with_documents": 5
  }
}
```

### 9. **`GET /api/v1/dashboard/activities/`** - Activity Feed
**Description:** Real-time activity feed showing recent activities across owned properties.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Results per page (default: 20)

**Response Data:**
```json
{
  "activities": [
    {
      "id": "investment_uuid",
      "type": "investment",
      "title": "New Investment Received",
      "description": "John Doe invested $25,000.00 in Downtown Office Complex",
      "details": {
        "investor_name": "John Doe",
        "investor_email": "john@example.com",
        "property_title": "Downtown Office Complex",
        "property_id": "uuid",
        "investment_amount": 25000.0,
        "tokens_purchased": 25,
        "ownership_percentage": 2.5
      },
      "timestamp": "2024-01-20T14:45:00Z",
      "icon": "dollar-sign",
      "color": "success"
    },
    {
      "id": "distribution_uuid",
      "type": "rental_distribution",
      "title": "Rental Income Distributed",
      "description": "$5,200.00 rental income distributed for Luxury Apartments",
      "details": {
        "property_title": "Luxury Apartments",
        "property_id": "uuid",
        "total_rental_income": 5200.0,
        "net_distribution_amount": 4940.0,
        "tokens_eligible": 850,
        "amount_per_token": 5.81,
        "distribution_period": "2024-01"
      },
      "timestamp": "2024-01-20T09:00:00Z",
      "icon": "home",
      "color": "primary"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 20,
    "total_activities": 125,
    "total_pages": 7,
    "has_next": true,
    "has_previous": false
  },
  "summary": {
    "total_activities": 125,
    "activity_counts": {
      "investment": 45,
      "rental_distribution": 25,
      "property_update": 20,
      "document_upload": 15,
      "status_change": 10,
      "new_subscriber": 8,
      "installment_payment": 2
    },
    "period_metrics": {
      "new_investments_count": 45,
      "total_investment_amount": 1125000.0,
      "total_rental_distributed": 130000.0,
      "new_subscribers": 8,
      "properties_with_activity": 5
    }
  }
}
```

## Security & Permissions

All endpoints require:
- **Authentication:** Valid JWT token
- **Authorization:** Property Owner role or Staff privileges
- **Data Filtering:** Only returns data for properties owned by the authenticated user

## Performance Features

- **Database Optimization:** Proper select_related and prefetch_related queries
- **Indexed Queries:** All database queries use indexed fields
- **Pagination:** Large result sets are paginated
- **Caching-Ready:** Responses structured for potential Redis caching

## Real-Time Data

All endpoints calculate real data from:
- ✅ Property ownership verification
- ✅ Investment transactions and amounts
- ✅ Rental income distributions
- ✅ Token sales and funding progress
- ✅ Investor demographics and behavior
- ✅ Document management and uploads
- ✅ Property status changes and approvals
- ✅ Activity tracking across all properties

## Integration Notes

These endpoints replace all mock data in the frontend Property Owner Dashboard and provide:
1. Real-time financial calculations
2. Actual investor data and analytics
3. True property performance metrics
4. Live activity feeds
5. Comprehensive document management
6. Advanced investor segmentation
7. Revenue distribution analysis
8. Tokenization progress tracking

The endpoints are designed to match the exact data structures expected by the frontend components while providing comprehensive real-world data calculations.