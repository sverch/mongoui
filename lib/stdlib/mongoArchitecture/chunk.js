//Defines a mongoDB chunk
function Chunk(c, minV, maxV, s) {
    this.collection = c; //The name of the collection this chunk belongs to
    this.minVals = minV; //The minimum values for each key in this chunk
    this.maxVals = maxV; //The maximum values for each key in this chunk 
    this.shard = s; //The shard containing this chunk
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this chunk sorted by priority
}

//Getters
Chunk.prototype.getMinVals = function() {
	return this.minVals;
}

Chunk.prototype.getMaxVals = function() {
	return this.maxVals;
}

Chunk.prototype.getCollection = function() {
	return this.collection;
}

Chunk.prototype.getShard = function() {
	return this.shard;
}

Chunk.prototype.getAlerts = function() {
	return this.alerts;
}

//Generates a list of alerts for this chunk
Chunk.prototype.setAlerts = function() {
    //No current alerts for chunks
}

//Deep equality 
Chunk.prototype.equals = function(chunk) {
    var minValsEqual = ((this.minVals.shardkey == chunk.minVals.shardkey) || (this.minVals.shardkey._bsontype && chunk.minVals.shardkey._bsontype && this.minVals.shardkey._bsontype == chunk.minVals.shardkey._bsontype));
    var maxValsEqual = ((this.maxVals.shardkey == chunk.maxVals.shardkey) || (this.maxVals.shardkey._bsontype && chunk.maxVals.shardkey._bsontype && this.maxVals.shardkey._bsontype == chunk.maxVals.shardkey._bsontype));
    return (this.collection == chunk.collection && minValsEqual && maxValsEqual);
}

//Creates a chunk given data about the chunk
createChunk= function(chunkData, map) {
    var collection = chunkData.ns.substring(chunkData.ns.indexOf(".")+1);
    var minVals = chunkData.min;
    for (field in minVals) {
        //This is the first chunk
        if (field.$minKey == 1) {
            minVals.field = -Infinity;
        }
    }

    var maxVals = chunkData.max;
    for (field in maxVals) {
        //This is the first chunk
        if (field.$maxKey == 1) {
            minVals.field = Infinity;
        }
    }
    var shardName = chunkData.shard;

    return new Chunk(collection, minVals, maxVals, map.shards[shardName]);
}
