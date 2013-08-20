# ee-dynamodb

ATTENTION: this module is still incomplete & unstable! The functionality described below should work. The module is at the moment not fully tested.
 	
fast & simple dynamodb access


## installation
	
	npm install ee-dynamodb

## usage

	
	var DynamoDB = require( "ee-dynamodb" );


	var db = new DynamoDB( {
		  key: 		""
		, secret:	""
		, region: 	"eu-west-1" 
	} );


	// create a table
	db.create( config, [ cb ] );
	db.create( {}, function( err, user ){} );


	// delete table
	db.delete( [ cb ] );
	db.delete( function( err ){} );


	// create a user
	var user = new db.tablename( user, [ cb ] );

	var michael = new db.user( {
		  name: "michael"
		, birthdate: Date.now()
	} ).save( function( err, michael ){} );



	// find one user
	db.tablename.findOne( filter, cb );
	db.user.findOne( { name: "michael" }, function( err, user ){} );


	// find multiple users
	db.tablename.find( filter, cb );
	db.user.find( { birthdate: { gt: 0 } }, function( err, users ){} );




	// update user
	entityObject.someField = value;
	entityObject.set( { you: "can", set: "multiple", values: "using", this: "method" } );
	entityObject.set( "set", "valueForSetReservedKeyword" );
	entityObject.save( cb );

	user.someNewFieldNeverSeenBefore = Math.random();
	user.save( function( err, user ){} );


	// static update ( not implemened yet )
	db.tablename.update( filter, update, [ cb ] );
	db.user.update( { birthdate: { lt: Date.noe() } }, { someNewFieldNeverSeenBefore: MAth.random() }, function( err ){} );

	

	// delete user
	entityObject.delete( [ cb ] );
	user.delete( function( err ){} );


	// static delete ( not implemente yet )
	db.tablename.remove( filter, [ cb ] );
	db.user.remove( { name: [ "michael", "fabian" ] }, function(){} );


### ATTENTION

in order to access tables or attributes on items with reserved names you have to use the following methods:

	db.table( name )
	item.set( name, value )
	item.get( name )

reserved names for tables are: 
- $id
- $

reserved names on items are
- $
- $id
- $request
- $typeEncoder
- save
- get
- set
- init