# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **SINGLE SOURCE OF TRUTH (SSOT)**: This document is the definitive guide for all developers (including AI agents) working on DailyMotion. Every code change must align with these principles.

---

## 📋 Document Hierarchy

- **CLAUDE.md** (this file): The constitution for architects/AI agents
- **AGENTS.md**: Extended constitution with detailed specifications
- **README.md**: User guide (installation, how to run)
- **docs/**: API specs, module designs, auto-generated code

---

## 🏢 Architecture Overview

### Frontend: React Native (`client/src/`)
- **State Management**: Zustand (`src/stores/use[Name]Store.ts`)
  - ⚠️ **NEVER** store server state in Zustand
  - Actions must be explicitly defined in `actions` object
- **Styling**: Styled-components only
  - Use centralized theme (`src/styles/theme.ts`)
  - No magic numbers (colors, spacing, fonts must come from theme)
- **Data Fetching**: React Query (TanStack Query) exclusively
  - ⚠️ **FORBIDDEN**: Manual `useEffect + useState` for API calls
  - Custom hooks in `src/hooks/queries/useGet[Name]Query`
- **Navigation**: React Navigation
  - Screens in `src/screens/`
  - Central config in `src/navigators/`
- **Testing**: Jest + React Native Testing Library (RTL)
  - **Methodology**: TDD (Test-first)
  - Test from user perspective (accessibility, actual behavior)

### Backend: FastAPI (`server/app/`)
- **Architecture**: Monolithic (modular structure)
  - Modules: `path_optimize/`, `ai_pattern/`, `risk_manage/`, etc.
  - **CRITICAL**: Each module communicates ONLY via service layer
  - No direct cross-module imports
- **Database**: PostgreSQL + PostGIS
  - ⚠️ **REQUIRED**: Use PostGIS for spatial queries (`ST_Intersects`, etc.)
  - Maintain statistics table for avg travel times (segment/hour)
- **Testing**: Pytest
  - **Methodology**: TDD (Test-first)
  - Tests act as "automated enforcement" of OpenAPI spec

### API Contract (The Border)
- **Standard**: OpenAPI 3.x (Design-First)
- **Process**: Define API spec in `docs/openapi/v1.yaml` BEFORE coding
- **JSON Keys**: ALWAYS camelCase (`userId` ✓, `user_id` ✗)
- **Response Format**:
  ```json
  // Success (2xx)
  { "data": { ... } }

  // Error (4xx, 5xx)
  { "error": { "code": "E001", "message": "..." } }
  ```
- **⚠️ CRITICAL RULE**: If you ADD or MODIFY anything in `docs/openapi/v1.yaml`, YOU MUST inform the user immediately
  - Changes to endpoints, request/response schemas, enums, etc.
  - This ensures API design stays aligned with implementation
  - User will decide whether to apply changes or keep current spec

---

## 🚀 Development Commands

### Frontend (React Native - `client/`)

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server (Expo/Metro bundler)
npm start

# Run unit tests (Jest)
npm test

# Run specific test file
npm test -- DailyBriefingScreen.test.tsx

# Watch mode for tests
npm test -- --watch
```

### Backend (FastAPI - `server/`)

```bash
# Navigate to server directory
cd server

# Install dependencies
pip install -r requirements.txt

# Run development server with hot reload
uvicorn app.main:app --reload

# Run server on specific port
uvicorn app.main:app --reload --port 8001

# Run all tests
pytest

# Run tests with verbose output
pytest -v

# Run specific test file
pytest tests/test_ai_pattern.py

# Run tests matching a pattern
pytest -k "test_learn_pattern"

# Run with coverage
pytest --cov=app
```

---

## 📐 Implementation Patterns & Conventions

### Frontend Patterns

#### Zustand Store Structure
```typescript
// Location: src/stores/use[Name]Store.ts
interface [Name]State {
  // State fields (UI state ONLY, never server state)
  fieldName: type;

  // Action methods
  updateField: (value: type) => void;
  reset: () => void;
}

export const use[Name]Store = create<[Name]State>((set) => ({
  fieldName: initialValue,
  updateField: (value) => set({ fieldName: value }),
  reset: () => set(initialState),
}));
```
**Key Rules**:
- Store state ONLY affects UI (loading, modal visibility, current mode)
- DO NOT cache API responses (use React Query instead)
- Actions must be explicitly defined (not implicit spread operators)
- Use `set()` callback for computed state

#### React Query Custom Hooks
```typescript
// Location: src/hooks/queries/useGet[Entity]Query.ts
const queryKey = ['entityName', param1, param2];

export const useGet[Entity]Query = (params) => {
  return useQuery({
    queryKey,
    queryFn: () => api.get(...),
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime: 1000 * 60 * 10,     // 10 minutes
  });
};
```
**Key Rules**:
- Use `queryKey` pattern: `[entityName, ...params]` for cache management
- Set `staleTime` to control when data is considered stale
- Set `gcTime` (garbage collection time) for memory efficiency
- DO NOT call in loops or conditionally without proper dependency tracking

#### Styled Components & Theme
```typescript
// ✅ CORRECT: Using theme values
const Container = styled.View`
  padding: ${theme.spacing.md}px;
  border-radius: ${theme.borderRadius.lg}px;
  background-color: ${theme.colors.primary};
`;

// ❌ WRONG: Magic numbers
const Container = styled.View`
  padding: 16px;     // NO! Use theme.spacing.md
  color: #007AFF;    // NO! Use theme.colors.primary
`;
```
**Key Theme Fields**:
- `colors`: primary, secondary, text, background, border, danger, warning, success
- `spacing`: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)
- `fonts`: Display/Headline/Body with L/M/S variants and font-weight
- `borderRadius`: sm (4px), md (8px), lg (12px), xl (16px)
- `shadows`: elevation 1-5 with shadow-color, shadow-offset, shadow-radius

#### File Organization
```
src/
├── screens/
│   └── [Feature]/
│       ├── [Feature]Screen.tsx         # Main screen component
│       ├── screens/                    # Sub-screens (if applicable)
│       │   ├── [SubFeature]Screen.tsx
│       │   └── ...
│       ├── components/                 # Feature-specific components
│       │   ├── [Component].tsx
│       │   └── ...
│       ├── stores/                     # Feature state management
│       │   └── use[Feature]Store.ts
│       ├── styles/                     # Feature theme extensions
│       │   └── [feature]Theme.ts
│       └── __tests__/                  # Colocated tests
│           ├── [Feature]Screen.test.tsx
│           ├── screens/
│           │   └── [SubFeature]Screen.test.tsx
│           └── components/
│               └── [Component].test.tsx
```

### Backend Patterns

#### Module Structure (Modular Monolith)
```
server/app/modules/
└── [module_name]/                      # e.g., path_optimize, ai_pattern
    ├── service.py                      # Business logic service class
    ├── models/
    │   ├── api_models.py              # Request/response DTOs (Pydantic)
    │   ├── db_models.py               # ORM models (SQLAlchemy)
    │   └── __init__.py
    ├── repositories/                   # Data access layer
    │   ├── [entity]_repository.py
    │   └── __init__.py
    ├── clients/                        # Outbound calls to other modules
    │   ├── [other_module]_client.py
    │   └── __init__.py
    ├── tests/
    │   ├── test_service.py            # Service layer tests
    │   ├── test_e2e_api.py            # End-to-end API tests
    │   ├── mock_data/
    │   │   └── sample_[entity].json
    │   └── __init__.py
    └── __init__.py
```

**Critical Rules**:
- NO direct imports between modules (only via clients/)
- Each module is independently testable
- Service layer is the entry point (no direct repository access from routers)
- All external communication through `clients/` subdirectory

#### Service Class Pattern
```python
# Location: server/app/modules/[module]/service.py
class [Module]Service:
    def __init__(self, db_session):
        self.db = db_session
        self.repo = [Entity]Repository(db_session)

    def process_request(self, request: RequestModel) -> ResponseModel:
        """Validate input, call repo, apply business logic."""
        if not self._validate(request):
            raise HTTPException(...)

        # Call other modules through clients
        result = self._get_external_data(request)
        return self._build_response(result)

    def _validate(self, request) -> bool:
        """Business logic validation."""
        pass
```

#### Repository Pattern
```python
# Location: server/app/modules/[module]/repositories/[entity]_repository.py
class [Entity]Repository:
    def __init__(self, db_session):
        self.db = db_session

    def get_by_id(self, entity_id: int) -> [EntityModel]:
        return self.db.query([EntityModel]).filter_by(id=entity_id).first()

    def find_all(self, filters: dict) -> List[[EntityModel]]:
        query = self.db.query([EntityModel])
        for key, value in filters.items():
            query = query.filter(getattr([EntityModel], key) == value)
        return query.all()

    def create(self, data: dict) -> [EntityModel]:
        entity = [EntityModel](**data)
        self.db.add(entity)
        self.db.commit()
        return entity
```

#### API Router Structure
```python
# Location: server/app/api/v1/[module]_router.py
from fastapi import APIRouter, Depends
from ...modules.[module].service import [Module]Service
from ...db.database import get_db

router = APIRouter(prefix="/api/v1/[path]", tags=["[module]"])

@router.get("/{id}")
async def get_item(id: int, db=Depends(get_db)):
    service = [Module]Service(db)
    return {"data": service.get_item(id)}

# Central registration in api/v1/__init__.py:
# from .[module]_router import router as [module]_router
# app.include_router([module]_router)
```

#### Database Models (SQLAlchemy + PostGIS)
```python
# Location: server/app/db/models/[entity].py
from geoalchemy2 import Geometry

class [Entity](Base):
    __tablename__ = "[entities]"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(Geometry('POINT', srid=4326))  # PostGIS support
    created_at = Column(DateTime, default=datetime.now)

    # Relationship
    related_items = relationship("[RelatedEntity]", back_populates="[entity]")
```

**Spatial Queries Example**:
```python
from geoalchemy2.functions import ST_Intersects, ST_DWithin

# Find entities within 1km radius
nearby = db.query(Entity).filter(
    ST_DWithin(Entity.location, Point(lat, lon), 1000)
).all()

# Check if point is within polygon
inside = db.query(Entity).filter(
    ST_Intersects(Entity.location, polygon)
).all()
```

#### Testing Pattern (Pytest)
```python
# Location: server/app/modules/[module]/tests/test_service.py
import pytest
from ..service import [Module]Service

@pytest.fixture
def mock_db(mocker):
    return mocker.MagicMock()

def test_service_process_valid_request(mock_db):
    service = [Module]Service(mock_db)
    request = RequestModel(...)

    result = service.process_request(request)

    assert result.status == "success"
    mock_db.commit.assert_called_once()
```

---

## 🔧 Core Business Logic (v3.0 Spec)

### Logic 1.1: Departure Alarm (출발 알림)
- **Mode**: Commute mode (prevent lateness)
- **Calculation**: Door-to-door (include First/Last Mile walking time)
- **Implementation**: Backend `path_optimize` module

### Logic 2.2: Smart Path Optimization
- **Gate 1**: Clear benefit (real time/cost savings)
- **Gate 2**: Transfer certainty (confirmed transfer)
- **Gate 3**: Experience quality (acceptable ride quality)
- **CRITICAL**: Do NOT suggest paths failing ANY gate (strictly forbidden)

### Logic 3.1: AI Pattern Analysis
- **Responsibility**: `ai_pattern` module
- **Core Asset**: Segment/hour-based average travel time database
- **AI Validation**: Use NHN Cloud AI/ML services (Vision, NLP)

---

## 📦 Infrastructure

- **Cloud Provider**: NHN Cloud
- **Deployment**: Kubernetes Service (NKS)
- **Storage**: Object Storage (for citizen reports)
- **Database**: Managed PostgreSQL service

---

## 🛠️ Development Workflow

### Before Writing ANY Code:
1. ✓ Read this `claude.md`
2. ✓ Consult AGENTS.md for detailed specs
3. ✓ Check OpenAPI spec (`docs/openapi/v1.yaml`)
4. ✓ Write failing tests FIRST (TDD methodology)
5. ✓ Then implement code to pass tests

### Git Workflow:
- **Branch**: `develop`
- **Commits**: Clear, atomic, follow existing commit style
- **Messages**: Describe WHY, not just WHAT

### Testing Requirements:
- **Frontend**: RTL tests must verify user perspective
- **Backend**: Pytest must enforce business logic invariants
- **All**: Tests are "living documentation" of spec compliance

---

## ⚠️ Critical Rules (NEVER Violate)

| Rule | Context | Status |
|------|---------|--------|
| Manual `useEffect + useState` for API calls | Frontend | 🚫 FORBIDDEN |
| Store server state in Zustand | Frontend | 🚫 FORBIDDEN |
| Magic numbers in styles (no theme usage) | Frontend | 🚫 FORBIDDEN |
| Cross-module direct imports | Backend | 🚫 FORBIDDEN |
| Suggest paths failing Gate checks | Backend | 🚫 STRICTLY FORBIDDEN |
| Skip TDD methodology | Both | 🚫 FORBIDDEN |
| JSON keys in snake_case | API Contract | 🚫 FORBIDDEN |
| Change code before updating OpenAPI spec | Both | 🚫 FORBIDDEN |

---

## 🐳 Local Development Setup

### Quick Start (Full Stack with Docker)

```bash
# Clone and navigate to project root
cd server

# Start PostgreSQL + Redis + FastAPI with hot reload
docker-compose up

# In a separate terminal, start frontend
cd ../client
npm install
npm start
```

### Docker Compose Services
- **PostgreSQL 15** on `localhost:5432`
  - Includes PostGIS extension for spatial queries
  - Automatic schema migrations via Alembic
  - Database: `dailymotion` (user: `postgres`, password: from `.env`)

- **Redis** (optional) on `localhost:6379`
  - Cache layer for session management

- **FastAPI** on `localhost:8000` (exposed)
  - Auto-reload on code changes
  - Uvicorn runs with `--reload` flag
  - Health endpoint: `GET /health`

### Environment Setup

Create `.env` file in repository root:
```bash
# Database
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/dailymotion

# APIs
ODSAY_API_KEY=your_odsay_key
NHN_CLOUD_API_KEY=your_nhn_key

# Mode flags
PATH_OPTIMIZE_COMMUTE_DB_ONLY=false  # Use real DB, not mock fallback
DEBUG=true

# Frontend
REACT_NATIVE_PACKAGER_HOSTNAME=localhost
```

### Database Migrations (Alembic)

```bash
cd server

# Create new migration (auto-detects model changes)
alembic revision --autogenerate -m "Add new table"

# Apply pending migrations
alembic upgrade head

# Downgrade one migration
alembic downgrade -1

# View current head
alembic current
```

Migration files are in `server/alembic/versions/`

---

## ⚙️ Configuration Files Reference

### Frontend Configuration (`client/`)

**`package.json`**
- Main dependencies: React 19, React Native 0.81, Expo 54
- Test runner: Jest with React Testing Library
- Build tool: Expo EAS (if publishing)

**`tsconfig.json`**
- Extends Expo base TypeScript config
- Enables strict null checks and module resolution

**`jest.config.js`**
- Preset: `react-native`
- Test matching pattern: `**/__tests__/**/*.test.[jt]s?(x)`
- Transform ignores: node_modules (except React Native packages)

**`app.json` (Expo Config)**
- App name: DailyMotion
- Package: com.dailymotion.client
- Plugins: expo-location (with permission strings)
- Build profiles for iOS/Android

### Backend Configuration (`server/`)

**`requirements.txt`**
- Core: FastAPI, Uvicorn, Pydantic v2
- Database: SQLAlchemy, Alembic, GeoAlchemy2, psycopg3
- Testing: Pytest, pytest-asyncio
- Utilities: pandas, openpyxl, geopy

**`docker-compose.yml`**
- Three services: PostgreSQL, Redis (optional), FastAPI container
- Volume persistence: postgres_data, redis_data
- Network: dailymotion_network (bridge)
- Health checks: Postgres and Redis
- Auto-migration: Alembic runs on container startup

**`alembic.ini`**
- Configuration for schema version control
- SQLAlchemy URL (loaded from DATABASE_URL env var)
- Script location: `alembic/versions/`

**`core/config.py`**
- `BaseSettings` from Pydantic (loads from .env)
- Database configuration
- API keys and credentials
- CORS configuration for frontend

**`api/v1/__init__.py`**
- Central router registration point
- All routers must be imported and registered here
- Pattern: `app.include_router(router)`

---

## 📁 Directory Structure (Quick Reference)

```
dailyMotion/
├── claude.md                    # ← You are here
├── AGENTS.md                    # Extended specs
├── README.md                    # User guide
├── client/                      # React Native Frontend
│   └── src/
│       ├── stores/              # Zustand (state management)
│       ├── hooks/queries/        # React Query hooks
│       ├── screens/             # Navigation screens
│       ├── navigators/          # Navigation config
│       ├── styles/theme.ts      # Centralized theme
│       └── __tests__/           # Jest + RTL tests
├── server/                      # FastAPI Backend
│   └── app/
│       ├── path_optimize/       # Logic 1.1, 2.2
│       ├── ai_pattern/          # Logic 3.1
│       ├── risk_manage/         # Safety guards
│       └── tests/               # Pytest tests
└── docs/
    ├── MODULES.md               # Module design docs
    └── openapi/
        ├── v1.yaml              # API spec (DESIGN-FIRST)
        └── generated/           # Auto-generated clients
```

---

## 🎯 Decision Matrix for AI Agent

**When implementing features, ask yourself:**

1. **Is this a frontend change?**
   - Use React Query (not useState)
   - Zustand for UI state (not server state)
   - RTL tests FIRST
   - Styled-components + theme

2. **Is this a backend change?**
   - Update OpenAPI spec FIRST
   - Write Pytest test FIRST
   - Use service layer for cross-module calls
   - Use PostGIS for spatial logic

3. **Is this an API contract change?**
   - Update `docs/openapi/v1.yaml` FIRST
   - Ensure camelCase JSON keys
   - Update both frontend & backend simultaneously
   - Commit together as single unit

4. **Am I in doubt?**
   - Check AGENTS.md for specific regulations
   - Look for existing patterns in codebase
   - When in doubt: **DESIGN FIRST, CODE SECOND**

---

## 🎨 Onboarding Implementation Guide

### Design Philosophy (desgin.md v3.2)
- **"Value First"**: Show benefits before requesting data
- **"Conversational Setup"**: Question-like UI instead of cold forms
- **"One Thing at a Time"**: Single task per screen
- **"Brainless Skeleton"**: Sensible defaults (90% of users accept them)

### Visual Design System (3D Claymorphism + Glassmorphism)
- **Colors**: Blue (#007AFF), Ambient variants (Normal/Warning/Alert)
- **Typography**: Display-L (34px), Headline-M (22px), Body-L (17px)
- **Components**:
  - **Cards**: Soft UI with diffused shadows + glassmorphism (backdrop blur 12px, opacity 70-80%)
  - **Buttons**: 3D effect with clear shadow on bottom
  - **Icons**: High-quality 3D renders (bus 🚌, subway 🚇, location 📍, notification 🔔, trophy 🏆)
  - **Input Fields**: Flat/Inset style (no 3D, clear input intent)

### Onboarding Screen Structure (10 screens)
```
Screen 1-3:  ValueProposal (horizontal swipeable cards)
Screen 4:    OriginScreen (departure location input)
Screen 5:    DestinationScreen (arrival location input)
Screen 6:    PathSelection (choose recommended path)
Screen 7:    GoalTime (arrival time + first mile minutes)
Screen 8:    ScheduleSetup (weekdays vs custom)
Screen 9:    PermissionsScreen (notification + location)
Screen 10:   CompletionScreen (success + preview briefing)
```

### Onboarding Store (`useOnboardingStore.ts`)
```typescript
// Location: src/screens/Onboarding/stores/useOnboardingStore.ts
// - journeySetup: { origin, destination }
// - pathSelection: { selectedPathIndex, customPath }
// - goalTime: { arrivalTime, firstMileMinutes }
// - schedule: { daysOfWeek, isCustom }
// - permissions: { notificationGranted, locationGranted }
// - currentStep: 1-9
// - isCompleted: boolean
// All state persisted to AsyncStorage
```

### TDD Pattern for Onboarding Screens
1. **Write RTL test first** (user perspective):
   ```typescript
   // Test: "User can input origin and destination"
   // Test: "Next button navigates to next screen"
   // Test: "Back button reverts to previous screen"
   ```
2. **Implement screen component** to pass tests
3. **Integrate into navigation** (OnboardingScreen stack navigator)
4. **Test against Zustand store** (state persistence)

### Onboarding Theme Extension
- Location: `src/screens/Onboarding/styles/onboardingTheme.ts`
- Extends `src/styles/theme.ts` with:
  - 3D button shadow tokens
  - Glassmorphism backdrop blur values
  - Ambient background colors
  - Animation/transition tokens

### Key File Locations
- **Navigation Controller**: `src/screens/Onboarding/OnboardingScreen.tsx`
- **State Management**: `src/screens/Onboarding/stores/useOnboardingStore.ts`
- **Screens**: `src/screens/Onboarding/screens/` (ValueProposalScreen, JourneySetupScreen, etc.)
- **Reusable Components**: `src/screens/Onboarding/components/` (OnboardingButton, OnboardingCard, InputField)
- **Tests**: `src/screens/Onboarding/__tests__/` (matching screen/component structure)
- **Task Tracker**: `src/screens/Onboarding/Onboarding_task.md` (Phase breakdown)

---

## 🔗 Reference Links

- **Extended Rules**: See AGENTS.md
- **API Spec**: `docs/openapi/v1.yaml`
- **Module Designs**: `docs/MODULES.md`
- **Onboarding Design**: `client/src/screens/Onboarding/desgin.md`
- **Onboarding Tasks**: `client/src/screens/Onboarding/Onboarding_task.md`
- **Frontend Entry**: `client/src/`
- **Backend Entry**: `server/app/`

---

**Last Updated**: November 23, 2025
**Status**: Constitutional Law (DO NOT MODIFY without team consensus)
**Recent Improvements**:
- Added comprehensive Implementation Patterns section (Frontend & Backend)
- Added Local Development Setup with Docker Compose instructions
- Added Configuration Files Reference for quick lookup
- Updated Onboarding structure from 9 to 10 screens (OriginScreen + DestinationScreen separation)
