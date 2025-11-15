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

### Onboarding Screen Structure (9 screens)
```
Screen 1-3:  ValueProposal (horizontal swipeable cards)
Screen 4:    JourneySetup (origin + destination)
Screen 5:    PathSelection (choose recommended path)
Screen 6:    GoalTime (arrival time + first mile minutes)
Screen 7:    ScheduleSetup (weekdays vs custom)
Screen 8:    PermissionsScreen (notification + location)
Screen 9:    CompletionScreen (success + preview briefing)
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

**Last Updated**: November 15, 2025
**Status**: Constitutional Law (DO NOT MODIFY without team consensus)
