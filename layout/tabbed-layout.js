function Layout(baseID, dataApi) {
    /* If this constructor is called without the "new" operator, "this" points
     * to the global object.  Log a warning and call it correctly. */
    if (false === (this instanceof Layout)) {
        console.log('Warning: Layout constructor called without "new" operator');
        return new Layout(baseID);
    }

    /* Return immediately if baseID doesn't match any DOM element */
    if ($('#' + baseID).length === 0) {
        console.log("Error: element: " + baseID + " not found!");
        return;
    }
    var baseIDSel = '#' + baseID;

    $(baseIDSel).tabs();

    var widgets = [];
    var widgetIDs = [];
    var widgetNum = 0;

    this.add = function (widgetName,WidgetConstructor) {
        // Create the widget div name and selector
        var widgetID = baseID + "-" + widgetNum;
        var widgetIDSel = '#' + widgetID;

        // Add a tab for the widget to live in
        $(baseIDSel).tabs("add",widgetIDSel,widgetName);

        // Create a new widget in that tab and save a reference to it
        widgets.push(new WidgetConstructor(widgetID));
        widgetIDs.push(widgetID);

        // Increment the widget number
        widgetNum++;
    };

    // handle resizing
    function resizelayout () {
        widgetIDs.forEach(function (widgetID) {
            $('#' + widgetID).height($(baseIDSel).height() - 90);
        });
    }
    $(baseIDSel).resize(resizelayout);

    dataApi.register(function (data) {
        widgets.forEach(function (widget) {
            widget.render(data);
        });
    });
}
