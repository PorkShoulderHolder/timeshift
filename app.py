from flask import Flask, Response, request, render_template
import json
from igraph import Graph
from gexdat.gexdat import Graph as Gex
from layouts import layouts as lo
import sys
import os

app = Flask(__name__)
global cluster_names

coloring_func_dir = "coloring_functions"
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
            k = g.vs[v]['name']
            if k in names:
                names[k] += g.degree(v)
            else:
                names[k] = g.degree(v)
        values = sorted(names.iteritems(), key=lambda x: x[1])
        cluster_names[i] = str([a[0] for a in values[-3:]][::-1])
    return cluster_names


def coerced(g):
    global cluster_names
    to_delete = []

    for i, v in enumerate(g.vs):
        if "Modularity Class" in v.attributes():
            v["membership"] = v["Modularity Class"]

    for i, e in enumerate(g.es):
        thresh = float(sys.argv[2]) if len(sys.argv) > 2 else 0.05
        if e['weight'] < thresh:
            to_delete.append(e.index)
    g.delete_edges(to_delete)
    vc = g.community_multilevel(return_levels=False)
    cluster_names = name_cluster(g, vc)
    for i, cluster in enumerate(vc):
        for v in cluster:
            g.vs[v]["membership"] = i
    #g = g.components().giant()
    return g


def load_graphml(filename):
    global cluster_names
    with open(filename) as f:
        print("reading {}".format(filename))
        graph_obj = Graph.Read(f)
        print("cleaning and computing modularity groups")
        graph_obj = coerced(graph_obj)
        graph_obj, centroids = lo.regular_layout(graph_obj)
        print("loading processed graph")
        gex_obj = Gex(igraph_obj=graph_obj)
        gex_obj.__dict__["group_names"] = cluster_names
        print("serializing graph")
        json_out = gex_obj.json_dumps()
        return json_out

static_json_graph = load_graphml(file_name)


@app.route("/save_coloring", methods=["POST"])
def save_coloring():
    data = request.form.get("text")
    name = request.form.get("name")
    unsafe_path = "{}/{}".format(coloring_func_dir, name)
    parent_path = os.path.abspath(coloring_func_dir)
    if os.path.dirname( os.path.abspath(unsafe_path) ) != parent_path:
        return Response("bad request")
    else:
        path = os.path.abspath(unsafe_path)

        with open(path, "w+") as f:
            f.write(data)
        return Response(json.dumps({"result": "ok"}))


@app.route("/get_coloring/<name>")
def get_coloring(name):
    unsafe_path = "{}/{}".format(coloring_func_dir, name)
    parent_path = os.path.abspath(coloring_func_dir)
    print unsafe_path
    print parent_path
    print os.path.dirname(os.path.abspath(unsafe_path))
    if os.path.dirname(os.path.abspath(unsafe_path)) != parent_path:
        return Response("bad request")
    else:
        path = os.path.abspath(unsafe_path)
        with open(path) as f:
            contents = f.read()
        return json.dumps({"function_text": contents})


@app.route("/list_colorings")
def list_colorings():
    files = os.listdir(coloring_func_dir)
    return Response(json.dumps(files))


@app.route("/api/json")
def get_data():
    print "hit dis {}".format(len(static_json_graph))
    return Response(static_json_graph, mimetype="json")


@app.route("/")
def render():
    return render_template("graph.html")

if len(sys.argv) > 3:
    app.run(host='0.0.0.0', port=int(sys.argv[3]))
else:
    app.run(host='0.0.0.0', port=int(8989))



