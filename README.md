# MapWrapper

Quickly dump a big array of items onto a map using LeafletJS.

## Getting Started

* Include the library on the page, duh. `<script src="/MapWrapper/src/mapwrapper.js"></script>`
* Render the map via `MapWrap(items, config)`. Note that `items` can be an empty array, and `config` is also optional.

## Example

```
<script src="/MapWrapper/src/mapwrapper.js"></script>
<script>
listings = [
{
"id": "mls_1704218",
"title": "Single Family Residential, $49,900.00",
"address": "2570 Graffenburg, Frankfort NY 13340",
"url": "/buy/listings/1704218",
"lat": 43.03969100000000000,
"lng": -75.20268400000000000,
"img": "/app/uploads/listings/images/",
"imgalt": "listing at 2570 Graffenburg, Frankfort NY 13340"
}];
MapWrap( listings );
</script>
```
