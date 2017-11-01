/* jshint node:true */
'use strict';

const cluster = require('cluster');
const http = require('http');
const ssdp = require('node-ssdp').Server;
const url = require('url');

const machineIdSync = require('node-machine-id').machineIdSync;
var openRequests = [];
module.exports = function(options, callback) {
	if(!options.servicename) {
		throw('Missing service name');
	}
	options = Object.assign(
		{port: Math.floor(Math.random() * 60000) + 1024, processes: require('os').cpus().length},
		options,
		{address: require('ip').address()}
	);
	if(cluster.isMaster) {
		console.log(`Master ${options.servicename} (${process.pid}) is running on http://${options.address}:${options.port}`);

		// Fork workers.
		for (let i = 0; i < options.processes; i++) {
			cluster.fork({masterPort: options.port});
		}

		var ssdpServer = new ssdp({
			location: options.address + ':' + options.port + '/stats',
			sourcePort: 1900,
			allowWildcards: true,
			headers: {
				address: options.address,
				port: options.port,
				servicename: options.servicename
			},
			udn: 'uuid:' + machineIdSync()
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

		cluster.on('exit', (worker, code, signal) => {
			if (worker.exitedAfterDisconnect !== true) {
				if (signal) {
					console.log(`worker was killed by signal: ${signal}`);
				} else if (code !== 0) {
					console.log(`worker exited with error code: ${code}`);
				} else {
					console.log('worker success!');
				}
			}
		});
	}
	else {
		// Workers can share any TCP connection. In this case it is an HTTP server
		http.createServer((req, res) => {
			console.log(`Request handled by ${process.pid} (${openRequests.length})`);
			var urlParsed = url.parse(req.url, true);
			res.servicename = options.servicename;
			res.setHeader('Connection', 'Transfer-Encoding');
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			res.setHeader('Transfer-Encoding', 'chunked');
				
			if(req.method === 'GET' && urlParsed.pathname === '/stats') {
				res.end('Ongoing streams: ' + openRequests.length);
			}
			else {
				if(req.method === 'GET' && urlParsed.pathname === '/') {
					callback.call(this, res, urlParsed.query);
					openRequests.push(this);
				}
				res.on('error', (e) => {
					//console.error('Error', e);
				});
				res.on('close', () => {
					openRequests.splice(openRequests.indexOf(this), 1);
					console.error('Close:', options.servicename);
				});
			}
		}).listen(process.env.masterPort);

		console.log(`Worker ${options.servicename} (${process.pid}) is running on http://${options.address}:${process.env.masterPort}`);
	}
}