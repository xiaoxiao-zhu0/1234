import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PublicContractTest(unittest.TestCase):
    def test_mock_contract_is_safe_and_conserved(self):
        payload = json.loads((ROOT / "data_contract" / "public_result.mock.json").read_text(encoding="utf-8"))
        self.assertEqual(payload["contract_version"], "1.0")
        self.assertEqual(payload["evidence_status"], "simulation_only")
        self.assertEqual(payload["budget"]["total"], payload["budget"]["allocated_sum"])
        ids = [item["location_id"] for item in payload["locations"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_github_public_result_is_prediction_backed(self):
        payload = json.loads((ROOT / "data_contract" / "public_result.json").read_text(encoding="utf-8"))
        self.assertEqual(payload["contract_version"], "1.0")
        self.assertEqual(payload["evidence_status"], "prediction_backed")
        self.assertEqual(payload["primary_method"], "三层因果语义回放")
        self.assertEqual(payload["budget"]["total"], payload["budget"]["allocated_sum"])
        self.assertEqual(payload["budget"]["total"], 600)
        self.assertTrue(payload["quality"]["recommended_for_bp"])
        ids = [item["location_id"] for item in payload["locations"]]
        self.assertEqual(len(ids), len(set(ids)))

    def test_shared_tree_has_no_private_directories(self):
        forbidden = {"rbcl", "results", "server_results", "tmp", "output"}
        self.assertTrue(forbidden.isdisjoint({path.name for path in ROOT.iterdir()}))

    def test_runtime_files_have_no_private_runtime_markers(self):
        forbidden = ("teacher-server", "causal_er_ace.py", "state_dict(", "torch.load(", "checkpoint_path")
        runtime_suffixes = {".js", ".html", ".json", ".css"}
        for path in ROOT.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in runtime_suffixes:
                continue
            text = path.read_text(encoding="utf-8")
            for marker in forbidden:
                self.assertNotIn(marker, text, f"private runtime marker {marker!r} found in {path}")


if __name__ == "__main__":
    unittest.main()
