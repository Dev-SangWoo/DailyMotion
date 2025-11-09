# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DailyMotion** is an AI-powered commute mobility assistant that optimizes daily travel for Korean users. It combines personal route learning with real-time navigation to provide intelligent commute optimization, safety alerts, and lifestyle recommendations.

**Key Technology Stack:**
- **Backend**: FastAPI (Python 3.13)
- **Database**: PostgreSQL + PostGIS (spatial queries)
- **Cloud**: KT Cloud Platform (KCP)
- **Containerization**: Docker + Kubernetes (K2S)
- **Frontend**: React Native (iOS/Android)
- **AI/ML**: LSTM, DBSCAN, Vision/NLP

## Repository Status

- **Current Phase**: Early development (architecture planning completed, source code not yet committed)
- **Git Branch**: main
- **Virtual Environment**: Python 3.13 (.venv)
- **IDE**: IntelliJ IDEA configured

## Architecture Overview

### Single FastAPI Architecture (Current Development Phase)

```
/app
├── main.py                      # Entry point (routing, scheduler)
├── routers/
│   ├── users.py                 # User management
│   ├── trips.py                 # Trip record collection
│   ├── ai_pattern.py            # AI pattern learning (DBSCAN, LSTM)
│   └── route_opt.py             # Real-time trip optimization (Dijkstra)
├── core/
│   ├── db.py                    # PostgreSQL connection (SQLAlchemy)
│   ├── scheduler.py             # APScheduler configuration
│   └── config.py                # Environment variables, API keys
├── services/
│   ├── odsay_api.py             # Odsay public transit integration
│   ├── skt_api.py               # SK Telecom congestion API
│   ├── hazard_api.py            # Disaster alert API integration
│   └── push_service.py          # Push notifications (FCM)
├── ai/
│   ├── dbscan_model.py          # Clustering model (DBSCAN)
│   ├── lstm_model.py            # Movement pattern prediction (LSTM)
│   └── recommender.py           # Alternative route recommendation engine
└── models/
    └── entities.py              # SQLAlchemy ORM entities
```

### Planned Microservices Architecture (MSA)

1. **trip-orchestrator** - Collects and aggregates trip/route data
2. **realtime-optimizer** - Real-time alternative routes and weight calculations
3. **safety-guard** - Disaster/local hazard detection and alerts
4. **lifestyle-recommender** - Route-based location recommendations
5. **ai-crv** - Citizen report credibility verification (Vision/NLP)

## Core Features

1. **Daily Briefing**: Proactive commute recommendations with real-time transit info
2. **Real-time Trip Optimization**: Detects delays/accidents and suggests alternatives
3. **Safety Guard**: Disaster alerts + AI-verified citizen reports
4. **AI Place Search**: Context-aware location recommendations based on route/time/interests
5. **Trip Pattern Learning**: LSTM-based movement pattern prediction for personalization

## External API Integrations

- **Odsay**: National public transit routes and real-time bus arrivals
- **SK Telecom**: Subway/train congestion and train car recommendations
- **Seoul City**: Real-time population density, V2X bus platform congestion
- **Ministry of Public Administration & Security**: Disaster alert broadcasts
- **Kakao**: User login and map API
- **Firebase**: Push notifications (FCM)

## Database Schema (Key Entities)

- **User**: Preferences, patterns, permissions
- **CommuteRoute**: Fixed commute routes
- **TripInstance**: Execution history of trips
- **Alert**: Disasters, congestion, local hazards
- **CitizenReport**: User-submitted reports with credibility scores
- **Recommendation**: Place/time/context-based recommendations
- **PostGIS Spatial Data**: Route-event intersections, buffer zones

## Development Workflow

### Setup
```bash
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# or: .venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### Run Development Server
```bash
uvicorn app.main:app --reload --port 8000
```

### Run Tests
```bash
pytest
```

### Build Docker Image
```bash
docker build -t dailymotion:latest .
```

### Deploy to Kubernetes (K2S)
```bash
kubectl apply -f k8s/
```

## Configuration

- **Environment Variables**: Managed in `app/core/config.py`
- **API Keys**: Required for Odsay, SK Telecom, Firebase, Kakao, Ministry of Public Administration APIs
- **Database**: PostgreSQL + PostGIS on KT Cloud
- **Object Storage**: KT Cloud Object Storage for citizen report media (images/videos)

## Key Dependencies

**Framework & Web:**
- FastAPI
- Uvicorn
- SQLAlchemy

**Database:**
- psycopg2-binary
- GeoAlchemy2

**AI/ML:**
- scikit-learn (DBSCAN)
- TensorFlow or PyTorch (LSTM)
- NumPy, Pandas

**External APIs:**
- requests
- aiohttp

**Task Scheduling:**
- APScheduler

**Notifications:**
- firebase-admin

**Utilities:**
- python-dotenv
- pydantic
- pytest

## Important Context

### AI/ML Components
- **LSTM Models**: Predict user movement patterns and preferred departure times
- **DBSCAN Clustering**: Identify frequent commute routes
- **Vision/NLP (CRV)**: Verify credibility of citizen-submitted reports
- **Multi-objective Optimization**: Balance travel time, comfort, and convenience

### Data Considerations
- **Spatial Queries**: PostGIS used extensively for route-event intersections
- **Real-time Processing**: Multiple external API integrations require efficient caching and rate limiting
- **Privacy**: Handle location data with encryption and anonymization
- **Cold Start Problem**: Use Seoul city statistics for new users before personal patterns develop

### Performance Priorities
1. Real-time alert delivery (must be sub-second for disaster alerts)
2. Route optimization response time (target: <2 seconds)
3. Efficient spatial queries for route-event intersection detection
4. CI/CD readiness for rapid deployment (planned)

## Related Files

- `claude.md` - Detailed project specifications, features, and business logic
- `README.md` - Project overview (Korean language)

## Next Steps for Contributors

1. Implement FastAPI application structure with routers
2. Integrate PostgreSQL + PostGIS database layer
3. Implement external API clients (Odsay, SK Telecom, etc.)
4. Develop core AI/ML models (LSTM, DBSCAN)
5. Create citizen report verification system (Vision/NLP)
6. Set up CI/CD pipeline for KT Cloud K2S deployment
7. Implement comprehensive test suite
