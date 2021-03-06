MongoUI
=======

MongoUI is a web app designed to provide a graphical way to view a MongoDB
cluster

Node.js must be installed to run MongoUI

Setup
-----
Run

    npm install

from the root of the repository to install all the necessary dependencies.

Usage
-----

From the root directory of MongoUI, run:

    node server.js [port]

This will run a node.js server listening on the given port (default 8080).  Open
"localhost:8080" in a browser to bring up the dashboard.

Once the dashboard is open, enter the host and port of any node in a MongoDB
cluster.  The server will automatically discover the whole cluster, and the
widgets will graphically display the results.
