//Defines a mongoDB collection
function Collection(id, d) {
    this.id = id; //Collection name
    this.database = d; //The database containing this collection
    this.shards; //The list of shards across which this collection is partitioned, or undefined if this collection is not sharded
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this server sorted by priority
}

//Getters
Collection.prototype.getID = function() {
	return this.id;
}

Collection.prototype.getDatabase = function() {
	return this.database;
}

Collection.prototype.getShards = function() {
    return this.shards;
}

Collection.prototype.getAlerts = function() {
    return this.alerts;
}

//Generates a list of alerts for this collection
Collection.prototype.setAlerts = function() {
    //No current alerts for databases
}

//Adds a collection to this database
Collection.prototype.addShard = function(shard) {
    if (!this.shards) {
        this.shards = new Array();
    }
    this.shards.push(shard);
}
