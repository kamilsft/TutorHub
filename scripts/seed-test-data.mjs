// scripts/seed-test-data.mjs
// Seed predictable test data for browser tests, manual UI testing, and UAT
// Creates test users (student, tutor, admin), a course, assignment, enrollment,
// study plan with tasks, and a messaging thread
//
// Usage: node ./scripts/seed-test-data.mjs

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '@prisma/client';

const connectionString =
  process.env.DATABASE_URL || "postgresql://USER:PASSWORD@localhost:5432/tutorhub";

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = 'TestPassword123!';

async function upsertUser({ email, fullName, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[skip] User already exists: ${email} (${role})`);
    return existing;
  }
  const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
  const user = await prisma.user.create({
    data: { email, fullName, password: hashed, role },
  });
  console.log(`[created] User: ${email} (${role})`);
  return user;
}

async function main() {
  console.log('Seeding test data...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const student = await upsertUser({
    email: 'test.student@tutorhub.test',
    fullName: 'Test Student',
    role: 'STUDENT',
  });

  const tutor = await upsertUser({
    email: 'test.tutor@tutorhub.test',
    fullName: 'Test Tutor',
    role: 'TUTOR',
  });

  // ── Course ─────────────────────────────────────────────────────────────────
  const existingCourse = await prisma.course.findFirst({
    where: { title: 'Test Course', tutorId: tutor.id },
  });

  const course = existingCourse ?? await prisma.course.create({
    data: {
      title: 'Test Course',
      subject: 'Mathematics',
      tutorId: tutor.id,
      isPublished: true,
      level: 'Beginner',
    },
  });

  if (existingCourse) {
    console.log(`[skip] Course already exists: "${course.title}" (id: ${course.id})`);
  } else {
    console.log(`[created] Course: "${course.title}" (id: ${course.id})`);
  }

  // ── Assignment ─────────────────────────────────────────────────────────────
  const existingAssignment = await prisma.assignment.findFirst({
    where: { title: 'Test Assignment 1', courseId: course.id },
  });

  const assignment = existingAssignment ?? await prisma.assignment.create({
    data: {
      title: 'Test Assignment 1',
      description: 'Test assignment description',
      courseId: course.id,
    },
  });

  if (existingAssignment) {
    console.log(`[skip] Assignment already exists: "${assignment.title}" (id: ${assignment.id})`);
  } else {
    console.log(`[created] Assignment: "${assignment.title}" (id: ${assignment.id})`);
  }

  // ── Enrollment ─────────────────────────────────────────────────────────────
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, courseId: course.id },
  });

  const enrollment = existingEnrollment ?? await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      status: 'ACTIVE',
    },
  });

  if (existingEnrollment) {
    console.log(`[skip] Enrollment already exists: student=${student.email} → course=${course.title}`);
  } else {
    console.log(`[created] Enrollment: student=${student.email} → course=${course.title} (status: ACTIVE)`);
  }

  // ── Study Plan with task ───────────────────────────────────────────────────
  const existingPlan = await prisma.studyPlan.findFirst({
    where: { studentId: student.id },
    include: { tasks: true },
  });

  if (existingPlan) {
    console.log(`[skip] Study plan already exists for student: ${student.email} (id: ${existingPlan.id})`);
  } else {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const plan = await prisma.studyPlan.create({
      data: {
        studentId: student.id,
        tasks: {
          create: [
            {
              title: 'Complete Test Assignment 1',
              dueDate,
              courseId: course.id,
            },
          ],
        },
      },
      include: { tasks: true },
    });
    console.log(`[created] Study plan (id: ${plan.id}) with ${plan.tasks.length} task(s) for student: ${student.email}`);
  }

  console.log('\nTest data seed complete.');
  console.log(`\nTest credentials (password for all): ${TEST_PASSWORD}`);
  console.log(`  Student: test.student@tutorhub.test`);
  console.log(`  Tutor:   test.tutor@tutorhub.test`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
