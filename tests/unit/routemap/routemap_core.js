( function( $ ) {

	module( "routemap" );

	test( "routemap test cases.", function() {
		var	$routemap = $(".ui-routemap"),
			expectedShortestPath = ["21", "22", "2", "3", "4", "5", "6", "7"],
			expectedminTransPath = ["21", "22", "23", "24", "25", "26", "27", "28"],
			resultPath,
			name,
			ids,
			highlightPath = [];

		deepEqual( $routemap.length , 1, "The widget is created." );

		ids = $routemap.routemap( "getIdsByName", "21" );
		deepEqual( ids, ["21"], "Function :: getIdsByName( '21' ) = " + ids );
		
		ids = $routemap.routemap( "getIdsByName", "7(ex)" );
		deepEqual( ids, ["7", "28", "46"], "Function :: getIdsByName( '7(ex)' ) = " + ids );

		name = $routemap.routemap( "getNameById", "5" );
		deepEqual( name, "5(ex)", "Function :: getNameById( '5' ) = " + name );

		resultPath = $routemap.routemap( "shortestRoute", "21", "7" );
		deepEqual( resultPath, expectedShortestPath , "Function :: shortestRoute( '21', '7' ) = " + resultPath );

		resultPath = $routemap.routemap( "minimumTransfers", "21", "7" );
		deepEqual( resultPath, expectedminTransPath , "Function :: minimumTransfers( '21', '7' ) = " + resultPath );

		$routemap.routemap( "highlight", ["3", "4", "5"] );
		$(".ui-highlight").each( function() {
			ids = $routemap.routemap( "getIdsByName", ( $(this).text() ) );
			highlightPath.push( ids[0] );
		} );
		deepEqual( highlightPath , ["3", "4", "5"], "Function :: highlight( ['3', '4', '5'] ) PASS" );
		
		$routemap.routemap( "dishighlight", ["3", "4", "5"] );
		deepEqual( $( ".ui-highlight" ).length , 0, "Function :: dishighlight(['3', '4', '5']) PASS" );
	});
})( jQuery );
