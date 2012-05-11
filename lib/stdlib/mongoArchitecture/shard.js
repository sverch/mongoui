//Defines a mongoDB shard
function Shard(id, ss, c) {
    this.id = id; //Host name
    this.servers = ss; //The servers in this shard
    this.replicaSet; //The replica set backing this shard, if one exists
    this.cluster = c; //The cluster containing this shard
    this.chunks = new Array(); //The list of chunks in this shard
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this shard sorted by priority
}

//Getters
Shard.prototype.getID = function() {
	return this.id;
}

Shard.prototype.getServers = function() {
	return this.servers;
}

Shard.prototype.getReplicaSet = function() {
	return this.replicaSet;
}

Shard.prototype.getCluster = function() {
	return this.cluster;
}

Shard.prototype.getChunks = function() {
	return this.chunks;
}

Shard.prototype.getAlerts = function() {
    return this.alerts;
}

//Setters
Shard.prototype.setReplicaSet = function(replicaSet) {
    this.replicaSet = replicaSet;
}

//Generates a list of alerts for this shard
Shard.prototype.setAlerts = function() {
    //No current alerts for shards
}

//Adds a chunk to this shard
Shard.prototype.addChunk = function(chunk) {
    this.chunks.push(chunk);
}

//Checks if the shard already has this chunk
Shard.prototype.hasChunk = function(chunk) {
    for (var chunkIndex = 0; chunkIndex < this.chunks.length; chunkIndex++) {
        if (this.chunks[chunkIndex].equals(chunk)) {
            return true;
        }
    }
    return false;
}

//Check if a replica set is backing a shard
Shard.prototype.isBackedBy = function(replicaSet) {
    if (this.servers.length ==  replicaSet.servers.length) {
        for (var serverIndex = 0; serverIndex < this.servers.length; serverIndex++) {
            if (this.servers[serverIndex] != replicaSet.servers[serverIndex]) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

//Creates a shard given data about the shard
createShard = function(serverName, clusterName, shardInfo, map) {
    if (shardInfo) {
        var id = shardInfo._id;
        var servers = new Array();
        var serverList = shardInfo.host;
        var slash = serverList.indexOf("/");
        if (slash >= 0) {
            serverList = serverList.substring(slash+1).split(",");
            for (var index = 0; index < serverList.length; index++) {
                servers.push(map.servers[serverList[index]]);
            }
        } else {
            servers.push(map.servers[serverList]);
        }
    } else {
        var id = serverName;
        if (map.servers[serverName].getReplicaSet()) {
            var servers = map.servers[serverName].getReplicaSet().getServers();
        } else {
            var servers = new Array();
            servers.push(map.servers[serverName]);
        }
    }
    return new Shard(id, servers, map.clusters[clusterName]);
}
