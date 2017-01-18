/**
 * Created by sam.royston on 8/12/15.
 */
Graphics = {};

Graphics.Lines = function(count, curveRes, defaultColor){
    var edges = new Float32Array(count * 3 * curveRes * 2);

    var edgeColors = new Float32Array( count * 3 * curveRes * 2 );
    for( var i = 0; i < count * 3 * curveRes * 2; i++){edgeColors[i] = defaultColor}
    var geometry = new THREE.BufferGeometry();
    var material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors, linewidth: 0.001, fog:true});

    material.blending = THREE.NormalBlending;
    material.transparent = true;

    geometry.addAttribute( 'position', new THREE.BufferAttribute( edges, 3 ) );
    geometry.addAttribute( 'color', new THREE.BufferAttribute( edgeColors, 3 ) );
    geometry.dynamic = true;
    geometry.computeBoundingBox();

    this.count = count;
    this.curveRes = curveRes;
    this.mesh = new THREE.Line( geometry, material, THREE.LinePieces );
};


Graphics.Lines.prototype.setPositions = function(cluster, netRenderer){


    for( var i =0; i < this.count; i++){
        var sourcePos = [0,0,0];
        var targetPos = [0,0,0];
         if( i < cluster.edges.length ){
             var source = netRenderer.graphDict[cluster.edges[i].source];
             var target = netRenderer.graphDict[cluster.edges[i].target];
             sourcePos = Graphics.defaultPosition(source, netRenderer.multiplier);
             targetPos = Graphics.defaultPosition(target, netRenderer.multiplier);
         }


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
         var pointsToAdd = curve.getPoints( this.curveRes );

         this.mesh.geometry.attributes.position.array[i * 12] = sourcePos[0];
         this.mesh.geometry.attributes.position.array[i * 12 + 1] = sourcePos[1];
         this.mesh.geometry.attributes.position.array[i * 12 + 2] = sourcePos[2];

         this.mesh.geometry.attributes.position.array[i * 12 + 3] = pointsToAdd[1].x;
         this.mesh.geometry.attributes.position.array[i * 12 + 4] = pointsToAdd[1].y;
         this.mesh.geometry.attributes.position.array[i * 12 + 5] = pointsToAdd[1].z;

         this.mesh.geometry.attributes.position.array[i * 12 + 6] = pointsToAdd[1].x;
         this.mesh.geometry.attributes.position.array[i * 12 + 7] = pointsToAdd[1].y;
         this.mesh.geometry.attributes.position.array[i * 12 + 8] = pointsToAdd[1].z;

         this.mesh.geometry.attributes.position.array[i * 12 + 9] = targetPos[0];
         this.mesh.geometry.attributes.position.array[i * 12 + 10] = targetPos[1];
         this.mesh.geometry.attributes.position.array[i * 12 + 11] = targetPos[2];
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
};



Graphics.defaultPosition = function(node, multiplier){
      return node.positions[0].map(function(p){ return p * multiplier});
};

Graphics.PointCloud = function(count){

    var points = new Float32Array( count * 3);
    var pointColors = new Float32Array( count * 3 );
    for( var i = 0; i < count * 3 ; i++){pointColors[i] = 0.5}
    var geometryPc = new THREE.BufferGeometry();
    var materialPc = new THREE.PointCloudMaterial({vertexColors: THREE.VertexColors, size:0.4});

    geometryPc.addAttribute( 'position', new THREE.BufferAttribute( points, 3 ) );
    geometryPc.addAttribute( 'color', new THREE.BufferAttribute( pointColors, 3 ) );
    geometryPc.dynamic = true;
    geometryPc.computeBoundingSphere();

    this.count = count;
    this.mesh =  new THREE.PointCloud( geometryPc , materialPc );
};

Graphics.PointCloud.prototype.setPositions = function(cluster, netRenderer){
    var centroid = new THREE.Vector3(0,0,0);
    for( var i =0; i < cluster.nodes.length; i++){
         var node = cluster.nodes[i];
         var position = Graphics.defaultPosition(node, netRenderer.multiplier);
         centroid.add(new THREE.Vector3(position[ 0 ],position[ 1 ],position[ 2 ]));

         this.mesh.geometry.attributes.position.array[i * 3] = position[0];
         this.mesh.geometry.attributes.position.array[i * 3 + 1] = position[1];
         this.mesh.geometry.attributes.position.array[i * 3 + 2] = position[2];

    }
    centroid.divideScalar(cluster.nodes.length);
    cluster.centroid = centroid;
    this.mesh.name = cluster.id;
    this.mesh.geometry.attributes.position.needsUpdate = true;
};