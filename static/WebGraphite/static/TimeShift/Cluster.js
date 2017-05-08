/**
 * Created by sam.royston on 8/4/15.
 */



function Cluster(id){
    this.nodes = [];
    this.edges = [];
    this.id = id;
    this.meta_data = {};
    this.defaultOpacity = 0.14;
    this.highlightOpacity = 0.5;
    this.currentOpacity = this.defaultOpacity;
    this.activated = false;
}

Cluster.prototype.activate = function(ms, repeats){
    var self = this;
    var fadeFunc = function() {return new TWEEN.Tween( {t: self.defaultOpacity} )
        .to( {t:self.highlightOpacity}, ms)
        .easing( TWEEN.Easing.Linear.None )
        .onUpdate( function(){
            var ease = this;
            if("lineMesh" in self){
                self.lineMesh.material.opacity = ease.t;
            }
        })
        .onComplete(function(){
            self.currentAnimation = fadeFunc2();
            self.currentAnimation.start();
        });
    };

    var fadeFunc2 = function() { return new TWEEN.Tween( {t: self.highlightOpacity} )
        .to( {t:self.defaultOpacity}, ms)
        .easing( TWEEN.Easing.Linear.None )
        .onUpdate( function(){
            var ease = this;
            if("lineMesh" in self){
                self.lineMesh.material.opacity = ease.t;
            }
        })
        .onComplete(function(){
            if( repeats > 0){
                self.currentAnimation = fadeFunc();
                self.currentAnimation.start();
                repeats--;
            }
        })
    };
    fadeFunc().start();
    this.activated = true;
};

Cluster.prototype.toggleActivation = function(){
  if(this.activated){
      this.hideTextSprite();
      this.deactivate();
  }
  else{

      this.showTextSprite();
      this.activate(230, 3);

  }
  if( "dom" in this ){
    this.dom.toggleClass('selected');
  }
};

Cluster.prototype.fade = function(ms,from,to){
    var self = this;
    return new TWEEN.Tween( {t: from} )
        .to( {t:to}, ms)
        .easing( TWEEN.Easing.Linear.None )
        .onUpdate( function(){
            var ease = this;
            if("lineMesh" in self){
                self.lineMesh.material.opacity = ease.t;
            }
        });
    };


Cluster.prototype.fadeIn = function(ms){
    if( ms == undefined ) ms = 400;
    return this.fade(ms, this.highlightOpacity, this.defaultOpacity);
};

Cluster.prototype.fadeOut = function(ms){
    if( ms == undefined ) ms = 400;
    return this.fade(ms, this.currentOpacity, 0);
};

Cluster.prototype.highlight = function(ms){
    if( ms == undefined ) ms = 400;
    return this.fade(ms, this.defaultOpacity, this.highlightOpacity);
};

Cluster.prototype.showLabels = function(){

};

Cluster.prototype.deactivate = function(ms){
    var self = this;
    this.currentAnimation.stop();
    this.currentOpacity = this.lineMesh.material.opacity;
    var animation = this.fade(ms, this.currentOpacity, this.defaultOpacity);
    this.activated = false;
    animation.start();
    animation.onComplete(function(){
        self.currentOpacity = self.defaultOpacity;
    });
};

Cluster.prototype.addPointCloudToScene = function(scene){
    var points = new Float32Array( this.nodes.length * 3);
    var pointColors = new Float32Array( this.nodes.length * 3 );

    for ( var g = 0; g < this.nodes.length; g ++ ) {
        var node = this.nodes[g];
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
    scene.add(PcMesh);
    this.pointcloud = PcMesh;
};

Cluster.prototype.animateTimestep = function(){

};

Cluster.prototype.setTextSprite = function(scale, renderer, color){

    var phrases = renderer.graph.group_names[this.id];
    var params = {"fontsize": 100};
    if( this.textSprite != undefined){
        renderer.scene.remove(this.textSprite);
    }
    var spriteMaker = new SpriteSet();
    spriteMaker.THUMBSIZE = 20;
    this.textSprite = new SpriteSet().makeTextSprite(phrases, "", this.centroid.x * scale, this.centroid.y * scale,
        this.centroid.z * scale, params, color);
    this.textSprite.material.transparent = true;
    this.textSprite.material.opacity = 0;
    renderer.scene.add(this.textSprite);

};

Cluster.prototype.showTextSprite = function(){

    this.fadeSprite(0 ,1, 500);

};

Cluster.prototype.hideTextSprite = function(){
    this.fadeSprite(1 ,0, 500);
};

Cluster.prototype.fadeSprite = function(start, end, ms){
    var self = this;
    if( this.textSprite != undefined ){
        var tween = new TWEEN.Tween( {t: start} ).to( {t: end}, ms).easing( TWEEN.Easing.Linear.None )
            .onUpdate( function(){
               self.textSprite.material.opacity = this.t;
            });
        tween.start();
    }
};



function IntraCluster(id){
    this.nodes = [];
    this.edges = [];
    this.id = id;
}

IntraCluster.keyGen = function(e, d){
    var s = d[e.source];
    var t = d[e.target];
    return [s.clusterID, t.clusterID].sort().join(':');
};
