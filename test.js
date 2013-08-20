


	//process.env.NODE_DEBUG = "request"

	var DynamoDB = require( "./" )
		, log 	= require( "ee-log" );






	var test = function(){
		db.session.findOne( { sessionId: "aaaa" }, function( err, session ){
			log.trace( err );
			log.dir( session );

			session.accessed = Math.floor( Math.random() * 10000 );
			session.funwith = "b";
			session.save( function( err ){
				log.trace( err );
			});
		} );
	}


	var db = new DynamoDB( {
		  key: 			"AKIAIR5LTODIOS4LLRRQ"
		, secret: 		"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"
		, region: 		"eu-west-1"
		, on: {
			  load: test
			, error: function( err ){ log.trace( err ) }
		}
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
	db.create( "session4", tableDefinition, function( err ){
		log.trace( err );
		log.info( "table ready ..." );

		db.throughput( "session4", 1, 1, function( err ){
			log.trace( err );
			log.info( "Throughput changed ..." );

			db.describe( "session4", function( err, def ){
				log.trace( err );
				log.dir( def );

				db.list( function( err, list ){
					log.trace( err );
					log.dir( list );

					db.delete( "session4", function( err ){
						log.trace( err );
						log.info( "table deleted ..." );

					} );
				} );
			} );
		} );
	} );
	*/

	

/*


	db.create( "session", tableDefinition, function( err ){
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

*/


	