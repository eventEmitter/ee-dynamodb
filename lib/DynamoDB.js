


	var   Class 		= require( "ee-class" )
		, log 			= require( "ee-log" );


	var   Entity 		= require( "./Entity" )
		, Requester 	= require( "./Requester" );


	module.exports = new Class( {
		


		tables: {}


		, init: function( options ){
			// a hidden internal storage which is not enumerable
			Object.defineProperty( this, "$", { value: {} } );
			this.$.key 			= options.key;
			this.$.secret		= options.secret;
			this.$.version 		= "20120810";
			this.$.region 		= options.region;
			this.$.service 		= "DynamoDB";

			this.$.requester 	= new Requester( this.$ );	
		}



		, listTables: function( callback ){
			this.$.requester.request( "ListTables", {}, function( err, status, list ){
				if ( err ) callback( err );
				else callback( null, list.TableNames );
			}.bind( this ) );
		}


		, getTable: function( name ){
			return this.table( name );
		}



		, describeTable: function( name, callback ){
			this.table( name ).$describe( callback );
		}


		// constructor for tables, a table will be a contructor for a new entity
		, createTable: function( name, definition, callback ){
			this.table( name ).$create( definition, callback );
		}



		, deleteTable: function( name, callback ){
			this.table( name ).$delete( callback );
		}


		, updateThroughput: function( name, read, write, callback ){
			this.table( name ).$update( read, write, callback );
		}


		, table: function( name ){
			if ( !this.tables[ name ] ){
				this.tables[ name ] = new Entity( { 
					  tableName: 	name
					, $: 			this.$
					, db: 			this
				} );
			}

			return this.tables[ name ];
		}
	} );