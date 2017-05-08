__author__ = 'sam.royston'

import numpy as np
from alignment import align_graph

def collapsed_layout(vertex_clustering):
    """
    get the layout of graph clusters
    """
    collapsed_graph = vertex_clustering.cluster_graph()
    layout_collapsed = collapsed_graph.layout_fruchterman_reingold_3d(maxiter=500)
    layout_collapsed.scale(450.0)
    return collapsed_graph, layout_collapsed


def seed_layout_clusters(vertex_clustering):
    """
    perform full layout with separated modularity groups
    """
    vertex_dict = {}
    collapsed_graph, layout_collapsed = collapsed_layout(vertex_clustering)
    graph = vertex_clustering._graph
    for i, vertex in enumerate(collapsed_graph.vs):
        coordinates = layout_collapsed[i]
        sub_graph = vertex_clustering.subgraph(i)
        print "laying out subgraph: " + str(i)
        print coordinates
        subgraph_layout = sub_graph.layout_fruchterman_reingold_3d(maxiter=1000)
        subgraph_layout.translate(coordinates)
        for j,v in enumerate(sub_graph.vs):
            vertex_dict[v["name"]] = {"membership": i, "coordinates": subgraph_layout[j]}
    for vertex in graph.vs:
        positioned_v = vertex_dict[vertex["name"]]
        vertex["coordinates"] = positioned_v["coordinates"]
    return graph


def include_cluster_centroids(func):
    """
    decorator for methods that take in a graph whose vertices have a "membership" and "coordinates" attributes
    returns graph, centroids tuple
    """

    def cluster_hash(k,l):
        return "{0}:{1}".format(k,l)

    def inner(graph):
        treated_graph = func(graph)
        clusters = {}

        for i,v in enumerate(treated_graph.vs):
            if v["membership"] in clusters.keys():
                clusters[v["membership"]].append(v["coordinates"])
            else:
                clusters[v["membership"]] = [v["coordinates"]]
        keys = clusters.keys()
        centroids = {}
        for key in keys:
            centroids[key] = np.mean(clusters[key], axis=0).tolist()
        return treated_graph, centroids
    return inner

def normalize_layout(layout):
    """
    Apply a standard set of normalization / centering operations to a layout
    """
    layout.fit_into((-100,-100,-100),(100,100,100))
    layout.center((0,0,0))
    return layout


@include_cluster_centroids
def regular_layout(graph):
    edgelist = graph.es

    print "totals: " + str(len(graph.vs)) + " vertices, " + str(len(edgelist)) + " edges"

    layout = graph.layout_fruchterman_reingold_3d(maxiter=2000)
    layout = normalize_layout(layout)

    for i,v in enumerate(graph.vs):
        v["coordinates"] = layout[i]
    for i,e in enumerate(graph.es):
        e["coordinates"] = [graph.vs[e.source]["coordinates"], graph.vs[e.target]["coordinates"]]

    return graph

def calc_layout_sucession(graphs):
    graphs = sorted(graphs, key=lambda x : x.timestamp)
    for graph in graphs:
        pass

def get_precursor(new_graph, old_graph):
    old_ids = np.array([v["name"] for v in old_graph.vs])
    new_ids = np.array([v["name"] for v in new_graph.vs])

    # boolean array the size of new_graph.vs

    # boolean the size of old_graph.vs, marking which elements of old_ids are not in new_ids
    membership_mask_old_new = np.in1d(new_ids, old_ids)
    seed_coords = []
    for i,e in enumerate(new_graph.es):
        # this vertex was not in the old graph, calculate a centroid to seed it with based on the positions of it's neighbors who were in the old graph
        # so there is no corresponding vertex
        source = new_graph.vs[e.source]
        target = new_graph.vs[e.target]

def layout_with_seed(new_graph, old_graph, noise = 0.1):
    """
    use an old graph and layout to seed a new one. relies on node intersections.
    """
    print "new totals: " + str(len(new_graph.vs)) + " vertices, " + str(len(new_graph.es)) + " edges"

    old_ids = np.array([v["name"] for v in old_graph.vs])
    new_ids = np.array([v["name"] for v in new_graph.vs])


    # boolean array the size of new_graph.vs

    # boolean the size of old_graph.vs, marking which elements of old_ids are not in new_ids
    membership_mask_old_new = np.in1d(new_ids, old_ids)

    seed_coords = []
    for i,v in enumerate(new_graph.vs):
        # this vertex was not in the old graph, calculate a centroid to seed it with based on the positions of it's neighbors who were in the old graph
        # so there is no corresponding vertex
        if not membership_mask_old_new[i]:
            neighbors = new_graph.neighbors(v)
            neighbor_ids = np.array([new_graph.vs[i]["name"] for i in neighbors])
            valid_neighbors_mask = np.logical_not(np.in1d(neighbor_ids, old_ids))
            valid = np.ma.compressed(np.ma.masked_array(neighbor_ids, mask = valid_neighbors_mask))
            ok_neighbors = [old_graph.vs.find(i) for i in valid]
            seed_coord = np.mean([i["coordinates"] for i in ok_neighbors], axis=0) if len(ok_neighbors) > 0 else np.array([0,0,0])
            seed_coord = seed_coord + (np.random.random(3) - 0.5)

        # otherwise we should search for this corresponding vertex
        else:
            seed_coord = old_graph.vs.find(v["name"])["coordinates"]

        seed_coords.append(seed_coord)


    new_layout = new_graph.layout_fruchterman_reingold_3d(maxiter=700, seed=seed_coords)
    layout = normalize_layout(new_layout)
    for i,v in enumerate(new_graph.vs):
        v["coordinates"] = layout[i]

    # alignment = align_graph(old_graph, new_graph)
    # for i,v in enumerate(new_graph.vs):
    #     v["coordinates"] = alignment[i]

    return new_graph