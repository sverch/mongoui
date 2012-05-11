// Base application and web socket includes
var httpServer = require('http').createServer(serverFunction),
    mime = require('mime'),
    url = require("url"),
    path = require("path"),
    port = process.argv[2] || 8080;
    io = require('socket.io').listen(httpServer),
    fs = require('fs') // XXX if we can get the client independent of
                       // the server, we won't need this (used to serve
                       // index.html)
var async = require('async');

// MongoDB includes
var Db = require('mongodb').Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server,
  mongo = require('mongodb');

var assert = require('assert');

// Http server stuff
function serverFunction (request, response) {

    var uri = url.parse(request.url).pathname
        , filename = path.join(process.cwd(), uri);

    /* Handle mime type for less css files */
    mime.define({'text/css':['less']});

    console.log("Attempting to serve file: " + filename);
    path.exists(filename, function(exists) {
        if(!exists) {
            response.writeHead(404, {"Content-Type": "text/plain"});
            response.write("404 Not Found\n");
            response.end();
            return;
        }

        if (fs.statSync(filename).isDirectory()) filename += "/index.html";

        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200, {"Content-Type": mime.lookup(filename)});
            response.write(file, "binary");
            response.end();
        });
    });
}

httpServer.listen(parseInt(port, 10));

console.log("Static file server running at\n => http://localhost:" + port + "/\nCTRL + C to shutdown");

// MongoDB and Socket.IO stuff
var env_host = process.env['MONGO_NODE_DRIVER_HOST'];
var env_port = process.env['MONGO_NODE_DRIVER_PORT'];
var starthost = env_host != null ? env_host : 'cslab1a';
var startport = env_port != null ? env_port : Connection.DEFAULT_PORT;
var dummy_file = process.env['DUMMY_FILE'];
dummy_file = dummy_file === "" ? null : dummy_file;

// Disable debugging
io.set('log level',1);

// Return the data when the client connects
io.sockets.on('connection', function (socket) {

    // User requested most recent data
    socket.on('getupdate', function (servers) {

        // User can pass back parameters (maybe type of update requested?)
        console.log("Client sent: " + JSON.stringify(servers));

        // getServerStatus and return to client
        if (dummy_file != null) {
            discoverClusterDummy([starthost + ":" + startport],{},function(cluster) {
                socket.emit('update', cluster);
            });
        } else {
            discoverCluster(servers,{},function(cluster) {
                socket.emit('update', cluster);
            });
        }
    });
});

// function: undiscoveredServers
// args: serverData - hash of all the data we have gotten so far
// returns: list of servers that the contents of serverData indicates are part
// of the cluster, but don't have entries in serverData yet

function undiscoverdServers (serverData) {

    serverNames = [];

    // Pushes the item into list only if it is not in the list or the hash
    function pushOnce (list,item,hash) {
        if (typeof hash[item] === 'undefined') {
            if (list.indexOf(item) === -1) {
                list.push(item);
            }
        }
    }
    // Calls pushOnce on all the items with the given list and hash
    function pushAll (list,items,hash) {
        if (typeof items !== 'undefined') {
            for (var i=0;i<items.length;i++) {
                pushOnce(list,items[i],hash);
            }
        }
    }

    // Iterate server data to see if there are any servers to discover
    for (server in serverData) {

        // Skip serverData that didn't get a serverStatus for some reason
        if (typeof serverData[server].serverStatus === 'undefined') {
            continue;
        }

        var process = serverData[server].serverStatus.process;

        if (typeof serverData[server].getShardVersion !== 'undefined') {
            var configServerString = serverData[server].getShardVersion.configServer;
        }
        var replicaSet = serverData[server].serverStatus.repl;
        var mongoses = serverData[server].mongoses;
        var shards = serverData[server].shards;

        // Check whether this is mongod or mongos
        if (process === "mongod") {

            // If we are in a replica set, add the other members
            if (typeof replicaSet !== 'undefined') {
                var replServers = replicaSet.hosts;
                pushAll(serverNames,replServers,serverData);
            }

            // Get any config servers that we can see
            if (typeof configServerString !== 'undefined' && configServerString !== '') {
                var configServers = parseConfigStr(configServerString).servers;
                pushAll(serverNames,configServers,serverData);
            }

            // Get mongoses from config collection
            if (typeof mongoses !== 'undefined') {
                var routingServers = mongoses.reduce(function (res, item) {res.push(item._id); return res;},[]);
                pushAll(serverNames,routingServers,serverData);
            }
        } else if (process === "mongos") {
            for (var i=0;i<shards.length;i++) {
                var shardServers = parseShardStr(shards[i].host).servers;
                pushAll(serverNames,shardServers,serverData);
            }
        } else {
            console.log("Invalid serverStatus output");
        }
    }
    return serverNames;
}
// While len(things we know about) < len(things we already talked to):
// talk to things
// add things we know about
function discoverClusterDummy(dummy,dummy2, callback) {
    fs.readFile(dummy_file, "binary", function(err, file) {
        callback(JSON.parse(file));
    });
}

// function: discoverCluster
// args: serverNames - list of servers to probe in this call
// serverData - hash of all the data we have gotten so far
// callback - function to call with the final cluster

function discoverCluster (serverNames,serverData,callback) {
    accumulateServerInfo (serverNames, serverData, function (serverData) {
        var serverNames = undiscoverdServers (serverData);

        if (serverNames.length === 0) {
            callback({"hosts":serverData})
        } else {
            discoverCluster (serverNames, serverData, callback);
        }
    });
}

// parseConfigStr
// args:
//  configStr - string of the form <host>:<port>,<host>:<port>,...
// returns:
//  {
//  "servers:[
//  "<host>:<port>",
//  "<host>:<port>"
//  ]
//  }
function parseConfigStr (configStr) {
    var configStrObj = {};
    configStrObj.servers = configStr.split(',');
    return configStrObj;
}
// parseShardStr
// args:
//  shardStr - string of the form <replicaset>/<host>:<port>,<host>:<port>,...
// returns:
//  {
//  "replicaSet":<replicaset>
//  "servers:[
//  "<host>:<port>",
//  "<host>:<port>"
//  ]
//  }
function parseShardStr (shardStr) {
    var splitShardStr = shardStr.split('/');
    var shardStrObj = {};

    if (splitShardStr.length == 1) {
        shardStrObj.servers = [splitShardStr[0]];
    } else {
        shardStrObj.replicaSet = splitShardStr[0];
        shardStrObj.servers = splitShardStr[1].split(',');
    }
    return shardStrObj;
}

discoverCluster([starthost + ":" + startport],{},function(cluster) {
    //console.dir(cluster.hosts['cslab9c:27017'].databases[1]);
    //console.dir(cluster);
});

// accumulateServerInfo
// args:
//  servers - a list of strings of the form <host>:<port>
//  serverInfoHash - a hash keyed by the server strings containing serverInfo
//      for each server
//  callback - function to call to return the original hash with the new server
//      entries added
function accumulateServerInfo (servers, serverInfoHash, callback) {
    function mapIterator (server,callback) {
        getServerInfo(server, function (serverInfo) {
            callback(null, {server:server,serverInfo:serverInfo});
        });
    }
    function mapCallback (err,serverInfoList) {
        /* Add all the results from the list to the provided hash */
        callback(serverInfoList.reduce(function (results,current) {
            results[current.server] = current.serverInfo;
            return results;
            },serverInfoHash));
    }
    /* Call map to build a list of serverInfo results in parallel */
    async.map(servers,mapIterator,mapCallback);
}

// getServerInfo
// args:
//  server - string of the form <host>:<port>
//  callback - function to call with all the information about this server

function getServerInfo (server,callback) {

    // Create a container for the server info
    var serverInfo = {};

    // Get connection information
    serverInfo.host = server.split(':')[0];
    serverInfo.port = parseInt(server.split(':')[1]);

    if (typeof serverInfo.host === 'undefined' || typeof serverInfo.port === 'undefined') {
        serverInfo = {error:"Error: invalid server string.  Must be <host>:<port>"};
        callback (serverInfo);
        return;
    }

    var dbConnectionInfo = new Db('admin', 
            new Server(serverInfo.host, 
                serverInfo.port, 
                {auto_reconnect: false, poolSize: 1}), 
                {native_parser:false});


    // Helper functions to construct callbacks for use in batch code
    function makeAdminCommandCallback (command) {
        return function (db,callback) {
            db.command(command,callback);
        };
    };
    function makeConfigCommandCallback (collectionName) {
        if (collectionName === 'databases') {
            return function (db,callback) {
                getDocs(db,collectionName,function(docs) {
                    addCollections(db, docs, callback);
                });
            };
        } else {
            return function (db,callback) {
                getDocs(db,collectionName,function(docs) {
                    callback(null, docs);
                });
            };
        }
    };

    // Lists of commands to run and add to serverInfo
    var adminCommands = [
        {"name":"serverStatus","command": makeAdminCommandCallback({serverStatus:1})},
        {"name":"replSetGetStatus","command": makeAdminCommandCallback({replSetGetStatus:1})},
        {"name":"getShardVersion","command": makeAdminCommandCallback({getShardVersion:'test.foo'})},
        {"name":"getCmdLineOpts","command": makeAdminCommandCallback({getCmdLineOpts:1})}
        ];
    var configCommands = [
        {"name":"shards","command": makeConfigCommandCallback('shards')},
        {"name":"chunks","command": makeConfigCommandCallback('chunks')},
        {"name":"mongoses","command": makeConfigCommandCallback('mongos')},
        {"name":"databases","command": makeConfigCommandCallback('databases')}
        ];

    // Open database connection
    dbConnectionInfo.open (function (err, dbConnection) {
        /* TODO: better error reporting */
        /* This is the case we hit when the server is down */
        if (err != null) {
            //console.log(err);
            callback(err);
            return;
        }
        var adminDB = dbConnection.db('admin');
        var configDB = dbConnection.db('config');
        runDbCommands (adminDB,adminCommands,serverInfo,function (serverInfo) {
            runDbCommands (configDB,configCommands,serverInfo,function (serverInfo) {
                dbConnection.close();
                callback(serverInfo);
            });
        });
    });
}

// runDbCommands
// args:
//  dbConnection - connection to database to run the commands on
//  requests - list of requests to run against the server
//  results - hash of commands that have already been run
//  callback - function to call with the new hash with new results

function runDbCommands (dbConnection, requests, results, callback) {
    /* Now that we have an open connection, run all requested commands */
    function mapIterator (request,callback) {
        request.command(dbConnection, function (err, result) {
            callback(null, {request:request.name,result:result});
        });
    }
    function mapCallback (err,resultList) {
        /* Add all the results from the list to the provided hash */
        callback(resultList.reduce(function (results,current) {
            results[current.request] = current.result || undefined;
            return results;
            },results));
    }
    async.map(requests,mapIterator,mapCallback);
}

// getDocs
// args:
//  dbConnection - connection to database
//  collectionName - name of collection to get documents from
//  callback - function to call with the documents in this collection

function getDocs(dbConnection,collectionName,callback) {
    dbConnection.collection(collectionName,function(err, collection) {
        assert.equal(null, err);
        assert.ok(collection != null);

        collection.find().toArray(function(err,docs) {
            // TODO: handle the error case
            callback(docs);
        });
    });
}


// addCollections
// args:
//  dbConnection - connection to database
//  databases - list of databases to get collections for
//  callback - function to call with the updated database list

function addCollections (dbConnection, databases, callback) {
    if (!databases) {
        callback(null, databases);
        return;
    }
    function mapIterator (database,callback) {
        var dbConnectionCurrent = dbConnection.db(database._id);
        getCollections(dbConnectionCurrent, function (err, collections) {
            database.collections = collections;
            callback(null, database);
        });
    }
    async.map(databases,mapIterator,callback);
}

// getCollections
// args:
//  dbConnection - connection to database
//  callback - function to call with the updated collection list

function getCollections (dbConnection, callback) {
    dbConnection.collectionNames(function (err,names) {
        function mapIterator (collection,callback) {
            var collectionName = collection.name.substr(collection.name.indexOf('.') + 1);
            dbConnection.collection(collectionName,function (err, collectionHandle) {
                collectionHandle.stats(function (err,stats) {
                    collection.stats = stats;
                    callback(null, collection);
                });
            });
        }
        async.map(names,mapIterator,callback);
    });
}
