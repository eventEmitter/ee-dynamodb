# ee-dynamodb

[![Greenkeeper badge](https://badges.greenkeeper.io/eventEmitter/ee-dynamodb.svg)](https://greenkeeper.io/)

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


	// query syntax. the module will decide itself if it should use the GetItem, BatchGetItem, Query or Scan API.
	// you should know what the differences are. examples: if you have a compund primary key you have to pass both values in 
	// order to be able to use the GetItem API. if you retreive values which are not part of an index the scan function
	// will be used. if you use keys from different indexes the scan API will be used. 
	{
		  $select: [ "the", "attributes", "to", "select" ] // defaults to all attributes
		, $limit: 100 // dynamodb will do anyway a limit ( if the response gets bigger than 1 mb )
		, key: value 
		, key: { contains: "whatever" } // finds the string in an string attribute or the item in a string set attribute
		, key: { gte: 2345 } // finds values equal or greater than 2345
	}


	// find one user
	db.tablename.findOne( filter, cb );
	db.user.findOne( { name: "michael" }, function( err, user, more ){} );


	// find multiple users
	db.tablename.find( filter, cb );
	db.user.find( { birthdate: { gt: 0 } }, function( err, users, more ){
		// do something with the data

		// get more records
		if ( more ) more();
	} );

	// if you passed the $limit argument to the find or findOne method or there are more result sets as dynamodb resturns per request you will get third parameter «more» delivered to your callback. you cann call that function to retreive the next records. if you pass a callback as parameter 0 to the more function that callback will be called for the new results, else the ôriginal callback passed to the find or findOne function will be called again.


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