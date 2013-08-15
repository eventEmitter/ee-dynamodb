
	//process.env.NODE_DEBUG = "request"

	var DynamoDB = require( "./" )
		, log 	= require( "ee-log" );


	var db = new DynamoDB( {
		  key: 			"AKIAIR5LTODIOS4LLRRQ"
		, secret: 		"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"
		, region: 		"eu-west-1"
	} );


	var tableDefinition = {
		index: { index_accessed: { projection: "all" } }
	    , attributes: {
	        accessed: {
	            type: "number"
	            , secondary: {
	                name: "index_accessed"
	                , type: "range"
	            }
	        }
	        , fuck: {
	              type: "number"
	            , projection: "index_accessed"
	        }
	        , you: {
	            type: "binary"
	            , projection: "index_created"
	        }
	        , created: {
	            type: "number"
	            , primary: "range"
	            , secondary: {
	                name: "index_created"
	                , type: "range"
	            }
	        }
	        , sessionId: {
	            type: "string"
	            , primary: "hash"
	        }
	    }
	    , throughput: {
	          read: 10
	        , write: 5
	    }
	};
	


	/*
	db.createTable( "session", tableDefinition, function( err ){
		log.trace( err );
		log.info( "table ready ..." );

		db.updateThroughput( "session", 1, 1, function( err ){
			log.trace( err );
			log.info( "Throughput changed ..." );

			db.describeTable( "session", function( err, def ){
				log.trace( err );
				log.dir( def );

				db.listTables( function( err, list ){
					log.trace( err );
					log.dir( list );

					db.deleteTable( "session", function( err ){
						log.trace( err );
						log.info( "table deleted ..." );

					} );
				} );
			} );
		} );
	} );


	  sessionId: 	"aaaa"
			, accessed: 	Date.now()
			, created: 		Date.now()
			, fuck: 		454545
			, you: 			new Buffer( "illb" )
			, hiho: 		4
			, arr: 			[ new Buffer( "sdfdsffsdf" ) ]
			, strarr: 		[ "hi", "ho" ]
			, nnum: 		[ 1,2,3,4,5,56]
	


*/

	db.createTable( "session", tableDefinition, function( err ){
		log.info( "table ready ..." );

		var session = db.table( "session" );

		var item = new session();
		item.set( {
			  sessionId: 	"aaaa"
			, accessed: 	1
			, created: 		2
		} );


		item.save( function( err ){
			log.trace( err );
			log.trace( new Error() );

			db.describeTable( "session", function( err, def ){
				log.trace( err );
				log.dir( def );
			} );
		} );
	} );
	
	