


	var   Class 		= require( "ee-class" )
		, Events 		= require( "ee-event-emitter" )
		, log 			= require( "ee-log" )
		, Waiter 		= require( "ee-waiter" );


	var   Entity 		= require( "./Entity" )
		, Requester 	= require( "./Requester" )
		, TableHelper 	= require( "./TableHelper" );




	module.exports = new Class( {
		inherits: Events

		, init: function( options ){
			var $object = {};

			// a hidden internal storage which is not enumerable
			Object.defineProperty( this, "$", { value: $object } );
			this.$.key 			= options.key;
			this.$.secret		= options.secret;
			this.$.version 		= "20120810";
			this.$.region 		= options.region;
			this.$.service 		= "DynamoDB";


			this.$.requester 	= new Requester( this.$ );

			// if a tbale has the same name as a keyword used on this class we have to 
			// redirect som ecalls to the instance constructor
			this.$.tables 		= {};
			this.$.reserved 	= [ "init", "table", "list", "describe", "delete", "create", "throughput", "refresh", "destroy", "addListener", "on", "once", "off", "listener", "emitNow", "emit" ];
			this.$.reserved.forEach( function( f ){ 
				var func = this[ f ];
				this[ f ] = function( options ){
					if ( !this.$ ) {
						if ( $object.tables[ f ] ) return new $object.tables[ f ]( options );
						else return undefined;
					}
					else return func.apply( this, Array.prototype.slice.call( arguments, 0 ) ) || this;
				}.bind( this );
			}.bind( this ) );


			// table functions
			this.$.tableHelper = new TableHelper( {
				requester: this.$.requester
			} );

			// load table info from aws
			this.refresh( function( err ){
				if ( err ) this.emit( "load", err );
				else this.emit( "load" );
			}.bind( this ) );
		}



		// re-load tables
		, refresh: function( callback ){

			// get all existing tables
			this.list( function( err, list ){
				if ( err ) callback( err );
				else {
					var loader = new Waiter( callback );

					// refresh existing, instantiate new
					list.forEach( function( table ){
						loader.add( function( cb ){
							if ( this.$.tables[ table ] ) this.$.tables[ table ].refresh( cb );
							else {
								// create new table
								var newTable = new Entity( {
									  requester: 	this.$.requester
									, tableName: 	table
									, tableHelper: 	this.$.tableHelper
									, db: 			this
								} );


								newTable.on('load', function(){
									this.$.tables[ table ] = newTable;

									// place on this for easy referencing
									if ( this.$.reserved.indexOf( table ) >= 0 ){
										this[ table ].__proto__ = newTable;
									}
									else {
										this[ table ] = newTable;
									}

									cb();
								}.bind( this ));

								newTable.on('error', cb);
							}
						}.bind( this ) );						
					}.bind( this ) );

					// delete no existent
					Object.keys( this.$.tables ).forEach( function( table ){
						if ( list.indexOf( table ) === -1 ){
							if ( this.$.reserved.indexOf( table ) >= 0 ){
								this[ table ].__proto__ = {};
							}
							else {
								delete this[ table ];
							}
						}
					}.bind( this ) );


					loader.start();
				} 
			}.bind( this ) );
		}



		// list tables
		, list: function( callback ){
			this.$.requester.request( "ListTables", {}, function( err, status, list ){
				if ( err ) callback( err );
				else callback( null, list.TableNames );
			}.bind( this ) );
		}



		// describe a table
		, describe: function( tableName, callback ){
			this.$.tableHelper.describe( tableName, callback );
		}




		// create a new table
		, create: function( tableName, definition, callback ){
			this.$.tableHelper.create( tableName, definition, function( err, table ){
				if ( err ) callback( err );
				else {
					this.$.tables[ tableName ] = table;

					if ( this.$.reserved.indexOf( tableName ) >= 0 ){
						this[ tableName ].__proto__ = this.$.tables[ tableName ];
					}
					else {
						this[ tableName ] = this.$.tables[ tableName ];
					}

					callback( null, table );
				}
			}.bind( this ) );
		}




		// delete a table
		, delete: function( tableName, callback ){
			this.$.tableHelper.delete( tableName, function( err ){
				if ( err ) callback( err );
				else {
					if ( this.$.reserved.indexOf( tableName ) >= 0 ){
						this[ table ].__proto__ = {};
					}
					else {
						delete this[ tableName ];
					}

					delete this.$.tables[ tableName ];

					callback();
				}
			}.bind( this ) );
		}



		// change throughput for a table
		, throughput: function( tableName, read, write, callback ){
			this.$.tableHelper.update( tableName, read, write, callback );
		}


		// returns a table object
		, table: function( tableName ){
			return this.$.tables[ tableName ];
		}
	} );