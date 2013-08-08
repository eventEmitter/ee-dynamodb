


	var   Class 		= require( "ee-class" )
		, log 			= require( "ee-log" );


	var   Entity 		= require( "./Entity" )
		, Request 		= require( "./Requester" );


	module.exports = new Class( {
		


		init: function( options ){
			// a hidden internal storage which is not enumerable
			Object.defineProperty( this, "$", { value: {} } );
			this.$.key 			= options.key;
			this.$.secret		= options.secret;
			this.$.version 		= "20120810";
			this.$.region 		= options.region;
			this.$.service 		= "DynamoDB";
		}


		, describeTable: function( name, callback ){
			this.__loadTbale( name );
			this[ name ].describe( callback );
		}


		// constructor for tables, a table will be a contructor for a new entity
		, createTable: function( name, definition, callback ){
			this.__loadTbale( name );
			this[ name ].create( definition, callback );
		}


		, __loadTbale: function( name ){
			if ( !this[ name ] ){
				this[ name ] = new Entity( { 
					  tableName: 		name
					, options: 			this.$
				} );
			}
		}
	} );