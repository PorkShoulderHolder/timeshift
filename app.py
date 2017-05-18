from flask import Flask, Response, request, render_template
import json
from igraph import Graph
from gexdat.gexdat import Graph as Gex
from layouts import layouts as lo
import sys

app = Flask(__name__)
global cluster_names

file_name = "marvel.graphml"
if len(sys.argv) > 1:
    file_name = sys.argv[1]
if len(sys.argv) > 2:
    edge_file_name = sys.argv[2]


def name_cluster(g, vc):

    cluster_names = {}
    for i, cluster in enumerate(vc):
        names = {}
        for v in cluster:
            k = g.vs[v]['label'].split("/")[0].replace(',"', '')
            if k in names:
                names[k] += g.degree(v)
            else:
                names[k] = g.degree(v)
        values = sorted(names.iteritems(), key=lambda x: x[1])
        cluster_names[i] = str([a[0] for a in values[-3:]][::-1])
    return cluster_names


def coerce(g):
    global cluster_names
    to_delete = []

    for i, v in enumerate(g.vs):
        v["membership"] = v["Modularity Class"]
        v["name"] = v["label"]
    for i, e in enumerate(g.es):
        if e['weight'] < 10:
            to_delete.append(e.index)
    g.delete_edges(to_delete)
    g.delete_vertices([v.index for v in g.vs.select(_degree_lt=1)])
    vc = g.community_multilevel(return_levels=False)
    cluster_names = name_cluster(g, vc)
    for i, cluster in enumerate(vc):
        for v in cluster:
            g.vs[v]["membership"] = i
    g = g.components().giant()
    return g


def load_graphml(filename):
    global cluster_names
    with open(filename) as f:
        graph_obj = Graph.Read_GraphML(f)
        graph_obj = coerce(graph_obj)
        graph_obj, centroids = lo.regular_layout(graph_obj)
        gex_obj = Gex(igraph_obj=graph_obj)
        gex_obj.__dict__["group_names"] = cluster_names
        json_out = gex_obj.json_dumps()

        return json_out

static_json_graph = load_graphml(file_name)


@app.route("/api/json")
def get_data():
    return Response(static_json_graph, mimetype="json")


@app.route("/")
def render():
    return render_template("graph.html")

app.run(host='0.0.0.0')
