"""
ProbNexus Community Detection & Bridge Entity Engine
Uses Louvain modularity optimization to detect criminal network communities
and identifies cross-community bridge entities.
"""

import networkx as nx
from typing import Dict, Any, List, Set


def detect_communities_and_bridges(
    G: nx.Graph,
    entity_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Applies Louvain community detection to group tightly connected entities.
    Identifies bridge nodes that span multiple communities.
    """
    num_nodes = G.number_of_nodes()
    
    if num_nodes == 0:
        return {"communities": [], "bridgeEntities": [], "nodeCommunities": {}}

    # Partition nodes into communities
    community_sets = []
    try:
        if hasattr(nx.algorithms.community, "louvain_communities") and G.number_of_edges() > 0:
            community_sets = list(nx.algorithms.community.louvain_communities(G, seed=42))
        else:
            # Fallback to connected components if no edges or louvain unavailable
            community_sets = list(nx.connected_components(G))
    except Exception:
        community_sets = list(nx.connected_components(G))

    # If all nodes isolated, each is its own community
    if not community_sets:
        community_sets = [{node} for node in G.nodes()]

    node_to_comm = {}
    communities_list = []
    
    # Process each community
    for comm_idx, comm_nodes in enumerate(community_sets, start=1):
        comm_nodes_list = list(comm_nodes)
        for node in comm_nodes:
            node_to_comm[node] = comm_idx

        # Calculate internal edges
        internal_subgraph = G.subgraph(comm_nodes)
        internal_edges_count = internal_subgraph.number_of_edges()

        # Gather member details and metrics
        member_items = []
        total_influence = 0.0
        for node in comm_nodes_list:
            node_data = G.nodes[node]
            metric = entity_metrics.get(node, {})
            inf = metric.get("influenceScore", 0.0)
            total_influence += inf
            member_items.append({
                "entityId": node,
                "entityType": node_data.get("entityType", "UNKNOWN"),
                "entityValue": node_data.get("entityValue", ""),
                "normalizedValue": node_data.get("normalizedValue", ""),
                "influenceScore": inf,
                "degree": metric.get("degree", 0)
            })

        # Sort major entities by influence
        member_items.sort(key=lambda x: x["influenceScore"], reverse=True)
        avg_influence = round(total_influence / max(1, len(comm_nodes_list)), 4)

        communities_list.append({
            "communityId": comm_idx,
            "communityNumber": comm_idx,
            "communityName": f"Community {comm_idx}",
            "memberCount": len(comm_nodes_list),
            "internalConnections": internal_edges_count,
            "averageInfluence": avg_influence,
            "majorEntities": member_items[:3],
            "members": member_items
        })

    # Bridge Entity Detection: Nodes with connections to multiple communities
    bridge_entities = []
    for node in G.nodes():
        node_comm = node_to_comm.get(node, 1)
        neighbors = list(G.neighbors(node))
        
        neighbor_comms = set()
        for nbr in neighbors:
            nbr_comm = node_to_comm.get(nbr)
            if nbr_comm and nbr_comm != node_comm:
                neighbor_comms.add(nbr_comm)

        metric = entity_metrics.get(node, {})
        bet_c = metric.get("betweennessCentrality", 0.0)
        deg = metric.get("degree", 0)

        # A node is a bridge if it connects to 1+ other communities or has high betweenness
        if neighbor_comms or (len(community_sets) > 1 and bet_c >= 0.25):
            cross_comm_count = len(neighbor_comms)
            # Bridge score combines cross-community reach with betweenness
            bridge_score = round(min(1.0, (cross_comm_count * 0.4) + (bet_c * 0.6)), 4)
            
            bridge_item = {
                "entityId": node,
                "entityType": G.nodes[node].get("entityType", "UNKNOWN"),
                "entityValue": G.nodes[node].get("entityValue", ""),
                "homeCommunity": node_comm,
                "connectedCommunities": sorted(list(neighbor_comms.union({node_comm}))),
                "betweennessCentrality": bet_c,
                "bridgeScore": bridge_score,
                "description": f"Connects Community {node_comm} with Community {', '.join(str(c) for c in sorted(neighbor_comms))}" if neighbor_comms else f"Acts as high-betweenness pathway inside Community {node_comm}"
            }
            bridge_entities.append(bridge_item)

    bridge_entities.sort(key=lambda x: x["bridgeScore"], reverse=True)

    return {
        "communities": communities_list,
        "bridgeEntities": bridge_entities,
        "nodeCommunities": node_to_comm
    }
