__author__ = 'sam.royston'
from xml.dom.minidom import parseString

from gexdat import Graph
from random import randrange
from datastore import db
import difflib

test_gexf_1 = '<gexf xmlns:viz="http://www.gexf.net/1.2draft/viz"><meta lastmodifieddate="06_16_15"><description>hungry</description><creator>hippo</creator></meta>' \
                  '<graph defaultedgetype="undirected" mode="static">' \
                    '<attvalues> ' \
                        '<timestamps>' \
                            '<timestamp t="1482947532"/>' \
                        '</timestamps>' \
                    '</attvalues>' \
                    '<nodes>' \
                        '<node id="0" label="1389027157">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="62.1817951223" y="-54.4532200515" z="41.805035391" start="1482947532"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="1" label="25558124">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="63.6997729008" y="16.2171231869" z="-31.8038678211" start="1482947532"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="2" label="96798045">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="-233.597982049" y="-80.795152307" z="-99.9236817835" start="1482947532"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                    '</nodes>' \
                    '<edges>' \
                        '<edge source="1" target="0">' \
                            '<spells>' \
                                '<spell start="1482947532" end="1482947532" />' \
                            '</spells>' \
                        '</edge>' \
                        '<edge source="0" target="2" >' \
                            '<spells>' \
                                '<spell start="1482947532" end="1482947532" />' \
                            '</spells>' \
                        '</edge>' \
                    '</edges>' \
                '</graph>' \
            '</gexf>'

test_gexf_2 = '<gexf xmlns:viz="http://www.gexf.net/1.2draft/viz"><meta lastmodifieddate="06_16_15"><description>hungry</description><creator>hippo</creator></meta>' \
                  '<graph defaultedgetype="undirected" mode="static">' \
                    '<attvalues> ' \
                        '<timestamps>' \
                            '<timestamp t="1482987552"/>' \
                        '</timestamps>' \
                    '</attvalues>' \
                    '<nodes>' \
                        '<node id="0" label="1389027157">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482987552" />' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="67.1817951223" y="-51.4532200515" z="21.805035391" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="1" label="25558124">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="61.6997729008" y="16.2171231869" z="-39.8038678211" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="2" label="96798045">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="-233.597982049" y="-180.795152307" z="-199.9236817835" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="3" label="96798012">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="-33.597982049" y="-80.795152307" z="-91.9236817835" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                    '</nodes>' \
                    '<edges>' \
                        '<edge source="0" target="2">' \
                            '<spells>' \
                                '<spell start="1482987552" end="1482987552" />' \
                            '</spells>' \
                        '</edge>' \
                        '<edge source="1" target="3" >' \
                            '<spells>' \
                                '<spell start="1482987552" end="1482987552" />' \
                            '</spells>' \
                        '</edge>' \
                    '</edges>' \
                '</graph>' \
            '</gexf>'

solution_gexf = '<gexf xmlns:viz="http://www.gexf.net/1.2draft/viz"><meta lastmodifieddate="06_16_15"><description>hungry</description><creator>hippo</creator></meta>' \
                  '<graph defaultedgetype="undirected" mode="dynamic">' \
                        '<attvalues> ' \
                            '<timestamps>' \
                                '<timestamp t="1482947532"/>' \
                                '<timestamp t="1482987552"/>' \
                            '</timestamps>' \
                        '</attvalues> ' \
                    '<nodes>' \
                        '<node id="0" label="1389027157">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="67.1817951223" y="-51.4532200515" z="21.805035391" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="1" label="25558124">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="61.6997729008" y="16.2171231869" z="-39.8038678211" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="2" label="96798045">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="1482947532"/>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="-233.597982049" y="-180.795152307" z="-199.9236817835" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                        '<node id="3" label="96798012">' \
                            '<attvalues> ' \
                                '<timestamps>' \
                                    '<timestamp t="None"/>' \
                                    '<timestamp t="1482987552"/>' \
                                '</timestamps>' \
                            '</attvalues>' \
                            '<viz:size value="1" />' \
                            '<viz:position x="-33.597982049" y="-80.795152307" z="-91.9236817835" start="1482987552"/>' \
                            '<viz:color r="100" g="100" b="100" />' \
                        '</node>' \
                    '</nodes>' \
                    '<edges>' \
                        '<edge source="1" target="0">' \
                            '<spells>' \
                                '<spell start="1482947532" end="1482947532" />' \
                            '</spells>' \
                        '</edge>' \
                        '<edge source="0" target="2">' \
                            '<spells>' \
                                '<spell start="1482947532" end="1482987552"/>' \
                            '</spells>' \
                        '</edge>' \
                        '<edge source="0" target="2">' \
                            '<spells>' \
                                '<spell start="1482987552" end="1482987552" />' \
                            '</spells>' \
                        '</edge>' \
                        '<edge source="1" target="3" >' \
                            '<spells>' \
                                '<spell start="1482987552" end="1482987552" />' \
                            '</spells>' \
                        '</edge>' \
                    '</edges>' \
                '</graph>' \
            '</gexf>'


def gexf_test():
    g1 = Graph(xml_string=test_gexf_1)
    g2 = Graph(xml_string=test_gexf_2)

    print g1.edges[g1.edges.keys()[0]].ranges
    print g2.edges[g2.edges.keys()[0]].ranges

    gexf1 = parseString(g1.compute_gexf())
    gexf2 = parseString(g2.compute_gexf())

    g1.fuse(g2)

    gexf_sol  = parseString(g1.compute_gexf())

    solg = parseString(Graph(xml_string=solution_gexf).compute_gexf())

    print "actual:"
    #print solg.toprettyxml()

    print "computed:"
    print gexf_sol.toprettyxml()

def json_test():
    g1_json = db.get_json_s3("poncholauncho_1438016311-json")
    g2_json = db.get_json_s3("ponchosmaller_1438038975-json")
    g3_json = db.get_json_s3("ponchosmallermuch_1438043059-json")
    g4_json = db.get_json_s3("ponchosmaller?_1438043551-json")

    g1= Graph(json_string=g1_json)
    g2= Graph(json_string=g2_json)
    g3= Graph(json_string=g3_json)
    g4= Graph(json_string=g4_json)
    print len(g1.nodes.keys())
    print len(g2.nodes.keys())
    print len(g3.nodes.keys())
    print len(g4.nodes.keys())
    g1.fuse(g2)
    g1.fuse(g3)
    print g1.nodes[g1.nodes.keys()[randrange(0,len(g1.nodes.keys()))]].__dict__
    print g1.edges[g1.edges.keys()[randrange(0,len(g1.edges.keys()))]].__dict__
    for n in g1.nodes.keys():

        print g1.nodes[n].positions

json_test()