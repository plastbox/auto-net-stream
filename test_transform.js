/* jshint node:true */
'use strict';

const { Transform } = require('stream');
class MyTransform extends Transform {
	constructor(options) {
		super(options);
		this.leftOvers = Buffer.alloc(0);
	}
	_transform(chunk, encoding, callback) {
		chunk = Buffer.concat([this.leftOvers, chunk]);
		this.leftOvers = Buffer.alloc(0);
		chunk.toString().trim().split("\r\n").forEach((msg, i, arr) => {
			console.log('msg', i, arr.length, msg.substr(-1), msg);
			if(i === arr.length -1 && msg.substr(-1) !== '}') {
				this.leftOvers = Buffer.from(msg);
			}
			else {
				msg = JSON.parse(msg);
				this.push(JSON.stringify({time: (new Date(msg.time - 0)).toISOString(), analog_1: msg.analog_1}) + "\r\n");
				this.push(JSON.stringify({time: (new Date(msg.time - 0)).toISOString(), analog_2: msg.analog_2}) + "\r\n");
				this.push(JSON.stringify({time: (new Date(msg.time - 0)).toISOString(), analog_3: msg.analog_3}) + "\r\n");
				this.push(JSON.stringify({time: (new Date(msg.time - 0)).toISOString(), analog_4: msg.analog_4}) + "\r\n");
				this.push(JSON.stringify({time: (new Date(msg.time - 0)).toISOString(), ignition: !!msg.ignition_sense}) + "\r\n");
			}
		});
		callback();
	}
}

for(var i = 0; i < 10; i++) {

	require('./server.js')({servicename: 'isotimesource'}, function(socket, request) {
		// Server has been created and a received has been request
		require('./client.js')({servicename: 'timesource'}, function(client) {
			// Hook up input data source (stream)
			var trans = new MyTransform();
			client.pipe(trans).pipe(socket);
			socket.on('close', () => {
				client.destroy();
			});
		});
	});

}