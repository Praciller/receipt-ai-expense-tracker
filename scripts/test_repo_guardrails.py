import unittest

from check_repo_guardrails import find_violations


class GuardrailTests(unittest.TestCase):
    def test_rejects_private_receipts_secrets_databases_and_unsafe_claims(self):
        files = {
            "test-slip/private.jpg": b"",
            ".env": b"GEMINI_API_KEY=secret",
            "data/local.sqlite": b"",
            "README.md": b"tax " + b"compliant",
        }

        violations = find_violations(files)

        self.assertEqual(len(violations), 4)

    def test_allows_synthetic_fixture_screenshots_and_empty_example_keys(self):
        files = {
            "fixtures/synthetic-receipt.json": b'{"synthetic": true}',
            "docs/screenshots/dashboard.png": b"",
            ".env.example": b"GEMINI_API_KEY=",
        }

        self.assertEqual(find_violations(files), [])


if __name__ == "__main__":
    unittest.main()
