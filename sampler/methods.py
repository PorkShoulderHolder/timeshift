__author__ = 'sam.royston'
from random import sample, random, choice
import numpy as np
import inspect
from igraph import Graph, VertexClustering
from scipy.stats import rv_discrete, powerlaw
import logging

import itertools
import os

logger = logging.getLogger("timeshift")
import numpy as np

def cartesian(arrays, out=None):
    arrays = [np.asarray(x) for x in arrays]
    dtype = arrays[0].dtype

    n = np.prod([x.size for x in arrays])
    if out is None:
        out = np.zeros([n, len(arrays)], dtype=dtype)

    m = n / arrays[0].size
    out[:,0] = np.repeat(arrays[0], m)
    if arrays[1:]:
        cartesian(arrays[1:], out=out[0:m,1:])
        for j in xrange(1, arrays[0].size):
            out[j*m:(j+1)*m,1:] = out[0:m,1:]
    return out


class BaseSampler(object):
    def __init__(self, graph, proportion=None):
        self.proportion = proportion
        self.graph = graph


    def clustering_consistency(self, graph, graph_sampled):
        """
        Metric to measure similarity of partitions derived from original graph and the result of the sampling.
        We assume each graph's vertices have a "membership" property
        """
        def bin_membership(g):
            groups = {}
            for i, v in enumerate(g.vs):
                if str(v["membership"]) in groups.keys():
                    groups[str(v["membership"])].append(v["label"])
                else:
                    groups[str(v["membership"])] = [v["label"]]
            groups = [groups[key] for key in groups.keys()]
            return sorted(groups,lambda x: len(x))

        def subset_score(orig_groups, subset):
            """
            returns normalized distribution with an intersection score for each original group
            """
            orig_groups = np.array(orig_groups)
            subset = np.array(subset)
            score = lambda x : len(np.intersect1d(subset, x)) / float(len(subset))
            scores = np.apply_along_axis(score, 1, orig_groups)
            scores /= np.sum(scores)
            return np.argmax(scores), np.max(scores)





    def run_diagnostic(graph, title, verbose = True):
        """
        calculate and print a bunch of stats about the graph
        """
        title = "{0}-{1}".format(inspect.stack()[1][3], title)
        if verbose:
            print "{0}: ".format(title)
        # modularity
        membership = []
        for v in graph.vs:
            membership.append(v["membership"])
        modularity_score = graph.modularity(membership)
        if verbose:
            print "modularity: " + str(modularity_score)

        #after we rerun optim
        vc = graph.community_multilevel(return_levels=False)
        post_optimized_modularity = vc.modularity


        for v, m in zip(graph.vs, vc.membership):
            pass

        if verbose:
            print "modularity after optim: " + str(post_optimized_modularity)

        #fit to degree
        degree_dist = graph.degree_distribution()
        if verbose:
            print "degree distr: " + str([b[2] for b in degree_dist.bins()])
            print "v,e: " + str(len(graph.vs)) + ", " + str(len(graph.es))

        return {"modularity_pre":modularity_score, "modularity_post": post_optimized_modularity, "degree_distribution":degree_dist}


def ensure_partitioned(func):
    """
    Decorator for any function which takes a graph or vertex cluster as input ensuring that the graph
    is partitioned and each vertex has a "membership" attr
    """
    def inner(vc, **kwargs):
        try:
            memberships = vc.membership
        except AttributeError:
            print "running modularity optimization..."
            vc = vc.community_multilevel(return_levels=False)
            memberships = vc.membership
        for i,v in enumerate(vc._graph.vs):
            v["membership"] = memberships[i]
        return func(vc, **kwargs)
    return inner

def pairwise_similarity(graph, graph_sampled, proportion = 1.0):
    """
    The proportion of correctly grouped vertex pairs vs incorrect
    """
    combo_iterator= [i for i in itertools.combinations(graph_sampled.vs,2)]
    vertex_pairs = sample(combo_iterator, int(proportion * len(combo_iterator)))
    score_table = np.array([not ((v[0]["membership"] == v[1]["membership"]) ^ (graph.vs.find(v[0]["name"])["membership"] == graph.vs.find(v[1]["name"])["membership"])) for v in vertex_pairs])

    score = np.sum(score_table) / float(len(score_table))
    return score

def vertex_sampling(orig_graph, max_count = 40000, proportion=1.0):
    """
    uniform node sampling. Does not maintain power law degree distribution.
    flag is 'RN'
    TODO: implement with induced_subgraph() call
    """
    print proportion
    graph = orig_graph.copy()
    if proportion is not None: max_count = int(len(graph.vs) * proportion)
    samples_count = int(max(0, len(graph.vs) - max_count))
    vs_to_delete  = sample(graph.vs, samples_count)
    graph.delete_vertices(vs_to_delete)
    return graph

def edge_sampling(orig_graph, max_count = 40000, max_edge_count = None,proportion=None):
    """
    uniform edge sampling. Biased towards highly connected nodes. Leads to sparsely connected graph (?).
    flag is 'RE'
    TODO: implement with subgraph_edges() call
    """
    graph = orig_graph.copy()
    if proportion is not None: max_count = int(len(graph.es) * proportion)
    samples_count = max(0, len(graph.es) - max_count)
    edges_to_delete  = sample(graph.es, samples_count)
    graph.delete_edges(edges_to_delete)
    return graph

def run_diagnostic(graph, title):
    """
    calculate and print a bunch of stats about the graph
    """
    title = "{0}-{1}".format(inspect.stack()[1][3], title)
    print "{0}: ".format(title)
    # modularity
    membership = []
    for v in graph.vs:
        membership.append(v["membership"])
    modularity_score = graph.modularity(membership)
    print "modularity: " + str(modularity_score)

    #after we rerun optim
    vc = graph.community_multilevel(return_levels=False)
    post_optimized_modularity = vc.modularity
    print "modularity after optim: " + str(post_optimized_modularity)

    #fit to degree
    degree_dist = graph.degree_distribution()
    print "degree distr: " + str([b[2] for b in degree_dist.bins()])
    print "v,e: " + str(len(graph.vs)) + ", " + str(len(graph.es))

class profile:
    def __init__(self, deg_dist):
        pass

def get_giant_component(graph):
    """
    return connected subgraph
    """
    vc = graph.clusters(mode="WEAK")
    return vc.giant()

def node_degree_sampling(orig_graph, max_count = 40000, proportion=None, profiling=False):
    """
    variant of RN sampling, samples nodes weighted by degree. intuitively similar to edge sampling
    flag is 'RDN'
    """

    graph = orig_graph.copy()

    run_diagnostic(graph, "starting")
    if proportion is not None: max_count = int(max_count * proportion)
    deg_dist = np.array([b[2] for b in graph.degree_distribution().bins()])
    degree_sum = float(np.sum(deg_dist))
    deg_dist_normalized = deg_dist / degree_sum
    generator = rv_discrete(values=deg_dist_normalized)
    vs_to_delete = generator.rvs(int(max_count))
    graph.delete_vertices(vs_to_delete)

    run_diagnostic(graph, "after sampling")
    giant_component = get_giant_component(graph)
    run_diagnostic(giant_component, "giant component only")
    if profiling:
        return {}
    return giant_component

def node_edge_sampling(orig_graph, max_count= 4000, proportion=0.2):
    """
    node edge sampling. variant of RN sampling includes adj edge w uniform probability.
    WARNING: this may be inefficient and not production ready.
    """

    graph = orig_graph.copy()
    new_graph = Graph()
    for i,v in enumerate(graph.vs):
        # select each vertex with probability 'proportion'
        if random() < proportion:
            # uniformly select an adjacent vertex
            # use graph.vs.find to ensure we do not add multiple copies of the same vertex
            neighbor = graph.vs[choice(graph.neighbors(v.index))]
            
            try:
                v_exists = new_graph.vs.find(neighbor["name"])
                source = v_exists.index
            except ValueError:
                new_graph.add_vertex(name=v["name"])
                new_graph.vs[len(new_graph.vs) - 1]["membership"] = v["membership"]
                source = new_graph.vs[len(new_graph.vs) - 1].index

            try:
                n_exists = new_graph.vs.find(neighbor["name"])
                target = n_exists.index 
            except ValueError:
                new_graph.add_vertex(name=neighbor["name"])
                new_graph.vs[len(new_graph.vs) - 1]["membership"] = neighbor["membership"]
                target = new_graph.vs[len(new_graph.vs) - 1].index
            
            # add edge between those two vertices. We are not accounting for the event of selecting the same edge twice,
            # but the probability of that happening is really low
            new_graph.add_edge(source,target)

    return new_graph

def random_walk_sampling(orig_graph, proportion=0.2, random_jump=True, jump_probability=0.15):
    """
    Go on a random walk down wall street
    """
    graph = orig_graph.copy()
    starting_vertex = choice(graph.vs)
    next_step = lambda v : graph.vs[choice(graph.neighbors(v.index))] if random() > jump_probability else (choice(graph.vs) if random_jump else starting_vertex)
    new_vertices = []
    for v in graph.vs:
        v["visited"] = 0
    steps = 0
    while len(new_vertices) < proportion * len(orig_graph.vs):
        next_vertex = next_step(v)
        steps += 1
        next_vertex["visited"] += 1
        if next_vertex["visited"] == 1:
            new_vertices.append(v)
    return graph.subgraph(new_vertices),steps

