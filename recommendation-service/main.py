from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="TutorHub Recommendation Service",
    description="Recommends tutors to students based on their enrolled courses",
    version="1.0.0"
)

# Allow Next.js to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----------------------------
# Database Connection
# ----------------------------

def get_db_connection():
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        return conn
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")


# ----------------------------
# Health Check
# ----------------------------

@app.get("/")
def root():
    return {"message": "TutorHub Recommendation Service is running"}


@app.get("/health")
def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Service unhealthy: {str(e)}")


# ----------------------------
# Recommendations
# ----------------------------

@app.get("/recommendations/{student_id}")
def get_recommendations(student_id: str):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Step 1: Verify the student exists
        cursor.execute("""
            SELECT id, "fullName", email
            FROM "User"
            WHERE id = %s AND role = 'STUDENT'
        """, (student_id,))
        student = cursor.fetchone()

        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")

        # Step 2: Get active enrollments and their subjects
        cursor.execute("""
            SELECT DISTINCT c.subject, e."courseId", c."tutorId"
            FROM "Enrollment" e
            JOIN "Course" c ON c.id = e."courseId"
            WHERE e."studentId" = %s
              AND e.status = 'ACTIVE'
        """, (student_id,))
        enrollments = cursor.fetchall()

        if not enrollments:
            return {
                "studentId": student_id,
                "studentName": student["fullName"],
                "recommendations": [],
                "message": "No enrollments found. Enroll in a course to get tutor recommendations."
            }

        enrolled_course_ids = [row["courseId"] for row in enrollments]
        enrolled_subjects = list(set([row["subject"] for row in enrollments]))
        enrolled_tutor_ids = list(set([row["tutorId"] for row in enrollments]))

        def fetch_recommendation_rows(restrict_subjects: bool, exclude_seen_tutors: bool):
            clauses = [
                "c.\"isPublished\" = true",
                "u.role = 'TUTOR'",
            ]
            params = []

            if restrict_subjects and enrolled_subjects:
                clauses.append("c.subject = ANY(%s)")
                params.append(enrolled_subjects)

            if enrolled_course_ids:
                clauses.append("c.id != ALL(%s)")
                params.append(enrolled_course_ids)

            if exclude_seen_tutors and enrolled_tutor_ids:
                clauses.append("u.id != ALL(%s)")
                params.append(enrolled_tutor_ids)

            where_sql = " AND ".join(clauses)

            query = f"""
                SELECT
                    u.id AS "tutorId",
                    u."fullName" AS "tutorName",
                    u.email AS "tutorEmail",
                    c.id AS "courseId",
                    c.title AS "courseTitle",
                    c.subject AS "courseSubject",
                    c.description AS "courseDescription",
                    c.level AS "courseLevel",
                    c.price AS "coursePrice",
                    c."averageRating" AS "averageRating",
                    COUNT(e2.id) AS "totalStudents"
                FROM "User" u
                JOIN "Course" c ON c."tutorId" = u.id
                LEFT JOIN "Enrollment" e2
                       ON e2."courseId" = c.id
                      AND e2.status = 'ACTIVE'
                WHERE {where_sql}
                GROUP BY u.id, u."fullName", u.email, c.id, c.title, c.subject,
                         c.description, c.level, c.price, c."averageRating"
                ORDER BY c."averageRating" DESC NULLS LAST, "totalStudents" DESC, c.id DESC
                LIMIT 12
            """
            cursor.execute(query, tuple(params))
            return cursor.fetchall()

        # Tiered strategy:
        # 1) Same subjects, new tutors
        # 2) Same subjects, any tutor
        # 3) Global published courses not yet enrolled
        rows = fetch_recommendation_rows(restrict_subjects=True, exclude_seen_tutors=True)
        strategy = "same_subject_new_tutor"

        if not rows:
            rows = fetch_recommendation_rows(restrict_subjects=True, exclude_seen_tutors=False)
            strategy = "same_subject_any_tutor"

        if not rows:
            rows = fetch_recommendation_rows(restrict_subjects=False, exclude_seen_tutors=False)
            strategy = "global_published"

        recommendations = [
            {
                "tutorId": row["tutorId"],
                "tutorName": row["tutorName"],
                "tutorEmail": row["tutorEmail"],
                "courseId": row["courseId"],
                "courseTitle": row["courseTitle"],
                "courseSubject": row["courseSubject"],
                "courseDescription": row["courseDescription"],
                "courseLevel": row["courseLevel"],
                "coursePrice": row["coursePrice"],
                "averageRating": row["averageRating"],
                "totalStudents": row["totalStudents"],
            }
            for row in rows
        ]

        response = {
            "studentId": student_id,
            "studentName": student["fullName"],
            "enrolledCourseCount": len(enrolled_course_ids),
            "recommendations": recommendations,
            "totalRecommendations": len(recommendations),
            "strategy": strategy,
        }

        if len(recommendations) == 0:
            response["message"] = "No additional published courses are available right now."

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ----------------------------
# All Tutors (fallback)
# ----------------------------

@app.get("/tutors")
def get_all_tutors():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT 
                u.id AS "tutorId",
                u."fullName" AS "tutorName",
                u.email AS "tutorEmail",
                COUNT(c.id) AS "totalCourses",
                COALESCE(AVG(c."averageRating"), 0) AS "averageRating"
            FROM "User" u
            LEFT JOIN "Course" c ON c."tutorId" = u.id AND c."isPublished" = true
            WHERE u.role = 'TUTOR'
            GROUP BY u.id, u."fullName", u.email
            ORDER BY "averageRating" DESC, "totalCourses" DESC
        """)

        rows = cursor.fetchall()

        tutors = [
            {
                "tutorId": row["tutorId"],
                "tutorName": row["tutorName"],
                "tutorEmail": row["tutorEmail"],
                "totalCourses": row["totalCourses"],
                "averageRating": round(float(row["averageRating"]), 2),
            }
            for row in rows
        ]

        cursor.close()
        conn.close()

        return {"tutors": tutors, "total": len(tutors)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


# ----------------------------
# Student's Enrolled Courses
# ----------------------------

@app.get("/students/{student_id}/courses")
def get_student_courses(student_id: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cursor.execute("""
            SELECT id, "fullName" FROM "User" WHERE id = %s AND role = 'STUDENT'
        """, (student_id,))
        student = cursor.fetchone()

        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")

        cursor.execute("""
            SELECT 
                c.id AS "courseId",
                c.title AS "courseTitle",
                c.subject AS "courseSubject",
                c.description AS "courseDescription",
                c.level AS "courseLevel",
                c."averageRating" AS "averageRating",
                u."fullName" AS "tutorName",
                e.status AS "enrollmentStatus",
                e."enrolledAt" AS "enrolledAt"
            FROM "Enrollment" e
            JOIN "Course" c ON c.id = e."courseId"
            JOIN "User" u ON u.id = c."tutorId"
            WHERE e."studentId" = %s
            ORDER BY e."enrolledAt" DESC
        """, (student_id,))

        rows = cursor.fetchall()

        courses = [
            {
                "courseId": row["courseId"],
                "courseTitle": row["courseTitle"],
                "courseSubject": row["courseSubject"],
                "courseDescription": row["courseDescription"],
                "courseLevel": row["courseLevel"],
                "averageRating": row["averageRating"],
                "tutorName": row["tutorName"],
                "enrollmentStatus": row["enrollmentStatus"],
                "enrolledAt": str(row["enrolledAt"]),
            }
            for row in rows
        ]

        cursor.close()
        conn.close()

        return {
            "studentId": student_id,
            "studentName": student["fullName"],
            "courses": courses,
            "totalCourses": len(courses)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
