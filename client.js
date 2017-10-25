/* jshint node:true */
'use strict';

const ssdp = require('node-ssdp').Client;
//var net = require('net');
const http = require('http');

var ssdpClient = new ssdp({
	explicitSocketBind: true
});
/*ssdpClient.on('notify', function () {
	console.log('Got a notification.');
}).on('end', function() {
	console.log('stop ssdpcli');
});*/

var searchCallbacks = {};
ssdpClient.searchCallback = function(name, callback) {
	if(!searchCallbacks[name]) {
		searchCallbacks[name] = [];
		Object.defineProperty(searchCallbacks[name], 'discoveredKeys', { value: [], enumerable: false });
		Object.defineProperty(searchCallbacks[name], 'timer', { value: setTimeout(function() { console.log('Hidden timer triggered!'); }, 40), enumerable: false, writable: true });
		console.log('callbacks', searchCallbacks[name], searchCallbacks[name].discoveredKeys);
	}
	searchCallbacks[name].push(callback);
	this.search(name);
	setTimeout(()=>{}, 1000);
};
ssdpClient.on('response', function inResponse(headers, code, rinfo) {
	//console.log('Got a response to an m-search:\n', code, headers, rinfo);
	Object.keys(searchCallbacks).forEach((key) => {
		if(headers.USN.match(new RegExp(key.replace(/\*/g, '.*'), "g")) !== null) {
			var tmp = headers.ADDRESS + ':' + headers.PORT + '/' + headers.SERVICENAME;			
			if(searchCallbacks[key].discoveredKeys.indexOf(tmp) === -1) {
				clearTimeout(searchCallbacks[key].timer);
				searchCallbacks[key].timer = setTimeout(function() { console.log('Hidden timer triggered!'); }, 40);
				searchCallbacks[key].discoveredKeys.push(tmp);
				searchCallbacks[key].forEach((cb) => {
					cb.call(this, headers, code, rinfo);
				});
			}
		}
	});
});

module.exports = function(opt, callback) {
	if(!opt.servicename) {
		throw('Missing service name');
	}
	if(!opt.start) {
		opt.start = Date.now();
	}

	var created = false;
	ssdpClient.searchCallback('urn:schemas-upnp-org:device:' + opt.servicename, function(headers, code, rinfo) {
		if(!created) {
			created = true;

			var options = {
				host: headers.ADDRESS,
				port: headers.PORT,
				path: '/'
			};
			
			http.request(options, function(res) {
				callback(res);
			}).end();

			/*var client = new net.Socket();
			client.connect(headers.PORT, headers.ADDRESS, function() {
				console.log('Connected', opt);
				client.write('REQUEST:' + opt.start);
				callback(client);
			}).on('error', function(e) {
				console.error('Connection erred', e);
			}).on('close', function() {
				//self.buffer.push(null);
				console.log('Connection closed');
			});*/
		}
	});
	setTimeout(()=>{}, 1000);
}