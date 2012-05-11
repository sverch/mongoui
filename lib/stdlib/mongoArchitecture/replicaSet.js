//Defines a mongoDB replica set
function ReplicaSet(id) {
    this.id = id; //Name of the replica set
    this.servers = new Array(); //List of servers in this replica set
    this.numStale = 0; //The number of stale servers in this replica set
    this.numDead = 0; //The number of unreachable servers in this replica set
    this.primary; //The primary in this replica set
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this replica set sorted by priority
}

//Getters
ReplicaSet.prototype.getID = function() {
	return this.id;
}

ReplicaSet.prototype.getServers = function() {
	return this.servers;
}

ReplicaSet.prototype.getPrimary = function() {
	return this.primary;
}

ReplicaSet.prototype.getSecondaries = function() {
    return this.servers.slice(0, this.servers.indexOf(this.primary));
}

ReplicaSet.prototype.getAlerts = function() {
    return this.alerts;
}

//Indicates that another servers has gone stale
ReplicaSet.prototype.incrementStale = function() {
    this.numStale++;
}

//Indicates that the replica set has lost contact with another server
ReplicaSet.prototype.incrementDead = function() {
    this.numDead++;
}

//Returns the number of live (reachable and healthy) servers in this replica set
ReplicaSet.prototype.numLive = function() {
    return this.servers.length - this.numStale - this.numDead;
}

//Generates a list of alerts for this replica set
ReplicaSet.prototype.setAlerts = function() {

    //Check if the primary is down
    if (!this.primary) {
        this.alerts.push(new PrimaryDownAlert(this));
    }

    //A replica set should always contain at least 3 servers
    if (this.servers.length < 3) {
        this.alerts.push(new MissingArbiterAlert(this));
    }

    //Check if any of the secondaries are dead or stale
    if (this.numStale > 0) {
        this.alerts.push(new StaleSecondaryAlert(this));    
    }

    if (this.numDead > 0) {
        this.alerts.push(new UnreachableSecondaryAlert(this));    
    }

    //Check if the replica set is in danger of failing
    majoritySize = this.servers.length / 2 + 1;
    if (this.numLive() <= majoritySize) {
        this.alerts.push(new SingleFailurePointAlert(this));
    } else {
        var primaryHost = this.primary.getHost();
        var othersLiveOnPrimaryHost = -1;
        for (index = 0; index < primaryHost.servers.length; index++) {
            var server = primaryHost.servers[index];
            if (server.getReplicaSet()) {
                if (!server.isNull() && !server.isStale() && (server.getReplicaSet() == this)) {
                    othersLiveOnPrimaryHost++;
                } 
            }
        }   
        if (this.numLive() - othersLiveOnPrimaryHost <= majoritySize) {
            this.alerts.push(new PrimaryHostFailurePointAlert(this));
        }
    }
}

//Adds a server to this host
ReplicaSet.prototype.addServer = function(server, isPrimary) {
    this.servers.push(server);
    if (isPrimary) {
	    this.primary = server;
    }
}
