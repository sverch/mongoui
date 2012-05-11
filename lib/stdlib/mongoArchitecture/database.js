//Defines a mongoDB database
function Database(id, p, c) {
    this.id = id; //Database name
    this.partitioned = p; //Whether or not this database is partitioned
    this.collections = new Array(); //The list of collections in this database
    this.cluster = c; //The cluster containing this database
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this server sorted by priority
}

//Getters
Database.prototype.getID = function() {
	return this.id;
}

Database.prototype.getCollections = function() {
	return this.collections;
}

Database.prototype.getAlerts = function() {
    return this.alerts;
}

//Checks if the database is partitioned
Database.prototype.isPartitioned = function() {
    return this.partitioned;
}

//Generates a list of alerts for this database
Database.prototype.setAlerts = function() {
    //No current alerts for databases
}

//Adds a collection to this database
Database.prototype.addCollection = function(collection) {
    this.collections.push(collection);
}
