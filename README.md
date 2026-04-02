# TutorHub

TutorHub is a full-stack tutoring platform that connects students, tutors, and administrators. Students can browse and enroll in courses, submit assignments, track study plans, and message tutors. Tutors can create courses, post assignments, and grade submissions. Admins can monitor platform activity through a stats dashboard.

---

## Tech Stack

- **Framework:** Next.js 14 (TypeScript)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (jose + jsonwebtoken)
- **Password hashing:** bcrypt
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Testing Library
- **Recommendation service:** Python (FastAPI)

---

## Prerequisites

- **Node.js** v18 or later
- **PostgreSQL** installed and running locally
- **Python 3.9+** (only needed if you want to run the recommendation service)

---

## How to Set It Up Locally

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd tutorhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the project root — see the Environment Variables section below.

4. **Generate the Prisma client**
   ```bash
   npx prisma generate
   ```

5. **Run database migrations**
   ```bash
   npx prisma migrate dev
   ```

6. **Seed an admin user** *(optional but recommended)*
   ```bash
   npm run seed:admin
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string e.g. `postgresql://USER:PASSWORD@localhost:5432/tutorhub` |
| `JWT_SECRET` | Secret key used to sign JWT tokens — use a long random string, never commit the real value |
| `ADMIN_EMAIL` | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Password for the seeded admin account |
| `ADMIN_NAME` | Display name for the seeded admin account |

---

## How to Run Tests

**Run all unit tests**
```bash
npm test
```

**Run tests in watch mode**
```bash
npm run test:watch
```

**Run tests with coverage report**
```bash
npm run test:coverage
```

**Manual UAT (User Acceptance Testing)**

See [`tests/uat/UAT_TEST_CASES.md`](tests/uat/UAT_TEST_CASES.md) for 43 manual test scenarios covering all major user flows — registration, enrollment, assignments, grading, study plans, messaging, and security checks.

---

## Project Structure

```
app/
  api/          ← API route handlers (auth, courses, enrollments, etc.)
  dashboard/    ← Student, tutor, and admin dashboard pages
components/     ← Reusable React components
lib/
  services/     ← Business logic
  repositories/ ← Database queries (Prisma)
  jwt.ts        ← Token sign/verify
  prisma.ts     ← Database connection
prisma/
  schema.prisma ← Database schema
  migrations/   ← Migration history
tests/
  uat/          ← Manual UAT test cases
recommendation-service/ ← Python FastAPI microservice
```

---

## Key Features

- Role-based access control — Student, Tutor, Admin
- JWT authentication with HTTP-only cookies
- Course creation, publishing, and archiving
- Student enrollment with capacity limits
- Assignment posting and submission workflow
- Tutor grading with feedback
- Student study plans and task tracking
- Direct messaging between users
- Admin platform stats dashboard
- Tutor recommendation microservice (Python)
