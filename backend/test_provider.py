import os
import unittest
from unittest.mock import patch
import httpx
from fastapi import HTTPException
from main import model_findings
from rules import diagnose


class ProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_configuration(self):
        with patch.dict(os.environ, {"MODEL_API_KEY": ""}):
            with self.assertRaises(HTTPException) as raised:
                await model_findings([])
            self.assertEqual(raised.exception.status_code, 503)

    async def test_provider_errors_and_invalid_json(self):
        cases = [
            (500, {"error": "down"}),
            (200, {"choices": [{"message": {"content": "not json"}}]}),
        ]
        raw = diagnose([])
        raw["hypotheses"][0]["evidence_ids"] = ["invented-id"]
        import json

        cases.append((200, {"choices": [{"message": {"content": json.dumps(raw)}}]}))
        for status, body in cases:
            transport = httpx.MockTransport(
                lambda request: httpx.Response(status, json=body)
            )
            real_client = httpx.AsyncClient
            with (
                patch.dict(os.environ, {"MODEL_API_KEY": "test-only"}),
                patch(
                    "main.httpx.AsyncClient",
                    side_effect=lambda **kwargs: real_client(
                        transport=transport, **kwargs
                    ),
                ),
            ):
                with self.assertRaises(HTTPException) as raised:
                    await model_findings([])
                self.assertEqual(raised.exception.status_code, 502)
                self.assertIn("No substitute", raised.exception.detail)


if __name__ == "__main__":
    unittest.main()
