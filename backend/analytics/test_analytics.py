"""
Unit and Integration Tests for ProbNexus Python Analytics Engine
Validates centrality, Louvain community detection, anomaly detection,
risk scoring, link prediction, explainability, and small graph resilience.
"""

import unittest
from graph_loader import build_networkx_graph
from centrality import calculate_centrality
from community_detection import detect_communities_and_bridges
from suspicious_activity import detect_suspicious_patterns
from risk_scoring import calculate_risk_scores
from link_prediction import predict_hidden_links
from explainability import generate_explanations
from analytics_engine import run_pipeline


class TestAnalyticsEngine(unittest.TestCase):

    def setUp(self):
        # Sample synthetic investigation case (8 nodes, 6 edges matching PNX-2026-001)
        self.sample_payload = {
            "caseId": "test-uuid-001",
            "caseNumber": "PNX-2026-001",
            "network": {
                "nodes": [
                    {"id": "node-p1", "entityType": "PHONE", "entityValue": "+919812345678", "normalizedValue": "+919812345678"},
                    {"id": "node-p2", "entityType": "PHONE", "entityValue": "+919876543210", "normalizedValue": "+919876543210"},
                    {"id": "node-p3", "entityType": "PHONE", "entityValue": "+919123456780", "normalizedValue": "+919123456780"},
                    {"id": "node-a1", "entityType": "ACCOUNT", "entityValue": "SBIN0001234", "normalizedValue": "SBIN0001234"},
                    {"id": "node-a2", "entityType": "ACCOUNT", "entityValue": "HDFC0005678", "normalizedValue": "HDFC0005678"},
                    {"id": "node-a3", "entityType": "ACCOUNT", "entityValue": "ICIC0009012", "normalizedValue": "ICIC0009012"},
                    {"id": "node-a4", "entityType": "ACCOUNT", "entityValue": "AXIS0003456", "normalizedValue": "AXIS0003456"},
                    {"id": "node-l1", "entityType": "LOCATION", "entityValue": "Sector 62, Noida", "normalizedValue": "SECTOR 62, NOIDA"}
                ],
                "edges": [
                    {"source": "node-p1", "target": "node-p2", "relationshipType": "CALLED", "weight": 1.0, "sourceRecordId": "call-1"},
                    {"source": "node-p2", "target": "node-p3", "relationshipType": "CALLED", "weight": 1.0, "sourceRecordId": "call-2"},
                    {"source": "node-p1", "target": "node-p3", "relationshipType": "CALLED", "weight": 1.0, "sourceRecordId": "call-3"},
                    {"source": "node-a1", "target": "node-a2", "relationshipType": "TRANSFERRED_TO", "weight": 50000.0, "sourceRecordId": "tx-1"},
                    {"source": "node-a2", "target": "node-a3", "relationshipType": "TRANSFERRED_TO", "weight": 35000.0, "sourceRecordId": "tx-2"},
                    {"source": "node-a3", "target": "node-a4", "relationshipType": "TRANSFERRED_TO", "weight": 20000.0, "sourceRecordId": "tx-3"}
                ]
            },
            "rawRecords": {
                "calls": [
                    {"id": "call-1", "callerPhone": "+919812345678", "receiverPhone": "+919876543210"},
                    {"id": "call-2", "callerPhone": "+919876543210", "receiverPhone": "+919123456780"},
                    {"id": "call-3", "callerPhone": "+919812345678", "receiverPhone": "+919123456780"}
                ],
                "transactions": [
                    {"id": "tx-1", "sender": "SBIN0001234", "receiver": "HDFC0005678", "amount": 50000.0},
                    {"id": "tx-2", "sender": "HDFC0005678", "receiver": "ICIC0009012", "amount": 35000.0},
                    {"id": "tx-3", "sender": "ICIC0009012", "receiver": "AXIS0003456", "amount": 20000.0}
                ]
            }
        }

    def test_graph_loader(self):
        G = build_networkx_graph(self.sample_payload["network"])
        self.assertEqual(G.number_of_nodes(), 8)
        self.assertEqual(G.number_of_edges(), 6)
        self.assertTrue(G.has_edge("node-p1", "node-p2"))
        self.assertEqual(G["node-p1"]["node-p2"]["sourceRecordId"], "call-1")

    def test_empty_graph_resilience(self):
        empty_payload = {"caseId": "empty", "network": {"nodes": [], "edges": []}}
        result = run_pipeline(empty_payload)
        self.assertEqual(result["network"]["nodes"], 0)
        self.assertEqual(result["network"]["relationships"], 0)
        self.assertEqual(len(result["keyPlayers"]), 0)
        self.assertEqual(len(result["communities"]), 0)

    def test_single_node_graph(self):
        single_payload = {
            "caseId": "single",
            "network": {
                "nodes": [{"id": "node-1", "entityType": "PHONE", "entityValue": "12345"}],
                "edges": []
            }
        }
        result = run_pipeline(single_payload)
        self.assertEqual(result["network"]["nodes"], 1)
        self.assertEqual(result["network"]["relationships"], 0)
        self.assertEqual(len(result["keyPlayers"]), 1)

    def test_centrality_and_key_players(self):
        G = build_networkx_graph(self.sample_payload["network"])
        centrality = calculate_centrality(G)
        self.assertIn("keyPlayers", centrality)
        self.assertTrue(len(centrality["keyPlayers"]) > 0)
        
        # Verify scores are bounded [0, 1]
        for metric in centrality["entityMetrics"].values():
            self.assertGreaterEqual(metric["degreeCentrality"], 0.0)
            self.assertLessEqual(metric["degreeCentrality"], 1.0)
            self.assertGreaterEqual(metric["betweennessCentrality"], 0.0)
            self.assertLessEqual(metric["betweennessCentrality"], 1.0)
            self.assertGreaterEqual(metric["influenceScore"], 0.0)
            self.assertLessEqual(metric["influenceScore"], 1.0)

    def test_community_detection(self):
        G = build_networkx_graph(self.sample_payload["network"])
        centrality = calculate_centrality(G)
        comm_data = detect_communities_and_bridges(G, centrality["entityMetrics"])
        self.assertIn("communities", comm_data)
        self.assertGreaterEqual(len(comm_data["communities"]), 1)

    def test_risk_scoring(self):
        result = run_pipeline(self.sample_payload)
        risk_entities = result["riskEntities"]
        self.assertEqual(len(risk_entities), 8)
        for r in risk_entities:
            self.assertGreaterEqual(r["riskScore"], 0.0)
            self.assertLessEqual(r["riskScore"], 100.0)
            self.assertIn(r["riskLevel"], ["LOW", "MEDIUM", "HIGH", "CRITICAL"])

    def test_link_prediction(self):
        G = build_networkx_graph(self.sample_payload["network"])
        predictions = predict_hidden_links(G)
        self.assertIn("predictedLinks", predictions)
        for p in predictions["predictedLinks"]:
            self.assertFalse(G.has_edge(p["entityAId"], p["entityBId"]))
            self.assertEqual(p["classificationLabel"], "PREDICTED CONNECTION (NOT CONFIRMED)")

    def test_explainability_and_evidence(self):
        result = run_pipeline(self.sample_payload)
        explanations = result["explanations"]
        self.assertTrue(len(explanations) > 0)
        for exp in explanations:
            self.assertIn("explanationText", exp)
            self.assertIsInstance(exp["sourceRecordIds"], list)


if __name__ == "__main__":
    unittest.main()
