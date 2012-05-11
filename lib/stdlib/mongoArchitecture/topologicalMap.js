// Creates a TopologicalMap given the data from mongoDB
function TopologicalMap(data) {

    // If this constructor is called without the "new" operator, "this" points
    // to the global object.  Log a warning and call it correctly.
    if (false === (this instanceof TopologicalMap)) {
        console.log('Warning: TopologicalMap constructor called without "new" operator');
        return new TopologicalMap(data);
    }

    this.collections = new Array(); //The collections in this map
    this.databases = new Array(); //The databases in this map
    this.servers = new Array(); //The servers in this map
    this.hosts = new Array(); //The hosts in this map
    this.replicaSets = new Array(); //The replica sets in this map
    this.clusters = new Array(); //The sharding clusters in this map
    this.shards = new Array(); //The shards in this map
    this.alerts = new Array();
    this.alerts["serverAlerts"]; //A max heap of server based alerts
    this.alerts["hostAlerts"]; //A max heap of host based alerts
    this.alerts["replicaSetAlerts"]; //A max heap of replica set based alerts
    this.alerts["shardAlerts"]; //A max heap of shard based alerts
    this.alerts["clusterAlerts"]; //A max heap of cluster based alerts

    var serverList = data.hosts;
    for (serverName in serverList) {
        if (serverList.hasOwnProperty(serverName) && serverList[serverName].serverStatus) {
            var newServer = createServer(serverName, serverList[serverName], this);
            var id = newServer.getID();
            if (!this.servers[id]) {
                this.servers[id] = newServer;
                //If that server is on a new host create that hosts
                var hostName = newServer.getHost().getID()

                //Add the server to its host's server list
                this.hosts[hostName].addServer(newServer);

                var replicaSet = newServer.getReplicaSet();  
                if (replicaSet) {
                    //Add the server to its replica set's server list
                    this.replicaSets[replicaSet.getID()].addServer(newServer, serverList[serverName].serverStatus.repl.ismaster);
                }
            }        
        }      
    }

    //Check for any servers that are down
    for (replicaSetName in this.replicaSets) {
        if (this.replicaSets.hasOwnProperty(replicaSetName)) {
            var server = this.replicaSets[replicaSetName].getPrimary();
            if (!server) {
                servers = this.replicaSets[replicaSetName].getSecondaries();
                server = servers[0];
            }
            if (server) {
                //The replica set was able to contact some server so use that server to check on the status of the other servers in the replica set
                var serverInfo = serverList[server.getID()];
                var replicaStatus = serverInfo.replSetGetStatus;
                if (replicaStatus) {
                    var members = replicaStatus.members;
                    for (index = 0; index < members.length; index++) {
                        var member = members[index];
                        if (member.stateStr == "(not reachable/healthy)") {
                            //Identified a server that is down
                            var hostName = member.name.substring(0, member.name.lastIndexOf(":"));
                            if (!this.hosts[hostName]) {
                                this.hosts[hostName] = new Host(hostName);
                            }
                            var nullServer = createNullServer(member.name, this.hosts[hostName], member.errMsg);
                            this.servers[nullServer.getID()] = nullServer;
                            this.hosts[hostName].addServer(nullServer);
                            this.replicaSets[replicaSetName].addServer(nullServer, false);
                            this.replicaSets[replicaSetName].incrementDead();
                        } else if (member.stateStr == "RECOVERING" &&  member.errmsg == "error RS102 too stale to catch up") {
                            //Identified a secondary that has become stale
                            this.servers[member.name].addAlert(new StaleServerAlert(this.servers[member.name]));
                            this.replicaSets[replicaSetName].incrementStale();
                        }
                    }
                } 
            }
        }
    }
    
    //Define clusters and config servers
    for (serverName in serverList) {
        if (serverList.hasOwnProperty(serverName)) {
            if (this.servers[serverName]) {
                var configServers;
                var masterName = serverName;
                if (serverList[serverName].getShardVersion) {
                    if (serverList[serverName].getShardVersion.errmsg) {
                        if (serverList[serverName].getShardVersion.errmsg == "not master") {
                            if (serverList[serverName].serverStatus && serverList[serverName].serverStatus.repl && (serverList[serverList[serverName].serverStatus.repl.primary] != undefined)) {
                                var primaryServerInfo = serverList[serverList[serverName].serverStatus.repl.primary];
                                masterName = serverList[serverName].serverStatus.repl.primary;
                                if (primaryServerInfo.getShardVersion) {
                                    configServers = primaryServerInfo.getShardVersion.configServer; 
                                }
                            }
                        } 
                    } else {
                        configServers = serverList[serverName].getShardVersion.configServer;
                    }
                }

                if (configServers) {
                    //If the cluster this server belongs to doesn't exist create it
                    if (!this.clusters[configServers]) {
                        this.clusters[configServers] = new Cluster(configServers);
                        //Add the config servers to the cluster
                        var remainingConfigServers = configServers;
                        while (remainingConfigServers.indexOf(":") != -1) {
                            var commaIndex = remainingConfigServers.indexOf(",");
                            if (commaIndex == -1) {
                                this.clusters[configServers].addConfig(this.servers[remainingConfigServers]);
                                this.servers[remainingConfigServers].setType("config");
                                remainingConfigServers = "";
                            } else {
                                var configServerName = remainingConfigServers.substring(0, commaIndex);
                                this.clusters[configServers].addConfig(this.servers[configServerName]);
                                this.servers[configServerName].setType("config");
                                remainingConfigServers = remainingConfigServers.substring(commaIndex+1);
                            }
                        }
                    } 

                    //Set the cluster of this server
                    this.servers[serverName].setCluster(this.clusters[configServers]);
                } else {
                    if (!(this.servers[serverName].isNull() || (serverList[serverName].mongoses != undefined && serverList[serverName].mongoses.length > 0))) {
                        if (!this.clusters[serverName]) {
                            this.clusters[masterName] = new Cluster(masterName);
                        }
                        this.servers[serverName].setCluster(this.clusters[masterName]);
                    }
                }
            }
        }
    }

    //Use config servers to create shards and chunks
    for (clusterName in this.clusters) {
        if (this.clusters.hasOwnProperty(clusterName)) {
            var configs = this.clusters[clusterName].getConfigs();
            if (configs.length == 0) {
                var newShard = createShard(clusterName, clusterName, undefined, this);
                if (this.servers[clusterName].getReplicaSet()) {
                    //This is a stand alone replica set

                    //Set the replica set for this shard
                    newShard.setReplicaSet(this.servers[clusterName].getReplicaSet());
    
                    //Set the shard of the servers in this shard
                    var replicaSetServer = this.servers[clusterName].getReplicaSet().getServers();
                    for (var serverIndex = 0; serverIndex < replicaSetServer.length; serverIndex++) {
                            this.servers[replicaSetServer[serverIndex].getID()].setShard(newShard);
                    }
                } else {
                    //This is an isolated server
                    this.servers[clusterName].setShard(newShard);
                }
                this.shards[newShard.getID()] = newShard;
                this.clusters[clusterName].addShard(newShard);
            } else {
                //This is a sharded cluster
                for (var configIndex = 0; configIndex < configs.length; configIndex++) {
                    var configServer = configs[configIndex];

                    //Set the cluster of the config server
                    configServer.setCluster(this.clusters[clusterName]);

                    //Creates the shards and add them to the cluster
                    var serverName = configServer.getID();
                    for (var shardIndex = 0; shardIndex < serverList[serverName].shards.length; shardIndex++) {
                        if (!this.shards[serverList[serverName].shards[shardIndex]._id]) {
                            //This is a new shard
                            var newShard = createShard(serverName, clusterName, serverList[serverName].shards[shardIndex], this);
                            this.clusters[clusterName].addShard(newShard);

                            //Set the shard of the servers in this shard                        
                            shardServers = newShard.getServers();
                            for (var serverIndex = 0; serverIndex < shardServers.length; serverIndex++) {
                                this.servers[shardServers[serverIndex].getID()].setShard(newShard);
                            }

                            //Find the backing replica set if one exists
                            newShard.setReplicaSet(this.replicaSets[newShard.getID()]);

                            this.shards[newShard.getID()] = newShard;
                        }
                    }

                    //Adds chunks to the shards
                    if (serverList[serverName].chunks) {
                        for (var index = 0; index < serverList[serverName].chunks.length; index++) {
                            var newChunk = createChunk(serverList[serverName].chunks[index], this);
                            if (!newChunk.getShard().hasChunk(newChunk)) {
                                newChunk.getShard().addChunk(newChunk);
                            }
                        }
                    }

                    //Add routers to the cluster
                    for (var mongosIndex = 0; mongosIndex < serverList[serverName].mongoses.length; mongosIndex++) {
                        if (this.servers[serverList[serverName].mongoses[mongosIndex]._id].type != "mongos") {
                            //This is a new mongos
                            var mongosName = serverList[serverName].mongoses[mongosIndex]._id;
                            this.clusters[clusterName].addRouter(this.servers[mongosName]);
                            this.servers[serverList[serverName].mongoses[mongosIndex]._id].setType("mongos");
                            this.servers[serverList[serverName].mongoses[mongosIndex]._id].setCluster(this.clusters[clusterName]);

                            //Add databases and collections to the cluster
                            for (var databaseIndex = 0; databaseIndex < serverList[mongosName].databases.length; databaseIndex++) {
                                databaseInfo = serverList[mongosName].databases[databaseIndex];

                                //If we haven't already discovered this database we need to define it
                                if (!this.databases[databaseInfo._id]) {
                                    this.databases[databaseInfo._id] = new Database(databaseInfo._id, databaseInfo.paritioned, this.clusters[clusterName]); 
                                    for (var collectionIndex = 0; collectionIndex < databaseInfo.collections.length; collectionIndex++) {
                                        collectionInfo = databaseInfo.collections[collectionIndex];

                                        //If we haven't already discovered this collection we need to define it
                                        if (!this.collections[collectionInfo.name]) {
                                            this.collections[collectionInfo.name] = new Collection(collectionInfo.name, this.databases[databaseInfo._id]);
                                            this.databases[databaseInfo._id].addCollection(this.collections[collectionInfo.name]);
                                            if (collectionInfo.stats.sharded) {

                                                //Set the shards for this collection
                                                for (shardName in collectionInfo.stats.shards) {
                                                    this.collections[collectionInfo.name].addShard(this.shards[shardName]);
                                                }
                                            }
                                        }
                                    }
                                    this.clusters[clusterName].addDatabase(this.databases[databaseInfo._id]);
                                }   
                            } 
                        }
                    }
                }
            }
        }
    }

    //Set the alerts for this map
    for (server in this.servers) {
        this.servers[server].setAlerts();
    }
    for (host in this.hosts) {
        this.hosts[host].setAlerts();
    }
    for (replicaSet in this.replicaSets) {
        this.replicaSets[replicaSet].setAlerts();
    }
    for (cluster in this.clusters) {
        this.clusters[cluster].setAlerts();
    }
    for (shard in this.shards) {
        this.shards[shard].setAlerts();
    }
    this.setAlerts();
}

//Getters
TopologicalMap.prototype.getServers = function() {
    return this.servers;
}

TopologicalMap.prototype.getHosts = function() {
    return this.hosts;
}

TopologicalMap.prototype.getReplicaSets = function() {
    return this.replicaSet;
}

TopologicalMap.prototype.getShards = function() {
    return this.shards;
}

TopologicalMap.prototype.getClusters = function() {
    return this.clusters;
}

//Returns a specific type of alert in this map or undefined if no such type of alert exists
//Valid types include: "server", "host", "replicaSet", "cluster", "shard"
TopologicalMap.prototype.getAlertType = function(type) {
    return this.alerts[type + "Alerts"];
}

//Gets a heap of all alerts in the map sorted by priority
TopologicalMap.prototype.getAlerts = function() {
    var totalAlerts = new MaxHeap(function(alert){return alert.getPriority();});
    for (alertList in this.alerts) {
        totalAlerts.pushAll(this.alerts[alertList]);
    } 
    return totalAlerts;
}

//Generates a list of alerts for this map
TopologicalMap.prototype.setAlerts = function() {
    this.alerts["serverAlerts"] = new MaxHeap(function(alert){return alert.getPriority();});
    for (server in this.servers) {
        this.alerts["serverAlerts"].pushAll(this.servers[server].getAlerts());
    }
    this.alerts["hostAlerts"] = new MaxHeap(function(alert){return alert.getPriority();});
    for (host in this.hosts) {
        this.alerts["hostAlerts"].pushAll(this.hosts[host].getAlerts());
    }
    this.alerts["replicaSetAlerts"] = new MaxHeap(function(alert){return alert.getPriority();});
    for (replicaSet in this.replicaSets) {
        this.alerts["replicaSetAlerts"].pushAll(this.replicaSets[replicaSet].getAlerts());
    }
    this.alerts["clusterAlerts"] = new MaxHeap(function(alert){return alert.getPriority();});
    for (cluster in this.clusters) {
        this.alerts["clusterAlerts"].pushAll(this.clusters[cluster].getAlerts());
    }
    this.alerts["shardAlerts"] = new MaxHeap(function(alert){return alert.getPriority();});
    for (shard in this.shards) {
        this.alerts["shardAlerts"].pushAll(this.shards[shard].getAlerts());
    }
}

