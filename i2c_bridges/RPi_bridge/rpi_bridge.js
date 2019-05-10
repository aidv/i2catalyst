const i2c = require('i2c-bus');
var os = require('os');
var ifaces = os.networkInterfaces();
const WebSockets_Callback = require('wscb');

var wsPort = 8082;
var localIP = '0.0.0.0:' + wsPort;
var i2c_port = 1;

console.log('Raspberry Pi i2c bridge for I2Catalyst')
console.log('https://www.github.com/aidv/i2catalyst/')
console.log('')
console.log('[...] Starting...')

process.stdout.write('[...] Opening i2c bus ' + i2c_port + '...')
var i2c_bus = i2c.open(i2c_port, function(err){
    if (err == null){
        console.log(' OK')
        tryFetchLocalIP();
    } else {
        console.log('')
        console.log('[ERROR] Could not open i2c bus')
    }
});

function tryFetchLocalIP(){
    process.stdout.write('[...] Finding local IP...')
    localIP = 'fetching'

    Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
        } else {
            // this interface has only one ipv4 adress
            console.log(' OK')
            localIP = iface.address;
            startWSServer()
        }
        ++alias;
    });
    });
}

var wscb;

function startWSServer(){
    process.stdout.write('[...] Starting Websocket Server')
    wscb = new WebSockets_Callback({port: wsPort});

    wscb.options.onUnexpectedMessage = function(conn, msg){
        //console.log('Client sent a responseless message: ' + msg)
    }

    wscb.options.onListening = function(conn){
        //console.log('Websocket server listening on port ' + wscb.options.port)
        console.log(' OK')
        console.log('')

        console.log('Connect to ' + localIP + ':' + wsPort + ' in I2Catalyst.')
    }

    wscb.options.onOpen = function(conn){
        //console.log('WS client connected!')

    }

    wscb.on('operation', function(msg, respondWith){
        var buf;
        
        if (msg.bytes){
            var bytesTmp = []
            for (var i = 0; i < msg.bytes.length; i++) bytesTmp.push(parseInt(msg.bytes[i], 16))
            buf = Buffer.from(bytesTmp)
        } else {
            buf = Buffer.alloc(msg.byteCount)
        }
        
        if (msg.operation == 'write'){
            
            i2c_bus.i2cWrite(parseInt(msg.address, 16), buf.length, buf, function(err, bytesWritten, buf){
                if (err == null)
                    respondWith({status: 'ok'})
                else
                    respondWith({status: 'error', message: 'error_writing_to_i2c_bus'})
            });
        } else {
            i2c_bus.i2cRead(parseInt(msg.address, 16), buf.length, buf, function(err, bytesRead, buffer){
                if (err == null){
                    var bytes = []
                    for (var i = 0; i < buffer.length; i++) bytes.push((+buffer[i]).toString(16).toUpperCase())
                    respondWith({status: 'ok', bytes: bytes})
                } else {
                    respondWith({status: 'error', message: 'error_reading_from_i2c_bus'})
                }
            });
        }
    })
}