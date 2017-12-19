/**
 * Created by sam.royston on 7/22/15.
 */
var clusterHud = $("#clusterhud");
var userHud = $("#userhud");
var editor = $("#editor");
var clustersSeparate = true;
var color_funcs = {};
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
    var search_term = $("#search").val().toLowerCase();
    timeShift.currentNetwork().changeColors(function(v){
        if(v.label.toLowerCase().indexOf(search_term) != -1){
            return [0.8, 1.0, 0.2];
        }
        else{
            return [0.1, 0.1, 0.1];
        }
    });
});

$("#newFilter").click(function(e){
   $("#editor").trigger("sidebar:toggle");
   $(".editorbox").trigger("sidebar:toggle");
});

$("#selectFilter").click(function(e){
    $(".functions").toggle();
    $.get("../list_colorings", function(data){

        var total_html = "";
        data.forEach(function(name){
            var new_html = "<div id='newFilter' class='textbutton'>" + name + "</div>"
            total_html += new_html;

        });
        $(".functions").html(total_html);
        data.forEach(function(name){
            if(!(name in color_funcs)){
                $.get("../get_coloring/" + name, function(data){
                    color_funcs[name] = data.function_text;
                    $(".functions." + name).click(function(){

                    })
                })
            }
            else{
                $(".functions." + name).click(function(){

                })
            }

        });
    })

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
    var func_str = editor.getValue();
    var func_name = func_str.match(/(?<=var )(.*)(?=\s?=\s?function)/)[0].replace(" ", "");

    swal({   title: "Save the function '" + func_name + "'?",
             text: msg,
             type: "warning",
             showCancelButton: true,
             confirmButtonColor: "#DD6B55",
             confirmButtonText: "Save",
             closeOnConfirm: false },
             function(){
                 $.post('../save_coloring', {"text": editor.getValue(), "name": func_name}, function(res){
                    swal("Saved", "success");
                    console.log(res);
                 });
         });

});


function setHudTitle(title, element){
    var t = element.children(".title")[0];
    $(t).html(title)
}

function setHudCaption(caption, location, element){
    var c = element.children(".caption")[0];
    $(c).html("")
}

function setHudImage(url, element){
    var profileImg = element.children(".profileImg")[0];
    $(profileImg).attr("src",url);
}

function setHudDesc(desc,element){
    var descr = element.children(".description")[0];
    var str_desc = "";
    for(k in desc){
        if(k != "img")
            str_desc += k + ": " + desc[k].toString() + "<br>";
    }
    $(descr).html(str_desc);
}

function selectThumb(info){
   var element = $("#pageone");
   // setHudCaption(info.user_name, info.location, element);
   //
   if("img" in info.node.attributes){
        setHudImage(info.node.attributes.img, element);
   }

   setHudTitle(info.node.label, element);
   setHudDesc(info.node.attributes, element);
   element.toggle(true);
}

function deselectThumb(){
   setHudCaption("");
   setHudImage("");
   setHudTitle("");
   setHudDesc("");
}
