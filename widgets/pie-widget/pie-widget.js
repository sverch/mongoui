function PieWidget(baseID){

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof PieWidget)) {
        console.log('Warning: PieWidget constructor called without "new" operator');
        return new PieWidget(baseID);
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
        canvas:         baseID + "-canvas"
    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }
    
    var wrapperDiv = '<div id="' + ids.wrapper + '" style="color: black !important; width: 800px; height: 100%; margin: auto; display: block; position: relative;">'
    var canvas = '<canvas id="' + ids.canvas + '" width=600 height=500 style="width: 600px; height: 500px; display: inline;">' +
        'If you can read this, your browser doesn\'t support the canvas ' +
        'element.</canvas>';
    var tool = '<div id="' + ids.tool + '" style="width: 200px; height: 500px; position: absolute; right: 0; top: 0; background: #DDD; padding-left: 5px; padding-right: 5px;"><h1 style="font-family: Share;">Server Info</h1>';
    var stats = '<div id="' + ids.stats + '" style="font-family: Share;"></div>';

    /* Clear the element we are using */
    $(sel.main).empty();

    /* Insert the stats and PieWidget panes */
    $(sel.main).append(wrapperDiv);
    $(sel.wrapper).append(canvas);
    $(sel.wrapper).append(tool);
    $(sel.tool).append(stats);

    this.render = function(data) {
//        map = new TopologicalMap(data);
    	var app_loop = this.start(new Vars());
    }
    
    this.start = function(vars){
	    var app_loop;
        var shardCanvas = $(sel.canvas)[0];
        var shardStat = $(sel.stats);
        var shardTool = $(sel.tool);
        if (shardCanvas.getContext) {
		    var shardBoard = new PieWidget_Pie(shardCanvas.getContext('2d'),"#FFF",shardCanvas.width,shardCanvas.height,shardStat,shardTool,vars);
		    shardCanvas.addEventListener('mousemove',function(evt){
		    var mousePos = getMousePos(shardCanvas, evt);
		    shardBoard.mouseOver(mousePos.x, mousePos.y);
		    }, false);
		    shardCanvas.addEventListener('click',function(evt){
		    var mousePos = getMousePos(shardCanvas, evt);
		    shardBoard.mouseClick(mousePos.x, mousePos.y);
		    }, false);
            app_loop = setInterval(function(){ shardBoard.draw(); }, 1000 / 60);
        } else {
            alert('You lack a browser able to run HTML5');
        }
        return app_loop;
    }


}


function Vars() {
	this.primary = new TestNode(1,"gurney","I'm the best node");
	this.secondary = [new TestNode(Math.random()*3,"cslab1a","yay"),
                      new TestNode(Math.random()*3,"cslab2a","nay"),
                      new TestNode(Math.random()*3,"cslab3a","wheee"),
                      new TestNode(Math.random()*3,"cslab4a","This is the best node, clearly"),
                      new TestNode(Math.random()*3,"cslab5a","whakjdshahsj",true),
                      new TestNode(Math.random()*3,"cslab6a","weqehahdsfw"),
                      new TestNode(Math.random()*3,"cslab7a","wfehvsbzck"),
                      new TestNode(Math.random()*3,"cslab8a","gibberish"),
                      new TestNode(Math.random()*3,"cslab9a","shards yay"),
                      new TestNode(Math.random()*3,"cslab1b",":D")];
}
function TestNode(load,title,info,alert) {
    this.load = load;
    this.info = info;
    this.title = title;
    this.alert = typeof alert !== 'undefined' ? alert : false;
}

TestNode.prototype.getInfo = function(){
    return this.info;
}



function getMousePos(canvas, evt){
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

function PieWidget_Pie(ctx,rgba,cw,ch,statPanel,toolPanel,vars){
    PieWidget_Shape.call(this,ctx,cw,100,0,ch-100,rgba,cw,ch,2);
    this.statPanel = statPanel;
    this.toolPanel = toolPanel;
    this.secondary = [];
    this.totalS = 0;
    this.oR = 400;
    var colors = ["#B9F73E","#1F7D63","#BF6430","#992667","#86B32D","#5FD3B3","#FFA573","#E667AF"];
    var emptyColor = "#FFF";
    var f = Math.floor(Math.random()*colors.length);
    var t = f;
    for (var i = 0; i < vars.secondary.length; i++) {
        this.secondary.push(new PieWidget_sNode(ctx,this.oR,vars.secondary[i],cw/2,ch/2,colors[t],cw,ch,this));
        var n = Math.floor(Math.random()*colors.length);
        if (i == vars.secondary.length-2) {
            while (n == t || n == f)
                n = Math.floor(Math.random()*colors.length);
        }
        else {
            while (n == t)
                n = Math.floor(Math.random()*colors.length);
        }
        t = n;
        this.totalS = this.totalS + vars.secondary[i].load;
    }
    this.iR = Math.sqrt(this.oR*this.oR/(this.totalS/vars.primary.load + 1));
    this.primary = new PieWidget_pNode(ctx,this.iR,vars.primary,cw/2,ch/2,"#FFF",cw,ch);
    var arc = 0;
    for (var i = 0; i < this.secondary.length; i++) {
        var arcSize = this.secondary[i].node.load/this.totalS*2*Math.PI;
        this.secondary[i].setArc(arc, arcSize, this.iR, emptyColor);
        arc += arcSize;
    }
    this.text = "";
    var arrowS = 40;
    this.arrow = new PieWidget_Shape(ctx,arrowS,arrowS,0,0,this.toolPanel.css('background-color'),cw,ch,2);
    this.showArrow = false;
    this.hideTool();
}
PieWidget_Pie.prototype = Object.create(new PieWidget_Shape());
PieWidget_Pie.prototype.draw = function() {
    this.ctx.clearRect(0,0,this.cw,this.ch);
    for (var i = 0; i < this.secondary.length; i++) {
        this.secondary[i].draw(false);
    }
    this.primary.draw(false);
    this.ctx.font = "20px Share";
    this.ctx.textAlign = "left";
    this.ctx.fillStyle = "#000";
    this.ctx.fillText(this.text,50,this.ch-20);
    if (this.showArrow) {
        this.ctx.save();
        this.ctx.translate(this.cw-10,this.ch/2 - this.arrow.w*Math.sqrt(2)/2);
        this.ctx.rotate(45 * Math.PI / 180);
        this.arrow.draw(false);
        this.ctx.restore();
    }
}
PieWidget_Pie.prototype.mouseOver = function(cX,cY) {
    var found = false;
    if (this.primary.inNode(cX,cY)) {
        this.text = this.primary.node.title;
        found = true;
    }
    for (var i = 0; i < this.secondary.length; i++) {
        if (this.secondary[i].inNode(cX,cY)) {
            this.text = this.secondary[i].node.title;
            found = true;
        }
    }
    if (!found) {
        this.text = "";
    }
}

PieWidget_Pie.prototype.mouseClick = function(cX,cY) {
    var found = -1;
    for (var i = 0; i < this.secondary.length; i++) {
        if (this.secondary[i].inNode(cX,cY)) {
            rA = this.secondary[i].rotateA();
            found = i;
        }
    }
    if (found >= 0) {
        this.hideTool();
        for (var i = 0; i < this.secondary.length; i++) {
            this.secondary[i].rotate(rA);
        }
    }
    else {
        this.hideTool();
    }
}

PieWidget_Pie.prototype.showTool = function(text) {
    this.toolPanel.css('display', 'block');
    this.statPanel.html(text);
    this.showArrow = true;
}

PieWidget_Pie.prototype.hideTool = function() {
    this.toolPanel.css('display', 'none');
    this.showArrow = false;
}

function PieWidget_pNode(ctx,r,node,x,y,rgba,cw,ch){
    this.prim = new PieWidget_Shape(ctx,r,node.load,x,y,rgba,cw,ch,0);
    this.node = node;
}

PieWidget_pNode.prototype.draw = function(stroke) {
    this.prim.draw(stroke);
}

PieWidget_pNode.prototype.inNode = function(x,y) {
    return this.prim.inShape(x,y);
}

function PieWidget_sNode(ctx,r,node,x,y,rgba,cw,ch,pie){
    this.outer = new PieWidget_Shape(ctx,r,node.load,x,y,rgba,cw,ch,1,this);
    this.alert = new PieWidget_Shape(ctx,20,0,this.outer.tR/2+45,0,"#D00",cw,ch,0,this);
    this.node = node;
    this.pie = pie;
    this.clicked = 1;
}

PieWidget_sNode.prototype.setArc = function(aS,aW,iR,emptyColor) {
    this.outer.setArc(aS,aW,iR);
    this.inner = new PieWidget_Shape(this.outer.ctx,iR,this.outer.h,this.outer.x,this.outer.y,emptyColor,this.outer.cw,this.outer.ch,1);
    this.inner.setArc(aS,aW,0);
}

PieWidget_sNode.prototype.draw = function(stroke) {
    this.outer.draw(stroke);
    //this.inner.draw(true);
    if (this.node.alert) {
        var r = this.outer.aS + this.outer.aW/2;
        this.outer.ctx.save();
        this.outer.ctx.translate(this.outer.x,this.outer.y);
        this.outer.ctx.rotate(r);
        this.alert.draw(false);
        this.outer.ctx.restore();
        this.outer.ctx.save();
        this.outer.ctx.font = "bold 14px Share";
        this.outer.ctx.textAlign = "left";
        this.outer.ctx.fillStyle = "#FFF";
        this.outer.ctx.translate(this.outer.x,this.outer.y);
        this.outer.ctx.fillText("!",Math.cos(r)*this.alert.x-2,Math.sin(r)*this.alert.x+5);
        this.outer.ctx.restore();
    }
}

PieWidget_sNode.prototype.inNode = function(x,y) {
    var hover = this.outer.inShape(x,y);
    this.inner.setEnlarge(hover);
    return hover;
}

PieWidget_sNode.prototype.rotateA = function() {
    this.clicked = -1;
    return this.outer.rotateA();
}

PieWidget_sNode.prototype.rotate = function(a) {
    this.outer.rotate(a);
    this.inner.rotate(a);
    this.clicked += 1;
}

PieWidget_sNode.prototype.finished = function() {
    if (this.clicked == 0) {
        this.pie.showTool("<h2>" + this.node.title + "</h2><p>" + this.node.info + "</p>");
    }
    this.clicked = 1;
}

function PieWidget_Shape(ctx,w,h,x,y,rgba,cw,ch,stype,node) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.x = x;
    this.y = y;
    this.rgba = rgba;
    this.cw = cw;
    this.ch = ch;
	this.enlarge = this.w/8;
    this.frames = 5;
    this.sframes = 10;
    this.rframes = 30;
    this.rotating = false;
    this.interval = 0;
    this.left = 0;
	this.hover = false;
    this.type = stype;
    this.aS = 0;
    this.aE = 0;
    this.aW = 0;
    this.iR = 0;
    this.tR = this.w;
    this.overHover = false;
    this.node = node;
    this.hoverOffset = 0;
    this.clicked = false;
    this.f = 1.5;
    this.offsetSize = this.w*this.f;
};

PieWidget_Shape.prototype.update = function() {
    if ((this.hoverOffset < this.offsetSize && this.hoverAbove) || (this.hoverOffset < 0 && !this.hoverBelow)) {
        this.hoverOffset += this.offsetSize/this.sframes;
    }
    else if ((this.hoverOffset > 0 && !this.hoverAbove) || (this.hoverOffset > -this.offsetSize && this.hoverBelow)) {
        this.hoverOffset -= this.offsetSize/this.sframes;
    }
}

PieWidget_Shape.prototype.draw = function(stroke) {
    this.ctx.fillStyle = this.rgba;
    if (this.tR < (this.w + this.enlarge) && (this.hover || this.overHover)) {
        this.tR += this.enlarge/this.frames;
    }
    else if (this.tR > this.w && !this.hover && !this.overHover) {
        this.tR -= this.enlarge/this.frames;
    }
    if (this.rotating) {
        this.aS = (this.aS + this.interval + Math.PI*2) % (Math.PI*2);
        this.aE = (this.aE + this.interval + Math.PI*2) % (Math.PI*2);
        this.rotateAngle -= this.interval;
        this.left--;
        this.rotating = this.left != 0;
    }
    else if (this.type == 1) {
        this.node.finished();
    }
    switch(this.type) {
    case 0:
        this.ctx.beginPath();
        this.ctx.arc(this.x,this.y,this.tR/2,0,Math.PI*2,true);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    case 1:
        this.ctx.beginPath();
        this.ctx.moveTo(this.x, this.y);
        this.ctx.arc(this.x,this.y,this.tR/2,this.aE,this.aS,true);
        this.ctx.lineTo(this.x, this.y);
        this.ctx.closePath();
        this.ctx.fill();
        break;
    case 2:
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
    if (this.type != 2)
        this.ctx.stroke();
    else
        this.ctx.strokeRect(this.x,this.y+this.hoverOffset,this.w,this.h);
}

PieWidget_Shape.prototype.setPosition = function(x,y) {
    this.x = x;
    this.y = y;
}

PieWidget_Shape.prototype.setEnlarge = function(enlarge) {
    this.overHover = enlarge;
}

PieWidget_Shape.prototype.setArc = function(aS, aW, iR) {
    this.aS = aS;
    this.aE = aS + aW;
    this.aW = aW;
    this.iR = iR;
}

PieWidget_Shape.prototype.changeSize = function(w,h) {
    this.w = w;
    this.h = h;
    this.offsetSize = this.w*this.f;
}

PieWidget_Shape.prototype.rotateA = function() {
    var middle = (this.aW/2 + this.aS) % (Math.PI*2);
    if (middle > Math.PI) {
        return this.genRotate(Math.PI*2 - middle);
    }
    else {
        return this.genRotate(-middle);
    }
}

PieWidget_Shape.prototype.rotate = function(aR) {
    this.left = aR.f;
    this.interval = aR.a / aR.f;
    this.rotating = true;
}

PieWidget_Shape.prototype.inShape = function(x,y) {
    var inside = false;
    switch(this.type) {
    case 0:
        var dx = x - this.x;
        var dy = y - this.y;
        this.hover = dx*dx + dy*dy <= this.w*this.w/4;
        inside = this.hover;
        break;
    case 1:
        var dx = x - this.x;
        var dy = y - this.y;
        var r = dx*dx + dy*dy;
        if (r > this.iR*this.iR/4) {
            this.hover = r <= this.w*this.w/4;
            var angle = dy == 0 ? (dx > 0 ? 0 : Math.PI) : Math.asin(dy/Math.sqrt(dy*dy+dx*dx));
            if (angle < 0)
                angle = 2*Math.PI + angle;
            if (dx < 0 && dy != 0)
                angle = Math.PI - angle;
            if (angle < 0)
                angle = 2*Math.PI + angle;
            if (this.aE < this.aS)
                this.hover = (angle < this.aE || angle > this.aS) && this.hover;
            else
                this.hover = angle < this.aE && angle > this.aS && this.hover;
            inside = this.hover;
        }
        else {
            this.hover = true;
        }
        break;
    case 2:
    default:
        inside = (x >= this.x && x <= (this.x + this.w) && y >= this.y && y <= (this.y + this.h));
    }
    return inside;
}

PieWidget_Shape.prototype.genRotate = function(a) {
    return new PieWidget_Rotation(a,Math.max(Math.round(Math.abs(a)/Math.PI*this.rframes),1));
}

PieWidget_Shape.prototype.setHover = function(above,val) {
    if(above) {
        this.hoverAbove = val;
        this.hoverBelow = false;
    }
    else {
        this.hoverBelow = val;
        this.hoverAbove = false;
    }
}

PieWidget_Shape.prototype.click = function(c) {
    this.clicked = c;
}

function PieWidget_Direction(r,l) {
    this.r = r;
    this.l = l;
}

function PieWidget_Rotation(a,f) {
    this.a = a;
    this.f = f;
}


