//Defines a mongoDB shard cluster
function Cluster(id) {
    this.id = id; //Name of the cluster, based on its config server
    this.databases = new Array() //The list of databases in this cluster
    this.shards = new Array(); //The list of primary shards for this cluster
    this.configs = new Array(); //Config servers for this cluster
    this.routers = new Array(); //MongoS routing proccesses for this server
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this cluster sorted by priority
}

//Getters
Cluster.prototype.getID = function() {
	return this.id;
}

Cluster.prototype.getDatabases = function() {
	return this.databases;
}

Cluster.prototype.getPrimaries = function() {
	return this.primaries;
}

Cluster.prototype.getConfigs = function() {
	return this.configs;
}

Cluster.prototype.getRouters = function() {
	return this.routers;
}

Cluster.prototype.getAlerts = function() {
    return this.alerts;
}

//Generates a list of alerts for this cluster
Cluster.prototype.setAlerts = function() {
    //No current alerts for cluster
}

//Adds a database to this cluster
Cluster.prototype.addDatabase = function(database) {
    this.databases.push(database);
}

//Adds a shard to this cluster
Cluster.prototype.addShard = function(shard) {
    this.shards.push(shard);
}

//Adds a config server to this cluster
Cluster.prototype.addConfig = function(config) {
    this.configs.push(config);
}

//Adds a router to this cluster
Cluster.prototype.addRouter = function(router) {
    this.routers.push(router);
}
