function SAMPApi(ip, port, pwd) {
	if (ip === undefined || port === undefined || pwd === undefined)
		throw new Error('Отсутствуют все необходимые параметры (IP, Port, Password)');

	var dgram = require('dgram');
	var client = dgram.createSocket('udp4');

	var ipArray = ip.split('.');
	for (var i = 0; i < ipArray.length; i++) ipArray[i] = parseInt(ipArray[i]);

	var sendRcon = function(command, callback) {
		var packet = Buffer.concat([
			new Buffer('SAMP'),

			new Buffer(ipArray),
			new Buffer([ port & 0xFF, port >> 8 & 0xFF ]),

			new Buffer('x'),

			new Buffer([ pwd.length & 0xFF, pwd.length >> 8 & 0xFF ]),
			new Buffer(pwd),

			new Buffer([ command.length & 0xFF, command.length >> 8 & 0xFF ]),
			new Buffer(command)
		]);

		client.on('message', function(msg, info) {
			return (callback !== undefined) ? callback(msg, info) : void 0;
		});
		client.send(packet, 0, packet.length, port, ip, function(err) { if (err) throw err });
	};

	return {
		call: sendRcon,
		ban: function(id, callback) {
			sendRcon('ban ' + id, callback);
		},
		kick: function(id, callback) {
			sendRcon('kick ' + id, callback);
		},
		close: function() { 
			client.close() 
		}
	}
}

module.exports = SAMPApi;