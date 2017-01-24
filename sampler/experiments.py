__author__ = 'sam.royston'

from methods import node_degree_sampling, vertex_sampling, edge_sampling, pairwise_similarity, get_giant_component
import json
import time
import numpy as np
import sys
# (*) To communicate with Plotly's server, sign in with credentials file
import plotly.plotly as py
py.sign_in(username='sfr',api_key='uurvzucyly')
# (*) Useful Python/Plotly tools
import plotly.tools as tls

# (*) Graph objects to piece together plots
from plotly.graph_objs import *

def do_sampling_experiment(graph, sampling_method, increment=0.05, fpath='/home/ubuntu/sam/sm-model/timeshift/sampler',graph_name="",count=15):
    p = 0
    degree_dists_giant = []
    modularity_scores_giant = []
    node_counts_giant = []
    edge_counts_giant = []
    community_scores_giant = []
    degree_dists = []
    modularity_scores = []
    community_scores = []
    node_counts = []
    edge_counts = []
    trials = []
    ps = []

    def update_stats_for_graph(g):
        degree_dists.append([b[2] for b in g.degree_distribution().bins()])
        vc_s = g.community_multilevel(return_levels=False)
        for i,v in enumerate(g.vs):
            v["membership"] = vc_s.membership[i]
        modularity_scores.append(vc_s.modularity)
        sample_size = 200.0
        po = min(1.0, sample_size / len(g.vs))
        community_scores.append(pairwise_similarity(graph, graph_sampled=g, proportion=po))
        node_counts.append(len(g.vs))
        edge_counts.append(len(g.es))

        giant = get_giant_component(g)
        degree_dists_giant.append([b[2] for b in giant.degree_distribution().bins()])
        vc_s_giant = giant.community_multilevel(return_levels=False)
        for i,v in enumerate(giant.vs):
            v["membership"] = vc_s_giant.membership[i]
        modularity_scores_giant.append(vc_s_giant.modularity)
        sample_size = 200.0
        po = min(1.0, sample_size / len(giant.vs))
        community_scores_giant.append(pairwise_similarity(graph, graph_sampled=giant, proportion=po))
        node_counts_giant.append(len(giant.vs))
        edge_counts_giant.append(len(giant.es))

    while len(trials) < count:
        p = 0
        degree_dists_giant = []
        modularity_scores_giant = []
        node_counts_giant = []
        edge_counts_giant = []
        community_scores_giant = []
        degree_dists = []
        modularity_scores = []
        community_scores = []
        node_counts = []
        edge_counts = []
        ps = []
        

        print "trial " + str(len(trials) + 1)

        while p <= (1.0 - increment):
            p += increment
            print p
            sampled_graph = sampling_method(graph,proportion=p)
            update_stats_for_graph(sampled_graph)
            ps.append(p)

        ps.append(1.0)
        update_stats_for_graph(graph)
        info_object = {"degree_dists":degree_dists,"modularity_scores":modularity_scores,"edge_counts":edge_counts,"node_counts":node_counts,
                       "community_scores":community_scores,"node_counts_giant":node_counts_giant,"edge_counts_giant":edge_counts_giant,"probabilities":ps,
                       "community_scores_giant":community_scores_giant,"modularity_scores_giant":modularity_scores_giant, "degree_dists_giant":degree_dists_giant}
        trials.append(info_object)
    time_str = time.strftime("%d-%m-%Y_%H:%M")
    method_name = sampling_method.__name__
    filename = "{0}/results/{1}_{2}_{3}.json".format(fpath,method_name,graph_name,time_str)
    with open(filename,'w') as f:
        json.dump(trials,f)

def create_degree_plots(xa,ya,za):
    Z1 = za
    X1 = xa
    Y1 = ya
    trace1 = Surface(
        z=np.swapaxes(Z1,0,1)[0:20],  # link the fxy 2d numpy array
        x=X1,  # link 1d numpy array of x coords
        y=Y1   # link 1d numpy array of y coords
    )
    trace2 = Surface(
        z=np.swapaxes(Z1,0,1)[0:200],  # link the fxy 2d numpy array
        x=X1,  # link 1d numpy array of x coords
        y=Y1   # link 1d numpy array of y coords
    )
    trace3 = Surface(
        z=np.swapaxes(Z1,0,1),  # link the fxy 2d numpy array
        x=X1,  # link 1d numpy array of x coords
        y=Y1   # link 1d numpy array of y coords
    )
    trace4 = Surface(
        z=np.swapaxes(np.log(Z1),0,1),  # link the fxy 2d numpy array
        x=X1,  # link 1d numpy array of x coords
        y=Y1   # link 1d numpy array of y coords
    )
    trace5 = Surface(
        z=np.swapaxes(np.log(Z1),0,1)[0:50],  # link the fxy 2d numpy array
        x=X1,  # link 1d numpy array of x coords
        y=Y1   # link 1d numpy array of y coords
    )
    data_30 = Data([trace1])
    data_200 = Data([trace2])
    data_full = Data([trace3])
    data_log_full = Data([trace4])
    data_log_200 = Data([trace5])
    xaxis = dict(
        title="sampling rate",
        showbackground=True, # (!) show axis background
        backgroundcolor="rgb(204, 204, 204)", # set background color to grey
        gridcolor="rgb(255, 255, 255)",       # set grid line color
        zerolinecolor="rgb(255, 255, 255)",   # set zero grid line color
    )
    yaxis = dict(
        title="degree",
        showbackground=True, # (!) show axis background
        backgroundcolor="rgb(204, 204, 204)", # set background color to grey
        gridcolor="rgb(255, 255, 255)",       # set grid line color
        zerolinecolor="rgb(255, 255, 255)",   # set zero grid line color
    )
    zaxis = dict(
        title="vertex count",
        showbackground=True, # (!) show axis background
        backgroundcolor="rgb(204, 204, 204)", # set background color to grey
        gridcolor="rgb(255, 255, 255)",       # set grid line color
        zerolinecolor="rgb(255, 255, 255)",   # set zero grid line color
    )
    zaxis_log = dict(
        title="log vertex count",
        showbackground=True, # (!) show axis background
        backgroundcolor="rgb(204, 204, 204)", # set background color to grey
        gridcolor="rgb(255, 255, 255)",       # set grid line color
        zerolinecolor="rgb(255, 255, 255)",   # set zero grid line color
    )
    # Make a layout object
    scene = Scene(  # (!) axes are part of a 'scene' in 3d plots
            xaxis=XAxis(xaxis), # set x-axis style
            yaxis=YAxis(yaxis), # set y-axis style
            zaxis=ZAxis(zaxis)  # set z-axis style
        )
    scene_log = Scene(  # (!) axes are part of a 'scene' in 3d plots
            xaxis=XAxis(xaxis), # set x-axis style
            yaxis=YAxis(yaxis), # set y-axis style
            zaxis=ZAxis(zaxis_log)  # set z-axis style
        )
    layout = Layout(
        title='edge sampling', # set plot title
        scene=scene
    )

    layout_log = Layout(
        title='edge sampling log scale', # set plot title
        scene=scene_log
    )

    # Make a figure object
    fig_20 = Figure(data=data_30, layout=layout)
    fig_200 = Figure(data=data_200, layout=layout)
    fig_log_full = Figure(data=data_log_full, layout=layout_log)
    fig_log_200 = Figure(data=data_log_200, layout=layout_log)

    return fig_20,fig_200,fig_log_200,fig_log_full


def process_json(filename):

    with open(filename) as f:
        data = json.load(f)
        mod_giant = np.array([[float(c) for c in trial["modularity_scores_giant"]] for trial in data])
        mod = np.array([[float(c) for c in trial["modularity_scores"]] for trial in data])
        pairwise_consistency_giant = np.array([[float(c) for c in trial["community_scores_giant"]] for trial in data])
        pairwise_consistency = np.array([[float(c) for c in trial["community_scores"]] for trial in data])
        distributions = np.array([[float(c) for c in dist] for dist in data[0]["degree_dists"]])
        distributions_giant = np.array([[float(c) for c in dist] for dist in data[0]["degree_dists_giant"]])
        probabilities = np.array([float(p) for p in data[0]["probabilities"]])
        X = probabilities
        Y = xrange(0,max([len(d) for d in distributions]))
        X, Y = np.meshgrid(X, Y)
        Z = []
        Z_giant = []
        
        for i,x in enumerate(X[0]):
            zr = []
            d = distributions[i]
            padding = [0] * (len(Y) - len(d))
            zr.extend(d + padding)
            Z.append(zr)
        Z = np.array(Z)
        
        for i,x in enumerate(X[0]):
            zr = []
            d = distributions_giant[i]
            padding = [0] * (len(Y) - len(d))
            zr.extend(d + padding)
            Z_giant.append(zr)
        Z_giant = np.array(Z)
    return {"mod_giant":mod_giant, "X":X, "Y":Y,"counts":Z,"counts_giant":Z_giant, "mod":mod, "pw_consistency":pairwise_consistency,
    "pw_consistency_giant":pairwise_consistency_giant,"distributions":distributions, "dists_giant":distributions_giant}


def draw_degree_dists(filename, for_giant=False, fpath=''):
    with open(fpath + filename) as f:
        data = json.load(f)
        probabilities = np.array([float(p) for p in data["probabilities"]])
        distributions = np.array([[float(c) for c in dist] for dist in data["degree_dists"]])

        X = probabilities
        Y = xrange(0,max([len(d) for d in distributions]))
        Z = np.meshgrid(X, Y)
        return X, Y, Z



def draw_community_scores(filenames, for_giant=False):
    for filename in filenames:
        pass
