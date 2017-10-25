/* jshint node:true */
'use strict';

for(var i = 0; i < 5; i++) {
	require('./server.js')({servicename: 'timesource'}, function(socket, request) {
		var ts = new MeasurementStream(request);
		ts.pipe(socket);
	});
}

const { Readable } = require('stream');
class MeasurementStream extends Readable {
	constructor(opt) {
		opt = Object.assign({}, opt);
		super(opt);
	}

	_read(size) {
		setTimeout(() => {
			this.push(JSON.stringify({
				time: Date.now(),
				analog_1: Math.floor(Math.random() * 255),
				analog_2: Math.floor(Math.random() * 255),
				analog_3: Math.floor(Math.random() * 255),
				analog_4: Math.floor(Math.random() * 255),
				ignition_sense: Math.random() > .5
			}) + "\r\n");
		}, 1);
	}
}