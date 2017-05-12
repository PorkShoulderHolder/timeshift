/**
 * Created by sam.royston on 8/11/15.
 */

var TimeShift = function(data_strs, containing_element){
    var self = this;


    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera( 27, window.innerWidth / window.innerHeight );
    this.camera.position.z = 850;
    this.camera.far = 3050;
    this.controls = new THREE.TrackballControls( this.camera );
    this.controls.rotateSpeed = 1.4;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.noZoom = false;
    this.controls.noPan = false;
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.8;
    this.controls.keys = [ 65, 83, 68 ];
    this.renderer = new THREE.WebGLRenderer( {alpha: true} );
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    this.renderer.autoClear = false;
    this.shouldRender = true;
    this.stats = new Stats();
    this.defaultOpacity = 0.14;
    this.container = containing_element;
    this.container.appendChild( this.renderer.domElement );

    this._networks = [];
    data_strs.forEach(function(string){
        var network = new GraphiteRenderer(self.camera,self.controls, self.scene, self.renderer);
        network.loadGraph(string, GraphiteRenderer.JSONTYPE);
        self._networks.push(network);
    });
    this.t = 0;
    this.initBuffers();
    this.bindMeshes();
    this.synchronizePositions(this.currentNetwork());
    this.currentNetwork().modularityColors();

    this.stats.domElement.style.top = '0px';
    this.stats.domElement.style.margin = '15px';
    this.stats.domElement.style.position = 'absolute';

    var graphRenderer = this.currentNetwork();
    graphRenderer.clusterList.forEach(function(cid){
        try{
            var cluster = graphRenderer.clusters[cid];

            var thumb = generateThumb("borg", g, "yup");
            thumb.click(function(){
                cluster.toggleActivation();
            });

            thumb.appendTo($("#clusterlist"));
            cluster.dom = thumb;
            cluster.setTextSprite(2, graphRenderer, cluster.color);
        }
        catch(e){
            console.log(e);
        }
    });
};

TimeShift.prototype.currentNetwork = function(){
    return this._networks[this.t];
};

TimeShift.prototype.getNextNetwork = function(){
    this.t ++;
    this.t %= this._networks.length;
    return this.currentNetwork();
};

TimeShift.prototype.getPreviousNetwork = function(){
    this.t = this.t == 0 ? this._networks.length - 1 : this.t -1;
    return this.currentNetwork();
};

TimeShift.prototype.synchronizePositions = function(network){
    var ind = 0;
    var self = this;
    network.clusterList.forEach(function(cid){
        var cluster = network.clusters[cid];
        var points = self.pointclouds[ind];
        var lines = self.clusterLines[ind];
        points.setPositions(cluster, network);
        lines.setPositions(cluster, network);
        ind++;
    });
    ind = 0;
    network.intraclusterList.forEach(function(cid){
        var intracluster = network.intraclusters[cid];
        var lines = self.intraLines[ind];
        lines.setPositions(intracluster, network);
        ind++;
    });
};

TimeShift.prototype.synchronizeColors = function(network){

};

TimeShift.prototype.next = function(){
    var network = this.getNextNetwork();
    this.synchronizePositions(network);
    network.modularityColors();
};

TimeShift.prototype.previous = function(){
    var network = this.getPreviousNetwork();
    this.synchronizePositions(network);
    network.modularityColors();
};

TimeShift.prototype.bindMeshes = function(){
    var self = this;
    this._networks.forEach(function(network){
        var ind = 0;
        network.clusterList.forEach(function(cid){
            var cluster = network.clusters[cid];
            cluster.pointcloud = self.pointclouds[ind].mesh;
            cluster.lineMesh = self.clusterLines[ind].mesh;
            ind++;
        });
        network.pointclouds = self.pointclouds.map(function(pc){return pc.mesh;});
        ind = 0;
        network.intraclusterList.forEach(function(cid){
            var intracluster = network.intraclusters[cid];
            intracluster.lineMesh = self.intraLines[ind].mesh;
            ind++;
        })
    });
};


TimeShift.prototype.renderScene = function() {
    if( this.shouldRender ){
        this.renderer.render( this.scene, this.camera );
    }

};


TimeShift.prototype.initBuffers = function(curveRes){
    /*
    clusterLists are already sorted
    */
    if(curveRes == undefined){
        curveRes = 2;
    }
    var self = this;
    this._networks.sort(function(nety,netq){
        return netq.clusterList.length - nety.clusterList.length;
    });
    var nodeSizes = this._networks[0].clusterListByNode.map(function(cid){
        return self._networks[0].clusters[cid].nodes.length;
    });
    var edgeSizes = this._networks[0].clusterList.map(function(cid){
        return self._networks[0].clusters[cid].edges.length;
    });
    var intraClusterSizes = this._networks[0].intraclusterList.map(function(cid){
        return self._networks[0].intraclusters[cid].edges.length;
    });

    this._networks.forEach(function(net){
        var i = 0;
        var j = 0;
        var k = 0;

        net.clusterListByNode.forEach(function(cid){
            var cluster = net.clusters[cid];
            if(nodeSizes[i] < cluster.nodes.length) nodeSizes[i] = cluster.nodes.length;
            i++;
        });
        net.clusterList.forEach(function(cid){
            var cluster = net.clusters[cid];
            if(edgeSizes[j] < cluster.edges.length) edgeSizes[j] = cluster.edges.length;
            j++;
        });
        net.intraclusterList.forEach(function(cid){
            var intraCluster = net.intraclusters[cid];
            if(intraClusterSizes[k] < intraCluster.edges.length) intraClusterSizes[k] = intraCluster.edges.length;
            k++;
        });
    });

    this.pointclouds = [];
    this.clusterLines = [];
    this.intraLines = [];

    edgeSizes.forEach(function(esize){
       var lines = new Graphics.Lines(esize, 3, 0.4);
       self.scene.add(lines.mesh);
       lines.mesh.material.opacity = self.defaultOpacity;
       self.clusterLines.push(lines);
    });
    intraClusterSizes.forEach(function(esize){
       var lines = new Graphics.Lines(esize, 3, 0.4);
       self.scene.add(lines.mesh);
       lines.mesh.material.opacity = self.defaultOpacity;
       self.intraLines.push(lines);
    });
    nodeSizes.forEach(function(nsize){
       var pointcloud = new Graphics.PointCloud(nsize);
       self.scene.add(pointcloud.mesh);
       self.pointclouds.push(pointcloud);
    });
};

