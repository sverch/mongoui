function ClusterTreeWidget (baseID) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof ClusterTreeWidget)) {
        console.log('Warning: ClusterTreeWidget constructor called without "new" operator');
        return new ClusterTreeWidget(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }

    /* construct unique IDs for all the elements in this widget */
    var ids = {
        main:           baseID,
        wrapper:        baseID + "-wrapper",
        info:           baseID + "-info",
        alerts:         baseID + "-alert"
    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }

    /* Elements of the stats pane */
    var wrapper =  '<div id="' + ids.wrapper + '" class="widget-default-container"></div>';
    var info =  '<div id="' + ids.info + '" class="widget-stats-container"></div>';

    /* Clear the element we are using */
    $(sel.main).empty();

    /* Insert the stats and pie panes */
    $(sel.main).append(wrapper);
    $(sel.main).append(info);
    
    var nwidth = 120;
    var nheight = 20;
    var nmargin = 3;
    
    var alertR = 5;

    // JIT Code
    
    (function() {
      var ua = navigator.userAgent,
          iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
          typeOfCanvas = typeof HTMLCanvasElement,
          nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
          textSupport = nativeCanvasSupport 
            && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
      labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
      nativeTextSupport = labelType == 'Native';
      useGradients = nativeCanvasSupport;
      animate = !(iStuff || !nativeCanvasSupport);
    })();

    var st = new $jit.ST({
        //id of viz container element
        injectInto: ids.wrapper,
        height: $(sel.wrapper).height(),
        width: $(sel.wrapper).width(),
        //set duration for the animation
        duration: 300,
        //set animation transition type
        transition: $jit.Trans.Quart.easeInOut,
        //set distance between node and its children
        levelDistance: 50,
        //enable panning
        Navigation: {
          enable:true,
          panning:true
        },
        //set node and edge styles
        //set overridable=true for styling individual
        //nodes or edges
        Node: {
            type: 'rectangle',
            color: '#aaa',
            align: "center",
            autoWidth: true,
            overridable: true
        },
        
        Edge: {
            type: 'bezier',
            overridable: true
        },
        
        //This method is called on DOM label creation.
        //Use this method to add event handlers and styles to
        //your node.
        onCreateLabel: function(label, node){
            label.id = baseID + node.id;            
            label.innerHTML = node.name;
            label.onclick = function(){
            	  st.onClick(node.id);
            };
            //set label styles
            var style = label.style;
            if (node.name.indexOf('</img> ') < 0) {
                style.width = node.name.length*8+20 + 'px';
            }
            else {
                var tempName = node.name.substring(node.name.indexOf('</img> ')+7);
                if (tempName.indexOf('</img> ') < 0) {
                    style.width = tempName.length*8+35 + 'px';
                }
                else {
                    style.width = tempName.substring(tempName.indexOf('</img> ')+7).length*8+45 + 'px';
                }
            }
            style.height = (nheight - nmargin) + 'px';
            style.cursor = 'pointer';
            style.color = '#333';
            style.fontSize = '0.8em';
            style.textAlign= 'center';
        },
        
        //This method is called right before plotting
        //a node. It's useful for changing an individual node
        //style properties before plotting it.
        //The data properties prefixed with a dollar
        //sign will override the global node style properties.
        onBeforePlotNode: function(node){
            //add some color to the nodes in the path between the
            //root node and the selected node.
            if (node.selected) {
                node.data.$color = "#AA7";
            }
            else {
                delete node.data.$color;
                //if the node belongs to the last plotted level
                if(!node.anySubnode("exist")) {
                    //count children number
                    var count = 0;
                    node.eachSubnode(function(n) { count++; });
                    //assign a node color based on
                    //how many children it has
                    node.data.$color = ['#aaa', '#baa', '#caa', '#daa', '#eaa', '#faa'][count];                    
                }
            }
        },
        
        //This method is called right before plotting
        //an edge. It's useful for changing an individual edge
        //style properties before plotting it.
        //Edge data proprties prefixed with a dollar sign will
        //override the Edge global style properties.
        onBeforePlotLine: function(adj){
            if (adj.nodeFrom.selected && adj.nodeTo.selected) {
                adj.data.$color = "#eed";
                adj.data.$lineWidth = 3;
            }
            else {
                delete adj.data.$color;
                delete adj.data.$lineWidth;
            }
        },
        
        onAfterCompute: function(id){
            var node = st.graph.getNode(id);
            if (node != undefined) {
                node.data['div'].empty();
                node.data['div'].append(node.data['html']);
            }
        }
    });
    st.loadJSON({});
    
    $(sel.wrapper + '-canvas').css('overflow','hidden !important');
    $(sel.wrapper).css('overflow','hidden !important');
    $(sel.info).css('overflow','auto !important');

    var rendered = 0;

    /* The only public field of this object is the "render" function.  It takes
     * as an argument the raw data from MongoDB */
    this.render = function (data) {
        // Makes sure JIT doesn't double-render -> ends up looking very wrong
        if (!st.busy) {
            // Converts Mongo JSON into a Topological Map
            var map = new TopologicalMap(data);
            
            // Converts a Topological Map into JSON for JIT
            var json = this.generateJSON(map);
            if (json === false)
                return;

            //loads JSON
            st.loadJSON(json);
            //compute node positions and layout
            st.compute();
            //make a translation of the tree to center it
            st.geom.translate(new $jit.Complex(-200, 0), "current");
            //emulate a click on the root node.
            st.onClick(st.root);

            // Adds resizing measures now that a tree exists (JIT is not happy without a tree)
            // Force initial resize
            st.canvas.resize($(sel.wrapper).width(),$(sel.wrapper).height());
            // Force resize div resize
            $(sel.main).resize(function() {
                st.canvas.resize($(sel.wrapper).width(),$(sel.wrapper).height());
            });
            // Force resize upon tab click
            $('a[href="' + ids.main + '"]').click(function() {
                st.canvas.resize($(sel.wrapper).width(),$(sel.wrapper).height());
            });
        }
    };
    

    // Converts TopologicalMap into JSON for JIT
    
    this.generateJSON = function(map){
        var cluster = false;
        var clustersList = map.getClusters();
        for (ci in clustersList) {
            var clusterAlert = 0;
            var cluster = clustersList[ci];
            var configsList = cluster.configs;
            var configs = [];
            var configAlert = 0;
            if (configsList.length == 0) {
                var shardsList = cluster.shards;
                for (i in shardsList) {
                    var shardAlert = 0;
                    var shard = shardsList[i];
                    var replSetAlert = 0;
                    var replSet = shard.getReplicaSet();
                    var servers = [];
                    
                    // Case for single server
                    if (replSet == undefined) {
                        var serversList = shard.getServers();
                        for (var j = 0; j < 1; j++) {
                            var server = serversList[j];
                            console.log(server.getID());
                            servers[j] = this.generateJSONElement(i + 's' + j,server.getID(),'Server');
                            if (server.alerts.size() > 0) {
                                this.setJSONAlert(servers[j],true);
                                var alert = server.alerts.peek();
                                servers[j].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                                clusterAlert++;
                                shardsAlert++;
                                shardAlert++;
                                replSetAlert++;
                            }
                            return servers[j];
                        }
                    }

                    // Case for single replica set
                    else {
                        var serversList = replSet.getServers();
                        for (var j = 0; j < serversList.length; j++) {
                            var server = serversList[j];
                            servers[j] = this.generateJSONElement(replSet.getID() + i + 's' + j,server.getID(),'Server');
                            if (server.alerts.size() > 0) {
                                this.setJSONAlert(servers[j],true);
                                var alert = server.alerts.peek();
                                servers[j].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                                clusterAlert++;
                                shardsAlert++;
                                shardAlert++;
                                replSetAlert++;
                            }
                        }
                        replSetJSON = this.generateJSONElement(replSet.getID(),replSet.getID(),'Replica Set',servers);
                        if (replSetAlert > 0) {
                            this.setJSONAlert(replSetJSON,false);
                        }
                        if (replSet.alerts.size() > 0) {
                            this.setJSONAlert(replSetJSON,true);
                            var alert = replSet.alerts.peek();
                            replSetJSON.data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                            shardsAlert++;
                            shardAlert++;
                            clusterAlert++;
                        }
                        cluster = this.generateJSONElement(cluster.getID(),cluster.getID(),'Cluster',[replSetJSON]);
                        if (clusterAlert > 0) {
                            this.setJSONAlert(cluster,false);
                        }
                        return cluster;
                    }
                }
            }
            // Case for full cluster
            else {
                for (var i = 0; i < configsList.length; i++) {
                    configs[i] = this.generateJSONElement(cluster.getID() + configsList[i].getID(),configsList[i].getID(),'Config Server');
                    if (configsList[i].alerts.size() > 0) {
                        this.setJSONAlert(configs[i],true);
                        var alert = configsList[i].alerts.peek();
                        configs[i].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                        clusterAlert++;
                        configAlert++;
                    }
                }
                if (configAlert > 0) {
                    this.setJSONAlert(configs,false);
                }
                if (configs.length > 1)
                    configs = this.generateJSONElement(cluster.getID() + 'configs','Config Servers','',configs);
                else
                    configs = this.generateJSONElement(cluster.getID() + 'configs','Config Server','',configs);
                var routersList = cluster.routers;
                var routers = [];
                var routerAlert = 0;
                for (var i = 0; i < routersList.length; i++) {
                    routers[i] = this.generateJSONElement(cluster.getID() + routersList[i].getID(),routersList[i].getID(),'Router Server');
                    if (routersList[i].alerts.size() > 0) {
                        this.setJSONAlert(routers[i],true);
                        var alert = routersList[i].alerts.peek();
                        routers[i].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                        clusterAlert++;
                        routerAlert++;
                    }
                }
                if (routers.length > 1)
                    routers = this.generateJSONElement(cluster.getID() + 'routers','Router Servers','',routers);
                else
                    routers = this.generateJSONElement(cluster.getID() + 'routers','Router Server','',routers);
                if (routerAlert > 0) {
                    this.setJSONAlert(routers,false);
                }
                var shardsList = cluster.shards;
                var shards = [];
                var a = 0;
                var shardsAlert = 0;
                for (i in shardsList) {
                    var shard = shardsList[i];
                    var replSetAlert = 0;
                    var replSet = shard.getReplicaSet();
                    if (replSet == undefined) {
                        var serversList = shard.getServers();
                        servers = [];
                        for (var j = 0; j < 1; j++) {
                            var server = serversList[j];
                            console.log(server.getID());
                            servers[j] = this.generateJSONElement(i + 's' + j,server.getID(),'Server');
                            if (server.alerts.size() > 0) {
                                this.setJSONAlert(servers[j],true);
                                var alert = server.alerts.peek();
                                servers[j].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                                clusterAlert++;
                                shardsAlert++;
                                shardAlert++;
                                replSetAlert++;
                            }
                            shards[a] = servers[j];
                            break;
                        }
                    }
                    else {
                        var servers = [];
                        var serversList = replSet.getServers();
                        for (var j = 0; j < serversList.length; j++) {
                            var server = serversList[j];
                            servers[j] = this.generateJSONElement(replSet.getID() + i + 's' + j,server.getID(),'Server');
                            if (server.alerts.size() > 0) {
                                this.setJSONAlert(servers[j],true);
                                var alert = server.alerts.peek();
                                servers[j].data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                                clusterAlert++;
                                shardsAlert++;
                                replSetAlert++;
                            }
                        }
                        replSetJSON = this.generateJSONElement(shard.getID() + replSet.getID(),replSet.getID(),'Replica Set',servers);
                        if (replSetAlert > 0) {
                            this.setJSONAlert(replSetJSON,false);
                        }
                        if (replSet.alerts.size() > 0) {
                            this.setJSONAlert(replSetJSON,true);
                            var alert = replSet.alerts.peek();
                            replSetJSON.data['html'] += "<h4>" + alert.toString() + "</h4><ul><li>" + alert.tips() + "</li></ul>";
                            shardsAlert++;
                            clusterAlert++;
                        }
                        shards[a] = replSetJSON;
                    }
                    a++;
                }
                if (shards.length > 1)
                    shards = this.generateJSONElement(cluster.getID() + 'shards','Shards','',shards);
                else
                    shards = this.generateJSONElement(cluster.getID() + 'shards','Shard','',shards);
                if (shardsAlert > 0) {
                    this.setJSONAlert(shards,false);
                }
                cluster = this.generateJSONElement(cluster.getID(),cluster.getID(),'Cluster',[configs,routers,shards]);
                if (clusterAlert > 0) {
                    this.setJSONAlert(cluster,false);
                }
                return cluster;
            }
        }
        // Case for nothing
        return this.generateJSONElement('empty','Empty','');
    };
    
    // Adds alert/warning icon for nodes
    this.setJSONAlert = function(node,alert) {
        var orig = node.name;
        node.name = '<img src="./widgets/util/';
        if (alert)
            node.name += 'alert';
        else
            node.name += 'warning';
        node.name += '.png" style="width: '
                     + alertR*2
                     + 'px; height: '
                     + alertR*2
                     + 'px;"></img> '
                     + orig;
    }
    
    // Generates a single JSON node for JIT
    this.generateJSONElement = function(id,name,type,children) {
        if (!(type === ""))
            type += ': ';
        return {
            id: id,
            name: name,
            data: {html: '<h1>' + type + name + '</h1>', div: $(sel.info)},
            children: children = typeof children !== 'undefined' ? children : []
        };
    };

}
