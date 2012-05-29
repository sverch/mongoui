function DataSocket() {

    // Connection to the server
    var socket = io.connect(document.URL);

    // List of all registered callbacks
    var callbacks = new Array();

    // List of all servers to requestUpdates on
    this.servers = [];

    // Listen for update and call all registered callbacks
    socket.on('update', function (data) {
        console.log(data);
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](data);
        }
    });

    // Register a callback
    this.register = function (callback) {
        callbacks.push(callback);
    }

    // Request most recent data
    this.requestUpdate = function () {
        socket.emit('getupdate', this.servers);
    }
}
