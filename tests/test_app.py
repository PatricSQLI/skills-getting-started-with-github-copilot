from fastapi.testclient import TestClient
from src.app import app, activities


client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # some known activity from the in-memory fixture
    assert "Chess Club" in data


def test_signup_and_unregister():
    activity = "Chess Club"
    email = "pytest-user@example.com"

    # Ensure clean start
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Sign up
    resp = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")
    assert email in activities[activity]["participants"]

    # Unregister
    resp = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert resp.status_code == 200
    body = resp.json()
    assert "Unregistered" in body.get("message", "")
    assert email not in activities[activity]["participants"]
