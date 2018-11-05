var GeoCodeAPI = function(opts) {
	const apiURL = "/plugins/listings/api/geocode.cfm";

	/***
	 * geocode an address to get a latitude and longitude.
	 * @returns {Promise} $.ajax - use the .success(callback) or .fail(callback) to extend this.
	 */
	const geocode = (data) => {
		return $.ajax({
			type: "get",
			url: apiURL,
			data: data
		});
	};
	return {
		geocode: geocode
	};
};
var MapWrap = function(selector, addressArray,opts) {
	// @see https://leafletjs.com/plugins.html#basemap-providers
	var tileSrc = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

	var loadSettings = function(userOptions) {
		var options = {};
		var defaults = {
			infoWindow: {
				open: true,
				maxWidth: 300,
				template: '<div class="grid-x" style="width:325px;max-width:75vw;"><div class="cell small-6"><img src="{img}" alt="{imgalt}" style="max-width:130px;height:auto;" /></div><div class="cell auto"><p><strong>{title}</strong><br/>{address}</p><p class="small button-group"><a href="https://maps.google.com/maps?saddr=current+location&daddr={address}" target="_blank" class="button small secondary">Directions</a><a href="{url}" class="button primary small">View Details</a></p></div></div>'
			},
			zoomLevel: 12,
			markerOpts: {},
			center: L.latLng(43.102040, -75.230000),
			zoomPosition: "topleft",
			scrollWheelZoom: false
		};
		if ( addressArray.length > 1 ) {
			defaults.infoWindow.open = false;
		}
		for ( var n in defaults) {
			options[n] = ( userOptions.hasOwnProperty(n) ? userOptions[n] : defaults[n] );
		}
		return options;
	};

	var mapObj = function(selector) {
		this.mapSelector = selector.replace('#','');
		this.geocoder = new GeoCodeAPI();
		this.map = null;
		this.addresses = addressArray;
		this.options = loadSettings(opts);
		this.infoWindows = {};
		this.markerMap = {};

		this.initialize = function() {
			var self = this;

			//init map
			var mapOpts = {
				scrollWheelZoom: self.options.scrollWheelZoom,
				zoomControl: false
			};
			self.map = L.map(self.mapSelector, mapOpts).setView(self.options.center, self.options.zoomLevel);

			// init map bounds
			self.bounds = L.latLngBounds( self.options.center );
			console.info( self );

			// add tile layer
			// @see https://leafletjs.com/examples/quick-start/
			L.tileLayer(tileSrc, {
					attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
					maxZoom: 14
			}).addTo(self.map);
			
			new L.control.zoom( { position: this.options.zoomPosition } ).addTo( self.map );


			//loop through array of addresses, get the lat/longitude for each.
			//OR, if we already have lat/long, proceed to put a marker on the map.
			self.addresses.forEach(function(item) {
				//if lat/lon exists and is real number
				if (typeof item.lat !== "undefined" && item.lng !== "") {
					//update - make sure they don't stay strings!
					item.lat = parseFloat(item.lat);
					item.lng = parseFloat(item.lng);
					self.pinAddress({lat:item.lat,lng:item.lng},item);
				} else {//else get lat/long
					self.geoCodeIt(item, function(results) {
						if ( results.success ) {
							self.pinAddress(results.results[0].location, item);
						} else {
							//possibly a bad latitude/longitude
							if ( results.hasOwnProperty("errors") && result.errors.length ) {
								console.warn("Geocode was not successful for the following reason: " + JSON.stringify(results.errors), item);
							} else {
								console.warn("Geocode was not successful, sorry.", item);
							}
						}
					});
				}
			});
			return this;
		};
		this.geoCodeIt = function(item, callback) {
			var self = this;
			self.geocoder.geocode({
				'address': item.address,
				'mlsNumber': item.id.replace("mls_",'')
			}).success(function(response) {
				console.log(arguments);
				if ( typeof callback == "function" ) {
					callback(response);
				}
			}).fail(function(response) {
				if ( typeof callback == "function" ) {
					callback(response.responseText);
				}
			});
		};
		this.extendBounds = function(latlng) {
			this.bounds.extend(latlng);
			this.map.fitBounds( this.bounds );
		};
		this.pinAddress = function(latlng, addressObj) {
			var self = this,
				markerOptions = {
					map: self.map,
					position: latlng,
					id: addressObj.id
				};

			var setInitialMarkerOpts = function() {
				if (typeof self.options.markerOpts === "object") {
					for (var option in self.options.markerOpts) {
						markerOptions[option] = self.options.markerOpts[option];
					}
				}

				//here, we accept any individual marker options set in the addressArray param, and override the defaults.
				//Thus, this must be AFTER the loop, not before.
				if (typeof addressObj.icon === "string") {
					// @see https://leafletjs.com/reference-1.3.4.html#icon
					markerOptions.icon = L.icon({
						iconUrl: addressObj.icon,
						iconSize: [38, 95]
					});
				}
				// @see https://leafletjs.com/reference-1.3.4.html#layer-bindtooltip
				if (typeof addressObj.markerLabel === "string") {
					marker.bindTooltip( addressObj.markerLabel ).openTooltip();
				}
				return markerOptions;
			};
			// @see https://leafletjs.com/reference-1.3.4.html#marker
			var marker = L.marker( latlng ).addTo(self.map);
			var popupOpts = {
				maxWidth: self.options.infoWindow.maxWidth
			};
			// @see https://leafletjs.com/reference-1.3.4.html#popup
			var popup = L.popup(popupOpts, marker).setContent( self.getWindowHTML(addressObj) );
			// @see https://leafletjs.com/reference-1.3.4.html#layer-bindpopup
			marker.bindPopup( popup ).on("popupopen", function(e) {
				// pan map to center the marker that was just clicked.
				self.map.panTo( e.target.getLatLng() );
			});

			if (self.options.infoWindow.open) {
				//open when loaded
				popup.openOn( self.map );
			}

			//add this marker to the array of all markers.
			self.markerMap[addressObj.id] = marker;
			self.infoWindows[addressObj.id] = popup;

			// make sure the map expands to fit this pin!
			self.extendBounds( latlng );

		};
		this.getWindowHTML = function(addressObj) {
			var windowHTML = this.options.infoWindow.template;
			for ( var key in addressObj ) {
				windowHTML = windowHTML.replace('{' + key + '}', addressObj[key]);
			}
			return windowHTML;
		};
  };
	return new mapObj(selector).initialize();
};