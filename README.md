# graphite-timeshift

This is a flask based system for running a fully interactive 3d graph visualization web app. The server takes a graphml file (like the example file included) as a command line argument and computes a layout using python-igraph on the backend. 
![](/timeshift_sample.png?raw=true)

### how it works
This project can be used as a standalone webapp, or alternatively the constituent components can all be used on their own. A typical use-case would be to clone the app and then modify the front end for your purposes. Another use case might be to use the backend to serve data to other types of frontends, like a VR app. For example it served as the data backend for:

https://www.youtube.com/watch?v=zBA0eVLglNs  
https://arxiv.org/abs/1604.08239


#### getting started
`
$python app.py marvel.graphml
`
will serve the visualization on port 5000, after around 15 seconds of preprocessing


#### Javascript API
```
var dom_obj = document.getElementById('container');
var timeshift = new TimeShift(data, dom_obj);
```

##### input data

`data` is an array of json objects representing the graph and `dom_obj` is the dom element you want to append it to.

The `data` variable is in a special format created by the backend, but if you look at the console output of the example, you should see what it needs to look like. For current applications `data` will be an array with a single object in it, but in the future timeshift will support dynamic graphs.

The important thing is that the object(s) within `data` contain array properties called "nodes" and "edges" where a single node could look like:
```
{
  "attributes":null,
  "colors":[
     [35,157,186]
   ],
  "id":"SYNCH/EVERETT THOMAS",
  "label":"SYNCH/EVERETT THOMAS",
  "membership":15,
  "positions":[
     [-12.590144813950602,12.004548966741098,-18.336773333335103]
   ],
  "ranges":null,
  "size":1,
  "timestamps":[null],
  "clusterID":"15"
}
```
and an edge might look like:

```
{
  "attributes":null, 
  "end":null,
  "ranges":null,
  "source":"THING/BENJAMIN J. GR",
  "target":"SASQUATCH/WALTER LAN",
  "timestamps":[null],
  "weight":null
  }
```
The only key properties for nodes are are `colors`, `positions`, `id`, and optionally `membership` if you want to take advantage of the cluster highlighing. For edges you must have at least `source` and `target` properties which both correspond to node ids.


##### styling
By default node colors are set to the color from their colors property, but timeshift.js makes it easy to dynamically style nodes based on their other properties:

```
timeshift.currentNetwork().changeColors(function(node){
    return [0.6, node.followers / MAX_FOLLOWERS, 0.6];
});
```
Above the node happens to have a float property called `followers` and we are scaling the green component by it's magnitude.

```
timeshift.currentNetwork().changeColors(function(node){
    var red = [1.0, 0.2, 0.2];
    var grey = [0.4, 0.4, 0.4];
    if(node.label.indexOf("kissinger") != -1){
        return red;
    }
    else{
        return grey;
    }
});
```
In this example we color the node red if its label property contains the string "kissinger".

Note that in the default webapp there is a dropdown menu which allows you directly enter functions of the form
```
function(node){
    var red = [1.0, 0.2, 0.2];
    var grey = [0.4, 0.4, 0.4];
    if(node.label.indexOf("kissinger") != -1){
        return red;
    }
    else{
        return grey;
    }
}
```
and see the output.

#### Upcoming

I am in the process of adding support for dynamic graphs and animations between states. Further down the line I hope to include support for node sizing based on data and maybe even frontend gpgpu layout support.    

