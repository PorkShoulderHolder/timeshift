/**
 * Created by sam.royston on 7/22/15.
 */
var clusterHud = $("#clusterhud");
var userHud = $("#userhud");
var editor = $("#editor");
var clustersSeparate = true;
 $(".sidebar.right").sidebar({side: "right"});
editor.sidebar({side: "bottom"});
$("#pageone").toggle();
 $(".editorbox").sidebar({side: "bottom"});
function focus(camera,x,y,z){
    var v = new THREE.Vector3(x,y,z);
    var tween = new TWEEN.Tween(camera.target).to(v, 2000);
}
setTimeout(function(){
    $("#info").toggle();
}, 20000);
//
$(document).keydown(function(objEvent) {
    if (objEvent.keyCode == 9) {  //tab pressed
        objEvent.preventDefault(); // stops its action
    }
})
$("#search").click(function(e){
    $("#search").focus();
        }).keypress(function(e){
    if(e.which === 13){
       var id = timeShift.currentNetwork().handleDict[$("#search").val().toLowerCase()];
       timeShift.currentNetwork().zoomToUser(id,2000);
    }
});

$("#newFilter").click(function(e){
   $("#editor").trigger("sidebar:toggle");
   $(".editorbox").trigger("sidebar:toggle");
});

$("#selectFilter").click(function(e){
    $(".functions").toggle();
});

function editSavedFunction(funcStr){
    editor.setValue(funcStr);
    $("#editor").trigger("sidebar:open");
    $(".editorbox").trigger("sidebar:open");
}
$("#separate").click(function(e){
    var direction = clustersSeparate ? 'forward' : 'backward';
    var time = 1400;
    timeShift.currentNetwork().separateClusters(2.6, time, direction);
    if( clustersSeparate){
        setTimeout(function(){
            $("#separate").text("join clusters");
        }, time / 2);
    }
    else{
        setTimeout(function(){
            $("#separate").text("separate clusters")
        }, time / 2);
    }
    clustersSeparate = !clustersSeparate;
});

$("#showlabels").click(function(e){
    timeShift.currentNetwork().showClusterLabels();
});

$("#hidelabels").click(function(e){
    timeShift.currentNetwork().hideClusterLabels();
});

$("#toggleColors").click(function(e){


    if( timeShift.currentNetwork().modularityMode ){
        setTimeout(function(){

            $("#toggleColors").text("Color by modularity group")

        },700);
    }
    else{
        setTimeout(function(){

            $("#toggleColors").text("Color by WNF")
        },700);
    }
    timeShift.currentNetwork().toggleColors();
});

$(".hud").mouseleave(function(e){
    $("input").blur();
    timeShift.currentNetwork().controls.enabled = true;
});

$(".hud").mouseenter(function(){
    timeShift.currentNetwork().controls.enabled = false;
});
$(".hud").click(function(e){
    e.stopPropagation();
});

$("#closeicon").click(function(e){
       $("#pageone").toggle();
       timeShift.currentNetwork().deactivateSphere();
});

$(".clustericon").click(function(e){
        userHud.trigger("sidebar:close");
        clusterHud.trigger("sidebar:toggle");
});
$(".usericon").click(function(e){
        userHud.trigger("sidebar:toggle");
        clusterHud.trigger("sidebar:close");
});
userHud.on("sidebar:open", function () {
   $(".userbuttons").css("visibility","visible");
   $(".clusterbuttons").css("visibility","hidden");
});

clusterHud.on("sidebar:open", function () {
    $(".userbuttons").css("visibility","hidden");
   $(".clusterbuttons").css("visibility","visible");
});

function generateThumb(title, caption, metrics){
    var stats = $('<div> \
                      <div class="stats sumstats">\
                           <div class="nodescount">' + metrics.num_nodes + '</div>\
                           vertices, \
                      </div>\
                      <div class="stats sumstats">\
                           <div class="edgescount">' + metrics.num_edges + '</div>\
                           edges\
                      </div>\n\
                      <div class="stats">avg degree: \
                            <div class="avgdegree">' + metrics.avg_degree + '</div>\
                      </div>\n\
                      <div class="stats"> median degree: \
                            <div class="meddegree">' + metrics.med_degree + '</div>\
                      </div>\
                  </div>');
    var thumb =  $('<div class="pg" > \
                        <div class="caption">' + caption + '</div> \
                    </div>');
    stats.appendTo(thumb);
    return thumb;
}

function generateFuncThumb(title){

    var t =  $('<div class="pg" > \
                        <div class="caption">' + title + '</div> \
                    </div>');
    return t;
}


$("#applyfunc").click(function(e){
    timeShift.currentNetwork().changeColors(editor.getValue().parseFunction())
});

$("#testfunc").click(function(e){
    var perf = evaluatePerformance(timeShift.currentNetwork().graph.nodes, editor.getValue());
    if( perf.successRate == 1 ){
        swal("100% success rate")
    }
    else{
        swal(100 * perf.successRate + "% success rate", "Here is one type of error encountered: " + perf.failures[0])
    }
});

$("#savefunc").click(function(e){
    var perf = evaluatePerformance(timeShift.currentNetwork().graph.nodes, editor.getValue());
    var msg = "";
    if( perf.successRate == 1 ){
        msg= "100% success rate";
    }
    else{
        msg = 100 * perf.successRate + "% success rate", "Here is one type of error encountered: " + perf.failures[0];
    }
        swal({   title: "Save this function?",
                 text: msg,
                 type: "warning",
                 showCancelButton: true,
                 confirmButtonColor: "#DD6B55",
                 confirmButtonText: "Save",
                 closeOnConfirm: false },
                 function(){
                     $.get('../api/save_function?graph_id=' + model_name + "&function=" + editor.getValue(), function(res){
                        swal("Saved", "success");
                     });
             });

});


function setHudTitle(title, element){
    var t = element.children(".title")[0];
    $(t).html(title)
}

function setHudCaption(caption, location, element){
    var c = element.children(".caption")[0];
    $(c).html(caption + " from " + location)
}

function setHudImage(url, element){
    var profileImg = element.children(".profileImg")[0];
    $(profileImg).attr("src",url);
}

function setHudDesc(desc,element){
    var descr = element.children(".description")[0];
    $(descr).html(desc);
}

function selectThumb(info){
   var element = $("#pageone");
   setHudCaption(info.user_name, info.location, element);
   setHudImage(info.img_url, element);
   setHudTitle(info.handle, element);
   setHudDesc(info.text, element);
   element.toggle();

}

function deselectThumb(){
   setHudCaption("");
   setHudImage("");
   setHudTitle("");
   setHudDesc("");
}