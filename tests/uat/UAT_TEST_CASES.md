# TutorHub — User Acceptance Test Cases

**Project:** TutorHub tutoring platform  
**Document type:** UAT test plan for manual / stakeholder sign-off  
**Version:** 1.1  
**Test environment:** Running TutorHub instance with a seeded PostgreSQL database (run `npm run seed:test-data` before testing)  
**How to use:** Follow each step in a browser or via a REST client (e.g. Postman). After each test, record the result inline using the **Result** field and mark the sign-off table at the end.

**Result key:**
- ✅ Pass — all steps produced the expected outcome
- ❌ Fail — one or more steps did not match the expected outcome
- ⚠️ Blocked — test could not be executed (environment issue, dependency not met)

---

## Section 1 — Account Registration and Login

### UAT-01 — Student registers successfully (FR1)
**Requirement:** A new visitor can create a student account

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Go to `/register` | Registration form is displayed |
| 2 | Enter: Full Name = `Alice Student`, Email = `alice@test.com`, Password = `securePass1`, Role = `STUDENT` | Fields accept the input |
| 3 | Click **Register** | Redirect to login or dashboard; no error |
| 4 | Check the database | A `User` row exists with `role = STUDENT` and a hashed password |

**Pass:** Registration succeeds and the user can log in.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-02 — Tutor registers successfully (FR1)
**Requirement:** A new visitor can create a tutor account

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Go to `/register` | Registration form is displayed |
| 2 | Enter: Full Name = `Bob Tutor`, Email = `bob@test.com`, Password = `securePass1`, Role = `TUTOR` | Fields accept the input |
| 3 | Click **Register** | Success — user created with `role = TUTOR` |

**Pass:** Tutor account created; `role = TUTOR` in the database.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-03 — Duplicate email is rejected (FR1 + NFR4)
**Requirement:** Two accounts cannot share the same email address

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Try to register with an email that already exists | Error: "An account with this email already exists." |
| 2 | Check HTTP response | Status 409 |

**Pass:** Duplicate email rejected; no second account created.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-04 — Invalid registration inputs rejected (NFR4)
**Requirement:** Server validates all fields before creating an account

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Submit with password `abc` (under 8 characters) | Error: "Password must be at least 8 characters." |
| 2 | Submit with email `notanemail` | Error: "Please enter a valid email address." |
| 3 | Submit with blank Full Name | Error: "Full name is required." |
| 4 | Submit with Role blank or invalid | Error about selecting a valid role |

**Pass:** Each invalid input produces a specific, readable error; no account created.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-05 — Student logs in and receives a session token (FR2 + NFR1)
**Requirement:** Registered users can log in and receive a JWT

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Go to `/login` | Login form displayed |
| 2 | Enter valid student credentials and click **Login** | Redirected to student dashboard |
| 3 | Open DevTools → Application → Cookies | `authToken` cookie is present and non-empty |

**Pass:** Login succeeds; `authToken` cookie set; dashboard is accessible.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-06 — Wrong password is rejected (FR2 + NFR1)
**Requirement:** Invalid credentials must be refused

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Go to `/login` | Login form displayed |
| 2 | Enter correct email with wrong password | Error: "Invalid email or password." |
| 3 | Check HTTP status | 401 |

**Pass:** Login fails cleanly; no token issued.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 2 — Course Browsing and Enrollment

### UAT-07 — Any visitor can browse published courses (FR4)
**Requirement:** Course browsing does not require an account

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Go to `/courses` without logging in | Published courses are listed |
| 2 | Use the subject filter | List filters to matching subject only |
| 3 | Check the database | All listed courses have `isPublished = true` |

**Pass:** Course list loads; no unpublished courses appear; no login required.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-08 — Student enrols in a published course (FR6)
**Requirement:** An authenticated student can enrol in a course

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a student | Student dashboard visible |
| 2 | Browse to `/courses` and click a published course | Course detail page shown |
| 3 | Click **Enrol** | Success message; button changes to enrolled state |
| 4 | Go to student dashboard | Enrolled course appears in "My Courses" |
| 5 | Check database | Enrollment row with `status = ACTIVE` |

**Pass:** Enrollment created using JWT identity; course appears in student's list.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-09 — Course at capacity rejects new enrollments (FR6)
**Requirement:** Students cannot enrol beyond the course capacity

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Set a course `capacity = 1` in the database; enrol one student | First enrollment succeeds |
| 2 | Try to enrol a second student in the same course | Error: "Course is full" |
| 3 | Check HTTP status | 400 |

**Pass:** Second enrollment blocked; first enrollment unaffected.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-10 — Tutor cannot enrol in a course (NFR2)
**Requirement:** Only students can enrol

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a tutor | Tutor dashboard visible |
| 2 | POST to `/api/enrollments` with a valid `courseId` | Status 403 |

**Pass:** Tutor enrollment refused.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 3 — Tutor Course Management

### UAT-11 — Tutor creates and manages a course (FR5)
**Requirement:** Authenticated tutors can create courses

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a tutor | Tutor dashboard visible |
| 2 | Go to course management and click **Create Course** | Creation form shown |
| 3 | Enter Title, Subject, Level, Price; tick **Publish** | Form accepts all input |
| 4 | Click **Create** | Success; redirected to courses page |
| 5 | Check `/api/courses/mine` | New course in the list |
| 6 | Check database | `tutorId` matches the logged-in tutor's JWT ID |

**Pass:** Course created; `tutorId` comes from the JWT, not the form body.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-12 — Student cannot create a course (NFR2)
**Requirement:** Course creation is restricted to tutors

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a student | Student session active |
| 2 | POST to `/api/courses` with a valid body | Status 403 |

**Pass:** Request refused; no course created.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-13 — Tutor updates only their own course (FR5 + NFR2)
**Requirement:** Tutors can edit their own courses; cannot edit others'

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as the owning tutor | Tutor session active |
| 2 | PATCH `/api/courses?id={id}` with `{ "title": "Updated", "subject": "Maths" }` | Status 200; title updated |
| 3 | Repeat as a **different** tutor using the same course ID | Status 403 |

**Pass:** Update succeeds for the owner; blocked for everyone else.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-14 — Course archive (safe removal) instead of hard delete (FR5 + NFR2)
**Requirement:** Archiving unpublishes the course; all data is preserved

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as the owning tutor | Session active |
| 2 | DELETE `/api/courses?id={id}` | Status 200 |
| 3 | Check the database | `isPublished = false`; row still exists with enrollments and assignments intact |
| 4 | Try DELETE as a **different** tutor | Status 403 |

**Pass:** Course is unpublished; no records deleted; cross-tutor attempt refused.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 4 — Assignments

### UAT-15 — Tutor creates an assignment (FR7)
**Requirement:** Tutors can add assignments to courses they own

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as the owning tutor | Session active |
| 2 | POST `/api/assignments` with `{ courseId, title, description, dueDate }` | Status 201; assignment created |
| 3 | Try the same POST as a **different** tutor | Status 403 |
| 4 | Try the same POST as a **student** | Status 403 |

**Pass:** Assignment created for the owner; blocked for everyone else.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-16 — Enrolled student can view assignments; unenrolled student cannot (FR7 + NFR2)
**Requirement:** Viewing assignments requires active enrollment

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as an enrolled student | Session active |
| 2 | GET `/api/assignments?courseId={id}` | Returns assignment list |
| 3 | Repeat as a student who is **not enrolled** | Status 403 |

**Pass:** Enrolled student sees the list; unenrolled student is refused.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-17 — Student only sees their own submissions in assignment detail (NFR2)
**Requirement:** Students must not see other students' submissions

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Two students submit to the same assignment | Two submission records in the database |
| 2 | Log in as Student A and GET `/api/assignments/{id}` | Only Student A's submission is in the response |
| 3 | Log in as the tutor and GET the same URL | Both submissions are in the response |

**Pass:** Data isolation confirmed; students only see their own work.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 5 — Submissions and Grading

### UAT-18 — Student submits an assignment (FR8)
**Requirement:** Enrolled students can submit work

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as an enrolled student | Session active |
| 2 | POST `/api/submissions` with `{ assignmentId, content: "My answer" }` | Status 201 |
| 3 | Check database `studentId` | Matches the JWT user ID, not anything from the request body |

**Pass:** Submission created using authenticated identity.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-19 — Student can resubmit and the old grade is cleared (FR8)
**Requirement:** A student can update their submission; previous grade is reset

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Submit once (UAT-18) and have the tutor grade it | Grade saved in database |
| 2 | POST the same `assignmentId` again with different content | Status 200; `resubmitted: true` in response |
| 3 | Check database | Content updated; `grade = null`; `feedback = null` |

**Pass:** Resubmission updates content and clears old grade.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-20 — Unenrolled student cannot submit (NFR2)
**Requirement:** Only enrolled students can submit work

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a student who is **not enrolled** in the course | Session active |
| 2 | POST to `/api/submissions` for that assignment | Status 403 |

**Pass:** Submission refused with "You must be enrolled in the course to submit."

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-21 — Tutor grades a submission (FR9 + NFR2)
**Requirement:** Tutors can grade submissions for their own courses

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as the tutor who owns the assignment's course | Session active |
| 2 | PATCH `/api/submissions/{id}/review` with `{ grade: 85, feedback: "Good work" }` | Status 200; grade saved |
| 3 | Repeat as a **different** tutor | Status 403 |
| 4 | Repeat as a **student** | Status 403 |

**Pass:** Grade saved for the course owner; blocked for others.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-22 — Grade out of range is rejected (NFR4)
**Requirement:** Server validates grade values

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | PATCH review with `{ grade: 150 }` | Status 400; error: "grade must be a number between 0 and 100" |
| 2 | PATCH review with `{ grade: -1 }` | Status 400 |

**Pass:** Invalid grades rejected before the database is touched.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 6 — Study Plans and Tasks

### UAT-23 — Student creates a study plan (FR12)
**Requirement:** Students can create personal study plans

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a student | Session active |
| 2 | Go to `/dashboard/student/study-plan/create-plan` | Form displayed; enrolled courses shown in dropdown |
| 3 | Add two tasks with titles, due dates, and course selections | Fields accept input |
| 4 | Click **Save Plan** | Success; plan appears in "View Plans" |
| 5 | Check database `studentId` | Matches the JWT user ID — NOT anything from the form body |

**Pass:** Plan created using JWT identity.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-24 — Body studentId is ignored when creating a plan (NFR2)
**Requirement:** Server always uses JWT identity, ignoring any ID in the request body

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | POST `/api/study-plans` with `{ studentId: "fake-id", tasks: [...] }` while logged in as `student-1` | Status 200 |
| 2 | Check database | Plan's `studentId = "student-1"` (the JWT ID, not `"fake-id"`) |

**Pass:** Body `studentId` is silently ignored.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-25 — Students only see their own plans (FR13 + NFR2)
**Requirement:** Students cannot read another student's plans

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as Student A | Session active |
| 2 | GET `/api/study-plans?studentId=student-B-id` | Returns only Student A's plans (query param ignored) |
| 3 | Log in as a tutor and GET `/api/study-plans` | Status 403 |

**Pass:** Query-string `studentId` ignored; tutor refused.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-26 — Student can update only their own plan (FR13 + NFR2)
**Requirement:** Students cannot edit another student's plan

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as Student A | Session active |
| 2 | PUT `/api/study-plans` with `{ planId: A's plan, tasks: [...] }` | Status 200; tasks replaced |
| 3 | PUT with `{ planId: Student B's plan, tasks: [...] }` | Status 403 |

**Pass:** Update succeeds for owner; blocked for others.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-27 — Tutor can edit a plan only when they share a course with the student (FR13 + NFR2)
**Requirement:** Tutors cannot freely edit any student's plan — only when they teach a course the student is enrolled in

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a tutor who teaches a course the student is enrolled in | Tutor session active |
| 2 | PUT `/api/study-plans` targeting that student's plan | Status 200 |
| 3 | Log in as a **different** tutor who shares no courses with the student | Tutor session active |
| 4 | PUT the same plan | Status 403 |

**Pass:** Shared-course tutor can edit; unrelated tutor cannot.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-28 — Student can toggle a task complete/incomplete (FR14 + NFR2)
**Requirement:** Students can mark tasks done or undo them; only for their own tasks

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as the student who owns a study plan | Session active |
| 2 | PATCH `/api/tasks/{taskId}` with `{ completed: true }` | Status 200; task marked complete |
| 3 | PATCH again with `{ completed: false }` | Status 200; task marked incomplete |
| 4 | Try the same PATCH while logged in as a **different** student | Status 403 |
| 5 | Try as a **tutor** | Status 403 |

**Pass:** Toggle works for the owner; refused for others; only boolean values accepted.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-29 — Non-boolean task toggle value is rejected (NFR4)
**Requirement:** The completed field must be exactly true or false

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | PATCH `/api/tasks/{id}` with `{ completed: "yes" }` | Status 400; error: "completed must be a boolean" |
| 2 | PATCH with `{ completed: 1 }` | Status 400 |

**Pass:** String and number values are rejected before the database is touched.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 7 — Messaging

### UAT-30 — User opens and uses a direct message conversation (FR10 + FR11 + NFR1)
**Requirement:** Authenticated users can send direct messages to each other

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as any user | Session active |
| 2 | Go to the Messages page and search for another user | User appears in the search results |
| 3 | Open a conversation and type a message | Message sent; appears in the thread |
| 4 | Log in as the recipient and open the conversation | Message is visible; `isRead` is updated to `true` |

**Pass:** Message stored; both users can see it; read status updated on open.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-31 — Cannot message yourself (NFR4)
**Requirement:** Self-messaging is blocked

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | POST `/api/messages` with `receiverId` equal to your own user ID | Status 400; error: "Cannot message yourself" |
| 2 | GET `/api/messages?with={your-own-id}` | Status 400 |

**Pass:** Both endpoints refuse self-messages.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-32 — Unauthenticated access to messages is blocked (NFR1)
**Requirement:** Messages require a valid session

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | GET `/api/messages` with no token | Status 401 |
| 2 | POST `/api/messages` with no token | Status 401 |

**Pass:** Both endpoints return 401 without a token.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 8 — Tutor Recommendations

### UAT-33 — Student receives tutor recommendations (FR15 + NFR1)
**Requirement:** Authenticated students get personalised tutor recommendations from the Python service

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Start the recommendation service: `uvicorn main:app` in `recommendation-service/` | Service running on port 8000 |
| 2 | Log in as a student who is enrolled in at least one course | Session active |
| 3 | Open the student dashboard — Recommended Tutors section | Tutor cards are displayed |
| 4 | GET `/api/recommendations` with no token | Status 401 |

**Pass:** Recommendations shown for authenticated students; 401 for unauthenticated requests.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-34 — Graceful handling when recommendation service is offline (FR15 / NFR8)
**Requirement:** App does not crash if the Python service is unavailable

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Stop the recommendation service | Service is offline |
| 2 | Log in as a student and view the dashboard | A friendly error or empty state is shown — no crash |
| 3 | Check the API response | Status 503 with error message "Recommendation service unavailable" |

**Pass:** 503 returned; app remains usable.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 9 — Security and Cross-cutting Checks

### UAT-35 — All protected routes require authentication (NFR1)
**Requirement:** Every non-public endpoint returns 401 with no token

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Call each endpoint below with no Authorization header and no cookie: `POST /api/courses`, `GET /api/study-plans`, `POST /api/study-plans`, `PATCH /api/tasks/1`, `POST /api/submissions`, `PATCH /api/submissions/1/review`, `GET /api/assignments?courseId=1`, `GET /api/messages`, `POST /api/messages` | All return 401 |

**Pass:** Every protected endpoint returns 401 without a valid token.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-36 — Role enforcement across all routes (NFR2)
**Requirement:** Actions restricted by role return 403 for the wrong role

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Student: POST `/api/courses` | 403 |
| 2 | Student: POST `/api/assignments` | 403 |
| 3 | Student: PATCH `/api/submissions/{id}/review` | 403 |
| 4 | Tutor: POST `/api/enrollments` | 403 |
| 5 | Tutor: GET `/api/study-plans` | 403 |

**Pass:** All five role violations return 403.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-37 — Identity cannot be injected via request body (NFR2)
**Requirement:** Server always uses JWT identity; body identity fields are ignored

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | POST `/api/courses` with body `{ tutorId: "attacker-id", title: "T", subject: "S" }` while logged in as `tutor-1` | Course created with `tutorId = "tutor-1"` in DB |
| 2 | POST `/api/study-plans` with body `{ studentId: "attacker-id", tasks: [...] }` while logged in as `student-1` | Plan created with `studentId = "student-1"` in DB |
| 3 | POST `/api/enrollments` with body `{ studentId: "attacker-id", courseId: 1 }` while logged in as `student-1` | Enrollment created with `studentId = "student-1"` in DB |

**Pass:** Body identity fields ignored in all three cases.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-38 — Input validation is consistent and returns clear errors (NFR4)
**Requirement:** All endpoints validate input and return specific, readable error messages

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | POST course with empty title | 400: "title is required" |
| 2 | POST study plan with no tasks | 400: "tasks must be a non-empty array" |
| 3 | POST message with content over 8000 characters | 400: "content must be 8000 characters or fewer" |
| 4 | POST submission with only spaces as content | 400: "content is required" |
| 5 | PATCH review with `grade: 999` | 400: "grade must be a number between 0 and 100" |
| 6 | PATCH task with `completed: "yes"` | 400: "completed must be a boolean" |

**Pass:** Each invalid input returns HTTP 400 with the exact message listed above.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Section 10 — Additional Acceptance Scenarios

### UAT-39 — Role-based dashboard routing after login (FR3)
**Requirement:** After login, each role lands on its own dashboard

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as a student | Redirected to `/dashboard/student` |
| 2 | Log in as a tutor | Redirected to `/dashboard/tutor` |
| 3 | Log in as an admin | Redirected to `/dashboard/admin` |
| 4 | Access `/dashboard/tutor` while logged in as a student | Redirected away or 403 |

**Pass:** Each role lands on the correct dashboard; cross-role access is blocked.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-40 — Logout clears the session cookie and blocks further access (FR16)
**Requirement:** After logging out, protected pages are inaccessible

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as any user | Session active; `authToken` cookie present |
| 2 | Click **Logout** | Redirected to `/login`; `authToken` cookie is cleared |
| 3 | Try to navigate to `/dashboard/student` directly | Redirected to `/login` |
| 4 | Try to call `GET /api/study-plans` with the old token | Status 401 |

**Pass:** Cookie cleared on logout; old token rejected; protected routes inaccessible.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-41 — Admin workspace access (FR17)
**Requirement:** An admin user can authenticate and access role-neutral endpoints

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Log in as an admin account | Session active; `authToken` cookie set with `role = ADMIN` |
| 2 | GET `/api/messages` with the admin token | Status 200 (messaging is role-neutral) |
| 3 | POST `/api/enrollments` as admin | Status 403 (enrollment is student-only) |
| 4 | POST `/api/courses` as admin | Status 403 (course creation is tutor-only) |

**Pass:** Admin token accepted by role-neutral endpoints; blocked by role-restricted ones.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-42 — Archived course is not visible in public course browse (FR5 + soft delete)
**Requirement:** A course with `isPublished=false` must not appear in the public listing

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | Ensure a course exists with `isPublished = true` | Course appears at `GET /api/courses` |
| 2 | Archive the course: DELETE `/api/courses?id={id}` as the owning tutor | Status 200 |
| 3 | Check the database | Row still exists; `isPublished = false` |
| 4 | GET `/api/courses` (public, no login) | Archived course is **not** in the list |
| 5 | Try to enroll in the archived course | Status 404 ("Course not found") |

**Pass:** Archived course disappears from public browse; enrolment is refused; data is preserved.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

### UAT-43 — Grade boundary values 0 and 100 are accepted (NFR4)
**Requirement:** The grade range is inclusive: 0 and 100 are both valid

| Step | What to do | What you should see |
|------|-----------|---------------------|
| 1 | PATCH `/api/submissions/{id}/review` with `{ grade: 0 }` as the owning tutor | Status 200; `grade = 0` saved in the database |
| 2 | PATCH the same endpoint with `{ grade: 100 }` | Status 200; `grade = 100` saved |
| 3 | PATCH with `{ grade: -1 }` | Status 400: "grade must be a number between 0 and 100" |
| 4 | PATCH with `{ grade: 101 }` | Status 400 |

**Pass:** Grades 0 and 100 are accepted; -1 and 101 are rejected before touching the database.

**Result:** ☐ Pass  ☐ Fail  ☐ Blocked  &nbsp;&nbsp; **Tester:** _______________  **Date:** ___________

---

## Sign-off Table

| ID | Workflow | FR / NFR | Result | Tester | Date | Notes |
|----|---------|----------|--------|--------|------|-------|
| UAT-01 | Student registers successfully | FR1 | | | | |
| UAT-02 | Tutor registers successfully | FR1 | | | | |
| UAT-03 | Duplicate email rejected | FR1, NFR4 | | | | |
| UAT-04 | Invalid registration inputs rejected | NFR4 | | | | |
| UAT-05 | Student logs in and receives session token | FR2, NFR1 | | | | |
| UAT-06 | Wrong password rejected | FR2, NFR1 | | | | |
| UAT-07 | Any visitor can browse published courses | FR4 | | | | |
| UAT-08 | Student enrols in a published course | FR6 | | | | |
| UAT-09 | Course at capacity rejects new enrollments | FR6 | | | | |
| UAT-10 | Tutor cannot enrol in a course | NFR2 | | | | |
| UAT-11 | Tutor creates and manages a course | FR5 | | | | |
| UAT-12 | Student cannot create a course | NFR2 | | | | |
| UAT-13 | Tutor updates only their own course | FR5, NFR2 | | | | |
| UAT-14 | Course archive instead of hard delete | FR5, NFR2 | | | | |
| UAT-15 | Tutor creates an assignment | FR7 | | | | |
| UAT-16 | Enrolled student can view assignments | FR7, NFR2 | | | | |
| UAT-17 | Student only sees their own submissions | NFR2 | | | | |
| UAT-18 | Student submits an assignment | FR8 | | | | |
| UAT-19 | Student can resubmit and old grade is cleared | FR8 | | | | |
| UAT-20 | Unenrolled student cannot submit | NFR2 | | | | |
| UAT-21 | Tutor grades a submission | FR9, NFR2 | | | | |
| UAT-22 | Grade out of range rejected | NFR4 | | | | |
| UAT-23 | Student creates a study plan | FR12 | | | | |
| UAT-24 | Body studentId is ignored | NFR2 | | | | |
| UAT-25 | Students only see their own plans | FR13, NFR2 | | | | |
| UAT-26 | Student can update only their own plan | FR13, NFR2 | | | | |
| UAT-27 | Tutor can edit plan only with shared course | FR13, NFR2 | | | | |
| UAT-28 | Student can toggle task complete/incomplete | FR14, NFR2 | | | | |
| UAT-29 | Non-boolean task toggle value rejected | NFR4 | | | | |
| UAT-30 | User opens and uses direct message conversation | FR10, FR11, NFR1 | | | | |
| UAT-31 | Cannot message yourself | NFR4 | | | | |
| UAT-32 | Unauthenticated access to messages blocked | NFR1 | | | | |
| UAT-33 | Student receives tutor recommendations | FR15, NFR1 | | | | |
| UAT-34 | Graceful handling when recommendation service offline | FR15, NFR8 | | | | |
| UAT-35 | All protected routes require authentication | NFR1 | | | | |
| UAT-36 | Role enforcement across all routes | NFR2 | | | | |
| UAT-37 | Identity cannot be injected via request body | NFR2 | | | | |
| UAT-38 | Input validation is consistent | NFR4 | | | | |
| UAT-39 | Role-based dashboard routing after login | FR3 | | | | |
| UAT-40 | Logout clears session and blocks further access | FR16 | | | | |
| UAT-41 | Admin workspace access | FR17 | | | | |
| UAT-42 | Archived course not visible in public browse | FR5 | | | | |
| UAT-43 | Grade boundary values 0 and 100 accepted | NFR4 | | | | |

---

**Overall sign-off**

| Approved by | Role | Date | Signature |
|-------------|------|------|-----------|
| | | | |
