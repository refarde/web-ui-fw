//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
//>>description: Render a route data.
//>>label: Route map
//>>group: Widgets

define( [
	"jqm/jquery",
	"jqm/jquery.mobile.widget" ], function( jQuery ) {
//>>excludeEnd("jqmBuildExclude");

( function ( $, window ) {
	var document = window.document,
		svgNameSpace = "http://www.w3.org/2000/svg",
		// Default style for SVG elements.
		DEFAULT_STYLE = {
			font: {
				fontSize: "12px"
			},
			exchangeRadius: 6,
			exchangeStyle: {
				fill: "white",
				stroke: "red",
				strokeWidth: 2
			},
			stationRadius: 4,
			stationStyle: {
				fill: "white",
				stroke: "black",
				strokeWidth: 1,
				r:6
			},
			lineStyle: {
				fill: "none",
				stroke: "black",
				strokeWidth: 3
			}
		},
		regId = new RegExp( "\\bui-id-([\\w-]+)\\b" );

	$.widget( "mobile.routemap", $.mobile.widget, {
		options: {
			language: null,
			db: null,
			unit: 1,
			initSelector: ":jqmData(role='routemap')"
		},

		_svg: null,
		_drawingRange: [],	// [ minX, minY, maxX, maxY ]
		_languageData: null,
		_lines: [],
		_stations: [],
		_stationsMap: [],
		_stationList: {},
		_graph: {},

		_create: function () {
			var self = this,
				view = self.element,
				svgContainer = $( "<div>" ).appendTo( view );

			svgContainer.addClass( "ui-routemap-container" );

			self._svg = $( document.createElementNS( svgNameSpace, "svg" ) )
				.attr( {
					"version": "1.1",
					"width": "100%",
					"height": "100%",
					"class": "ui-routemap-svg"
				} ).appendTo( svgContainer )[0];

			view.addClass( "ui-routemap" );

			$.each( this.options, function ( key, value ) {
				self._setOption( key, value );
			} );

			if ( document.readyState === "complete" ) {
				self.refresh( true );
			}

			svgContainer.on( "click", function ( event ) {
				var target = event.target,
					targetId,
					tagName = target.tagName;

				if ( tagName === "circle" || tagName === "path" ) {
					targetId = regId.exec( target.getAttribute( "class" ) );
					if ( targetId ) {
						$( target ).trigger( "select", targetId[1] );
					}
				} else {
					$( target ).trigger( "select" );
				}
			});
		},

		_setOption: function ( key, value ) {
			var self = this,
				option = self.options,
				data;

			$.Widget.prototype._setOption.apply( this, arguments );
			switch ( key ) {
			case "db":
				if ( value.match( /\.(json)$/i ) ) {
					$.ajax( {
						async: false,
						global: false,
						dataType: "JSON",
						url : option.db
					} ).done( function ( result ) {
						data = result;
					} ).fail( function ( e ) {
						throw new Error( e );
					} );
				} else {
					data = window[value];
				}
				self._processData( data );
				break;

			case "language":
				if ( !value ) {
					this._languageData = null;
					return;
				}

				data = option.db;
				if ( !data || !data.match(/\.(json)$/i) ) {
					return;
				}

				data = data.substring( data.lastIndexOf("\\") + 1, data.lastIndexOf(".") ) +
						"." + value + "." + data.substring( data.lastIndexOf(".") + 1, data.length );
				$.ajax( {
					async: false,
					global: false,
					dataType: "JSON",
					url : data
				} ).done( function ( result ) {
					self._languageData = result;
				} );
				break;
			}
		},

		_clear: function () {
			while ( this._svg.firstChild ) {
				this._svg.removeChild( this._svg.firstChild );
			}
		},

		_processData: function ( data ) {
			var i, j, k,
				lines = data.lines,
				options = this.options,
				unit = options.unit,
				branches,
				branch,
				station,
				duplicatedStation,
				stationStyle,
				stationRadius = data.stationRadius || DEFAULT_STYLE.stationRadius,
				stationFont = $.extend( {}, DEFAULT_STYLE.font, data.stationFont ),
				exchangeStyle = $.extend( {}, DEFAULT_STYLE.exchangeStyle, data.exchangeStyle ),
				exchangeRadius = data.exchangeRadius || DEFAULT_STYLE.exchangeRadius,
				exchangeFont = $.extend( {}, DEFAULT_STYLE.font, data.exchangeFont ),
				lineStyle,
				coord,
				minX = 9999,
				minY = 9999,
				maxX = 0,
				maxY = 0,
				xPosPrev,
				yPosPrev,
				xPos = 0,
				yPos = 0,
				linePath,
				shorthand,
				controlPoint = [],
				graph= {},
				svgContainer = this.element.find( ".ui-routemap-container" ),
				marginTop = parseInt( svgContainer.css( "marginTop" ), 10 ) || 0,
				marginBottom = parseInt( svgContainer.css( "marginBottom" ), 10 ) || 0,
				marginLeft = parseInt( svgContainer.css( "marginLeft" ), 10 ) || 0,
				marginRight = parseInt( svgContainer.css( "marginRight" ), 10 ) || 0,
				convertCoord = function ( pos ) {
					return ( unit * pos );
				};

			for ( i = 0; i < lines.length; i += 1 ) {
				branches = lines[i].branches;
				stationStyle = $.extend( {}, DEFAULT_STYLE.stationStyle, lines[i].style.station );
				lineStyle = $.extend( {}, DEFAULT_STYLE.lineStyle, lines[i].style.line );
				for ( j = 0; j < branches.length; j += 1 ) {
					branch = branches[j];
					linePath = "";
					xPosPrev = yPosPrev = -1;
					for ( k = 0; k < branch.length; k += 1 ) {
						station = branch[k];
						coord = station.coordinates;

						if ( graph[station.id] === undefined ) {
							graph[station.id] = {};
						}

						if ( branch[k - 1] !== undefined ) {
							graph[station.id][branch[k - 1].id] = 3;
						}

						if ( branch[k + 1] !== undefined ) {
							graph[station.id][branch[k + 1].id] = 3;
						}

						// info
						minX = ( minX > coord[0] ) ? coord[0] : minX;
						minY = ( minY > coord[1] ) ? coord[1] : minY;
						maxX = ( maxX < coord[0] ) ? coord[0] : maxX;
						maxY = ( maxY < coord[1] ) ? coord[1] : maxY;

						//stations
						if ( !this._stationsMap[coord[0]] ) {
							this._stationsMap[coord[0]] = [];
						}

						this._stationList[ station.id ] = station.label;

						if ( !this._stationsMap[coord[0]][coord[1]] ) {
							station.style = stationStyle;
							station.radius = stationRadius;
							station.font = stationFont;
							this._stationsMap[coord[0]][coord[1]] = station;
							this._stations.push( station );
						} else if ( !this._stationsMap[coord[0]][coord[1]].exchange ) {
							duplicatedStation = this._stationsMap[coord[0]][coord[1]];
							duplicatedStation.style = exchangeStyle;
							duplicatedStation.radius = exchangeRadius;
							duplicatedStation.font = exchangeFont;
							duplicatedStation.exchange = true;

							graph[station.id][duplicatedStation.id] = "TRANSPER";
							graph[duplicatedStation.id][station.id] = "TRANSPER";
						}

						// lines
						xPos = convertCoord( coord[0] );
						yPos = convertCoord( coord[1] );

						if ( xPosPrev !== -1 && yPosPrev !== -1 ) {
							if ( xPosPrev === xPos || yPosPrev === yPos ) {
								linePath += "L" + xPos + "," + yPos;
							} else {
								// Catmull-Rom to Cubic Bezier conversion matrix
								//    0       1       0       0
								//  -1/6      1      1/6      0
								//    0      1/6      1     -1/6
								//    0       0       1       0
								shorthand = branch[ ( k > branch.length - 2 ) ? k : ( k + 1 )].coordinates;
								controlPoint[0] = ( xPosPrev + 6 * xPos - convertCoord( shorthand[0] ) ) / 6;
								controlPoint[1] = ( yPosPrev + 6 * yPos - convertCoord( shorthand[1] ) ) / 6;

								linePath += "S" + " " + controlPoint[0] + "," + controlPoint[1] + " " + xPos + "," + yPos;
							}
						} else {
							linePath += "M" + xPos + "," + yPos;
						}

						xPosPrev = xPos;
						yPosPrev = yPos;
					}
					this._lines.push( { path: linePath, style: lineStyle, id: lines[i].id } );
				}
			}
			this._drawingRange = [ minX, minY, maxX, maxY ];
			this._graph = graph;

			svgContainer.width( ( maxX + minX ) * unit + marginLeft + marginRight )
				.height( ( maxY + minY ) * unit + marginTop + marginBottom );
		},

		_drawLines: function () {
			var i, lines = this._lines,
				length = lines.length;

			for ( i = 0; i < length; i += 1 ) {
				this._node( null, "path", {
					"class": "ui-line ui-id-" + lines[i].id,
					d: lines[i].path
				}, lines[i].style );
			}
		},

		_drawLegend: function () {
			var i, lines = this._lines,
				length = lines.length,
				lineId,
				group = this._node( null, "g", { "class": "ui-legend"} );

			for ( i = 0; i < length; i += 1 ) {
				if ( lineId !== lines[i].id ) {
					lineId = lines[i].id;
					this._node( group, "line", {
						"class": "ui-legend-line ui-id-" + lineId,
						x1: 0,
						y1: 10 + (i * 15),
						x2: 20,
						y2: 10 + (i * 15)
					}, lines[i].style );

					this._node( group, "text", {
						"class": "ui-legend-text ui-id-" + lineId,
						x : 25,
						y : 13 + (i * 15)
					}, { fontSize: DEFAULT_STYLE.font.fontSize || "0.75rem"} ).appendChild( group.ownerDocument.createTextNode( lineId ) );
				}
			}
		},

		_drawElements: function () {
			var i,
				options = this.options,
				unit = options.unit,
				stationRadius,
				stations = this._stations,
				station,
				label,
				coordinates,
				position,
				labelPosition = [0, 0],
				labelAngle = 0,
				group,
				stationName,
				text;

			for ( i = 0; i < stations.length; i += 1 ) {
				station = stations[i];
				label = station.label;
				coordinates = station.coordinates;
				position = [unit * coordinates[0], unit * coordinates[1] ];
				stationRadius = station.radius;

				// draw station
				this._node( null, "circle", {
					"class": "ui-station ui-id-" + station.id,
					cx: position[0],
					cy: position[1],
					r: stationRadius
				}, station.style );

				group = this._node( null, "g" );

				labelAngle = ( station.labelAngle ) ? -parseInt( station.labelAngle, 10 ) : 0;

				// draw station name
				stationName = this._languageData ?
					( this._languageData[label] || label ) :
						label;

				text = this._text( group, stationName || "?", {},
					{ transform: "rotate(" + labelAngle + ")", fontSize: station.font.fontSize || "9" }
				);

				switch ( station.labelPosition || "s" ) {
				case "w" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius / 2 ];
					break;
				case "e" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius / 2 ];
					break;
				case "s" :
					labelPosition = [ position[0] - text.getBBox().width / 2, position[1] + stationRadius + text.getBBox().height ];
					break;
				case "n" :
					labelPosition = [ position[0] - text.getBBox().width / 2, position[1] - stationRadius - text.getBBox().height / 3 ];
					break;
				case "nw" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] - stationRadius / 2 - text.getBBox().height / 3  ];
					break;
				case "ne" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] - stationRadius / 2 - text.getBBox().height / 3 ];
					break;
				case "sw" :
					labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius + text.getBBox().height / 2  ];
					break;
				case "se" :
					labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius + text.getBBox().height / 2 ];
					break;
				}

				group.setAttribute( "transform", "translate(" + labelPosition[0] + "," + labelPosition[1] + ")" );
			}
		},

		// -------------------------------------------------
		// SVG

		_node: function ( parent, name, settings, style ) {
			var node, key, value,
				attributes = $.extend( settings, style || {} );

			parent = parent || this._svg;
			node = parent.ownerDocument.createElementNS( svgNameSpace, name );

			for ( key in attributes ) {
				value = attributes[key];
				if ( value && ( typeof value !== "string" || value !== "" ) ) {
					node.setAttribute( key.replace( /([a-z])([A-Z])/g, "$1-$2" ).toLowerCase(), value);
				}
			}

			parent.appendChild( node );
			return node;
		},

		_text:  function ( parent, value, settings, style ) {
			var node = this._node( parent, "text", settings, style ),
				texts, i;

			if ( typeof value !== "string" ) {
				value = "";
			}

			texts = value.split( "\n" );

			for ( i = 0; i < texts.length; i += 1 ) {
				this._node( node, "tspan", {
					"class": "ui-station-text",
					x: "0",
					y: ( settings.fontSize * i )
				}, {} ).appendChild( node.ownerDocument.createTextNode( texts[i] ) );
			}

			return node;
		},

		_addClassSVG: function ( element, className ) {
			var classAttr = element.attr( "class" );

			if ( classAttr.indexOf( className ) !== -1 ) {
				return;
			}

			classAttr = classAttr + ( classAttr.length === 0 ? "" : " " ) + className;
			element.attr( "class", classAttr );
		},

		_removeClassSVG: function ( elements, className ) {
			$.each( elements, function () {
				var element = $( this ),
					classAttr = element.attr( "class" );

				classAttr = classAttr.replace( new RegExp( "\\s?" + className ), "" );
				element.attr( "class", classAttr );
			} );
		},

		// -------------------------------------------------
		// Dijkstra path-finding functions
		// Original code: https://bitbucket.org/wyatt/dijkstra.js(MIT license)
		// Thanks Wyatt Baldwin
		_calculateShortestPath: function ( graph, source, destination, isMinimumTransfersMode ) {
			var predecessors, costs, open,
				closest,
				u, v,
				costU,
				adjacentNodes,
				costE,
				costUTotal,
				costV,
				first_visit,
				msg,
				nodes = [];

			function PriorityQueue() {
				var queue = [],
					sorter = function ( a, b ) {
						return a.cost - b.cost;
					};

				this.push = function ( value, cost ) {
					var item = { value: value, cost: cost };

					queue.push( item );
					queue.sort( sorter );
				};

				this.pop = function () {
					return queue.shift();
				};

				this.empty = function () {
					return queue.length === 0;
				};
			}

			predecessors = {};

			costs = {};
			costs[source] = 0;

			open = new PriorityQueue();
			open.push( source, 0 );

			while ( !open.empty() ) {
				closest = open.pop();
				u = closest.value;
				costU = closest.cost;

				adjacentNodes = graph[u] || {};

				for ( v in adjacentNodes ) {
					costE = adjacentNodes[v];

					if ( costE === "TRANSPER" ) {
						costE = isMinimumTransfersMode ? 999 : 5;
					}

					costUTotal = costU + costE;

					costV = costs[v];
					first_visit = ( costs[v] === undefined );
					if ( first_visit || costV > costUTotal ) {
						costs[v] = costUTotal;
						open.push( v, costUTotal );
						predecessors[v] = u;
					}
				}
			}

			if ( destination !== undefined && costs[destination] === undefined ) {
				msg = ["Could not find a path from ", source, " to ", destination, "."].join( "" );
				throw new Error( msg );
			}

			while ( destination ) {
				nodes.push( destination );
				destination = predecessors[destination];
			}

			nodes.reverse();

			return nodes;
		},

		// -------------------------------------------------
		// Public

		getIdsByName: function ( name ) {
			var stationList = this._stationList, key, ret = [];

			for ( key in stationList ) {
				if( stationList[key] === name ) {
					ret.push( key );
				}
			}
			return ret;
		},

		getNameById: function ( id ) {
			return this._stationList[id];
		},

		shortestRoute: function ( source, destination ) {
			return this._calculateShortestPath( this._graph, source, destination );
		},

		minimumTransfers: function ( source, destination ) {
			return this._calculateShortestPath( this._graph, source, destination, true );
		},

		highlight: function ( path ) {
			var i, j, stations, stationList;

			if ( !this._svg || !path ) {
				return;
			}

			stations = this._stations;
			stationList = this._stationList;

			for ( i = 0; i < path.length; i++ ) {
				for ( j = 0; j < stations.length; j += 1 ) {
					if ( stations[j].label === stationList[path[i]] ) {
						this._addClassSVG( $( ".ui-id-" + stations[j].id ), "ui-highlight" );
						break;
					}
				}
			}
		},

		dishighlight: function ( path ) {
			var i, j,
				svgDoc = this._svg,
				stations = this._stations,
				stationList = this._stationList;

			if ( !svgDoc ) {
				return;
			}

			if ( !path ) {
				this._removeClassSVG( $( "circle" ), "ui-highlight" );
				return;
			}

			for ( i = 0; i < path.length; i++ ) {
				for ( j = 0; j < stations.length; j += 1 ) {
					if ( stations[j].label === stationList[path[i]] ) {
						this._removeClassSVG( $( ".ui-id-" + stations[j].id ), "ui-highlight" );
						break;
					}
				}
			}
		},

		refresh: function ( redraw ) {
			var view, svgContainer;

			view = this.element;
			svgContainer = view.find( "ui-routemap-container" );

			if ( svgContainer.width() !== view.width() ) {
				svgContainer.width( view.width() );
			}

			if ( redraw ) {
				this._clear();
				this._drawLines();
				this._drawElements();
				this._drawLegend();
			}
		}
	} );

	$.mobile.window.on( "pagechange", function () {
		$( ".ui-page-active .ui-routemap" ).routemap( "refresh", true );
	} ).on( "resize", function () {
		$( ".ui-page-active .ui-routemap" ).routemap( "refresh" );
	} );

} ( jQuery, this ) );

//>>excludeStart("jqmBuildExclude", pragmas.jqmBuildExclude);
} );
//>>excludeEnd("jqmBuildExclude");
