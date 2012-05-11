// An encapsulated visual representation of a shard. 
// Displays how much space each collection takes up.
// 
// Contains shapes. Is sort of a shape in the sense that it can be drawn.
// 
// TODO: make it possible to get all rectangles of a particular collection.

// colors = mapping of collection name to color name
function ShardShape(ctx, shard, X, Y, height, width, colors){
    this.ctx = ctx;
    this.shard = shard;
    this.shardH = height;
    this.shardW = width;
    this.X = X; // top left corner coordinates
    this.Y = Y;
    this.colors = colors;
    this.colorsToColl = reversemap(colors);
    this.pointedCollection = "";
    
    // {collectionA : number-chunks-in-that-collection, collectionB : number-chunks-in-collection-B, ...}
    this.collections = {};
    this.collShapes = [];
    
    // make initial shape
    this.UpdateShard(shard);
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
}

ShardShape.prototype.draw = function(){ 
   this.calculateSizes();
   this.collShapes = [];
   
   var Y = this.Y;
   // now we make shapes!
   for (var c in this.collections){
       this.collShapes.push(new Shape(this.ctx, this.shardW, 
				      this.collections[c], 
				      this.X, Y, this.colors[c], 800, 600, 2));
	Y += this.collections[c];
   }
   
   for (var s in this.collShapes){
       this.collShapes[s].draw(false);
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
	    this.pointedCollection = this.colorsToColl[this.collShapes[s].rgba];
	}
    }
    return found;
}

