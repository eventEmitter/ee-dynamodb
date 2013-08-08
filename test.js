
	//process.env.NODE_DEBUG = "request"

	var DynamoDB = require( "./" )
		, log 	= require( "ee-log" );


	var db = new DynamoDB( {
		  key: 			"AKIAIR5LTODIOS4LLRRQ"
		, secret: 		"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"
		, region: 		"eu-west-1"
	} );


	db.describeTable( "session", function( err, def ){
		log.trace( err );
		log.dir( def );
	} );


	db.createTable( "test", {
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
	}, function( err ){
		log.trace( err );
		log.info( "table ready ..." );
	} );