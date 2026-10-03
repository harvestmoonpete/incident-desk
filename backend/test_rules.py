import unittest
from rules import diagnose, validate_findings


def e(id, value):
    return dict(id=id, kind="test", summary=id, value=value)


class RulesTests(unittest.TestCase):
    def test_scenarios(self):
        for signals, expected in [
            ([e("deploy-1", 1), e("http-1", 8)], "Deployment regression"),
            ([e("pool-1", 4), e("http-1", 8)], "Database connection exhaustion"),
            ([e("queue-1", 20), e("worker-1", 1)], "Worker throughput deficit"),
        ]:
            result = diagnose(signals)
            self.assertEqual(result["hypotheses"][0]["title"], expected)
            validate_findings(result, signals)

    def test_missing(self):
        self.assertEqual(diagnose([])["hypotheses"][0]["confidence"], "low")

    def test_misleading(self):
        self.assertEqual(
            diagnose([e("deploy-1", 1), e("http-1", 0)])["hypotheses"][0]["title"],
            "Insufficient evidence",
        )

    def test_unknown_reference(self):
        r = diagnose([e("deploy-1", 1), e("http-1", 8)])
        with self.assertRaises(ValueError):
            validate_findings(r, [])

    def test_malformed(self):
        with self.assertRaises(ValueError):
            validate_findings({"hypotheses": []}, [])

    def test_unsupported_confidence(self):
        r = diagnose([])
        r["hypotheses"][0]["confidence"] = "high"
        with self.assertRaises(ValueError):
            validate_findings(r, [])


if __name__ == "__main__":
    unittest.main()
