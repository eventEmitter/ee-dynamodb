

	var   Class			= require( "ee-class" )
		, Events 		= require( "ee-event" )
		, log 			= require( "ee-log" )


	var   Instance 		= require( "./Instance" );


	var Entity = new Class( {
		inherits: Events


		, operatorMap: {
			  equals: 			"EQ"
			, equal: 			"EQ"
			, e: 				"EQ"
			, notequals: 		"NE"
			, notequal: 		"NE"
			, ne: 				"NE"
			, lessthan:			"LT"
			, less: 			"LT"
			, lt: 				"LT"
			, lessthanequal: 	"LE"
			, lessequal: 		"LE"
			, lte: 				"LE"
			, le: 				"LE"
			, greaterthan:		"GT"
			, greater: 			"GT"
			, gt: 				"GT"
			, greaterthanequal: "GE"
			, greaterqual: 		"GE"
			, gte: 				"GE"
			, ge: 				"GE"
			, begins: 			"BEGINS_WITH"
			, begin: 			"BEGINS_WITH"
			, beginsWith: 		"BEGINS_WITH"
			, beginWith: 		"BEGINS_WITH"
			, bw: 				"BEGINS_WITH"
			, between: 			"BETWEEN"
			, b: 				"BETWEEN"
			, notnull: 			"NOT_NULL"
			, nn: 				"NOT_NULL"
			, null: 			"NULL"
			, n: 				"NULL"
			, contains: 		"CONTAINS"
			, contain: 			"CONTAINS"
			, c: 				"CONTAINS"
			, notcontains: 		"NOT_CONTAINS"
			, notcontain: 		"NOT_CONTAINS"
			, nc: 				"NOT_CONTAINS"
			, in: 				"IN"
		}


		, scannerMap: {			
			  notequals: 		"NE"
			, notequal: 		"NE"
			, ne: 				"NE"
			, bw: 				"BEGINS_WITH"
			, between: 			"BETWEEN"
			, b: 				"BETWEEN"
			, notnull: 			"NOT_NULL"
			, nn: 				"NOT_NULL"
			, null: 			"NULL"
			, n: 				"NULL"
			, contains: 		"CONTAINS"
			, contain: 			"CONTAINS"
			, c: 				"CONTAINS"
			, notcontains: 		"NOT_CONTAINS"
			, notcontain: 		"NOT_CONTAINS"
			, nc: 				"NOT_CONTAINS"
			, in: 				"IN"
		}

		, targetMap: {
			  get: 				"GetItem"
			, batch: 			"BatchGetItem"
			, query: 			"Query"
			, scan: 			"Scan"
		}


		, init: function( options ){
			this.requester 		= options.requester;			
			this.tableName 		= options.tableName;
			this.tableHelper 	= options.tableHelper;

			this.refresh( function( err ){
				if ( err ) this.emit( "error", err );
				else this.emit( "load" );
			}.bind( this ) );
		}



		, refresh: function( callback ){
			this.tableHelper.describe( this.tableName, function( err, definition ){
				if ( err ) callback( err );
				else {
					this.definition = definition;

					// does the primary have a second field?
					Object.keys( definition.attributes ).forEach( function( att ){
						if ( definition.attributes[ att ].primary === "range" ) this.primaryHasRange = true;
					}.bind( this ) );

					callback( null, definition );
				}
			}.bind( this ) );
		}



		, request: function( target, payload, callback ){
			this.requester.request( target, payload, callback );
		}



		, __find: function( config, callback ){
			var   mQuery 			= mGet = mBatchGet = mScan = false
				, queryType 		= ""
				, primaryUsed 		= false
				, primaryUsedCount 	= 0
				, secondaryName 	= ""
				, query 			= {};


			// detect query mode
			Object.keys( config ).forEach( function( attribute ){
				if ( attribute[ 0 ] !== "$" ){	
					if ( this.definition.attributes[ attribute ] && ( this.definition.attributes[ attribute ].primary || this.definition.attributes[ attribute ].secondary ) ){
						if ( typeof config[ attribute ] === "string" || Array.isArray( config[ attribute ] ) ){
							if ( Array.isArray( config[ attribute ] ) ) mBatchGet = true;
							else mGet = true;
						} else if ( typeof config[ attribute ] === "object" ){
							// the following comparison operators are only supported by scans
							if ( this.scannerMap[ Object.keys( config[ attribute ] )[ 0 ].toLowerCase() ] ) mScan = true;
							else mQuery = true;
						}

						// for query type query there is need for a indexname
						if ( this.definition.attributes[ attribute ].primary ) {
							primaryUsed = true;
							primaryUsedCount++;
						}
						else if ( !secondaryName && this.definition.attributes[ attribute ].secondary ) secondaryName = this.definition.attributes[ attribute ].secondary.name;
					} else mScan = true;
				}
			}.bind( this ) );


			if ( mScan ) 			queryType = "scan";
			else if ( mQuery ) 		queryType = "query";
			else if ( mGet ) 		queryType = "get";
			else if ( mBatchGet ) 	queryType = "batch";

			// select is only supported on queries;
			if ( ( queryType === "get" || queryType === "batch" ) && typeof config.$select === "string" ) queryType = "query";
			if ( queryType === "query" && primaryUsed && secondaryName.length > 0 ) queryType = "scan";
			if ( queryType === "get" && this.primaryHasRange && primaryUsedCount < 2 ) queryType = "query";


			if ( queryType === "get" || queryType === "query" || queryType === "scan" ) query.TableName = this.tableName;
			if ( queryType === "query" && !primaryUsed ) query.IndexName = secondaryName;


			// build query
			Object.keys( config ).forEach( function( attribute ){	

				switch ( attribute ){

					// attribute selection
					case "$select":
						switch ( queryType ){
							case "get": 
								query.AttributesToGet = config.$select;
								break;

							case "query": 
							case "scan":
								if ( Array.isArray( config.$select ) ) query.AttributesToGet = config.$select;
								else query.select = config.$select;
								break;

							case "batch": 
								if ( !query.RequestItems ) {
									query.RequestItems = {};
									query.RequestItems[ this.tableName ] = { Keys: {} };
								}
								query.RequestItems[ this.tableName ].AttributesToGet = $select;
								break;
						}
						break;


					case "$consistent":
						switch ( queryType ){
							case "get": 
							case "query":				
								query.ConsistentRead = true;
								break;

							case "batch": 
								if ( !query.RequestItems ) {
									query.RequestItems = {};
									query.RequestItems[ this.tableName ] = { Keys: {} };
								}
								query.RequestItems[ this.tableName ].ConsistentRead = true;
								break;

							case "scan":
								callback( new Error( "consistent reads are not possible as long as you are querying attributes which are not part of an index!" ) );
						}
						break;


					case "$limit":
						switch ( queryType ){
							case "query":
							case "scan":
								query.Limit = config.$limit;
						}
						break;


					// filter attribute
					default: 
						switch ( queryType ){
							case "get": 
								if ( !query.Key ) query.Key = {};		
								query.Key[ attribute ] = this.typeEncoder( config[ attribute ] );

								break;

							case "batch": 
								if ( !query.RequestItems ) {
									query.RequestItems = {};
									query.RequestItems[ this.tableName ] = { Keys: {} };
								}
								query.RequestItems[ this.tableName ].Keys[ attribute ] = this.typeEncoder( config[ attribute ] );
								break;

							case "query": 
								if ( !query.KeyConditions ) query.KeyConditions = {};
								if ( !query.KeyConditions[ attribute ] ) query.KeyConditions[ attribute ] = { AttributeValueList: [] };

								if ( typeof config[ attribute ] !== "object" ) config[ attribute ] = { e: config[ attribute ] };
								var operator = Object.keys( config[ attribute ] )[ 0 ];
								query.KeyConditions[ attribute ].ComparisonOperator = this.operatorMap[ operator.toLowerCase() ];
								query.KeyConditions[ attribute ].AttributeValueList.push( this.typeEncoder( config[ attribute ][ operator ] ) );
								break;

							case "scan": 
								if ( !query.ScanFilter ) query.ScanFilter = {};	
								if ( !query.ScanFilter[ attribute ] ) query.ScanFilter[ attribute ] = { AttributeValueList: [] };

								if ( typeof config[ attribute ] !== "object" ) config[ attribute ] = { e: config[ attribute ] };
								var operator = Object.keys( config[ attribute ] )[ 0 ];
								query.ScanFilter[ attribute ].ComparisonOperator = this.operatorMap[ operator.toLowerCase() ];
								query.ScanFilter[ attribute ].AttributeValueList.push( this.typeEncoder( config[ attribute ][ operator ] ) );
								break;
						}
				}
			}.bind( this ) );
	
			log.dir(query);

			this.request( this.targetMap[ queryType ], query, function( err, status, data ){
				log.trace( err );
				log.dir( data );
			}.bind( this ) );
		}



		, find: function( config, callback ){
			config.$consistent = true;
			this.__find( config, callback );
		}


		, findOne: function( config, callback ){
			config.$limit = 1;
			config.$consistent = true;
			this.__find( config, function( err, list ){
				if ( err ) callback( err );
				else if ( !list || list.length === 0 ) callback();
				else callback( null, list[ 0 ] );
			}.bind( this ) );
		}


		, remove: function( config, callback ){

		}


		, update: function( config, callback ){

		}



		, typeEncoder: function( val ){
			if ( typeof val === "string" && val.length > 0 ) return { "S": val };
			else if ( typeof val === "number" ) return { "N": val + "" };
			else if ( Buffer.isBuffer( val ) ) return { B: val.toString( "base64") };
			else if ( Array.isArray( val ) && val.length > 0 ){
				if ( typeof val[ 0 ] === "string" ) return { SS: val };
				else if ( typeof val[ 0 ] === "number" ) return { NS: val + "" };
				if ( Buffer.isBuffer( val[ 0 ] ) ) return { BS: val.map( function( v ){ return v.toString( "base64" ); } ) };
			}
			return null;	
		}
	} );





	module.exports = function( options ){

		// this is the actual entity instance constructor, has the static properties
		// can create instances of the entity
		var constructor = function( definition ){

			return new Instance( {
				  requester: 	this.requester
				, tableName: 	options.tableName
				, definition: 	definition
				, db: 			options.db
			} );
		};


		// bind to new proto object ( static methods )
		constructor.__proto__ = new Entity( options );

		return constructor;
	}	