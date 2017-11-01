/* jshint node:true */
'use strict';

const { Writable } = require('stream');
var slowMode = true;

class MyWritable extends Writable {
	constructor(options) {
		super(options);
	}

	_write(chunk, encoding, callback) {
		console.log(chunk.toString().trim());
		if(slowMode) {
			setTimeout(callback, 1000);
		}
		else {
			callback();
		}
	}
}

for(var i=0; i<100; i++) {
	
	require('.').Client({servicename:'fake-sensorify'}, function(client) {
		client.pipe(new MyWritable());
	});

}
setInterval(() => {
	slowMode = !slowMode;
}, 3000);

/*require('./client.js')({servicename:'timesource'}, function(client) {
	client.pipe(process.stdout);
});*/