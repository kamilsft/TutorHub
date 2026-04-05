# TutorHub

A full-stack tutoring platform that connects students with tutors. Students can browse and enroll in courses, submit assignments, message tutors, manage study plans, and receive personalized course recommendations. Tutors can create and manage courses, review submissions, and communicate with students. Admins have platform-wide oversight.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT (jose / jsonwebtoken) |
| Recommendation Service | Python 3.11, FastAPI |
| Testing | Vitest, React Testing Library, pytest |
| CI | GitHub Actions |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (running locally or via Docker)
- Python 3.11+ (for the recommendation service)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/tutorhub
JWT_SECRET=your-secret-key-here
RECOMMENDATION_SERVICE_URL=http://localhost:8000
```

### 3. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 4. Seed initial data

```bash
# Seed an admin account
npm run seed:admin

# Seed test data (student, tutor, course, assignment, study plan)
npm run seed:test-data
```

### 5. Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Recommendation Service (Python / FastAPI)

The recommendation microservice runs separately from the Next.js app.

```bash
cd recommendation-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Testing

### Summary

| Metric | Value |
|---|---|
| Total Vitest test files | **74** |
| Total automated tests | **686** |
| All passing | ✅ Yes |
| Overall statement coverage | **97.18%** |
| Overall branch coverage | **90.57%** |
| Overall function coverage | **90.78%** |
| Business logic coverage (`lib/`) | 100% statements, 100% functions |
| UAT manual test cases | **43** |
| Python pytest suite | separate (recommendation service) |
| CI | Runs on every push to `main` / `master` |

### Test breakdown by layer

| Layer | Files | Tests | What is covered |
|---|---|---|---|
| Unit — services | 9 | ~130 | Business rules, ownership, validation logic |
| Unit — repositories | 9 | ~80 | Prisma query behavior per domain |
| Unit — lib | 3 | ~60 | JWT signing/verification, auth guards, validators |
| Route tests | 18 | ~90 | Every API endpoint — status codes, auth, errors |
| Component tests | 18 | ~90 | All reusable React UI components (jsdom) |
| Integration tests | 11 | ~120 | Full route → service → repository stack |
| Contract tests | 1 | ~5 | Recommendation gateway boundary shape |
| Performance smoke | 3 | ~10 | Messages, inbox, recommendation response shape |
| Security smoke | 2 | ~6 | Access control, ownership enforcement |
| UAT (manual) | 43 cases | — | Full user workflows in a real browser |
| Python pytest | separate | — | FastAPI recommendation service |

All Vitest tests run without a live database — routes and services are tested with mocks.

### Run all tests

```bash
npm test
```

### Run by layer

```bash
# Unit tests (services, repositories, utilities)
npm run test:unit

# Route tests (API route handlers)
npm run test:route

# Integration tests (cross-layer wiring)
npm run test:integration

# Component tests (React UI components)
npm run test:component

# Contract tests (recommendation service boundary)
npm run test:contracts

# Performance smoke tests
npm run test:smoke:perf

# Security smoke tests
npm run test:smoke:security
```

### Run Python tests

```bash
npm run test:python
# or directly:
cd recommendation-service && python -m pytest test_main.py -v
```

### Run with coverage

```bash
npm run test:coverage
```

### UAT (Manual / Browser testing)

End-to-end and user acceptance testing is conducted manually using the test cases in [`tests/uat/UAT_TEST_CASES.md`](tests/uat/UAT_TEST_CASES.md). These cover all major workflows for student, tutor, and admin roles against a running instance with seeded data.

---

## Project Structure

```
app/                  Next.js pages and API routes
components/           Reusable React components
lib/
  services/           Business logic layer
  repositories/       Data access layer (Prisma)
  gateways/           External service clients
prisma/               Database schema and migrations
recommendation-service/  FastAPI recommendation microservice
scripts/              Seed scripts
tests/
  integration/        Cross-layer integration tests
  contracts/          Service boundary contract tests
  performance/        Performance smoke tests
  security/           Security smoke tests
  fixtures/           Shared test data
  uat/                Manual UAT test cases
```

---

## CI

GitHub Actions runs on every push to `main` / `master`:
1. Install Node dependencies
2. Generate Prisma client
3. Run all Vitest tests
4. Set up Python 3.11
5. Install Python dependencies
6. Run pytest on the recommendation service
