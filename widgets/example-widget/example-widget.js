/* baseID is the ID of the element our widget lives in */
function ExampleWidget (baseID) {

    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof ExampleWidget)) {
        console.log('Warning: ExampleWidget constructor called without "new" operator');
        return new ExampleWidget(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }

    /* construct unique IDs for all the elements in this widget */
    var ids = {
        main:           baseID,
        stats:          baseID + "-stats",
        statsButton:    baseID + "-statsButton",
        pie:            baseID + "-pie",
        pieCanvas:      baseID + "-pieCanvas",
        pieContent:     baseID + "-pieContent"
    };

    /* create a list of id's with the '#' prepended for convenience */
    var sel = {};
    for (var id in ids) {
        sel[id] = "#" + ids[id];
    }

    /* Elements of the stats pane */
    var statsDiv =  '<div id="' + ids.stats + '" class="widget-stats-container"></div>';
    var statsHeader =  '<h1 class="widget-stats-header">Stats!</hi>';
    var statsButton =  '<button type=button id="' + ids.statsButton + '">' +
        'Add Stats!</button>';

    /* Elements of the pie pane */
    var pieDiv =    '<div id="' + ids.pie + '" class="widget-default-container"></div>';
    var pieHeader =  '<h1 class="widget-default-header">Pie!</hi>';
    var pieCanvas = '<canvas id="' + ids.pieCanvas + '">' +
        'If you can read this, your browser doesn\'t support the canvas ' +
        'element.</canvas>';
    var pieContent = '<p id="' + ids.pieContent + '"></p>';

    /* Clear the element we are using */
    $(sel.main).empty();

    /* Insert the stats and pie panes */
    $(sel.main).append(pieDiv);
    $(sel.main).append(statsDiv);

    /* Put together the pie pane */
    $(sel.pie).append(pieHeader);
    $(sel.pie).append(pieCanvas);
    $(sel.pie).append(pieContent);

    /* Put together the stats pane */
    $(sel.stats).append(statsHeader);
    $(sel.stats).append(statsButton);

    /* Add function to stats button */
    var statsNum = 0;
    $(sel.statsButton).click(function() {
        $(sel.statsButton).before("<p>Crazy stats number " + statsNum++ + "!</p>");
    });

    /* The only public field of this object is the "render" function.  It takes
     * as an argument the raw data from MongoDB */
    this.render = function (data) {

        /* Library calls to interpret the data */
        /* XXX: not working in current tree */
        /* map = new TopologicalMap(data); */

        /* Code to display the data */
        var ctx = $(sel.pieCanvas)[0].getContext("2d");
        ctx.beginPath();
        ctx.arc(75,75,50,0,Math.PI*2,true);
        ctx.closePath();
        ctx.fill();
        $(sel.pieContent).html(JSON.stringify(data));
        map = new TopologicalMap(data);
        console.log(map);
    };
}
