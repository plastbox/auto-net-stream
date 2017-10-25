/* jshint node:true */
'use strict';

const ssdp = require('node-ssdp').Server;
const http = require('http');
const url = require('url');
const { Readable, Writable } = require('stream');

module.exports = function(options, callback) {
	if(!options.servicename) {
		throw('Missing service name');
	}

	var my = {
		address: require('ip').address(),
		port: Math.floor(Math.random() * 60000) + 1024
	};
	var openRequests = [];
	var server = http.createServer(function(req, res) {
		console.log('Request', req.method, req.url);
		res.servicename = options.servicename;
		if(req.method === 'GET' && req.url === '/stats') {
			res.setHeader('Content-Type', 'text/html');
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('Ongoing streams: ' + openRequests.length);
		}
		else {
			if(req.method === 'GET' && req.url === '/') {
				callback.call(this, res, url.parse(req.url, true).query);
				openRequests.push(this);
			}
			res.on('error', (e) => {
				//console.error('Error', e);
			});
			res.on('close', () => {
				openRequests.splice(openRequests.indexOf(this), 1);
				console.error('Close');
			});
		}
	});
	server.listen(my.port, my.address);

	var ssdpServer = new ssdp({
		location: my.address + ':' + my.port + '/stats',
		sourcePort: 1900,
		allowWildcards: true,
		headers: {
			address: my.address,
			port: my.port,
			servicename: options.servicename
		}
	});

	//ssdpServer.addUSN('upnp:rootdevice');
	ssdpServer.addUSN('urn:schemas-upnp-org:device:' + options.servicename);

	ssdpServer.on('advertise-alive', function(heads) {
		//console.log('advertise-alive', heads);
		// Expire old devices from your cache.
		// Register advertising device somewhere (as designated in http headers heads)
	});

	ssdpServer.on('advertise-bye', function(heads) {
		//console.log('advertise-bye', heads);
		// Remove specified device from cache.
	});

	// start server on all interfaces
	ssdpServer.start().then(function() {
		console.log('ssdp server started');
	});

	return server;
};