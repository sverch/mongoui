//Defines a mongoDB server
function Server(id, h, rs, s) {
    this.id = id; //Server name
    this.type = "mongod"; //The type of server, can be either mongod, mongos or config
    this.host = h; //The host running this server
    this.replicaSet = rs; //The replica set containing this server (or undefined if this server is not in a replica set)
    this.shard = s; //The shard containing this server (or undefined if this server is not in a shard)
    this.cluster; //For special servers (isSpecial returns true) it returns the clusters with which this server is associated, otherwise it is undefined
    this.stale = false; //Whether or not this server is a stale secondary
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this server sorted by priority
}

//Getters
Server.prototype.getID = function() {
	return this.id;
}

Server.prototype.getType = function() {
	return this.type;
}

Server.prototype.getHost = function() {
	return this.host;
}

Server.prototype.getReplicaSet = function() {
	return this.replicaSet;
}

Server.prototype.getShard = function() {
	return this.shard;
}

Server.prototype.getCluster = function() {
	return this.cluster;
}

Server.prototype.getAlerts = function() {
    return this.alerts;
}

//Setters
Server.prototype.setType = function(type) {
	this.type = type;
}

//Setters
Server.prototype.setShard = function(shard) {
	this.shard = shard;
}

Server.prototype.setCluster = function(cluster) {
	this.cluster = cluster;
}

//Checks if the server is a stale secondary
Server.prototype.isStale = function() {
    return this.stale;
}

//Checks if the server is reachable
Server.prototype.isNull = function() {
    return this.alerts.peek() instanceof UnreachableServerAlert;
}

//Checks if the server is a special server (mongos routing server or configuration server)
Server.prototype.isSpecial = function() {
    return this.type != "mongod";
}

//Adds an alert to this server
Server.prototype.addAlert = function(alert) {
    if (alert instanceof Alert) {
        this.alerts.push(alert);
    }
}

//Generates a list of alerts for this server
Server.prototype.setAlerts = function() {

    if (!(this.alerts.peek() instanceof UnreachableServerAlert)) {
	    //Check if the server is replicated
	    if (this.type == "mongod" && !this.replicaSet) {
	        this.alerts.push(new UnreplicatedServerAlert(this));
	    }
    }
}

//Creates a server given data about the server
createServer = function(id, serverInfo, map) {
    var hostName = serverInfo.serverStatus.host;
    var colon = hostName.indexOf(":");
    if (colon >= 0) {
        hostName = hostName.substring(0, colon);
    }
    var replicaSetName;
    if (serverInfo.serverStatus.repl) {
        replicaSetName = serverInfo.serverStatus.repl.setName;
    }

    if (!map.hosts[hostName]) {
        map.hosts[hostName] = new Host(hostName);
    }

    if (replicaSetName && !map.replicaSets[replicaSetName]) {
        map.replicaSets[replicaSetName] = new ReplicaSet(replicaSetName);
    }

    return new Server(id, map.hosts[hostName], map.replicaSets[replicaSetName], undefined);
}

//Creates a server with no properties except for an unreachable alert
//To be used when no data can be obtained about a server
createNullServer = function(id, host, err) {
    nullServer = new Server(id, host, undefined, undefined);
    nullServer.alerts.push(new UnreachableServerAlert(err, nullServer));
    return nullServer;
}
