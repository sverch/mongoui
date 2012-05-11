function ChunkWidget(baseID){

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof ChunkWidget)) {
        console.log('Warning: ChunkWidget constructor called without "new" operator');
        return new ChunkWidget(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }

    /* construct unique IDs for all the elements in this widget */
    var ids = {
        main:           baseID,
        wrapper:        baseID + "-wrapper",
        stats:          baseID + "-stats",
        tool:           baseID + "-tool",
        canvas:         baseID + "-canvas",
        menu:           baseID + "-menu",
        menuList:       baseID + "-menuList",
        accordian:      baseID + "-accordian",
        collection:     baseID + "-coll"
    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }
    
    var wrapperDiv = '<div id="' + ids.wrapper + '" class="widget-default-container">'
    var menu = '<div id="' + ids.menu + '" style="width: 30%; font-family: Share; float: left;"></div>';
    var canvas = '<canvas id="' + ids.canvas + '" style="width: 70%; height: 600px;">' +
        'If you can read this, your browser doesn\'t support the canvas ' +
        'element.</canvas>';
    var tool = '<div id="' + ids.tool + '" class="widget-stats-container"><h1 style="font-family: Share;">Server Info</h1>';
    var stats = '<div id="' + ids.stats + '" style="font-family: Share;"></div>';

    /* Clear the element we are using */
    $(sel.main).empty();

    /* Insert the stats and pie panes */
    $(sel.main).append(wrapperDiv);
    $(sel.wrapper).append(menu);
    $(sel.wrapper).append(canvas);
    $(sel.main).append(tool);
    $(sel.tool).append(stats);
    
    
    $(sel.wrapper).css('overflow','visible');

    this.render = function(data) {
    	this.app_loop = this.start(new TopologicalMap(data));
    }
    
    this.start = function(vars){
        // Generating new DB list and Collection lists
        $(sel.menu).empty();
        $(sel.stats).empty();
        clearInterval(this.app_loop);
	    var app_loop;
        var m = "<div style='overflow-y: auto;'>";
	    var dbList = vars.databases;
	    var col = 0;
	    var collections = [];
        var ci = 0;
	    
        var first = true;
        var nodb = true;
	    for (db in dbList) {
	        m += "<h4 class='menuList'>DB: ";
	        var dbc = dbList[db];
	        m += dbc.getID();
	        m += "</h4><div><ul class='menuList'>";
	        for (c in dbc.collections) {
	            if (first)
    	            m += "<li id='" + ids.collection + ci + "' style='background: #222;'>";
                else
    	            m += "<li id='" + ids.collection + ci + "'>";
	            collections[ci] = dbc.collections[c];
	            m += collections[ci].getID();
	            m += "</li>";
	            ci++;
	            first = false;
	        }
	        m += "</ul></div>"
	        nodb = false;
	    }
	    m+= "</div>";
	    if (nodb) {
	        m = "<div style='overflow-y: auto;'><h4>No Databases</h4></div>";
	    }
        $(sel.menu).append(m);
        var collectionCanvas = $(sel.canvas)[0];
        var collectionStat = $(sel.stats);
        var collectionTool = $(sel.tool);
        if (collectionCanvas.getContext) {
		    var collectionBoard = new ChunksWidget(collectionCanvas.getContext('2d'),"#FFF",$(sel.canvas),collectionStat,collectionTool,collections,true);
		    collectionCanvas.addEventListener('mousemove',function(evt){
		    var mousePos = ChunksWidgetGetMousePos(collectionCanvas, evt);
		    collectionBoard = collectionBoard;
		    collectionBoard.mouseOver(mousePos.x, mousePos.y);
		    }, false);
		    collectionCanvas.addEventListener('click',function(evt){
		    var mousePos = ChunksWidgetGetMousePos(collectionCanvas, evt);
		    collectionBoard.mouseClick(mousePos.x, mousePos.y);
		    }, false);
		    
            app_loop = setInterval(function(){ collectionBoard.draw(); }, 1000 / 60);
            var index = 0;
            for (var i = 0; i < collections.length; i++) {
                (function(index){
                    $(sel.collection + index).click(function() {
                        $(sel.canvas).attr('width',$(sel.canvas).width());
                        $(sel.canvas).attr('height',$(sel.canvas).height());
                        collectionBoard.changeCollection(index);
                    });
                })(i);
            }
            $(".menuList li").click(function() {
                $(".menuList li").css('background','#555');
                $(this).css('background','#222');
            });

            collectionBoard.setup();
            $(sel.main).resize(function() {
                $(sel.canvas).attr('width',$(sel.canvas).width());
                $(sel.canvas).attr('height',$(sel.canvas).height());
                collectionBoard.setup();
            });
            $('a[href="' + ids.main + '"]').click(function() {
                $(sel.canvas).attr('width',$(sel.canvas).width());
                $(sel.canvas).attr('height',$(sel.canvas).height());
                collectionBoard.setup();
            });

        } else {
            alert('You lack a browser able to run HTML5');
        }
        
        
        return app_loop;
    }
    
   


}

// Getting the mouse position based on the canvas

function ChunksWidgetGetMousePos(canvas, evt){
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

/*
 * ChunkWidget
 * Initial constructor, takes in all information regarding divs and canvas.
 * Calls setup with first collection if it exists.
 * Hover animation is optional.
 */

function ChunksWidget(ctx,rgba,canvas,statPanel,toolPanel,collections,showHover){
    this.ctx = ctx;
    this.canvas = canvas;
    this.collections = collections;
    this.buttons = [];
    this.shards = [];
    this.statPanel = statPanel;
    this.toolPanel = toolPanel;
    this.text = "";
    this.showArrow = false;
    this.hideTool();
    this.selected = [];
    if (this.collections.length > 0) {
        this.changeCollection(0);
        this.setup();
    }
    this.showHover = showHover;
}

/*
 * ChunkWidget.setup()
 * Sets up the chunk view with collection info, finds all chunks
 * from the selected collection by matching IDs. Preset colors.
 */

ChunksWidget.prototype.setup = function() {
    this.totalS = 0;
    this.width = (this.canvas.width()-200)/2;
    this.topX = (this.canvas.width() - this.width)/2;
    this.topY = 100;
    var colors = ["#B9F73E","#1F7D63","#BF6430","#992667","#86B32D","#5FD3B3","#FFA573","#E667AF"];
    var totalChunks = 0;
    this.shards = [];
    this.selected = [];
    this.hideTool();
    if (this.collections.length > 0 && this.collection.getShards() != null) {
        for (var i = 0; i < this.collection.getShards().length; i++) {
            var sChunks = this.collection.shards[i].getChunks();
            var tChunks = [];
            var add = 0;
            for (var j = 0; j < sChunks.length; j++) {
                if (sChunks[j].getCollection() == this.collectionName) {
                    tChunks[add] = sChunks[j];
                    add++;
                }
            }
            totalChunks += add;
            this.shards[i] = new ChunksWidget_ShardRectangles(this.ctx,
                                                              this.topX,
                                                              this.topY,
                                                              tChunks,
                                                              this.collection.shards[i],
                                                              colors[i % colors.length],
                                                              this.canvas,
                                                              this.collection.shards[i].replicaSet.alerts.size() > 0,
                                                              this);
        }
        if (this.canvas.height() > this.canvas.width()) {
            var factor = Math.ceil(this.canvas.height()/this.canvas.width());
            var w = Math.ceil(Math.sqrt(totalChunks/factor));
            var h = factor*w;
        }
        else {
            var factor = Math.ceil(this.canvas.width()/this.canvas.height());
            var h = Math.ceil(Math.sqrt(totalChunks/factor));
            var w = factor*h;
        }
        
        var o = Math.ceil(totalChunks/w) % 2;
        var sh = 0;
        var sw = 0;
        var total = 0;
        for (i = 0; i < this.shards.length; i++) {
            this.shards[i].setStart(total,this.width/w,w,o);
            total += this.shards[i].chunks.length;
        }
    }
    else if (this.collections.length == 0)
        this.showTool("<h3>No Collections</h3>");
    else
        this.showTool("<h3>Empty Collection</h3>");

}

/*
 * ChunkWidget.stripDB()
 * Removes DB name from Collection name
 */

ChunksWidget.prototype.stripDB = function(collection) {
    if (collection.getID().indexOf(collection.getDatabase().getID()) == 0) {
        var db = collection.getDatabase().getID();
        var c = collection.getID();
        return c.substring(db.length+1,c.length);
    }
    return false;
}

/*
 * ChunkWidget.draw()
 * Draws each of the items
 */

ChunksWidget.prototype.draw = function() {
    this.canvas.width;
    this.canvas.height;
    this.ctx.clearRect(0,0,this.canvas.width(),this.canvas.height());
    for (var i = 0; i < this.shards.length; i++) {
        this.shards[i].update();
        this.shards[i].draw(true);
        this.shards[i].drawAlert();
    }
    if (this.selected.length > 0) {
        this.selected[0].draw(true);
        this.selected[0].click(false);
        this.selected[0].draw(true);
        this.selected[0].click(true);
    }
    this.ctx.font = "20px Share";
    this.ctx.textAlign = "left";
    this.ctx.fillStyle = "#000";
    this.ctx.fillText(this.text,50,this.canvas.height()-20);
}

/*
 * ChunkWidget.mouseOver()
 * Hover Animation
 */

ChunksWidget.prototype.mouseOver = function(cX,cY) {
    var found = -1;
    for (var i = 0; i < this.shards.length; i++) {
        if (this.shards[i].inShard(cX,cY) !== false) {
            this.text = this.shards[i].shard.id + this.shards[i].inShard(cX,cY);
            found = i;
            if (this.showHover)
                this.shards[i].setHover(true,false);
        }
        else if (this.showHover) {
            if (found < 0)
                this.shards[i].setHover(false,true);
            else
                this.shards[i].setHover(true,true);
        }
    }
    if (found < 0) {
        this.text = "";
        if (this.showHover) {
            for (var i = 0; i < this.shards.length; i++)
                this.shards[i].setHover(true,false);
        }
    }
}

/*
 * ChunkWidget.mouseClick()
 * Click effects/info tab update
 * Adds border around clicked shard
 */

ChunksWidget.prototype.mouseClick = function(cX,cY) {
    var found = -1;
    for (var i = 0; i < this.shards.length; i++) {
        if (this.shards[i].inShard(cX,cY)) {
            this.shards[i].click(true);
            this.selected[0] = this.shards[i];
            found = i;
        }
        else
            this.shards[i].click(false);
    }
    if (found >= 0) {
        var text = '';
        text += "<h3>Servers in '" + this.shards[found].shard.getID() + "'</h3><ul>";
        var servers = this.shards[found].shard.getServers();
        for (var i = 0; i < servers.length; i++) {
            text += "<li>" + servers[i].getID();
            if (servers[i].alerts.size() > 0) {
                var alert = servers[i].alerts.peek();
                text += "<ul><li>" + alert.toString() + "</li><li>" + alert.tips() + "</li></ul>";
            }
            text += "</li>";
        }
        text += "</ul>";
        this.showTool(text);
    }
    else {
        this.selected = [];
        this.hideTool();
    }
}

/*
 * ChunkWidget.changeCollection()
 * Updates canvas with new collection info
 */

ChunksWidget.prototype.changeCollection = function(collection) {
    this.collection = this.collections[collection];
    this.collectionName = this.stripDB(this.collection);
    this.setup();
}

/*
 * ChunkWidget.showTool()
 * Shows the info div with new text
 */

ChunksWidget.prototype.showTool = function(text) {
    this.toolPanel.css('display', 'block');
    this.statPanel.html(text);
    this.showArrow = true;
}

/*
 * ChunkWidget.hideTool()
 * Hides the info div
 */

ChunksWidget.prototype.hideTool = function() {
    this.toolPanel.css('display', 'none');
    this.showArrow = false;
}

/*
 * ChunkWidget_Shape
 * Container for drawing things, circles and rectangles
 */

function ChunksWidget_Shape(ctx,w,h,x,y,rgba,canvas,stype,node) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.x = x;
    this.y = y;
    this.rgba = rgba;
    this.canvas = canvas;
    
    // Number of frames to animate with
    this.sframes = 15;
    // Offset for animation -> default 1.5x the width of the chunk
    this.f = 1.5;
    this.offsetSize = this.w*this.f;
    this.hoverOffset = 0;

    this.type = stype;
    this.node = node;
    this.clicked = false;
};

/*
 * ChunkWidget_Shape.update()
 * Updates position for animation
 */

ChunksWidget_Shape.prototype.update = function() {
    if ((this.hoverOffset < this.offsetSize && this.hoverAbove) || (this.hoverOffset < 0 && !this.hoverBelow)) {
        this.hoverOffset += this.offsetSize/this.sframes;
        if (!this.hoverAbove && this.hoverOffset > 0) {
            this.hoverOffset = 0;
        }
    }
    else if ((this.hoverOffset > 0 && !this.hoverAbove) || (this.hoverOffset > -this.offsetSize && this.hoverBelow)) {
        this.hoverOffset -= this.offsetSize/this.sframes;
        if (!this.hoverBelow && this.hoverOffset < 0) {
            this.hoverOffset = 0;
        }
    }
}

/*
 * ChunkWidget_Shape.draw()
 * Draws shape
 */

ChunksWidget_Shape.prototype.draw = function(stroke) {
    this.ctx.fillStyle = this.rgba;
    switch(this.type) {
    case 0:
        this.ctx.beginPath();
        this.ctx.arc(this.x,this.y,this.w/2,0,Math.PI*2,true);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    case 1:
    default:
        this.ctx.fillRect(this.x,this.y+this.hoverOffset,this.w,this.h); 
    }
    this.ctx.strokeStyle = "#FFF";
    if (!this.clicked)
        this.ctx.lineWidth = 1;
    else {
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 4;
    }
    if (this.type != 1)
        this.ctx.stroke();
    else
        this.ctx.strokeRect(this.x,this.y+this.hoverOffset,this.w,this.h);
}

/*
 * ChunkWidget_Shape.setPosition()
 * Changes shape position
 */

ChunksWidget_Shape.prototype.setPosition = function(x,y) {
    this.x = x;
    this.y = y;
}

/*
 * ChunkWidget_Shape.setSize()
 * Changes shape size
 */

ChunksWidget_Shape.prototype.setSize = function(w,h) {
    this.w = w;
    this.h = h;
    this.offsetSize = this.w*this.f;
}

/*
 * ChunkWidget_Shape.inShape()
 * Detects if given point is in the shape bounds
 */

ChunksWidget_Shape.prototype.inShape = function(x,y) {
    var inside = false;
    switch(this.type) {
    case 0:
        var dx = x - this.x;
        var dy = y - this.y;
        this.hover = dx*dx + dy*dy <= this.w*this.w/4;
        inside = this.hover;
        break;
    case 1:
    default:
        inside = (x >= this.x && x <= (this.x + this.w) && y >= this.y && y <= (this.y + this.h));
    }
    return inside;
}

/*
 * ChunkWidget_Shape.setHover()
 * Sets the hover animation booleans
 */

ChunksWidget_Shape.prototype.setHover = function(above,val) {
    if(above) {
        this.hoverAbove = val;
        this.hoverBelow = false;
    }
    else {
        this.hoverBelow = val;
        this.hoverAbove = false;
    }
}

/*
 * ChunkWidget_Shape.click()
 * Sets whether or not the item has been clicked
 */

ChunksWidget_Shape.prototype.click = function(c) {
    this.clicked = c;
}

/*
 * ChunkWidget_ShardRectangles
 * Wrapper class for each shard's collection of chunks
 * Shows alert if it exists
 */

function ChunksWidget_ShardRectangles(ctx,x,y,chunks,shard,rgba,canvas,alert,board){
    this.rects = [];
    for (i = 0; i < chunks.length; i++) {
        this.rects[i] = new ChunksWidget_Shape(ctx,0,0,0,0,rgba,canvas,1,this);
    }
    this.chunks = chunks;
    this.ctx = ctx;
    this.shard = shard;
    this.rgba = rgba;
    this.x = x;
    this.y = y;
    this.canvas = canvas;
    this.board = board;
    if (alert) {
        this.alert = new ChunksWidget_Shape(ctx,20,0,0,0,"#D00",canvas,0,this);
    }
    this.clicked = 1;
}

/*
 * ChunkWidget_ShardRectangles.setStart()
 * Sets the start index in the 2D array of rectangles
 * Instead of wrapping the rows, each shard is either right aligned or left aligned
 * based on shard index, to eliminate disconnected chunks and make the canvas 
 * rendering less confusing.
 * Alert bubble shows up either on top of the shard if it is short enough to stay
 * on one line, or to the left or right of the shard depending on shard alignment.
 */

ChunksWidget_ShardRectangles.prototype.setStart = function(x,w,n,o) {
    var sx = x % n;
    var sy = Math.floor(x/n);
    var minY = sy;
    var minX = sx;
    var c = x;
    var maxY = sy-1;
    var maxX = sx+1;
    for (i = 0; i < this.rects.length; i++) {
        if (sy % 2 == o)
            this.rects[i].setPosition(this.x + (n-sx-1)*w,this.y + sy*w);
        else
            this.rects[i].setPosition(this.x + sx*w,this.y + sy*w);
        this.rects[i].setSize(w,w);
        maxY = Math.max(maxY,sy);
        c++;
        sx = c % n;
        maxX = sx;
        sy = Math.floor(c/n);
    };
    if (this.alert != undefined) {
        if (minY == maxY)
            this.alert.setPosition(this.x + (maxX-minX)*w/2,this.alert.y);
        else if (o == 1)
            this.alert.setPosition(this.x + n*w + 30, this.alert.y);
        else
            this.alert.setPosition(this.x - 30, this.alert.y);
    }
    this.middle = this.y + minY*w + (maxY+1-minY)*w/2;
}

/*
 * ChunkWidget_ShardRectangles.getMiddle()
 * Gets the middle Y point of the shard
 */

ChunksWidget_ShardRectangles.prototype.getMiddle = function() {
    return this.middle + this.rects[0].hoverOffset;
}

/*
 * ChunkWidget_ShardRectangles.draw()
 * Draws the shard
 */

ChunksWidget_ShardRectangles.prototype.draw = function(stroke) {
    for (i = 0; i < this.rects.length; i++) {
        this.rects[i].draw(stroke);
    }
    if (this.alert != undefined) {
        this.alert.draw(false);
        this.ctx.font = "bold 14px Share";
        this.ctx.textAlign = "left";
        this.ctx.fillStyle = "#FFF";
        this.ctx.fillText("!",this.alert.x-2,this.alert.y+5);
    }
}

/*
 * ChunkWidget_ShardRectangles.drawAlert()
 * Draws the shard
 */

ChunksWidget_ShardRectangles.prototype.drawAlert = function() {
    if (this.alert != undefined) {
        this.alert.draw(false);
        this.ctx.font = "bold 14px Share";
        this.ctx.textAlign = "left";
        this.ctx.fillStyle = "#FFF";
        this.ctx.fillText("!",this.alert.x-2,this.alert.y+5);
    }
}

/*
 * ChunkWidget_ShardRectangles.inShard()
 * Checks if canvas coordinate point is in the shard
 */

ChunksWidget_ShardRectangles.prototype.inShard = function(x,y) {
    var hover = false;
    for (i = 0; i < this.rects.length; i++) {
        if (this.rects[i].inShape(x,y)) {
            hover = ": chunk has keys from '" + this.processKeys(this.chunks[i].getMinVals()) + "' to '" + this.processKeys(this.chunks[i].getMaxVals()) + "'";
            break;   
        }
    }
    return hover;
}

/*
 * ChunkWidget_ShardRectangles.processKeys()
 * Returns the min or max key of a chunk
 */

ChunksWidget_ShardRectangles.prototype.processKeys = function(vals) {
    var shardkey = vals.shardkey;
    if (!shardkey._bsontype) {
        return shardkey;
    }
    return shardkey._bsontype;
}

/*
 * ChunkWidget_ShardRectangles.update()
 * Updates the position of each chunk and the alert
 */

ChunksWidget_ShardRectangles.prototype.update = function() {
    for (i = 0; i < this.rects.length; i++) {
        this.rects[i].update();
    }
    if (this.alert != undefined)
        this.alert.setPosition(this.alert.x,this.getMiddle());
}

/*
 * ChunkWidget_ShardRectangles.setHover()
 * Sets the hover booleans for each chunk
 */

ChunksWidget_ShardRectangles.prototype.setHover = function(above,val) {
    for (i = 0; i < this.rects.length; i++) {
        this.rects[i].setHover(above,val);
    }
}

/*
 * ChunkWidget_ShardRectangles.click()
 * Click outline setting
 */

ChunksWidget_ShardRectangles.prototype.click = function(c) {
    for (i = 0; i < this.rects.length; i++) {
        this.rects[i].click(c);
    }
}


