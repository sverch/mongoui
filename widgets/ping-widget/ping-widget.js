/* baseID is the ID of the element our widget lives in */
function PingWidget (baseID) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof PingWidget)) {
        console.log('Warning: PingWidget constructor called without "new" operator');
        return new PingWidget(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }

    /* construct unique IDs for all the elements in this widget */
    var ids = {
        main:           baseID,
        ping:           baseID + "-ping",
    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }

    /* pingDiv html */
    var pingDiv =  '<div id="' + ids.ping + '" class="widget-ping-container"></div>';

    /* Clear the element we are using */
    $(sel.main).empty();
    $(sel.main).append(pingDiv);

    /* Handle resizing */
    $(sel.main).resize(function () {
        $(sel.ping).height($(sel.main).height());
    });

    /* The only public field of this object is the "render" function.  It takes
     * as an argument the raw data from MongoDB */
    this.render = function (data) {
        $(sel.ping).empty();
        var table = prettyPrint(data);
        $(sel.ping).append(table);
    };
}
