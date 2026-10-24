import unittest
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from api.main import app, UPSTREAM, SESSION_COOKIE


class BridgeTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app, base_url="https://second-look.ninoo.app")

    def test_mutation_requires_same_origin_json(self):
        for headers in [{}, {"Origin": "https://evil.test"}]:
            self.assertEqual(self.client.post("/api/session/login", json={}, headers=headers).status_code, 403)
        self.assertEqual(self.client.post("/api/session/login", content="{}", headers={"Origin": "https://second-look.ninoo.app"}).status_code, 403)
        self.assertEqual(self.client.get("/api/not-an-app-endpoint").status_code, 404)

    def test_forwarding_keeps_auth_but_not_unrelated_cookies_or_role_headers(self):
        seen = []
        token = "a" * 64
        def upstream(request):
            seen.append(request)
            return httpx.Response(200, json={"authenticated": True}, headers={"Set-Cookie": f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; Secure; SameSite=Strict"})
        real_client = httpx.AsyncClient
        with patch("api.main.httpx.AsyncClient", side_effect=lambda **kw: real_client(transport=httpx.MockTransport(upstream), **kw)):
            response = self.client.post("/api/session/role", json={"role": "gp"}, headers={"Origin": "https://second-look.ninoo.app", "Cookie": f"{SESSION_COOKIE}={token}; unrelated_private_cookie=secret", "x-demo-role": "buyer"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(seen[0].url), UPSTREAM + "/api/session/role")
        self.assertEqual(seen[0].headers["origin"], UPSTREAM)
        self.assertEqual(seen[0].headers["cookie"], f"{SESSION_COOKIE}={token}")
        self.assertNotIn("x-demo-role", seen[0].headers)
        self.assertIn("HttpOnly; Secure; SameSite=Strict", response.headers["set-cookie"])

    def test_errors_preserve_state_and_large_bodies_are_rejected(self):
        def fail(request):
            raise httpx.ConnectError("test failure")
        real_client = httpx.AsyncClient
        with patch("api.main.httpx.AsyncClient", side_effect=lambda **kw: real_client(transport=httpx.MockTransport(fail), **kw)):
            self.assertEqual(self.client.get("/api/health").status_code, 502)
        response = self.client.post("/api/session/login", content=b"x" * 21000, headers={"Origin": "https://second-look.ninoo.app", "Content-Type": "application/json"})
        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()
