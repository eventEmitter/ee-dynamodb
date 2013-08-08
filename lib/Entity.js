	( function(){



		var   Class			= require( "ee-class" )
			, Events 		= require( "ee-event" )
			, log 			= require( "ee-log" )


		var   Instance 		= require( "./Instance" )
			, Requester 	= require( "./Requester" );


		var Entity = new Class( {
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
				this.requester = new Requester( options.options );				
				this.tableName = options.tableName;
			}


			, request: function( target, payload, callback ){
				this.requester.request( target, payload, callback );
			}


			, find: function( config, callback ){

			}


			, findOne: function( config, callback ){

			}


			, remove: function( config, callback ){

			}


			, update: function( config, callback ){

			}


			// get table info
			, describe: function( callback ){
				
				this.request( "DescribeTable", {
					TableName: this.tableName
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

						try {
							data.Table.AttributeDefinitions.forEach( function( att ){
								table.attributes[ att.AttributeName ] = { type: this.typeMap[ att.AttributeType ] };
							}.bind( this ) );

							data.Table.KeySchema.forEach( function( att ){
								table.attributes[ att.AttributeName ].primary = att.KeyType.toLowerCase();
							} );

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
						} catch ( e ) {
							return callback( e );
						}

						callback( null, table );
					}
				}.bind( this ) );
			}



			, create: function( def, callback, table ){

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
							, TableName: 				this.tableName
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

				var resumeCreate = function(){
					this.createLock = false;
					if ( this.createQueue.length > 0 ){
						var item = this.createQueue.shift();
						this.create( null, item.callback, item.table );
					}
				}.bind( this )

				this.request( "CreateTable", table, function( err, status, data ){
					if ( !err ){
						// we have to wait until the table becomes active
						var wait =function(){
							setTimeout( function(){								
								this.describe( function( err, tableInfo ){
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
							}.bind( this ), 1000 );
						}.bind( this );
						
						wait();
					}
					else {
						callback( err );
						resumeCreate();
					}
				}.bind( this ) );
			}


			, addSecondaryIndex: function(){

			}


			, removeSecondaryIndex: function(){

			}
		} );





		module.exports = function( options ){

			// this is the actual entity instance constructor, has the static properties
			// can create instances of the entity
			var constructor = function( definition ){

				return new Instance( {
					  url: 			options.url
					, credentials: 	options.credentials
					, tableName: 	options.tableName
					, definition: 	definition
				} );
			};


			// bind to new proto object ( static methods )
			constructor.__proto__ = new Entity( options );

			return constructor;
		}	
	} )();