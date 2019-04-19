
class packet {
    constructor(lines){
        this.bytes = [];
        this.parse(lines);
    }

    parse(lines){

        var checkfor = 'Address/Data: Address ';

        for (var i = 0; i < lines.length; i++){
            var line = lines[i];

            
            if (this.type == undefined){
                if (line.indexOf(checkfor) > -1){
                    var tmp = line.substr(line.indexOf(checkfor) + checkfor.length, 10).replace(' ', '').split(':');
                    this.type = tmp[0];
                    this.address = tmp[1];

                    checkfor = (this.type == 'write' ? 'Address/Data: Data write: ' : 'Address/Data: Data read: ');
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

var serialWriteQueue = [];
var serialWriteQueue_ClearOnNext_Callback = undefined;

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


    wscb.on('start_com_port', function(msg, respondWith){
        console.log('[COM] Initializing...')
        com_device.port = new SerialPort(msg.port, {
            baudRate: 2000000,
        })
        com_device.parser = new Readline();
        com_device.port.pipe(com_device.parser);

        com_device.start(respondWith, com_device);
    })
    
    wscb.on('list_com_ports', function(msg, respondWith){
        console.log('[COM] Providing COM ports to WS client...');
        SerialPort.list((err, ports) => {
            respondWith({ports: ports});
        });    
    })


    wscb.on('serialWrite', function(msg, respondWith){
        console.log('[COM] Write: ' + msg.text);
        respondWith({status: 'ok'})
        
        addAndTrySend({string: msg.text + '\n'})
    })




    wscb.on('list_i2c_snapshots', function(msg, respondWith){
        fs.readdir('./i2c_snapshots/', (err, files) => {
            respondWith({snapshots: files});
        });
    })

    wscb.on('load_snapshot', function(msg, respondWith){
        provide_I2C_snapshot('./i2c_snapshots/' + msg.snapshot)
    })

    wscb.on('clearWriteQueue', function(msg, respondWith){
        serialWriteQueue_ClearOnNext_Callback = respondWith;
    })
}


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

            if (
                packets.length > 1 &&
                p.type == 'read' &&
                packets[packets.length - 1].type == 'write')
            {
            packets[packets.length - 1].response = p;
            }

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
            }
        )
    });

    function filterPairs(){
        var tmp = packets;
        packets = [];
        for (var i = 0; i < tmp.length; i++){
            if (tmp[i].type == 'write')
                packets.push(tmp[i]);
        }
    }    
}

function addAndTrySend(packet){
    serialWriteQueue.push(packet)
    
    if (serialWriteQueue.length == 1) sendNextInQueue();
}

function sendNextInQueue(){
    if (!com_device.port) return;

    if (serialWriteQueue_ClearOnNext_Callback != undefined){
        serialWriteQueue = [];
        serialWriteQueue_ClearOnNext_Callback({status: 'ok'});
        serialWriteQueue_ClearOnNext_Callback = undefined;
        return;
    }

    if (serialWriteQueue.length == 0){
        wscb.send({cmd: 'sequenceCompleted' },function(response){})
        return;
    }
    com_device.port.write(serialWriteQueue[0].string);

    var operation = '';
    if (serialWriteQueue[0].string.indexOf('write') >-1)
        operation = 'write';


    console.log(serialWriteQueue[0].string);
    

    wscb.send(
        {
            cmd: 'packetOperation',
            idx: serialWriteQueue[0].idx,
            operation: operation
        },
        function(response){
        }
    )
}



var com_device = {
    port: undefined,
    parser: undefined,
    start: function(ws_callback, com_device){
        console.log('[COM] Starting COM device...');

        if (ws_callback != undefined)
            ws_callback({status: 'listening'});

        this.parser.on('data', function (data) {
            wscb.send({cmd: 'com_data', data: data},
                function(response){
                }
            )

            if (data.indexOf('write,ok') > -1){
                if (serialWriteQueue[0].readResponse != undefined){
                    var readstr = 'read,' + serialWriteQueue[0].readResponse.address + ',' + serialWriteQueue[0].readResponse.bytes + '\n';
                    wscb.send(
                        {
                            cmd: 'packetOperation',
                            idx: serialWriteQueue[0].idx,
                            operation: 'read'
                        },
                        function(response){
                        }
                    )

                    com_device.port.write(readstr);
                    return;
                }
                
                serialWriteQueue.splice(0,1)

                sendNextInQueue()

                

                return;
            }

            if (data.indexOf('read,') > -1 && serialWriteQueue[0].readResponse != undefined){
                var bytes = data.replace(',\r','').replace(',\n','').split(',');
                bytes.splice(0,1)
                serialWriteQueue[0].readResponse.respondWith({bytes: bytes})

                serialWriteQueue.splice(0,1)
                sendNextInQueue()

                return;
            }

            

            
        })
    },

    buffer: new Uint8Array(),
};