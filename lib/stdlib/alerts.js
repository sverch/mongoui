//Defines an Alert
//This is abstract
function Alert(id, p) {
    this.id = id;
    this.priority = p;
}

//Getters
Alert.prototype.getID = function() {
	return this.id;
}

Alert.prototype.getPriority = function() {
	return this.priority;
}

//Information about this error, should be overriden
Alert.prototype.toString = function() {
	throw "This method is abstract";
}

//Tips for avoiding this error, should be overriden
Alert.prototype.tips = function() {
	throw "This method is abstract";
}


//Defines a Replica Set Alert
//This is abstract
ReplicaSetAlert.prototype = new Alert();
ReplicaSetAlert.prototype.constructor=ReplicaSetAlert; 
function ReplicaSetAlert(id, p, rs) {
    Alert.call(this, id+200, p);
    this.myReplicaSet= rs;
}

//Defines a Primary Down Alert
PrimaryDownAlert.prototype = new ReplicaSetAlert();
PrimaryDownAlert.prototype.constructor=PrimaryDownAlert; 
function PrimaryDownAlert(rs) {
    ReplicaSetAlert.call(this, 0, 230, rs);
}

PrimaryDownAlert.prototype.toString = function() {
	return "The primary of replica set " + myReplicaSet.id + " is down.";
}

PrimaryDownAlert.prototype.tips = function() {
	return "If the primary is down it means that no new primary could be elected.  This probably means that either a majority of your secondaries are down or you have a 2 node replica set without an arbiter. Check for stale or unreachable alerts on your secondary nodes.";
}

//Defines a Missing Arbiter Alert
MissingArbiterAlert.prototype = new ReplicaSetAlert();
MissingArbiterAlert.prototype.constructor=MissingArbiterAlert; 
function MissingArbiterAlert(rs) {
    ReplicaSetAlert.call(this, 1, 200, rs);
}

MissingArbiterAlert.prototype.toString = function() {
	return "A replica set should not contain 2 nodes.  If you wish to have a primary and a single backup please add an arbiter.";
}

MissingArbiterAlert.prototype.tips = function() {
	return "A replica set should not contain 2 nodes.  If your primary goes down the entire replica set will fail because a single node is not a majority in a group of 2 nodes and cannot elect a primary.  If you wish to have a primary and a single secondary please add an arbiter.";
}

//Defines a StaleSecondaryAlert
StaleSecondaryAlert.prototype = new ReplicaSetAlert();
StaleSecondaryAlert.prototype.constructor=StaleSecondaryAlert; 
function StaleSecondaryAlert(rs) {
    ReplicaSetAlert.call(this, 2, 150, rs);
}

StaleSecondaryAlert.prototype.toString = function() {
	return "Some of the secondaries in this replica set are stale.";
}

StaleSecondaryAlert.prototype.tips = function() {
	return "A secondary becomes stale if it falls too far behind the primaries oplog.  You may wish to increase the size of your oplog to prevent this in the future.  To fix the current problem please perform a manual resynch.  To do this check each individual server for errors to see if it is stale.  For each stale server you will need to stop the server, delete all data and restart it.";
}

//Defines a Unreachable Secondary Alert
UnreachableSecondaryAlert.prototype = new ReplicaSetAlert();
UnreachableSecondaryAlert.prototype.constructor=UnreachableSecondaryAlert; 
function UnreachableSecondaryAlert(rs) {
    ReplicaSetAlert.call(this, 3, 160, rs);
}

UnreachableSecondaryAlert.prototype.toString = function() {
	return "Some of the secondaries in this replica set are unreachable or unhealthy.";
}

UnreachableSecondaryAlert.prototype.tips = function() {
	return "There are many reasons a server may be unreachable or unhealthy.  Check the specific erros on your servers for more detail.";
}

//Defines a Single Failure Point Alert
SingleFailurePointAlert.prototype = new ReplicaSetAlert();
SingleFailurePointAlert.prototype.constructor=SingleFailurePointAlert; 
function SingleFailurePointAlert(rs) {
    ReplicaSetAlert.call(this, 4, 215, rs);
}

SingleFailurePointAlert.prototype.toString = function() {
	return "If the primary fails the entire replica set will fail.";
}

SingleFailurePointAlert.prototype.tips = function() {
	return "This problem is most likely due to some of your secondaries failing.  Check your secondary servers for alerts indicating they are unreachable or stale.";
}

//Defines a PrimaryHostFailurePointAlert
PrimaryHostFailurePointAlert.prototype = new ReplicaSetAlert();
PrimaryHostFailurePointAlert.prototype.constructor=PrimaryHostFailurePointAlert; 
function PrimaryHostFailurePointAlert(rs) {
    ReplicaSetAlert.call(this, 5, 175, rs);
}

PrimaryHostFailurePointAlert.prototype.toString = function() {
	return "If the host the primary is on goes down the entire replica set will go down.";
}

PrimaryHostFailurePointAlert.prototype.tips = function() {
	return "It is usually a good idea to store secondaries (backups) on different machines from the primary and each other.  This way the data will still be available even if any single machine fails.";
}


//Defines a Host Alert
//This is abstract
HostAlert.prototype = new Alert();
HostAlert.prototype.constructor=HostAlert; 
function HostAlert(id, p, h) {
    Alert.call(this, id+300, p);
    this.myHost = h;
}

//Defines a Unreachable Host Alert
UnreachableHostAlert.prototype = new HostAlert();
UnreachableHostAlert.prototype.constructor=UnreachableHostAlert; 
function UnreachableHostAlert(rs) {
    HostAlert.call(this, 3, 160, rs);
}

UnreachableHostAlert.prototype.toString = function() {
	return "This host is unreachable.";
}

UnreachableHostAlert.prototype.tips = function() {
	return "This is most likely due to either a network partition or a physical crash.";
}


//Defines a Server Alert
//This is abstract
ServerAlert.prototype = new Alert();
ServerAlert.prototype.constructor=ServerAlert; 
function ServerAlert(id, p, s) {
    Alert.call(this, id+400, p);
    this.myServer = s;
}

//Defines a Unreachable Server Alert
UnreachableServerAlert.prototype = new ServerAlert();
UnreachableServerAlert.prototype.constructor=UnreachableServerAlert; 
function UnreachableServerAlert(e, s) {
    ServerAlert.call(this, 0, 255, s);
    if (e) {
	this.error = e;
    } else {
	this.error = "unkown error";
    }
}

UnreachableServerAlert.prototype.toString = function() {
	return "Server " + this.myServer.getID() + " could not be contacted.";
}

UnreachableServerAlert.prototype.tips = function() {
	return "Error: " + this.error + ".  Is the host for this server up?";
}

//Defines a Unreplicated Server Alert
UnreplicatedServerAlert.prototype = new ServerAlert();
UnreplicatedServerAlert.prototype.constructor=UnreplicatedServerAlert; 
function UnreplicatedServerAlert(s) {
    ServerAlert.call(this, 1, 200, s);
}

UnreplicatedServerAlert.prototype.toString = function() {
	return "Server is not backed up.";
}

UnreplicatedServerAlert.prototype.tips = function() {
	return "If this server goes down you will lose access to the data on it.  Consider adding this server to a replica set.  The smallest type of replica set contain a primary, a secondary (backup) and an arbiter.";
}

//Defines a Stale Server Alert
StaleServerAlert.prototype = new ServerAlert();
StaleServerAlert.prototype.constructor=StaleServerAlert; 
function StaleServerAlert(s) {
    ServerAlert.call(this, 10, 150, s);
}

StaleServerAlert.prototype.toString = function() {
	return "Server " + this.myServer.id + " is stale.";
}

StaleServerAlert.prototype.tips = function() {
	return "Manually resych this server by shutting it down, deleteing all data and restarting it.  In the future you may want to increase the size of your replica set's oplog to prevent this from occurring.";
}








