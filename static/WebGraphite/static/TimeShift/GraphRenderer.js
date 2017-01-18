


function GraphiteRenderer(camera, controls, scene, renderer){
    this.initVars(camera, controls, scene, renderer);
}

GraphiteRenderer.JSONTYPE = 'json';
GraphiteRenderer.XMLTYPE = 'xml';
GraphiteRenderer.FULLGRAPH = 'fullgraph';

GraphiteRenderer.prototype.initVars = function(camera, controls, scene, renderer){
    this.multiplier = 1;
    this.DEFAULT_COLORS = ["#FF6A00","#5ec8da","#FEBE10","#239dba","#36C776","#BDDC76"];
    this.NEAR = 1.5 * this.multiplier;
    this.FAR  = 4.5 * this.multiplier;
    this.graphDict = {};
    this.mouse = new THREE.Vector2();
    this.selectedCluster = undefined;
    this.mouse.x = 0.5;
    this.mouse.y = 0.5;
    this.picsize = 0.081;
    this.threshold = this.multiplier * 0.08;
    this.geometries = [];
    this.clusters = {};
    this.ba = 0;
    this.pointclouds = [];
    this.intraclusters = {};
    this.nodeDict = {};
    this.edgeDict = {};
    this.camera = camera;
    this.controls = controls;
    this.scene = scene;
    this.renderer = renderer;

    this.shouldRender = true;

    this.modularityMode = true;
    var self = this;
    window.addEventListener( 'mousemove', function(e){
        self.mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        self.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    });
    window.addEventListener( 'click', function(e){
        if(e.shiftKey){
            self.mouseOverRender();
        }
        else if(e.altKey){
            self.clusterSpriteMouseover();
        }
    });
    window.addEventListener( 'resize', function(){onWindowResize(self)}, false );
    this.sprites = new SpriteSet(self);
    this.debugLines = [];
    var geometry = new THREE.SphereGeometry( 2, 32, 32 );
    var material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    this.sphere = new THREE.Mesh( geometry, material );
    this.scene.add(this.sphere);
    this.sphere.scale.multiplyScalar(0.001);
};

GraphiteRenderer.prototype.zoomToUser = function(id, ms){
    var self = this;
    var pointcloud =  this.graphDict[id].pointcloud;
    var userPosition = new THREE.Vector3( this.graphDict[id].positions[0][0] * self.multiplier,
                                          this.graphDict[id].positions[0][1] * self.multiplier,
                                          this.graphDict[id].positions[0][2] * self.multiplier);
    var finalPosition = new THREE.Vector3().copy(userPosition);
    var currentPosition = new THREE.Vector3().copy(self.camera.position);
    this.highlightUser(this.graphDict[id]);

    finalPosition.add(new THREE.Vector3().copy(finalPosition).normalize().multiplyScalar(100));

    var tweenTranslate = new TWEEN.Tween( {x: currentPosition.x, y: currentPosition.y, z: currentPosition.z} )
        .to( {x: finalPosition.x, y: finalPosition.y, z: finalPosition.z}, ms)
        .easing( TWEEN.Easing.Quadratic.InOut )
        .onUpdate( function(){
            self.camera.position.x = this.x;
            self.camera.position.y = this.y;
            self.camera.position.z = this.z;
            self.camera.lookAt(new THREE.Vector3(0,0,0));
        });

    tweenTranslate.start();
};

GraphiteRenderer.prototype.separateClusters = function(scale, ms, direction){
    if ( direction == undefined ){
        direction = 'forward';
    }
    else if(direction != 'backward' && direction != 'forward'){
        console.log("direction '" + direction + "' should be 'forward' or 'backward'") ;
        throw TypeError;
    }
    var self = this;
    var oldPositions = {};
    self.clusterList.forEach( function(cid){
       var cluster = self.clusters[cid];
       oldPositions[cluster.id] = new THREE.Vector3().copy(cluster.centroid);
    });

    var fader = function(){
        self.intraclusterList.forEach(function(cid){
           var intracluster = self.intraclusters[cid];
        if(direction != 'forward'){
            self.scene.add(intracluster.lineMesh);
        }
           var oldOpacity = direction == 'forward' ? intracluster.defaultOpacity : 0;
           var newOpacity = direction != 'forward' ? intracluster.defaultOpacity : 0;
           var anim = intracluster.fade(ms / 4, oldOpacity, newOpacity);
           anim.onComplete(function(){
                if(direction == 'forward'){
                    self.scene.remove(intracluster.lineMesh);
                }
           }).start();
        });
    };

    var start = direction == 'forward' ? 0 : 1;
    var end = direction != 'forward' ? 0 : 1;
    var textStart = direction == 'forward' ? 2 : 5;
    var textFinish = direction != 'forward' ? 2 : 5;
    var exploder = new TWEEN.Tween( {t: start, textPos: textStart} )
        .to( {t: end, textPos: textFinish}, ms)
        .easing( TWEEN.Easing.Quadratic.InOut )
        .onUpdate( function(){
            var ease = this;
            self.clusterList.forEach(function(cid){
               var cluster = self.clusters[cid];
                if("lineMesh" in cluster && "textSprite" in cluster){
                    cluster.textSprite.position.x = cluster.centroid.x * ease.textPos;
                    cluster.textSprite.position.y = cluster.centroid.y * ease.textPos;
                    cluster.textSprite.position.z = cluster.centroid.z * ease.textPos;
                    cluster.lineMesh.position.copy(new THREE.Vector3().copy(oldPositions[cluster.id]).multiplyScalar(scale * ease.t));
                    cluster.pointcloud.position.copy(new THREE.Vector3().copy(oldPositions[cluster.id]).multiplyScalar(scale * ease.t));
                }
            });
        });
    if( direction == 'forward' ){
        fader();
        exploder.delay(ms / 5);
        exploder.start();
    }
    else{
        exploder.onComplete(fader);
        exploder.start();
    }
};

GraphiteRenderer.prototype.showClusterLabels = function(){
    var self = this;
    this.clusterList.forEach(function(cid){
        var cluster = self.clusters[cid];
        cluster.showTextSprite();
    });
};

GraphiteRenderer.prototype.hideClusterLabels = function(){
    var self = this;
    this.clusterList.forEach(function(cid){
        var cluster = self.clusters[cid];
        cluster.hideTextSprite();
    });
};

GraphiteRenderer.prototype.consolidateGraphData = function (){
    var self = this;
    this.handleDict = {};
    this.maxWNF = 0;
    this.graph.nodes.forEach(function(n){
        if(n.weight_norm_followers > self.maxWNF){ self.maxWNF = n.weight_norm_followers}
        self.graphDict[n.id] = n;
        if(n.screen_name != undefined){
            self.handleDict[n.screen_name.toLowerCase()] = n.id;
        }
    });
};

GraphiteRenderer.prototype.loadGraph = function(model_data_str,  data_type){
    if( data_type == undefined ){
        data_type = GraphiteRenderer.XMLTYPE;
    }
    if (data_type == GraphiteRenderer.JSONTYPE){
        this.graph = model_data_str;

        this.data_type = GraphiteRenderer.JSONTYPE;

    }
    else{
        var xml_dom = new DOMParser().parseFromString(model_data_str, "application/xml");
        this.graph = gexf.parse(xml_dom);
        this.data_type = GraphiteRenderer.XMLTYPE;
    }
    this.consolidateGraphData();
    if(this.data_type == GraphiteRenderer.JSONTYPE){
        this.resolveClusters();
    }
};

GraphiteRenderer.prototype.resolveClusters = function(){
    var self = this;
    this.clusters = {};
    this.intraclusters = {};
    this.resolvePointsByCluster();
    this.resolveEdgesByCluster();

    this.clusterListByNode = Object.keys(this.clusters).sort(function(key1, key2){
        return self.clusters[key2].nodes.length - self.clusters[key1].nodes.length;
    });
    this.clusterList = Object.keys(this.clusters).sort(function(key1, key2){
        return self.clusters[key2].edges.length - self.clusters[key1].edges.length;
    });
    this.intraclusterList = Object.keys(this.intraclusters).sort(function(key1,key2){
        return self.intraclusters[key2].edges.length - self.intraclusters[key1].edges.length;
    });
};

GraphiteRenderer.prototype.addDebugAxis = function(axisLength){
    //Shorten the vertex function
    function v(x,y,z){
            return new THREE.Vector3(x,y,z);
    }

    //Create axis (point1, point2, colour)
    function createAxis(p1, p2, color){
            var line, lineGeometry = new THREE.Geometry(),
            lineMat = new THREE.LineBasicMaterial({color: color, lineWidth: 1});
            lineGeometry.vertices.push(p1, p2);
            line = new THREE.Line(lineGeometry, lineMat);
            this.scene.add(line);
            return line;
    }

    var x = createAxis(v(-axisLength, 0, 0), v(axisLength, 0, 0), 0xFF0000);
    var y = createAxis(v(0, -axisLength, 0), v(0, axisLength, 0), 0x00FF00);
    var z = createAxis(v(0, 0, -axisLength), v(0, 0, axisLength), 0x0000FF);
    this.removeDebugAxis();
    this.debugLines = [x,y,z];
};

GraphiteRenderer.prototype.removeDebugAxis = function(){
    var self = this;
    this.debugLines.forEach( function(line){
       self.scene.remove(line);
    });
};

onWindowResize = function(r){
    r.camera.aspect = window.innerWidth / window.innerHeight;
    r.camera.updateProjectionMatrix();
    r.renderer.setSize( window.innerWidth, window.innerHeight );
};


GraphiteRenderer.prototype.synchronizeGraphicsObjects = function(){
    /*
    This should be called as sparingly as possible. Updates the display with new graph data.
    This should not be used to animate graphs, only to initialize. To animate, pass
    the states in your data object to load into the gpu.
    Input: a graph object
     */
    var self = this;
    if( this.data_type == GraphiteRenderer.JSONTYPE){
        for (var k in this.clusters ){
            var cluster = this.clusters[k];
            this.addPointCloud(cluster, cluster.id);
            if( cluster.edges.length > 0){
                this.setupEdges(cluster);
            }
        }
        for (var j in this.intraclusters ){
            var intracluster = this.intraclusters[j];
            if( intracluster.edges.length > 0){
                this.setupEdges(intracluster);
            }
        }
    }
    else{
        this.addPointCloud(this.graph);
        this.setupEdges(this.graph);
    }
    //this.modularityColors();
};

GraphiteRenderer.prototype.addPointCloud = function(graph, id){
    if( this.data_type == GraphiteRenderer.XMLTYPE ){
        this.addPointCloudGexfFormat(graph, id);
    }
    else if( this.data_type == GraphiteRenderer.JSONTYPE ){
        this.addPointCloudJsonFormat(graph, id);
    }
};

GraphiteRenderer.prototype.resolvePointsByCluster = function(){
    /*
     Populates the clusters nodes property. Make sure to call after GraphiteRenderer.loadGraph(..), not before.
     */
    var self = this;
    this.graph.nodes.forEach( function(n){
         if( n.clusterID == undefined ){
             n.clusterID = n.membership.toString();
         }
         if( self.clusters[n.clusterID] == undefined ){
            self.clusters[n.clusterID] = new Cluster(n.clusterID);
         }
         var cluster = self.clusters[n.clusterID];
         cluster.nodes.push(n);
         if(n.colors[0] != undefined){
             cluster.color = n.colors[0].map(function(c){return c / 256;});
         }
    });
    this.graph.clusters.forEach(function(cluster_data){
        try{
            var cluster = self.clusters[cluster_data.id];
            cluster.meta_data = cluster_data;
        }
        catch(e){

        }
    });
};

GraphiteRenderer.prototype.resolveEdgesByCluster = function(){
    /*
     Populates the clusters edges property.
     */
    var self = this;
    this.graph.edges.forEach( function(e){
         var source = self.graphDict[e.source];
         var target = self.graphDict[e.target];

         if( source.clusterID == target.clusterID ){
             if( self.clusters[source.clusterID] == undefined ){
                self.clusters[source.clusterID] = new Cluster(source.clusterID);
             }
             var cluster = self.clusters[source.clusterID];
             cluster.edges.push(e);
         }
         else{
            var k = IntraCluster.keyGen(e, self.graphDict);
            if( self.intraclusters[k] == undefined ){
                self.intraclusters[k] = new Cluster(k);
            }
            var intracluster = self.intraclusters[k];
            intracluster.edges.push(e);
         }
    });
};

GraphiteRenderer.prototype.addPointCloudJsonFormat = function(graph, id){
    /*
    Upload the node data when given in complete json (including temporal data)
    */

    var points = new Float32Array( graph.nodes.length * 3);
    var pointColors = new Float32Array( graph.nodes.length * 3 );
    var centroid = new THREE.Vector3(0,0,0);

    for ( var g = 0; g < graph.nodes.length; g ++ ) {
        var node = graph.nodes[g];
        node.idx = g;
        this.graphDict[node.id].idx = g;
        points[ (g * 3) ] = node.positions[0][0] * this.multiplier;;
        points[ (g * 3) + 1 ] = node.positions[0][1] * this.multiplier;
        points[ (g * 3) + 2 ] = node.positions[0][2] * this.multiplier;

        centroid.add(new THREE.Vector3(points[ (g * 3) ],points[ (g * 3) + 1],points[ (g * 3)  + 2]));

        pointColors[ (g * 3) ] = node.colors[0][0] / 256;
        pointColors[ (g * 3) + 1 ] = node.colors[0][1] / 256;
        pointColors[ (g * 3) + 2 ] = node.colors[0][2] / 256;
    }
    var geometryPc = new THREE.BufferGeometry();
    var materialPc = new THREE.PointCloudMaterial({vertexColors: THREE.VertexColors, size:0.4});

    geometryPc.addAttribute( 'position', new THREE.BufferAttribute( points, 3 ) );
    geometryPc.addAttribute( 'color', new THREE.BufferAttribute( pointColors, 3 ) );
    geometryPc.dynamic = true;
    geometryPc.computeBoundingSphere();
    var PcMesh = new THREE.PointCloud( geometryPc , materialPc );
    PcMesh.name = id;
    this.scene.add(PcMesh);
    this.pointclouds.push(PcMesh);
    centroid.divideScalar(graph.nodes.length);
    graph.centroid = centroid;
    graph.pointcloud = PcMesh;
};

GraphiteRenderer.prototype.addPointCloudGexfFormat = function(graph, id){
    /*
    Upload the node data when graph object originates from gexf
    (not compatable with temporal data as of 7/27/15)
    */

    var points = new Float32Array( graph.nodes.length * 3);
    var pointColors = new Float32Array( graph.nodes.length * 3 );
    for ( var g = 0; g < graph.nodes.length; g ++ ) {
        var node = graph.nodes[g];
        var x = node.viz.position.x * this.multiplier;
        var y = node.viz.position.y * this.multiplier;
        var z = node.viz.position.z * this.multiplier;

        points[ (g * 3) ] = x;
        points[ (g * 3) + 1 ] = y;
        points[ (g * 3) + 2 ] = z;

        var re = node.viz.color.split('(')[1].split(')')[0].split(',')[0];
        var gr = node.viz.color.split('(')[1].split(')')[0].split(',')[1];
        var bl = node.viz.color.split('(')[1].split(')')[0].split(',')[2];
        pointColors[ (g * 3) ] = re / 256.0;
        pointColors[ (g * 3) + 1 ] = gr / 256.0;
        pointColors[ (g * 3) + 2 ] = bl / 256.0;
    }
    var geometryPc = new THREE.BufferGeometry();
    var materialPc = new THREE.PointCloudMaterial({vertexColors: THREE.VertexColors, size:0.4});

    geometryPc.addAttribute( 'position', new THREE.BufferAttribute( points, 3 ) );
    geometryPc.addAttribute( 'color', new THREE.BufferAttribute( pointColors, 3 ) );
    geometryPc.dynamic = true;
    geometryPc.computeBoundingSphere();
    var PcMesh = new THREE.PointCloud( geometryPc , materialPc );
    PcMesh.name = id;

    this.scene.add(PcMesh);
    this.pointclouds.push(PcMesh);

};

GraphiteRenderer.prototype.removePointCloud = function(id){
    var obj = this.pointclouds[id];
    this.scene.remove(obj);
    delete this.pointclouds[id];
};

GraphiteRenderer.prototype.removeAllPointClouds = function(){
    var self = this;
    for(var key in this.pointclouds ){
        self.removePointCloud(key);
    }
};

GraphiteRenderer.prototype.toggleCluster = function(intersection){
    if ( intersection.length > 0 ){
        var selected = intersection[0];
        this.selectCluster(selected.object.name);
    }
    else{
        this.deselectCluster(this.selectedCluster);
    }
};

GraphiteRenderer.prototype.mouseOverRender = function(renderFunc) {

    if( renderFunc == undefined ){
        renderFunc = GraphiteRenderer.focusToolTips;
    }
    var intersection = this.rayCast(this.mouse, this.threshold, this.pointclouds);
    if( intersection.length > 0 ){
        var graphics_obj = intersection[0];
        var cluster = this.clusters[graphics_obj.object.name];
        var user_data = cluster.nodes[graphics_obj.index];
        this.highlightUser(user_data);
    }
};

GraphiteRenderer.prototype.selectCluster = function(id){
    if( this.selectedCluster != undefined ){
        this.deselectCluster(this.selectedCluster);
    }
    var cluster = this.clusters[id];
    if( cluster.edges.length > 0 ){
        cluster.lineMesh.material.opacity = 0.5;
        cluster.pointcloud.material.size = 3;
        this.selectedCluster = id;
    }
};

GraphiteRenderer.prototype.deselectCluster = function(id){
    var cluster = this.clusters[id];
    cluster.lineMesh.material.opacity = 0.14;
    cluster.pointcloud.material.size = 0.4;

};


GraphiteRenderer.focusToolTips = function(r, intersection){

    var self = r;
    var filtered_focus = [];
    var ind = 0;
    while(ind < intersection.length && intersection[ind].distance < r.FAR){
        if(intersection[ind].distance > r.NEAR){
            var in_the_zone = intersection[ind];
            filtered_focus.push(in_the_zone);
        }
        ind ++;
    }
    // update ui based on what user is looking at
    var info_dicts = [];

    filtered_focus.forEach(function(item){

        var node_data = self.clusters[item.object.name].nodes[item.index];
        var coordinate = self.data_type == GraphiteRenderer.XMLTYPE ? [node_data.viz.position.x, node_data.viz.position.y, node_data.viz.position.z] : node_data.positions[0];
        coordinate = coordinate.map(function(e){ return e * self.multiplier });

        var username = node_data.name;
        var text = node_data.description;
        var url = node_data.profile_image_url;
        var handle = "@" + node_data.screen_name;
        var location = node_data.location;
        var info = {"img_url":url, "coords":coordinate, "user_name":username, "text":text, "handle":handle, "location":location};
        info_dicts.push(info);
        if (info_dicts.length == 1){
            selectThumb(info);
        }
    });
    if( info_dicts.length > 0 ){
        r.sprites.consolidateUrls(info_dicts);
    }

};

GraphiteRenderer.prototype.setPointSize = function(size){
    var self = this;
    this.clusterList.forEach(function(cid){
        var cluster = self.clusters[cid];
        cluster.pointcloud.material.size = size;
    });
    this.intraclusterList.forEach(function(cid){
        var ic = self.intraclusters[cid];
        ic.pointcloud.material.size = size;
    });
};

GraphiteRenderer.prototype.highlightUser = function(node_data){
    var self = this;

    var coordinate = this.data_type == GraphiteRenderer.XMLTYPE ? [node_data.viz.position.x, node_data.viz.position.y, node_data.viz.position.z] : node_data.positions[0];
    coordinate = coordinate.map(function(e){ return e * self.multiplier });

    var username = node_data.name;
    var text = node_data.description;
    var url = node_data.profile_image_url;
    var handle = "@" + node_data.screen_name;
    var location = node_data.location;
    var info = {"img_url":url, "coords":coordinate, "user_name":username, "text":text, "handle":handle, "location":location};
    selectThumb(info);
    this.sphere.position.x = coordinate[0];
    this.sphere.position.y = coordinate[1];
    this.sphere.position.z = coordinate[2];
    this.activateSphere(1);

};

GraphiteRenderer.prototype.activateSphere = function(size){
    var self = this;
    var rad = new THREE.Vector3(size,size,size);
    this.sphere.material.opacity = 0.5;
    this.sphere.material.transparent = true;
    var breath = function(start,end){
        return new TWEEN.Tween( {t: start} )
        .to( {t: end}, 400)
        .easing( TWEEN.Easing.Quadratic.InOut )
        .onUpdate( function(){
            self.sphere.scale.copy(new THREE.Vector3().copy(rad).multiplyScalar(this.t));
        });
    };
    this.sphereAnimation = breath(1.0,0.5).yoyo(Infinity).repeat(Infinity);
    this.sphereAnimation.start();
};

GraphiteRenderer.prototype.deactivateSphere = function(){
  this.sphere.material.opacity = 0;
  this.sphereAnimation.stop();
};

GraphiteRenderer.prototype.rayCast = function(ray2dLoc, threshold, objs){
        var raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ray2dLoc, this.camera);
        raycaster.params.PointCloud.threshold = threshold;
        return raycaster.intersectObjects(objs);
};

GraphiteRenderer.prototype.focusRender = function(renderFunc) {

    if( renderFunc == undefined ){
        renderFunc = GraphiteRenderer.focusToolTips;
    }
    var focus = new THREE.Vector2(0.0,0.0);
    var focus_intersection = this.rayCast(focus, this.threshold, this.pointclouds);
    renderFunc(this, focus_intersection);
};

GraphiteRenderer.prototype.clusterSpriteMouseover = function(){
    var self = this;
    var intersection = this.rayCast(this.mouse, this.threshold * 3, this.pointclouds);
    if( intersection.length > 0 ){
        var cluster = self.clusters[intersection[0].object.name];
        cluster.toggleActivation();
    }
};

GraphiteRenderer.prototype.wnfColors = function(){
    var self = this;
    this.changeColors(function(node){
        return [0.6, (0.3 + (node.weight_norm_followers / self.maxWNF)), 0.6];
    });
};

GraphiteRenderer.prototype.modularityColors = function(){
   this.changeColors(function(node){
       return [node.colors[0][0] / 256, node.colors[0][1] / 256, node.colors[0][2] / 256];
   });
};

GraphiteRenderer.prototype.changeColors = function(colorFunc){
     var self = this;
     this.clusterList.forEach(function(cid){
         var cluster = self.clusters[cid];
         var avg_color = [0,0,0];
         var i =0;
         cluster.nodes.forEach(function(node){
             var color = colorFunc(node);
             avg_color[0] += color[0];
             avg_color[1] += color[1];
             avg_color[2] += color[2];
             cluster.pointcloud.geometry.attributes.color.array[i * 3] = color[0];
             cluster.pointcloud.geometry.attributes.color.array[i * 3 + 1] = color[1];
             cluster.pointcloud.geometry.attributes.color.array[i * 3 + 2] = color[2];
             i++;
         });
         avg_color = avg_color.map(function(c){ return c / cluster.nodes.length; });
         cluster.pointcloud.geometry.attributes.color.needsUpdate = true;
         cluster.color = avg_color;
        i = 0;
        if("lineMesh" in cluster){
         cluster.edges.forEach(function(edge){
             var source = self.graphDict[edge.source];
             var target = self.graphDict[edge.target];
             var color_s = colorFunc(source);
             var color_t = colorFunc(target);

             cluster.lineMesh.geometry.attributes.color.array[i * 12] = color_s[0];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 1] = color_s[1];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 2] = color_s[2];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 9] = color_t[0];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 10] = color_t[1];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 11] = color_t[2];
             i ++;
         });
            cluster.lineMesh.geometry.attributes.color.needsUpdate = true;
         }
    });
    this.intraclusterList.forEach(function(cid){
        var cluster = self.intraclusters[cid];
        var i = 0;
        cluster.edges.forEach(function(edge){
             var source = self.graphDict[edge.source];
             var target = self.graphDict[edge.target];
             var color_s = colorFunc(source);
             var color_t = colorFunc(target);

                         cluster.lineMesh.geometry.attributes.color.array[i * 12] = color_s[0];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 1] = color_s[1];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 2] = color_s[2];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 9] = color_t[0];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 10] = color_t[1];
             cluster.lineMesh.geometry.attributes.color.array[i * 12 + 11] = color_t[2];
             i ++;
         });
        cluster.lineMesh.geometry.attributes.color.needsUpdate = true;
    });
};

GraphiteRenderer.prototype.toggleColors = function(){
    if( this.modularityMode ){
        this.wnfColors();
    }
    else{
        this.modularityColors();
    }
    this.modularityMode = !this.modularityMode;
};

GraphiteRenderer.prototype.setupEdges = function(graph){
    var curveRes = 2;
    var edges = new Float32Array(graph.edges.length * 3 * curveRes * 2);
    var edgeColors = new Float32Array( graph.edges.length * 3 * curveRes * 2);
    var stepSize = 3 * curveRes * 2;
    for (var i = 0; i < graph.edges.length; i ++){

        var source = this.graphDict[graph.edges[i].source];
        var target = this.graphDict[graph.edges[i].target];

        var targetPos = this.data_type == GraphiteRenderer.XMLTYPE ? [target.viz.position.x, target.viz.position.y, target.viz.position.z] : target.positions[0];
        var sourcePos = this.data_type == GraphiteRenderer.XMLTYPE ? [source.viz.position.x, source.viz.position.y, source.viz.position.z] : source.positions[0];


        var startPos = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
        var finPos = new THREE.Vector3(sourcePos[0], sourcePos[1], sourcePos[2]);
        var difVect = new THREE.Vector3(sourcePos[0], sourcePos[1], sourcePos[2]);
        difVect.sub(startPos);
        var midPoint = new THREE.Vector3();
        midPoint.copy(difVect.divideScalar(2).add(startPos));
        var elbow = difVect.cross(new THREE.Vector3(1,1,0)).normalize().multiplyScalar(0.00 * startPos.distanceTo(finPos));

        var curve = new THREE.QuadraticBezierCurve3(
            startPos,
            new THREE.Vector3(midPoint.x + elbow.x, midPoint.y + elbow.y, midPoint.z + elbow.z),//midPoint.add(new THREE.Vector3(Math.random(),Math.random(),Math.random()).subScalar(0.5).multiplyScalar(10)),
            finPos
        );
        var pointsToAdd = curve.getPoints( curveRes );

        var l = 0;
        var k = i * 6 * pointsToAdd.length;

        var targetColor = this.data_type == GraphiteRenderer.XMLTYPE ?
            target.viz.color.split('(')[1].split(')')[0].split(',').map(function(el){return parseFloat(el)}) : target.colors[0];

        var sourceColor = this.data_type == GraphiteRenderer.XMLTYPE ?
            source.viz.color.split('(')[1].split(')')[0].split(',').map(function(el){return parseFloat(el)}) : source.colors[0];


        var format_id = [source.id,target.id].sort().join(':');

        edges[ i * stepSize ] = sourcePos[0] * this.multiplier;;
        edges[ (i * stepSize) + 1 ] = sourcePos[1] * this.multiplier;
        edges[ (i * stepSize) + 2 ] = sourcePos[2] * this.multiplier;

        edges[ (i * stepSize) + 3] = pointsToAdd[1].x * this.multiplier;
        edges[ (i * stepSize) + 4] = pointsToAdd[1].y * this.multiplier;
        edges[ (i * stepSize) + 5] = pointsToAdd[1].z * this.multiplier;

        edges[ (i * stepSize) + 6] = pointsToAdd[1].x * this.multiplier;
        edges[ (i * stepSize) + 7] = pointsToAdd[1].y * this.multiplier;
        edges[ (i * stepSize) + 8] = pointsToAdd[1].z * this.multiplier;

        edges[ (i * stepSize) + 9] = targetPos[0] * this.multiplier;;
        edges[ (i * stepSize) + 10 ] = targetPos[1] * this.multiplier;
        edges[ (i * stepSize) + 11 ] = targetPos[2] * this.multiplier;

        edgeColors[ (i * stepSize) ] = sourceColor[0] / 256 ;
        edgeColors[ (i * stepSize) + 1 ] = sourceColor[1] / 256;
        edgeColors[ (i * stepSize) + 2 ] =  sourceColor[2] / 256;

        edgeColors[ (i * stepSize) + 3 ] = 100 / 256;
        edgeColors[ (i * stepSize) + 4 ] = 100 / 256;
        edgeColors[ (i * stepSize) + 5 ] = 100 / 256;

        edgeColors[ (i * stepSize) + 6 ] = 100 / 256;
        edgeColors[ (i * stepSize) + 7 ] = 100 / 256;
        edgeColors[ (i * stepSize) + 8 ] = 100 / 256;

        edgeColors[ (i * stepSize) + 9 ] = targetColor[0] / 256;
        edgeColors[ (i * stepSize) + 10 ] = targetColor[1] / 256;
        edgeColors[ (i * stepSize) + 11 ] = targetColor[2] / 256;

    }
    var geometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors, linewidth: 0.001, fog:true});

    material.blending = THREE.NormalBlending;

    material.opacity = graph.defaultOpacity;

    material.transparent = true;

    geometry.addAttribute( 'position', new THREE.BufferAttribute( edges, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( edgeColors, 3 ) );
    geometry.dynamic = true;
    geometry.computeBoundingBox();
    var mesh = new THREE.Line( geometry, material, THREE.LinePieces );
    this.scene.add(mesh);
    graph.lineMesh = mesh;
};

