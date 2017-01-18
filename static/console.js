/**
 * Created by sam.royston on 6/22/15.
 */

var layoutListSel = false;
var newLayoutSel = false;
var mergeLayoutsSel = false;
var trackingSel = false;

function displaySplash(){
    if(layoutListSel || newLayoutSel || mergeLayoutsSel || trackingSel){
        $("#splash").css("display","none");
    }
    else{
        $("#splash").css("display","block");
    }
}

$(document).ready(function(){

    $("#begin_layout").click(function(){
       var model_id = $("#model_id_input").val();
       var name = $("#name_input").val();
       var sample_type = $("input[name=sampling_type]:checked").val();
       var sample_rate = $("#sample_rate_input").val();

       var endpoint = "api/begin_layout?model_id=" + model_id + '&name=' + name + '&sample_mode=' + sample_type + '&sample_rate=' + sample_rate;
        console.log(endpoint+ " !!!!! ");
       $.get(endpoint,function(resp){
           console.log(resp)
       })
    });

    $("#add_id").click(function(e){
        if(e.shiftKey){
            $("#tracking").remove(".medium-8.columns.ids");
        }
        else{
            var new_input = "<div class='medium-8 columns ids'> \
                                <input class='tracking_ids' type='text' placeholder='Search Terms'/> \
                            </div>";
            $("#tracking").append(new_input);

        }
    });

    $("#start_tracking").click(function(e){
        var ids = [];
        var idEls = $(".tracking_ids");
        for(var i =0; i < idEls.length; i++){
             var el = $(idEls[i]);
             ids.push(el.val());
        }

        $.get("api/sequential_layout?model_ids=" + JSON.stringify(ids));


    });

    $("#tracking_menu").click(function(){
        $("#tracking").toggle();
        trackingSel = !trackingSel
        displaySplash();

    });

    $("#new_layout").click(function(){

        $("#start_layout").toggle();
        newLayoutSel = !newLayoutSel;
        displaySplash();
    });

    $("#layout_list").click(function(){
        $(".layouts").toggle();
        layoutListSel = !layoutListSel;
        displaySplash();
    });

    $("#merge_layouts").click(function(){
        if(confirm("Merge the selected layouts?")){
            // merge dem dat layouts
        }
    });
});