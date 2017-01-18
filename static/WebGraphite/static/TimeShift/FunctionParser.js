/**
 * Created by sam.royston on 8/9/15.
 */


if (typeof String.prototype.parseFunction != 'function') {
    String.prototype.parseFunction = function () {
        var funcReg = /function *\(([^()]*)\)[ \n\t]*{(.*)}/gmi;
        var match = funcReg.exec(this.replace(/\n/g, ' '));

        if(match) {
            return new Function(match[1].split(','), match[2]);
        }

        return null;
    };
}

/*
  above taken from:
  http://stackoverflow.com/questions/1271516/executing-anonymous-functions-created-using-javascript-eval
 */


function testFunction(funcStr, arg){
    try{
        var func = funcStr.parseFunction();
        var ret = func(arg);

        var testFloat = function(a){
            if(typeof a != 'number'){
                throw "TypeError, RGB values should be floats in the interval [ 0, 1 ]"
            }
        }
        testFloat(ret[0]);
        testFloat(ret[1]);
        testFloat(ret[2]);

        return "success";
    }
    catch(e){
        return e + " " + Object.keys(arg).toString();
    }
}

function evaluatePerformance(nodes, funcStr){
    var successCount = 0;
    var failures = [];
    nodes.forEach(function(node){
        var evaluation = testFunction(funcStr, node);
        successCount += (evaluation == 'success');
        if (evaluation != 'success'){
            failures.push(evaluation);
        }
    });
    return {"successRate": successCount/ nodes.length, "failures":failures}
}