# recommendation-service/test_main.py
# Unit tests for the TutorHub recommendation service
# Uses pytest + unittest.mock so no real database is needed
# Run with: pytest test_main.py -v
# NFR13 (testability) — covers the main recommendation logic paths

import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

# Patch the DB connection before importing the app so the module loads cleanly
with patch("psycopg2.connect") as mock_connect:
    from main import app

client = TestClient(app)


# ── Health and root ───────────────────────────────────────────────────────────

def test_root_returns_running_message():
    """FR15 / sanity check — service is alive"""
    response = client.get("/")
    assert response.status_code == 200
    assert "running" in response.json()["message"].lower()


def test_health_check_success():
    """FR15 — health endpoint reports healthy when DB connects"""
    with patch("main.get_db_connection") as mock_conn:
        mock_conn.return_value = MagicMock()
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_health_check_failure_returns_500():
    """NFR — health endpoint reports unhealthy when DB is down"""
    with patch("main.get_db_connection", side_effect=Exception("DB unreachable")):
        response = client.get("/health")
    assert response.status_code == 500


# ── /recommendations/{student_id} ────────────────────────────────────────────

def _make_cursor(rows: list, fetchone_row=None):
    """Helper: creates a mock cursor that returns controlled query results."""
    cursor = MagicMock()
    cursor.fetchone.return_value = fetchone_row
    cursor.fetchall.return_value = rows
    return cursor


def test_recommendations_student_not_found_returns_404():
    """FR15 — unknown student ID returns 404"""
    with patch("main.get_db_connection") as mock_conn:
        cursor = _make_cursor([], fetchone_row=None)  # student lookup returns None
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/recommendations/nonexistent-student")

    assert response.status_code == 404


def test_recommendations_no_enrollments_returns_empty_list():
    """FR15 — student exists but has no enrollments: returns empty recommendations"""
    with patch("main.get_db_connection") as mock_conn:
        cursor = MagicMock()
        # First call: student lookup succeeds
        cursor.fetchone.return_value = {"id": "s1", "fullName": "Alice"}
        # Second call: enrollment lookup returns empty
        cursor.fetchall.return_value = []
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/recommendations/s1")

    assert response.status_code == 200
    body = response.json()
    assert body["recommendations"] == []
    assert "message" in body  # should explain why there are none


def test_recommendations_returns_tutors_for_enrolled_subjects():
    """FR15 — student enrolled in Maths gets Maths tutors they aren't already with"""
    enrollment_rows = [{"subject": "Maths", "courseId": 10}]
    tutor_rows = [
        {
            "tutorId": "t1",
            "tutorName": "Bob Tutor",
            "tutorEmail": "bob@tutor.com",
            "courseId": 20,
            "courseTitle": "Advanced Maths",
            "courseSubject": "Maths",
            "courseDescription": "Hard maths",
            "courseLevel": "Advanced",
            "coursePrice": 50.0,
            "averageRating": 4.8,
            "totalStudents": 12,
        }
    ]

    with patch("main.get_db_connection") as mock_conn:
        cursor = MagicMock()
        student_row = {"id": "s1", "fullName": "Alice"}
        # fetchone for student check
        cursor.fetchone.return_value = student_row
        # fetchall: first call = enrollments, second call = tutor recommendations
        cursor.fetchall.side_effect = [enrollment_rows, tutor_rows]
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/recommendations/s1")

    assert response.status_code == 200
    body = response.json()
    assert body["totalRecommendations"] == 1
    assert body["recommendations"][0]["tutorName"] == "Bob Tutor"
    assert body["recommendations"][0]["courseSubject"] == "Maths"


def test_recommendations_db_error_returns_500():
    """NFR — unexpected DB error is caught and returns 500, not a crash"""
    with patch("main.get_db_connection", side_effect=Exception("connection reset")):
        response = client.get("/recommendations/s1")
    assert response.status_code == 500


# ── /tutors ───────────────────────────────────────────────────────────────────

def test_get_all_tutors_returns_list():
    """FR15 — fallback tutor list returns all tutors"""
    tutor_rows = [
        {
            "tutorId": "t1",
            "tutorName": "Bob Tutor",
            "tutorEmail": "bob@tutor.com",
            "totalCourses": 3,
            "averageRating": 4.5,
        }
    ]
    with patch("main.get_db_connection") as mock_conn:
        cursor = _make_cursor(tutor_rows)
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/tutors")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["tutors"][0]["tutorName"] == "Bob Tutor"


def test_get_all_tutors_db_error_returns_500():
    """NFR — DB failure on tutor list returns 500"""
    with patch("main.get_db_connection", side_effect=Exception("timeout")):
        response = client.get("/tutors")
    assert response.status_code == 500


# ── /students/{student_id}/courses ───────────────────────────────────────────

def test_get_student_courses_student_not_found():
    """FR15 — unknown student returns 404 from course endpoint"""
    with patch("main.get_db_connection") as mock_conn:
        cursor = _make_cursor([], fetchone_row=None)
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/students/bad-id/courses")

    assert response.status_code == 404


def test_get_student_courses_returns_enrolled_courses():
    """FR15 — enrolled student sees their courses"""
    course_rows = [
        {
            "courseId": 10,
            "courseTitle": "Maths 101",
            "courseSubject": "Maths",
            "courseDescription": "Intro",
            "courseLevel": "Beginner",
            "averageRating": 4.2,
            "tutorName": "Bob",
            "enrollmentStatus": "ACTIVE",
            "enrolledAt": "2026-01-01 10:00:00",
        }
    ]
    with patch("main.get_db_connection") as mock_conn:
        cursor = MagicMock()
        cursor.fetchone.return_value = {"id": "s1", "fullName": "Alice"}
        cursor.fetchall.return_value = course_rows
        conn = MagicMock()
        conn.cursor.return_value = cursor
        mock_conn.return_value = conn

        response = client.get("/students/s1/courses")

    assert response.status_code == 200
    body = response.json()
    assert body["totalCourses"] == 1
    assert body["courses"][0]["courseTitle"] == "Maths 101"
