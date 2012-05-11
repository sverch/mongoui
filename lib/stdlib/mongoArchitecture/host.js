//Defines a mongoDB host
function Host(id) {
    this.id = id; //Host name
    this.servers = new Array(); //List of servers on this host
    this.alerts = new MaxHeap(function(alert){return alert.getPriority();});; //The alerts for this host sorted by priority
}

//Getters
Host.prototype.getID = function() {
	return this.id;
}

Host.prototype.getServers = function() {
	return this.servers;
}

Host.prototype.getAlerts = function() {
    return this.alerts;
}

//Generates a list of alerts for this host
Host.prototype.setAlerts = function() {
    //Check if the host is down
    var unreachable = true;
    for (var i = 0; i < this.servers.length; i++) {
        unreachable &= this.servers[i].isNull(); 
    }
    if (unreachable) {
        this.alerts.push(new UnreachableHostAlert(this));
    }
}

//Adds a server to this host
Host.prototype.addServer = function(server) {
	this.servers.push(server);
}
