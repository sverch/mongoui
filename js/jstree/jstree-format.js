function jstreeFormat (json) {
    var json_display = [];
    var json_obj = {};
    var i;

    function isArray(a)
    {
        return Object.prototype.toString.apply(a) === '[object Array]';
    }

    /* Error checking */
    if (typeof json !== 'object') {
        console.log("Error: jstreeFormat called on non object!");
        return null;
    }

    /* Convert to associative array since we need the concept of a
       "name" for every item */
    if (isArray(json)) {
        for (i = 0; i < json.length; i++) {
            json_obj[i] = json[i];
        }
        if (json.length === 0) {
            return ["[ ]"];
        }
    } else {
        json_obj = json;
    }

    /* Do the conversion */
    for (var key in json_obj) {
        if (json_obj[key] != null && typeof json_obj[key] === 'object') {
            json_display.push({"data":key,
                "children":jstreeFormat(json_obj[key])});
        } else {
            json_display.push(key + ": " + json_obj[key]);
        }
    }

    if ($.isEmptyObject(json_display)) {
        return ["{ }"];
    }

    return json_display;
}
