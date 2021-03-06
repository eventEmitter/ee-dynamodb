

	var   Class			= require( "ee-class" )
		, Events 		= require( "ee-event-emitter" )
		, log 			= require( "ee-log" )



	module.exports = new Class( {
		inherits: Events

		, queue: []
		, createLock: false
		, createQueue: []
		, typeMap: {
			  N: "number"
			, S: "string"
			, B: "binary"
		}
		, reverseMap: {
			  "number": "N"
			, "string": "S"
			, "binary": "B"
		}




		, init: function( options ){
			this.requester = options.requester;	
		}




		, request: function( target, payload, callback ){
			this.requester.request( target, payload, callback );
		}




		// get table info
		, describe: function( tableName, callback ){
			
			this.request( "DescribeTable", {
				TableName: tableName
			}, function( err, status, data ){
				if ( err ) callback( err );
				else {
					var table = { 
						  attributes: 	{}
						, count: 		data.Table.ItemCount
						, created: 		data.Table.CreationDateTime
						, size: 		data.Table.TableSizeBytes
						, status: 		data.Table.TableStatus.toLowerCase()
						, throughput: {
							decreases: 	data.Table.ProvisionedThroughput.NumberOfDecreasesToday 
							, read: 	data.Table.ProvisionedThroughput.ReadCapacityUnits
							, write: 	data.Table.ProvisionedThroughput.WriteCapacityUnits
						}
					};

					if ( data.Table.AttributeDefinitions ){
						try {
							data.Table.AttributeDefinitions.forEach( function( att ){
								table.attributes[ att.AttributeName ] = { type: this.typeMap[ att.AttributeType.substr( 0, 1 ) ], isArray: att.AttributeType.length === 2 };
							}.bind( this ) );

							data.Table.KeySchema.forEach( function( att ){
								table.attributes[ att.AttributeName ].primary = att.KeyType.toLowerCase();
								if ( att.KeyType.toLowerCase() === "hash" ) this.primary = att.AttributeName;
							}.bind( this ) );

							if ( data.Table.LocalSecondaryIndexes ){
								data.Table.LocalSecondaryIndexes.forEach( function( index ){
									index.KeySchema.forEach( function( att ){
										if ( !table.attributes[ att.AttributeName ].secondary ) table.attributes[ att.AttributeName ].secondary = {}; 
										table.attributes[ att.AttributeName ].secondary.name 	= index.IndexName;
										table.attributes[ att.AttributeName ].secondary.size 	= index.IndexSizeBytes;
										table.attributes[ att.AttributeName ].secondary.count 	= index.ItemCount;
										table.attributes[ att.AttributeName ].secondary.type 	= att.KeyType.toLowerCase();
									} );
								} );
							}

							Object.keys( table.attributes ).forEach( function( key ){
								if ( table.attributes[ key ].primary === "hash" ) delete table.attributes[ key ].secondary;
							} );

							this.primary = { name: this.primary, type: table.attributes[ this.primary ].type, isArray: table.attributes[ this.primary ].isArray };
						} catch ( e ) {
							return callback( e );
						}
					}


					callback( null, table );
				}
			}.bind( this ) );
		}




		, create: function( tableName, def, callback, table ){
			callback = callback || function(){}

			// create schema only if not defined already
			if ( !table ){
				if ( !def.throughput 		) callback( new Error( "missing attribute throughput" ) );
				if ( !def.throughput.read 	) callback( new Error( "missing attribute throughput.read" ) );
				if ( !def.throughput.write 	) callback( new Error( "missing attribute throughput.write" ) );
				if ( !def.attributes 		) callback( new Error( "missing attribute attributes" ) );


				try { 
					table = {
						  AttributeDefinitions: 	[]
						, KeySchema: 				[]
						, LocalSecondaryIndexes: 	[]
						, ProvisionedThroughput: {
							  ReadCapacityUnits: 	def.throughput.read 
							, WriteCapacityUnits: 	def.throughput.write
						}
						, TableName: 				tableName
					};

					var attributes = {};
					var keys = {};
					var projections = {};
					var primary;

					Object.keys( def.attributes ).forEach( function( key ){
						var att = def.attributes[ key ];

						if ( ( att.primary || att.secondary ) && !attributes[ key ] ) attributes[ key ] = { AttributeName: key, AttributeType: this.reverseMap[ att.type ] };
						if ( att.primary ) {
							table.KeySchema.push( { AttributeName: key, KeyType: att.primary.toUpperCase() } ); 
							if ( att.primary === "hash" ){
								primary = { AttributeName: key, KeyType: att.primary.toUpperCase() };
							}
						}
						if ( att.secondary ){
							if ( !keys[ att.secondary.name ] ) keys[ att.secondary.name ] = { IndexName: att.secondary.name, KeySchema: [], Projection: { ProjectionType: null } };
							keys[ att.secondary.name ].KeySchema.push( { AttributeName: key, KeyType: att.secondary.type.toUpperCase() } );
						}
						if ( att.projection ){
							if ( !Array.isArray( att.projection ) ) att.projection = [ att.projection ];
							att.projection.forEach( function( p ){
								if ( !projections[ p ] ) projections[ p ] = [];
								projections[ p ].push( key );
							} );
						}
					}.bind( this ) );


					Object.keys( projections ).forEach( function( key ){
						if ( !keys[ key ] ) throw new Error( "projection <"+projections[key].join(",")+">: there is no secondary index with the name <"+key+">" );
						keys[ key ].Projection.NonKeyAttributes = projections[ key ];
					}.bind( this ) );



					Object.keys( attributes ).forEach( function( key ){
						table.AttributeDefinitions.push( attributes[ key ] );
					} );

					Object.keys( keys ).forEach( function( key ){
						table.LocalSecondaryIndexes.push( keys[ key ] );
					} );


					table.KeySchema.sort( function( a, b ){ return a.KeyType === "HASH" ? -1 : 1; } );


					table.LocalSecondaryIndexes.forEach( function( idx ){
						idx.KeySchema.push( primary );
						idx.KeySchema.sort( function( a, b ){ return a.KeyType === "HASH" ? -1 : 1; } );

						if ( def.index && def.index[ idx.IndexName ] && def.index[ idx.IndexName ].projection === "all" ){
							idx.Projection.ProjectionType = "ALL";
							delete idx.Projection.NonKeyAttributes;
						}
						else if ( idx.Projection.NonKeyAttributes ){
							idx.Projection.ProjectionType = "INCLUDE";
						}
						else {
							idx.Projection.ProjectionType = "KEYS_ONLY";
						}
					} );
				} catch ( err ){
					return callback( err );
				}
			}


			// we can only create one table with secondary indexes at the time ...				
			if ( table.LocalSecondaryIndexes.length > 0 ) {
				if ( this.createLock ){
					// queue request
					return this.createQueue.push( { table: table, callback: callback } );
				} 
				else this.createLock = true; // lock			
			}

			// unlock & execute the next job
			var resumeCreate = function(){
				this.createLock = false;
				if ( this.createQueue.length > 0 ){
					var item = this.createQueue.shift();
					this.create( null, item.callback, item.table );
				}
			}.bind( this );


			// talk with amazon
			this.request( "CreateTable", table, function( err, status, data ){
				if ( !err ){
					// we have to wait until the table becomes active
					var wait =function(){
						setTimeout( function(){								
							this.describe( tableName, function( err, tableInfo ){
								if ( err ) {
									callback( err );
									resumeCreate();
								}
								else {
									if ( tableInfo.status === "active" ) {
										callback();
										resumeCreate();
									}
									else wait();
								}
							}.bind( this ) );
						}.bind( this ), 5000 );
					}.bind( this );
					
					wait();
				}
				else {
					// we have to try again later
					if ( err.name === "LimitExceeded" ){
						setTimeout( function(){
							this.create( tableName, null, callback, table );
						}.bind( this ), 5000 );
					}
					callback( err );
					resumeCreate();
				}
			}.bind( this ) );
		}





		, delete: function( tableName, callback ){
			callback = callback || function(){};

			var wait = function(){
				setTimeout( function(){								
					this.describe( tableName, function( err, tableInfo ){
						if ( err ) {
							if ( err.name === "ResourceNotFound" ) callback();
							else callback( err );
						}
						else {
							if ( tableInfo.status === "active" ) this.delete( tableName, callback );
							else wait();
						}
					}.bind( this ) );
				}.bind( this ), 5000 );
			}.bind( this );


			this.request( "DeleteTable", { TableName: tableName }, function( err, status, data ){
				if ( err ){
					if ( err.name === "ResourceNotFound" ) callback();
					else if ( err.name === "ResourceInUse" ) wait();
					else if ( err.name === "LimitExceeded" ) wait();
					else callback( err );
				}
				else wait();					
			}.bind( this ) );
		}





		, update: function( tableName, read, write, callback ){
			callback = callback || function(){};

			var wait = function( waitForFinished ){
				setTimeout( function(){								
					this.describe( tableName, function( err, tableInfo ){
						if ( err ) callback( err );
						else {
							if ( waitForFinished ) {
								if ( tableInfo.status === "active" ) callback();
								else wait( waitForFinished );
							}
							else {
								if ( tableInfo.status === "active" ) this.update( tableName, read, write, callback );
								else wait();
							}
						}
					}.bind( this ) );
				}.bind( this ), 5000 );
			}.bind( this );


			this.request( "UpdateTable", { 
				TableName: tableName
				, ProvisionedThroughput: {
					ReadCapacityUnits: read
					, WriteCapacityUnits: write
				}
			}, function( err, status, data ){
				if ( err ){
					if ( err.name === "ResourceInUse" ) wait();
					else if ( err.name === "LimitExceeded" ) wait();
					else if ( err.name === "Validation" && new RegExp( "The provisioned throughput for the table will not change" ).test( err.message ) ) callback();
					else callback( err );
				}
				else wait( true );					
			}.bind( this ) );
		}
	} );