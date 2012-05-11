/* baseID is the ID of the element our widget lives in */
function ShardView (baseID) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof ShardView)) {
        console.log('Warning: ShardView constructor called without "new" operator');
        return new ExampleWidget(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }

    /* construct unique IDs for all the elements in this widget */
    var ids = {
        main:           baseID,
        stats:          baseID + "-stats",
        alerts:		baseID + "-alerts",
        statsButton:    baseID + "-statsButton",
        pie:            baseID + "-pie",
        pieCanvas:      baseID + "-pieCanvas",

    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }

    /* Elements of the stats pane */
    var statsDiv =  '<div id="' + ids.stats + '" class="widget-stats-container"></div>';
    var alertsDiv =  '<div id="' + ids.alerts + '" class="widget-stats-container"></div>';
    var statsHeader =  '<h1 class="widget-stats-header">Stats!</hi>';
    var statsButton =  '<button type=button id="' + ids.statsButton + '">' +
        'Add Stats!</button>';

    /* Elements of the pie pane */
    var pieDiv =    '<div id="' + ids.pie + '" class="widget-default-container"></div>';
    var pieHeader =  '<h1 class="widget-default-header">Shard View</hi>';
    var pieCanvas = '<canvas id="' + ids.pieCanvas + '" width=600 height=500 style="width: 600px; height: 500px; display: inline;">' +
        'If you can read this, your browser doesn\'t support the canvas ' +
        'element.</canvas>';


    /* Clear the element we are using */
    $(sel.main).empty();

    /* Insert the stats and pie panes */
    $(sel.main).append(pieDiv);
    $(sel.main).append(statsDiv);

    /* Put together the pie pane */
    $(sel.pie).append(pieHeader);
    $(sel.pie).append(pieCanvas);

    
    $(sel.stats).append(alertsDiv);
    
    /* The only public field of this object is the "render" function.  It takes
     * as an argument the raw data from MongoDB */      
    this.render = function(data) {
        this.map = new TopologicalMap(data);
        this.shards = this.map.getShards();
	this.alerts = this.map.getAlerts();
	var app_loop = this.start();
    }

    this.start = function(){
	var app_loop;
        var canvas = $(sel.pieCanvas)[0];
	
        var statPanel = $(sel.stats);
	var alertPanel = $(sel.alerts);

        if (canvas.getContext) {
	    //canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
	    canvas.width = canvas.width;
	    var board = new Board(canvas.getContext('2d'),"#FFF",canvas.width,canvas.height, statPanel, alertPanel, this.shards, this.alerts, this.map);
	    canvas.addEventListener('mousemove',function(evt){
		var mousePos = ShardViewWidgetGetMousePos(canvas, evt);
		board.mouseOver(mousePos.x, mousePos.y);
		}, false);
	    canvas.addEventListener('click',function(evt){
		var mousePos = ShardViewWidgetGetMousePos(canvas, evt);
		board.mouseClick(mousePos.x, mousePos.y);
		}, false);
            app_loop = setInterval(function(){ board.draw(); }, 1000 / 60);
        } else {
            alert('You lack a browser able to run HTML5');
        }
        return app_loop;
    };

}


// Getting the mouse position based on the canvas

function ShardViewWidgetGetMousePos(canvas, evt){
    var obj = canvas;
    var top = 0;
    var left = 0;
    while (obj && obj.tagName != 'BODY') {
        top += obj.offsetTop;
        left += obj.offsetLeft;
        obj = obj.offsetParent;
    }
    var mouseX = evt.clientX - left + window.pageXOffset;
    var mouseY = evt.clientY - top + window.pageYOffset;
    return {
        x: mouseX,
        y: mouseY
    };
}

function countProperties(foo){
    var count = 0;
    for (var k in foo) {
	if (foo.hasOwnProperty(k)) {
	++count;
	}
    }
    return count;
}

function processAlerts(map){
    var hostalerts = map.getAlerts('server');
    
    var hostmap = {};
    
    var servers = map.getServers();
    for (var s in servers){
	var a = servers[s].getAlerts();
	hostmap[servers[s].id] = a.content;
    }
    return hostmap;
   
}

function Board(ctx,rgba,cw,ch,statPanel, alertPanel, passedShards, passedAlerts, passedMap){

    this.statPanel = statPanel;
    this.alertPanel = alertPanel;
    this.map = passedMap;   
    this.hostAlertsMap = processAlerts(this.map);
    this.shards = passedShards;
    this.alerts = passedAlerts;
    this.colls = this.uniqueCollections(this.shards);
    this.colors = ["#B9F73E","#1F7D63","#BF6430","#992667","#86B32D","#5FD3B3","#FFA573","#E667AF"];    
    this.colors = zip(this.colors, this.colls);
     
    var MARGIN = 20;
    var num_repsets = countProperties(this.shards);
    var shardW = ((cw - MARGIN) / num_repsets) - MARGIN;
    var shardH = ch - 2*MARGIN;
    var X = MARGIN;
        
    this.shardShapes = [];
    for (var index in this.shards){
	this.shardShapes.push(new ShardShape(ctx, this.shards[index], X, MARGIN,  shardH, shardW, this.colors, this.alerts));
	X += shardW + MARGIN;
    }

    this.back = new ShardBlock(ctx,this.cw,this.ch,0,0,this.alerts, 0, "#333");    
}

Board.prototype.draw = function() {
    //this.back.draw();
    for (var i = 0; i < this.shardShapes.length; i++) {
        this.shardShapes[i].draw();
    }
}
Board.prototype.mouseOver = function(cX,cY) {
   

}

Board.prototype.mouseClick = function(cX, cY){
    for (var i = 0; i < countProperties(this.shards); i++) {
        if (this.shardShapes[i].inShape(cX,cY)) {
	    this.statPanel.html("");
	    var coll = this.shardShapes[i].pointedCollection;
	    var theShard = ithShard(this.shards, i);
	    
	    if (!coll){
		var info = "Shard " + theShard.getID() + " has no collections.";
	    } else {
		var info = "Shard " + theShard.getID() + " of collection " + coll +  ".";
	    }

            this.statPanel.html("<p>" + info + "</p>");
	   
	    var words = "";
	    for (var s in theShard.getServers()){
		var serv = theShard.getServers()[s];
		var id = serv.id;
		var alerts = serv.getAlerts();
		
		if (alerts.content.length > 0)
		{
		    words += "<li class = \"shard-view-alert\" >" + serv.id ;
		    words += "<ul>";

		    for (var a = 0; a < alerts.content.length; a++){
			

			var er = alerts.content[a];
			var erstr = er.toString();
			var ertip = er.tips();
			
			var splitid = id.split(":");
			var stripped = splitid[0] + splitid[1];
			
 			words += "<li><a href = \"#\" id = \"" + stripped + "\" class = \"shard-view-click\" onclick=\"shardviewshowHide(\'"+ stripped +"\');\"> " + erstr + "</a></li>";
			words += "<li id =\"" + stripped + "-show\" class = \"shard-view-reveal\">" + ertip + "</li>" ;
			
		    }
		    words += "</ul></li>";    
		}
		else {
		    words += "<li>" + serv.id + "</li>";
		}
	    }
	    
	    this.statPanel.append("<p><ul>" + words + "</ul>" + "</p>");
           
        }
    }
}

function shardviewshowHide(shID) {
	if (document.getElementById(shID)) {
		var disp = document.getElementById(shID+'-show').style.display;
		if (disp != 'none') {
			document.getElementById(shID+'-show').style.display = 'none';
		}
		else {
			document.getElementById(shID+'-show').style.display = 'inline';
		}
		return true;
	}
	return false;
}

function priorityToColor(priority){
    if (priority > 150){ // oh no!
	return '#F' + (255 - priority).toString(16) + (255 - priority).toString(16);
    } else {
	return '#FFO';
    }
}
function ithShard(shards, i){
    var theShard;
    var theShardctr = 0;
    for (var s in shards){
	
	if (theShardctr == i){
	    return shards[s];
	}
	theShardctr++;
    }
    return 'ERROR; i > number of shards.';
}

Board.prototype.uniqueCollections = function(shards){
    var collNames = {};
    var result = [];
        
    for (var s in shards){
	var names = shards[s].getChunks();
	for (var n in names){
	    var cName = names[n].getCollection();
	    collNames[cName] = "";
	}
	
	// TEMPORARY -- if a collection is not chunked, 
	// the number of chunks seems to be 0 and not 1, 
	// so we kind of have to do this...
// 	if (names.length == 0){
// 	    collNames["Collection " + shards[s].id] = "";
// 	}
    }
    
    // now get just the keys
    for (var n in collNames){
	result.push(n);
    }
    return result;
}


// Zips 2 arrays into a map. Array 1 can be longer than Array 2.
function zip(colors, collections){
    var result = {};
    var len = Math.max(colors.length, collections.length);
    
    for (var i = 0; i < len; i++){
	result[collections[i]] = colors[i];
    }
    return result;
}

function reversemap(map){
    var result = {};
    for (var i in map){
	result[map[i]] = i;
    }
    return result;
}
/** end static-ish functions **/
// An encapsulated visual representation of a shard. 
// Displays how much space each collection takes up.
// 
// Contains shapes. Is sort of a shape in the sense that it can be drawn.

// colors = mapping of collection name to color name
function ShardShape(ctx, rep_set, X, Y, height, width, colors, shardAlerts){
    this.ctx = ctx;
    this.shard = rep_set;
    this.shardH = height;
    this.shardW = width;
    this.X = X; // top left corner coordinates
    this.Y = Y;
    this.colors = colors;
    this.colorsToColl = reversemap(colors);
    this.pointedCollection = "";
    
    this.allAlerts = shardAlerts; // may be undefined.
    this.shardIDs = [];
    
    // {collectionA : number-chunks-in-that-collection, collectionB : number-chunks-in-collection-B, ...}
    this.collections = {};
    this.collShapes = [];
    
    // make initial shape
    this.UpdateShard(this.shard);
    
}

// So that we can redraw this when new data comes in
ShardShape.prototype.UpdateShard = function(shard, init){
    var c = shard.getChunks();
    this.collections = {};
    for (var chunk in c){
	if (this.collections.hasOwnProperty(c[chunk].getCollection())){
	    this.collections[c[chunk].getCollection()]++;
	}
	else {
	    this.collections[c[chunk].getCollection()] = 1;
	}
    }
    
    // TEMPORARY -- if a collection is not chunked, 
    // the number of chunks seems to be 0 and not 1, 
    // so we kind of have to do this...
    
    if (c.length == 0){
	this.collections["NONE"] = 1;
    }
    
    for (var c in this.collections){
	this.shardIDs.push(Math.floor(1024*Math.random()));
    }
	
}

ShardShape.prototype.draw = function(){ 
   this.calculateSizes();
   this.collShapes = [];
   
   var Y = this.Y;
   var ctr = 0;

   for (var c in this.collections){       
       var alerts = 0;
       id = this.shardIDs[ctr];
       ctr++;
       
       if (c == "NONE"){
	    var block = new ShardBlock(this.ctx, this.shardW, this.shardH, this.X, Y, alerts, id, '#CCC');
       } else {
       var block = new ShardBlock(this.ctx, this.shardW, this.collections[c], this.X, Y, alerts, id, this.colors[c]);
       }
        this.collShapes.push(block);
	Y += this.collections[c];
   }
   
   for (var s in this.collShapes){
       this.collShapes[s].draw();
   }
}


ShardShape.prototype.calculateSizes = function(){
    var sizes = [];
    var totalChunks = 0.0;
    
    // get the sum...
    for (var c in this.collections){
	totalChunks += this.collections[c];
    }
    
    // now scale each chunk count to a height, in pixels
    for (var c in this.collections){
	this.collections[c] = this.collections[c]*1.0*this.shardH / totalChunks;
    }
    
}


ShardShape.prototype.inShape = function(x, y){
    var found = false;

    for (var s in this.collShapes){
	if (this.collShapes[s].inShape(x, y)){   
	    found = true;

	    this.pointedCollection = this.colorsToColl[this.collShapes[s].color];
	}
    }
    return found;
}

// Shardblock: represents one chunk in a collection. 
// Fundamentally, a shape. 
// Knows about its alerts.
// Has unique id. This allows the main board to have some idea of when the mouse has changed blocks.

function ShardBlock(ctx, width, height, cornerX, cornerY, alerts, id, color){
    this.ctx = ctx;
    this.alerts = alerts; 
    this.id = id;
    this.color = color;
    this.x = cornerX;
    this.y = cornerY;
    this.w = width;
    this.h = height;

}

ShardBlock.prototype.draw = function(){
	this.ctx.fillStyle = this.color;
	this.ctx.fillRect(this.x,this.y,this.w,this.h); 
	this.ctx.stroke = '#FFF';
	this.ctx.strokeRect(this.x,this.y,this.w,this.h);
}

ShardBlock.prototype.inShape = function(x, y){
    return (x >= this.x && x <= (this.x + this.w) && y >= this.y && y <= (this.y + this.h));
}

