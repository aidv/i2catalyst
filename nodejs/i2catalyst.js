
class packet {
    constructor(lines){
        this.bytes = [];
        this.parse(lines);
    }

    parse(lines){

        var checkfor = 'Address/Data: Address ';

        for (var i = 0; i < lines.length; i++){
            var line = lines[i];

            
            if (this.operation == undefined){
                if (line.indexOf(checkfor) > -1){
                    var tmp        = line.substr(line.indexOf(checkfor) + checkfor.length, 10).replace(' ', '').split(':');
                    this.operation = tmp[0];
                    this.address   = tmp[1];

                    checkfor = (this.operation == 'write' ? 'Address/Data: Data write: ' : 'Address/Data: Data read: ');
                }
            } else {
                if (line.indexOf(checkfor) > -1)
                    this.bytes.push(
                        line.substr(
                            line.indexOf(checkfor) + checkfor.length, 2
                        )
                    );
            }

        }
    }
};


/*******/



var path = require('path');
var express = require("express");
var app = express();

var root_path = ''

/* serves main page */
app.get("/", function(req, res) {
    res.sendfile(path.resolve(root_path + 'index.html'))
});

app.post("/user/add", function(req, res) { 
    /* some server side logic */
    res.send("OK");
});

/* serves all the static files */
app.get(/^(.+)$/, function(req, res){ 
    console.log('static file request : ' + req.params);
    res.sendfile( __dirname + root_path + req.params[0]); 
});

var port = 8080;
app.listen(port, function() {
    console.log("Listening on " + port);
});


/*******/

const fs = require('fs')
const WebSockets_Callback = require('wscb');
const SerialPort = require('serialport')
const Readline = SerialPort.parsers.Readline;



var options = {}
var wscb = new WebSockets_Callback(options);

initWSCB();

function initWSCB(){
    wscb.on('sendPacket', function(msg, respondWith){
        console.log('[W ' + msg.address + '] ' + msg.bytes);

        var readResponse;

        if (msg.readResponse == undefined){
            readResponse = undefined;
            respondWith({status: 'ok'})
        } else {
            readResponse = msg.readResponse;
            readResponse.respondWith = respondWith;
        }

        

        var packet = {
            idx: msg.packetIdx,
            string: 'write,' + msg.address + ',' + msg.bytes + '\n',
            readResponse: readResponse
        };

        addAndTrySend(packet)
            
        
    })

    wscb.options.onUnexpectedMessage = function(conn, msg){
        console.log('[WS] Client sent a responseless message: ' + msg)
    }

    wscb.options.onListening = function(conn){
        console.log('[WS] Server listening on port ' + wscb.options.port)
    }

    wscb.options.onOpen = function(conn){
        console.log('[WS] Client connected')
        console.log('[WS] Providing I2C dataset...')
    }



    wscb.on('list_i2c_snapshots', function(msg, respondWith){
        fs.readdir('./i2c_snapshots/', (err, files) => {
            respondWith({snapshots: files});
        });
    })

    wscb.on('load_snapshot', function(msg, respondWith){
        provide_I2C_wsCallback = respondWith;
        provide_I2C_snapshot('./i2c_snapshots/' + msg.snapshot)
    })






    wscb.on('start_com_port', function(msg, respondWith){
        console.log('[COM] Initializing...')
        com_device.port = new SerialPort(msg.port, {
            baudRate: 2000000,
        })
        com_device.parser = new Readline();
        com_device.port.pipe(com_device.parser);

        com_device.start(respondWith, com_device);
    })

    wscb.on('disconnectComPort', function(msg, respondWith){
        console.log('[COM] Disconnecting...')
        if (i2c_device) i2c_device.disconnect((res) => {
            respondWith(res)  
        })

        respondWith({status: 'ok'})            
    })
    
    wscb.on('list_com_ports', function(msg, respondWith){
        console.log('[COM] Providing COM ports to WS client...');
        SerialPort.list((err, ports) => {
            respondWith({ports: ports});
        });    
    })



    wscb.on('connectToRemoteI2CHost', function(msg, respondWith){
        fake.connectTo(msg.address, (status) => {
            respondWith(status)
        }, msg.port);
    })

    wscb.on('connectToFakeI2CBridge', function(msg, respondWith){
        console.log('[FAKE I2C BRIDGE] Initializing...')
        fake_i2c_bridge.start(respondWith);
    })

    
    wscb.on('operation', function(msg, respondWith){
        if (!i2c_device){
            respondWith({status: 'error', message: 'i2c_device_not_connected'})
            return;
        }

        if (msg.operation.operation == 'write'){
            i2c_device.write(msg.operation.address, msg.operation.bytes, (res) => {
                respondWith(res)
            });
        } else {
            i2c_device.read(msg.operation.address, msg.operation.bytes, (res) => {
                respondWith(res)
            });
        }
    })

    
}

var provide_I2C_wsCallback = undefined;
var waitForStop = false;
function provide_I2C_snapshot(filename){
    
    var packets = [];
    var tmp_lines = [];
    var lineReader = require('readline').createInterface({
        input: require('fs').createReadStream(filename)
    });

    lineReader.on('line', function (line) {
        tmp_lines.push(line);

        

        if (line.indexOf('Address/Data: Start') > -1)
            waitForStop = true;

        if (waitForStop == true && line.indexOf('Address/Data: Stop') > -1){
            //console.log(tmp_lines);

            var p = new packet(tmp_lines);

            if (packets.length > 1 && p.operation == 'read' && packets[packets.length - 1].operation == 'write' && p.address == packets[packets.length - 1].address)
                packets[packets.length - 1].response = p;

            packets.push(p);
            
            waitForStop = false;
            tmp_lines = [];
        }
    });

    lineReader.on('close', function (line) {
        filterPairs();
        console.log('[DOWNTOWN] I2C parsing done!');
        
        wscb.send(
            {cmd: 'packets', packets: packets},
            function(response){
                console.log('[WS] I2C snapshot ' + filename + ' successfully provided!')
                provide_I2C_wsCallback = undefined;
            }
        )
    });

    function filterPairs(){
        var tmp = packets;
        packets = [];

        provide_I2C_wsCallback({status: 'loading', total: tmp.length})
        
       
        for (var i = 0; i < tmp.length; i++){
            if (tmp[i].operation == 'write' || (tmp[i].operation == 'read' && tmp[i].respondsTo == undefined)){
                if (packets.length > 1 && tmp[i].operation == 'read' && packets[packets.length - 1].operation == 'write' && tmp[i].address == packets[packets.length - 1].address){
                    packets[packets.length - 1].response = tmp[i];
                    tmp[i].respondsTo = (packets.length - 1);
                }

                packets.push(tmp[i]);
            }
        }
    }    
}


/*  
    i2c_device

    An object that handles write and read to an i2c bus.
    It contains two functions: write() and read().

    Is used as a bridge to i2c-land and can contain any code.
*/
var i2c_device;

var com_device = {
    port: undefined,
    parser: undefined,
    start: function(ws_callback, com_device){
        console.log('[COM] Starting COM device...');

        i2c_device = com_device.i2c_bridge

        if (ws_callback != undefined)
            ws_callback({status: 'listening'});

        this.parser.on('data', function (data) {
            wscb.send({cmd: 'com_data', data: data}, (res) => {} )

            if (data.indexOf('write,ok') > -1){
                com_device.i2c_bridge.onDone_Callback({status: 'ok', operation: 'write'})
                return;
            }

            if (data.indexOf('read,') > -1){
                var bytes = data.replace(',\r','').replace(',\n','').split(',');
                bytes.splice(0,1)
                com_device.i2c_bridge.onDone_Callback({status: 'ok', operation: 'read', bytes: bytes})
                return;
            }            
        })
    },

    i2c_bridge: {
        onDone_Callback: undefined,

        write: function(address, bytes, onDone){
            com_device.i2c_bridge.onDone_Callback = onDone
            com_device.port.write('write,' + address + ',' + bytes);
        },
    
        read: function(address, byteCount, onDone){
            com_device.i2c_bridge.onDone_Callback = onDone
            com_device.port.write('read,' + address + ',' + byteCount);
        },

        disconnect: function(onDone){
            com_device.port.close(function (err) {
                console.log('[COM] Port closed', err);
                onDone({status: 'ok'})
            });
        }
    }
};




var remote_i2c_host = {
    wscb: undefined,
    onConnectStatus: undefined,
    connectTo: function(address, onConnectStatus, port = 8081){
        remote_i2c_host.onConnectStatus = onConnectStatus;
        try {
            remote_i2c_host.wscb = new WebSockets_Callback({
                asClient: true,
                
                address: address,
                port: port,

                onUnexpectedMessage: (conn, msg) => {
                    console.log('[remote_i2c_host] Host sent a responseless message: ' + msg)
                },
            
                onOpen: (conn) => {
                    console.log('[remote_i2c_host] Connected!')
                    remote_i2c_host.onConnectStatus({status: 'ok'})
                    i2c_device = remote_i2c_host
                },

                onError: (err) => {
                    console.log('[remote_i2c_host] Connected!')
                    remote_i2c_host.onConnectStatus({status: 'error'})
                    remote_i2c_host.wscb = undefined;
                    i2c_device = undefined
                }
            })
        } catch(e) {
            remote_i2c_host.onConnectStatus({status: 'error', message: 'ERR_INVALID_URL'})
            remote_i2c_host.wscb = undefined;
        }
    },

    write: function(address, bytes, onDone){
        if (!remote_i2c_host.wscb){
            console.log('[remote_i2c_host] Cannot write. Remote I2C host not connected.')
            //return;
        }

        /*onDone({operation: 'write'})
        return;*/
        
        remote_i2c_host.wscb.send({
            cmd: 'operation',
            operation: 'write',
            address: address,
            bytes: bytes,
        },
        function(response){
            onDone({status: 'ok', operation: 'write'})
        })
    },

    read: function(address, byteCount, onDone){
        if (!remote_i2c_host.wscb){
            console.log('[remote_i2c_host] Cannot read. Remote I2C host not connected.')
            //return;
        }

        
        /*onDone({operation: 'read', bytes: [0x00, 0x01, 0x02, 0x03]})
        return;*/
        
        remote_i2c_host.wscb.send({
            cmd: 'operation',
            operation: 'read',
            address: address,
            byteCount: byteCount,
        },
        function(response){
            onDone({status: 'ok', operation: 'read', bytes: response.bytes})
        })
    },

    disconnect: function(onDone){
        wscb.ws.close()
        onDone({status: 'ok'})
    }
}





var fake_i2c_bridge = {
    start: function(ws_callback){
        console.log('[FAKE BRIGDE] Starting fake I2C device...');
        i2c_device = fake_i2c_bridge.i2c_bridge;
        if (ws_callback != undefined) ws_callback({status: 'ok'});
    },

    i2c_bridge: {
        onDone_Callback: undefined,

        write: function(address, bytes, onDone){
            onDone({status: 'ok', operation: 'write', bytes: bytes}); 
        },
    
        read: function(address, byteCount, onDone){
            var bytes_ = []
            for (var i = 0; i < byteCount; i++) bytes_.push('00');
            onDone({status: 'ok', operation: 'read', bytes: bytes_}); 
        },

        disconnect: function(onDone){ console.log('[FAKE BRIGDE] Port closed'); }
    }
};