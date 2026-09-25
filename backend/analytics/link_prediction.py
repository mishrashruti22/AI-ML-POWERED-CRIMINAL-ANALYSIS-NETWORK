"""
ProbNexus Link Prediction Engine (SIH Step 7)
Predicts hidden and emergent connections between unconnected entities
using Jaccard Coefficient and Adamic-Adar Index algorithms in NetworkX.
"""

import networkx as nx
import math
from typing import Dict, Any, List, Tuple


def predict_hidden_links(
    G: nx.Graph,
    min_score_threshold: float = 0.1,
    top_k: int = 10
) -> Dict[str, Any]:
    """
    Evaluates candidate non-adjacent node pairs to predict potential hidden links.
    Clearly labels results as PREDICTED CONNECTION (NOT CONFIRMED).
    """
    num_nodes = G.number_of_nodes()
    
    if num_nodes < 3 or G.number_of_edges() == 0:
        return {
            "predictedLinks": [],
            "totalCandidatesEvaluated": 0,
            "message": "Graph structure insufficient for multi-hop link prediction."
        }

    # Generate candidate pairs of unconnected nodes that have at least 1 common neighbor or share context
    non_edges = list(nx.non_edges(G))
    if not non_edges:
        return {
            "predictedLinks": [],
            "totalCandidatesEvaluated": 0,
            "message": "No unconnected candidate pairs available in the network."
        }

    # Filter candidate pairs to those having at least 1 common neighbor to avoid evaluating unrelated disconnects
    candidate_pairs = []
    for u, v in non_edges:
        common_nbrs = list(nx.common_neighbors(G, u, v))
        if common_nbrs:
            candidate_pairs.append((u, v, common_nbrs))

    if not candidate_pairs:
        return {
            "predictedLinks": [],
            "totalCandidatesEvaluated": len(non_edges),
            "message": "No high-confidence hidden connection candidates detected with shared network neighbors."
        }

    pair_ebunch = [(u, v) for u, v, _ in candidate_pairs]

    # Calculate Jaccard Coefficients
    jaccard_map = {}
    try:
        for u, v, p in nx.jaccard_coefficient(G, pair_ebunch):
            jaccard_map[(u, v)] = float(p)
    except Exception:
        pass

    # Calculate Adamic-Adar Index
    adamic_map = {}
    try:
        for u, v, p in nx.adamic_adar_index(G, pair_ebunch):
            adamic_map[(u, v)] = float(p)
    except Exception:
        pass

    # Find max Adamic-Adar value for normalization
    max_adamic = max(adamic_map.values()) if adamic_map and max(adamic_map.values()) > 0 else 1.0

    predictions = []
    for u, v, common_nbrs in candidate_pairs:
        j_score = jaccard_map.get((u, v), 0.0)
        a_score = adamic_map.get((u, v), 0.0)
        a_norm = a_score / max_adamic if max_adamic > 0 else 0.0

        # Combined prediction score formula: 0.40 * Jaccard + 0.60 * Adamic-Adar (normalized)
        combined_score = round(0.40 * j_score + 0.60 * a_norm, 4)

        if combined_score < min_score_threshold and len(common_nbrs) < 1:
            continue

        # Confidence level
        if combined_score >= 0.6 or len(common_nbrs) >= 2:
            confidence = "HIGH"
        elif combined_score >= 0.3 or len(common_nbrs) == 1:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"

        u_data = G.nodes[u]
        v_data = G.nodes[v]

        # Gather details of common neighbors
        common_entities = []
        for cn in common_nbrs:
            cn_data = G.nodes[cn]
            common_entities.append({
                "entityId": cn,
                "entityType": cn_data.get("entityType", "UNKNOWN"),
                "entityValue": cn_data.get("entityValue", "")
            })

        explanation_text = (
            f"Predicted connection based on {len(common_nbrs)} shared intermediate entity "
            f"({', '.join(cn['entityValue'] for cn in common_entities[:2])}) "
            f"with Jaccard score {round(j_score, 3)} and Adamic-Adar index {round(a_score, 3)}."
        )

        predictions.append({
            "entityAId": u,
            "entityAType": u_data.get("entityType", "UNKNOWN"),
            "entityAValue": u_data.get("entityValue", ""),
            "entityBId": v,
            "entityBType": v_data.get("entityType", "UNKNOWN"),
            "entityBValue": v_data.get("entityValue", ""),
            "jaccardScore": round(j_score, 4),
            "adamicAdarScore": round(a_score, 4),
            "predictionScore": combined_score,
            "predictionMethod": "Adamic-Adar + Jaccard",
            "confidence": confidence,
            "status": "PREDICTED",
            "classificationLabel": "PREDICTED CONNECTION (NOT CONFIRMED)",
            "commonNeighborsCount": len(common_nbrs),
            "commonNeighbors": common_entities,
            "explanation": explanation_text
        })

    # Sort descending by prediction score
    predictions.sort(key=lambda x: (x["predictionScore"], x["commonNeighborsCount"]), reverse=True)

    return {
        "predictedLinks": predictions[:top_k],
        "totalCandidatesEvaluated": len(candidate_pairs),
        "methodology": "Combined Jaccard Coefficient (40%) and Adamic-Adar Index (60%) on non-adjacent node pairs with shared neighbors."
    }
