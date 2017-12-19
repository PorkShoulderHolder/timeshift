__author__ = 'sam.royston'

from xml.etree.ElementTree import SubElement, Element
from xml.etree.ElementTree import tostring, parse, fromstring
from datetime import datetime
from time import time
import os
import json
import csv


def hex_to_rgb(value):
    """
    taken from http://stackoverflow.com/questions/214359/converting-hex-color-to-rgb-and-vice-versa
    """
    value = value.lstrip('#')
    lv = len(value)
    return tuple(int(value[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))


def rgb_to_hex(rgb):
    """
    taken from http://stackoverflow.com/questions/214359/converting-hex-color-to-rgb-and-vice-versa
    """
    return '#%02x%02x%02x' % rgb

DEFAULT_COLORS = ["#FF6A00","#5ec8da","#FEBE10","#239dba","#36C776","#BDDC76"]


class TemporalObject(object):
    """
    defines time based operations that can apply to both nodes and edges
    """
    def __init__(self, timestamps, ranges=None):
        if timestamps is not None:
            self.timestamps = sorted(timestamps)
        if ranges is None and timestamps is not None:
            self.ranges = ranges
        else:
            self.ranges = ranges

    def is_starting_appearance(self, i):
        if i == 0 and self.timestamps[0] is not None: return True
        else:
            return self.timestamps[i] is not None and self.timestamps[i-1] is None

    def is_ending_appearance(self, i):
        if i == len(self.timestamps) - 1 and self.timestamps[-1] is not None: return True
        else:
            return self.timestamps[i] is not None and self.timestamps[i+1] is None

    def consolidate_ranges(self):
        self.ranges.sort()
        for i, (start, end) in enumerate(self.ranges):
            if i + 1 < len(self.ranges):
                next_start = self.ranges[i + 1][0]
                next_end = self.ranges[i + 1][1]
                if end == next_start or start == end or next_start == next_end:
                    self.ranges[i] = (start, next_end)
                try:
                    self.ranges.remove((next_start, next_end))
                except ValueError:
                    pass

    def get_active_chunks(self):
        bottom = 0
        top = 0
        chunks = []
        while bottom != len(self.timestamps) and top != len(self.timestamps):
            chunks.append((self.timestamps[bottom], self.timestamps[top]))

            while not (self.is_starting_appearance(bottom) and self.is_ending_appearance(top)):
                if not self.is_starting_appearance(bottom):
                    bottom += 1
                if not self.is_ending_appearance(top):
                    top += 1
            bottom = top + 1
            top += 1
        return chunks


class Node(TemporalObject):
    def __init__(self, id, timestamps=None, positions=None, colors=None, label=None, attributes=None, membership=None,
                 size=1):
        super(Node, self).__init__(timestamps)
        self.id = id
        if label is None:
            self.label = self.id
        else:
            self.label = label
        self.attributes = attributes
        self.membership = membership
        ## only have multiple elements due to the fuse operation
        self.timestamps = timestamps
        self.positions = positions
        self.colors = colors
        if self.colors is None:
            self.colors = [[100,100,100]]
        self.size = size

    def has_position_at(self, i):
        return not None in self.positions[i]

    def has_color_at(self, i):
        return not None in self.colors[i]

    def append_info(self, node):
        self.positions.extend(node.positions)
        self.timestamps.extend(node.timestamps)
        self.colors.extend(node.colors)

    def prepend_dummy(self):
        self.positions.insert(0,None)
        self.timestamps.insert(0,None)
        self.colors.insert(0,None)

    def append_dummy(self):
        self.positions.insert(0,None)
        self.timestamps.insert(0,None)
        self.colors.insert(0,None)


class Edge(TemporalObject):
    def __init__(self, source, target, timestamps=None, attributes=None, weight=None, ranges=None):
        super(Edge, self).__init__(timestamps)
        self.source = source
        self.target = target
        self.weight = None
        self.attributes = attributes
        self.timestamps = timestamps
        self.end = None
        self.ranges = ranges

    def key(self):
        return '{0}:{1}'.format(self.source, self.target)


#   convenience methods for instantiation   ########################################

def load_igraph(igraph_obj):
    return Graph(igraph_obj=igraph_obj)


class Graph(TemporalObject):
    """
    Intermediary object which holds graph data. Timestamps property has no null entries
    """
    def __init__(self, timestamps=None, xml_string = None, igraph_obj=None, layout=None, centroids=None,
                 json_string=None, clusters=None, model_id=None):
        super(Graph, self).__init__(timestamps)
        self.nodes = {}
        self.edges = {}
        self.model_id = model_id
        self.timestamps = timestamps
        self.clusters = clusters
        if centroids is not None:
            self.centroids = centroids
        if igraph_obj is not None:
            self.igraph = igraph_obj
            self.__load_igraph(igraph_obj, layout)
        if json_string is not None:
            self.__json_loads(json_string)
        if xml_string is not None:
            self.__load_from_xml(xml_string)

    @staticmethod
    def color_for_index(i):
        """
        feel free to redefine this as needed
        """
        return hex_to_rgb(DEFAULT_COLORS[i % len(DEFAULT_COLORS)])

    def __load_from_xml(self, xml_string):
        root_tree = fromstring(xml_string)
        nodes_el = root_tree.find("graph").find("nodes")
        edges_el = root_tree.find("graph").find("edges")
        vis_namespace = {"viz":"http://www.gexf.net/1.2draft/viz"}
        get_pos_attr = lambda item: [item.attrib["x"], item.attrib["y"], item.attrib["z"]]
        get_col_attr = lambda item: [item.attrib["r"], item.attrib["g"], item.attrib["b"]]
        graph_timestamps = root_tree.find("graph").find("attvalues").find("timestamps").findall("timestamp")
        cluster_centroids = root_tree.find("graph").find("attvalues").findall("centroids")
        self.timestamps = [item.attrib["t"] for item in graph_timestamps]

        for node_el in nodes_el.findall('node'):
            timestamps_el = node_el.find("attvalues").find("timestamps")
            id = node_el.attrib['id']
            label = node_el.attrib['label']
            positions = sorted([get_pos_attr(item) for item in list(node_el.findall('viz:position',
                                                                                    namespaces=vis_namespace))])
            timestamps = sorted([item.attrib["t"] for item in list(timestamps_el.findall('timestamp'))])
            colors = [get_col_attr(item) for item in sorted(list(node_el.findall('viz:color', namespaces=vis_namespace)),
                                                            lambda x: x["start"])]
            node = Node(id, timestamps, positions, colors=colors, label=label)

            self.__add_node(node)
        for edge_el in edges_el.findall('edge'):
            spells_el = edge_el.find('spells')

            source = edge_el.attrib["source"]
            target = edge_el.attrib["target"]

            ranges = [(item.attrib["start"], item.attrib["end"]) for item in sorted(list(spells_el.findall('spell')),
                                                                                    lambda x: x["start"])]
            edge = Edge(source, target, ranges=ranges)
            self.__add_edge(edge)

    def __json_loads(self, json_str):
        """
        Load graph from json file
        """
        json_dict = json.loads(json_str)
        cp = Graph()
        for v in json_dict["nodes"]:
            node = Node(v["id"], timestamps=v["timestamps"], colors=v["colors"], label=v["id"],
                        attributes=v["attributes"], membership=v["membership"], positions=v["positions"])
            cp.__add_node(node)

        for e in json_dict["edges"]:
            edge = Edge(e["source"], e["target"], timestamps=e["timestamps"],attributes=e["attributes"],
                        ranges=e["ranges"])
            cp.__add_edge(edge)
        self.__dict__ = json_dict
        self.nodes = cp.nodes
        self.edges = cp.edges

    def __load_igraph(self, graph, timestamp=None):
        if timestamp is not None:
            self.timestamps = [timestamp]
        for i, n in enumerate(graph.vs):
            colors = None
            positions = None
            if "membership" in n.attributes():
                colors = [self.color_for_index(int(n["membership"]))]
            if "coordinates" in n.attributes():
                positions = [n["coordinates"]]

            label = n["label"] if "label" in n.attributes() else None
            attributes = n["attributes"] if "attributes" in n.attributes() else None
            node = Node(n["name"], colors=colors, positions=positions, label=label,
                        timestamps=self.timestamps, membership=n["membership"], attributes=attributes)
            self.__add_node(node)

        for (source, target) in graph.get_edgelist():
            source_name = graph.vs[source]["name"]
            target_name = graph.vs[target]["name"]
            edge = Edge(source_name, target_name, timestamps=self.timestamps)
            self.__add_edge(edge)
        print ("totals after processing: {} vertices, {} edges".format(len(self.nodes.keys()), len(self.edges.keys())))

    def __load_csv_edgelist(self, fn):
        with open(fn) as f:
            for line in csv.reader(f):
                edge = Edge(line[0],line[1])
                self.__add_edge(edge)

    def __load_csv_nodelist(self, fn):
        with open(fn) as f:
            for line in csv.reader(f):
                node = Node(line[0])
                self.__add_node(node)

    def __add_node(self, node):
        """
        attempt to concatenate with existing version of node, otherwise add a new one
        """

        if node.__class__ != Node: raise TypeError
        if node.id in self.nodes and node.timestamps is not None:
            self.nodes[node.id].positions.extend(node.positions)
            self.nodes[node.id].timestamps.extend(node.timestamps)
        else:
            self.nodes[node.id] = node

    def __add_edge(self, edge):
        if edge.__class__ == Edge:
            self.edges[edge.key()] = edge
        else:
            raise TypeError("edges must be of type gexdat.Edge")

    def __create_base_element(self, description="hungry", creator="hippo", edge_type='undirected', mode='dynamic'):
        attributes = {"xmlns:viz":"http://www.gexf.net/1.2draft/viz"}

        root = Element("gexf", attrib=attributes)
        date = datetime.today().strftime("%m_%d_%y")
        meta = SubElement(root, "meta", lastmodifieddate=date)
        if description is not None:
            SubElement(meta,"description").text = description
        if creator is not None:
            SubElement(meta,"creator").text = creator
        graph = SubElement(root, "graph", defaultedgetype=edge_type, mode=mode, timeformat="double")
        attributes_el = SubElement(graph, 'attvalues')
        timestamps_el = SubElement(attributes_el, 'timestamps')

        for timestamp in self.timestamps:
            SubElement(timestamps_el, 'timestamp', t=str(timestamp))

        for centroid in self.centroids:
            SubElement(attributes_el, 'centroid', x=str(centroid[0]), y=str(centroid[1]), z=str(centroid[2]))
        return root, graph

    def __nodes_element(self):
        """
        make nodes xml element from nodes. Position and Color subject to dynamics
        """
        nodes_el = Element("nodes")

        for node_id in self.nodes.keys():
            node = self.nodes[node_id]
            gexf_node = SubElement(nodes_el, 'node', id=str(node.id), label=str(node.label),
                        start=str(node.timestamps[0]), end=str(node.timestamps[-1]), membership=str(node.membership))
            attributes_el = SubElement(gexf_node, 'attvalues')
            timestamps_el = SubElement(attributes_el, 'timestamps')
            SubElement(gexf_node, 'viz:size', value=str(node.size))

            for i, position in enumerate(node.positions):
                timestamp = node.timestamps[i]
                SubElement(timestamps_el, 'timestamp', t=str(timestamp))
                color = node.colors[i]
                if i + 1 >= len(node.positions) and timestamp is not None:
                    SubElement(gexf_node, 'viz:position', x=str(position[0]), y=str(position[1]),
                               z=str(position[2]), start = str(timestamp))
                    SubElement(gexf_node, 'viz:color', r=str(color[0]), g=str(color[1]),
                               b=str(color[2]), start = str(timestamp))

                elif timestamp is not None:
                    next_timestamp = str(node.timestamps[i+1])
                    SubElement(gexf_node, 'viz:position', x=str(position[0]), y=str(position[1]), z=str(position[2]),
                               start = str(timestamp), end= next_timestamp)
                    SubElement(gexf_node, 'viz:color', r=str(color[0]), g=str(color[1]), b=str(color[2]),
                               start = str(timestamp), end=next_timestamp)

        return nodes_el

    def __edges_element(self):
        """
        create xml element from edge list
        """
        edges = Element("edges")
        for edge_id in self.edges.keys():
            edge = self.edges[edge_id]
            gexf_edge = SubElement(edges,'edge', source=str(edge.source), target=str(edge.target))
            spells_el = SubElement(gexf_edge, "spells")
            for active_chunk in edge.ranges:
                SubElement(spells_el, "spell", start=str(active_chunk[0]), end=str(active_chunk[1]))

        return edges

    def compute_gexf(self):
        """
        creates an xml_string of  the graph in gexf format to file with no modifications to the object
        """
        root, graph = self.__create_base_element()

        nodes_element = self.__nodes_element()
        edges_element = self.__edges_element()

        graph.insert(0, nodes_element)
        graph.insert(0, edges_element)

        xml_string = tostring(root)

        return xml_string

    def json_dumps(self):
        """
        returns a json string
        """
        nodes_copy = self.nodes.copy()
        edges_copy = self.edges.copy()

        def clean_node(node):
            for k, v in node.attributes.iteritems():
                # if k == "max_people":
                #     print v, str(v)
                if str(v) == "nan":
                    node.attributes[k] = "null"
            return node

        self.nodes = [clean_node(self.nodes[key]) for key in self.nodes.keys()]

        self.edges = [self.edges[key] for key in self.edges.keys()]
        json_str = json.dumps(self.__dict__, default=lambda o: o.__dict__, sort_keys=True)

        self.nodes = nodes_copy
        self.edges = edges_copy
        return json_str


    def __fuse_edges(self, graph):
        current_edges = set(self.edges.keys())
        new_edges = set(graph.edges.keys())

        # update edges that were already there
        for edge_id in current_edges.intersection(new_edges):
            self.edges[edge_id].ranges.extend(graph.edges[edge_id].ranges)
            self.edges[edge_id].consolidate_ranges()

        # copy new edges
        for edge_id in new_edges - current_edges:
            self.edges[edge_id] = graph.edges[edge_id]

    def __fuse_nodes(self, graph):
        current_nodes = set(self.nodes.keys())
        new_nodes = set(graph.nodes.keys())

        # update nodes that were already there
        for node_id in current_nodes.intersection(new_nodes):
            self.nodes[node_id].append_info(graph.nodes[node_id])

        # copy new nodes
        for node_id in new_nodes - current_nodes:
            self.nodes[node_id] = graph.nodes[node_id]
            self.nodes[node_id].prepend_dummy()

        # add sentinel entries for nodes that are no longer present.
        # This is to keep arrays the same length for all nodes
        for node_id in current_nodes - new_nodes:
            self.nodes[node_id].append_dummy()


    def decorate_nodes(self, ext_node_arr, key="user_id"):
        """
        Take an external array, where each element has a property "key" that we can lookup nodes with

        args
        ext_node_arr -- array of ambiguous node objects

        kwargs
        key -- the name of the property containing the identifier we can use to look up the node internally
        """
        for n_ext in ext_node_arr:
            self.__decorate_node(n_ext, key)

    def __decorate_node(self, n_ext, key):
        identifier = str(n_ext[key])
        try:
            n_int = self.nodes[identifier]
            for k in n_ext.keys():
                n_int.__dict__[k] = n_ext[k]
            return True
        except:
            return False


    def fuse(self, graph):
        """
        fuse with another timestamped graph, to create a dynamic graph (if not one already)
        """
        self.__fuse_nodes(graph)
        self.__fuse_edges(graph)


