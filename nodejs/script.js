
$('.ui.checkbox').checkbox();

$('.toggle.label').click(function(){
    $(this).next().checkbox('uncheck');
});

/*$('.ui.checkbox label').click(function(){
    $(this).parent().checkbox('toggle');
    console.log('CHANGED');
    console.log($(this).attr('data-value'));
    return false;
});*/

$('#toggleHexDec').checkbox({
    onChecked: function(){ toggleHexDec(false) },
    onUnchecked: function(){ toggleHexDec(true) }
})



$('.ui.dropdown').dropdown({});



$('.comPort_MenuItem').click(refreshComPorts)
$('.snapshots_MenuItem').click(refresh_i2c_snapshots)

function onComPortItemClick(){
    wscb.send({cmd: 'start_com_port', port: $(this).attr('data-value')},
        function(response){
            if (response.status == 'listening'){
                console.log('[SUCCESS] COM port listening!');
            } else {
                console.log('[ERROR] COM port error: ' + response.error);
            }
        }
    )
}

function onSnapshotItemClick(){
    wscb.send({cmd: 'load_snapshot', snapshot: $(this).attr('data-value')},
        function(response){
            if (response.status == 'ok'){
                console.log('[SUCCESS] COM port listening!');
            } else {
                console.log('[ERROR] Snapshot could not be loaded');
            }
        }
    )
}

function refreshComPorts(){
    $('#comPortList').empty();
    $('#comPortList').append(`<div class="item" style="margin-top: 1rem; margin-bottom: 1rem;">
        <div class="ui tiny active loader"></div>
    </div>`);

    wscb.send({cmd: 'list_com_ports'},
        function(response){
            $('#comPortList').empty();
            for (var i = 0; i < response.ports.length; i++)
                $('#comPortList').append('<div class="item comPortItem" data-value="' + response.ports[i].comName + '">' + response.ports[i].comName + '</div>');        
        
            /*$('#comPortListItems').on('change', function(){
                console.log('COM port selected: ' + this.value);
            })*/

            $('.comPortItem').click(onComPortItemClick)
        }
    )
}


function refresh_i2c_snapshots(){
    $('#i2c_snapshots_list').empty();
    $('#i2c_snapshots_list').append(`<div class="item" style="margin-top: 1rem; margin-bottom: 1rem;">
        <div class="ui tiny active loader"></div>
    </div>`);

    wscb.send({cmd: 'list_i2c_snapshots'},
        function(response){
            $('#i2c_snapshots_list').empty();
            for (var i = 0; i < response.snapshots.length; i++)
                $('#i2c_snapshots_list').append('<div class="item snapshotItem" data-value="' + response.snapshots[i] + '">' + response.snapshots[i] + '</div>');

            $('.snapshotItem').click(onSnapshotItemClick)
        }
    )
}


/******/

$(document).keydown(function(e) {
    switch(e.which) {
        case 68:
            toggleHexDec();
            $('#toggleHexDec').checkbox((byteTypeHex ? 'uncheck' : 'check'));
        break;

        case 88: clearSequence(); break;
        case 65: selectAllSequence(); break;
        case 82: runSequence(); break;
        case 27: stopSequence(); break;

        case 70: toggleFirstOccurances(); break;

        case 66: toggleBinaryOnly(); break;

        default: console.log(e.which)
    }
})


var currentPacketIndex = 0;
var packets = [];

var packetSequence = {};

$('#prevBtn').on('click', function(){
    currentPacketIndex--;

    if (currentPacketIndex == -1){
        currentPacketIndex = 0;
    }
})

$('#nextBtn').on('click', function(){
    currentPacketIndex++;
})



var byteTypeHex = true;
function toggleHexDec(typeHex){
    if (!binaryOnly) byteTypeHex = !byteTypeHex;

    if (typeHex != undefined) byteTypeHex = typeHex

    $('.hex').hide()
    $('.dec').hide()

    if (byteTypeHex == true) $('.hex').show()
    else
    if (byteTypeHex == false) $('.dec').show()

    binaryOnly = false;
}



var binaryOnly = false;
function toggleBinaryOnly(){
    binaryOnly = !binaryOnly;

    if (!binaryOnly){
        toggleHexDec(byteTypeHex)
        return;
    }

    $('.hex').hide()
    $('.dec').hide()
}
$('#toggleBinaryOnly').click(toggleBinaryOnly)


var keepFirstOccurances = false;
function toggleFirstOccurances(){
    console.log('TOGGLING FIRST OCCURANCES')
    keepFirstOccurances = !keepFirstOccurances;
    for (var i = 0; i < packets.length; i++)
        if (packets[i].sameAsPrevious)
            if (keepFirstOccurances)
                packets[i].jq_el.hide()
            else
                packets[i].jq_el.show()
        
}
$('#filterFirstOccurances').click(toggleFirstOccurances)




var runSequenceBtn = $('#sequenceAction');
runSequenceBtn.button = $('#sequenceActionBtn');
runSequenceBtn.icon = $('#sequenceActionIcon');
runSequenceBtn.label = $('#sequenceActionLabel');
runSequenceBtn.label.text = function(text){
    this.html('');
    if (text == 'indeterminate'){
        this.append('<div class="ui tiny active indeterminate loader"></div>');
    } else if (text == 'loading'){
        this.append('<div class="ui tiny active loader"></div>');
    } else {
        this.html(text);
    }
};

runSequenceBtn.clear = function(){
    this.button.removeClass('red')
    this.button.removeClass('blue')

    this.icon.removeClass('play')
    this.icon.removeClass('pause')

    this.label.removeClass('red')
    this.label.removeClass('blue')
}

runSequenceBtn.color = function(color){
    this.clear()
    this.button.addClass(color)
    this.label.addClass(color)
}

runSequenceBtn.state = function(state){
    
    if (state == 'running'){
        this.color('red')
        this.icon.addClass('pause')        
    } else if (state == 'stopped'){
        this.color('blue')
        this.icon.addClass('play')
    } else  {
        if (this.button.hasClass('blue'))
            return 'stopped';
        else
            return 'running';
    }
}

$('#sequenceAction').on('click', function(){
    if (runSequenceBtn.state() == 'running'){
        stopSequence()
    } else {
        runSequence();
    }
})


function stopSequence(){
    runSequenceBtn.label.text('loading')
   
    wscb.send({cmd: 'clearWriteQueue'}, function(response){
        runSequenceBtn.state('stopped')
        runSequenceBtn.label.text(Object.keys(packetSequence).length)
    })
}

function runSequence(){
    runSequenceBtn.state('running')

    runSequenceBtn.label.text(1 + '/' + Object.keys(packetSequence).length)

    for (var i = 0; i < Object.keys(packetSequence).length; i++){
        var key = Object.keys(packetSequence)[i];
        $(packetSequence[key].jq_el).addClass('grey_bg');

        sendPacket(packetSequence[key])
    }

    setTimeout(function(){
        for (var i = 0; i < Object.keys(packetSequence).length; i++){
        var key = Object.keys(packetSequence)[i];
        $(packetSequence[key].jq_el).removeClass('grey_bg');
    }
    }, 5000)
}

function clearSequence(){
    for (var i = Object.keys(packetSequence).length - 1; i > -1; i--){
        var key = Object.keys(packetSequence)[i];

        var packetIdx = packetSequence[key].idx;

        $('#packetSequenceOrder-' + packetIdx + '-write').hide()
        $('#packetSequenceOrder-' + packetIdx + '-write').removeClass('sequence')

        $('#packetSequenceOrder-' + packetIdx + '-read').hide()
        $('#packetSequenceOrder-' + packetIdx + '-read').removeClass('sequence')

        delete packetSequence[key];
    }

    $('#runSequenceBtn').addClass('disabled')
    runSequenceBtn.label.text('-')
}

function selectAllSequence(){
    for (var i = 0; i < packets.length; i++){
        if (keepFirstOccurances && packets[i].sameAsPrevious) continue;
        packetSequence[i] = packets[i];

        $('#packetSequenceOrder-' + i + '-write').show()
        $('#packetSequenceOrder-' + i + '-write').addClass('sequence')

        if (packets[i].response != undefined){
            $('#packetSequenceOrder-' + i + '-read').show()
            $('#packetSequenceOrder-' + i + '-read').addClass('sequence')
            packets[i].expectRead = true;
        }
        
        
    }

    $('#runSequenceBtn').removeClass('disabled')
    runSequenceBtn.label.text(Object.keys(packetSequence).length)

}

function sendPacket(packet){
    var readResponse = undefined;

    if ($('#packetItem-' + packet.idx + '-read-bytes').html() != '' && packet.expectRead == true){
        readResponse = {
            address: packet.address,
            bytes: $('#packetItem-' + packet.idx + '-read-bytes > .hex').length,
        }
    }

    wscb.send(
        {   
            cmd: 'sendPacket',
            address: packet.address,
            bytes: packet.bytes,
            delay: packet.delay,
            readResponse: readResponse,
            packetIdx: packet.idx
        },

        function(response){
            if (response.bytes != undefined){
                for (let i = 0; i < Object.keys(packetSequence).length; i++){
                    if (packetSequence[Object.keys(packetSequence)[i]].idx == packet.idx){
                        runSequenceBtn.label.text((packet.idx + 1) + '/' + Object.keys(packetSequence).length)
                        break;
                    }
                }

                $('#packetItem-' + packet.idx + '-read-bytes').empty();
                for (let i = 0; i < response.bytes.length; i++) {
                    $('#packetItem-' + packet.idx + '-read-bytes').append(
                        '<a class="ui teal tiny label hex">' + response.bytes[i].toUpperCase()  + '</a>' + 
                        '<a class="ui teal tiny label dec">' + hex2dec(response.bytes[i].toUpperCase())  + '</a>'
                    )
                }

                toggleHexDec(byteTypeHex)
            }
        }
    )
}




function onPacketItemClicked(e){
    var packetIdx = $(this).attr('packet-idx');
    if (e.shiftKey) {
        
    } else {
        sendPacket(packets[packetIdx])
    }
}

function onPacketItemSequenceWriteOrderClicked(e){
    event.stopPropagation();

    var packetIdx = $(this).attr('packet-idx');

    var el = $('#packetSequenceOrder-' + packetIdx + '-write');
    
    el.toggleClass('sequence')
    if (el.hasClass('sequence')){
        packetSequence[packetIdx] = packets[packetIdx];
        //el.html(packetIdx)
        el.show()

        if (packets[packetIdx].response != undefined){
            //$('#packetSequenceOrder-' + packetIdx + '-read').html(packetIdx)
            $('#packetSequenceOrder-' + packetIdx + '-read').show()
            $('#packetSequenceOrder-' + packetIdx + '-read').addClass('sequence')
            packets[packetIdx].expectRead = true;
        }
    } else {
        delete packetSequence[$(packets[packetIdx].jq_el).attr('packet-idx')];
        //$('#packetSequenceOrder-' + packetIdx + '-write').html('-1')
        el.hide()

        $('#packetSequenceOrder-' + packetIdx + '-read').hide()
        packets[packetIdx].expectRead = false;
        $('#packetSequenceOrder-' + packetIdx + '-read').removeClass('sequence')
    }

    $('#runSequenceBtn').addClass('disabled')
    if (Object.keys(packetSequence).length > 0)
        $('#runSequenceBtn').removeClass('disabled')
    
    runSequenceBtn.label.text(Object.keys(packetSequence).length)
}

function onPacketItemSequenceReadOrderClicked(e){
    event.stopPropagation();

    var packetIdx = $(this).attr('packet-idx');

    var el = $('#packetSequenceOrder-' + packetIdx + '-read')
    
    el.toggleClass('sequence')
    if (el.hasClass('sequence')){
        packetSequence[packetIdx] = packets[packetIdx];
        //el.html(packetIdx)
        el.show()
        packets[packetIdx].expectRead = true;
    } else {
        delete packetSequence[el.attr('packet-idx')];
        //$('#packetSequenceOrder-' + packetIdx + '-read').html('-1')
        el.hide()
        packets[packetIdx].expectRead = false;
    }

    $('#runSequenceBtn').addClass('disabled')
    if (Object.keys(packetSequence).length > 0)
        $('#runSequenceBtn').removeClass('disabled')

        runSequenceBtn.label.text(Object.keys(packetSequence).length)
}



function onPacketItemWriteBytesClicked(){
    event.stopPropagation();

    var packetIdx = $(this).attr('packet-idx');

    var bytes = prompt("Please enter hex values. Separate with comma (,):", packets[packetIdx].bytes);

    if (bytes == null || bytes == "") {
        alert('Invalid hex values, ignoring')
    } else {
        bytes = bytes.split(' ').join('').split(',')

        var writeBytes = '';
        for (var i = 0; i < bytes.length; i++){
            if (bytes[i].length < 2 || bytes[i].length > 2){
                alert('One or more hex values are too short or too long. Hex value example: FF,B0,C3')
                return;
            }

            var bT = generateBitTable(bytes[i]);
            writeBytes +=
                '<div style="float:left; position: relative;">' +
                    '<a class="ui red label tiny hex">' + bytes[i]  + '</a>' + 
                    '<a class="ui red label tiny dec">' + hex2dec(bytes[i]) + '</a>' +
                    bT +    
                '</div>';

         }


        packets[packetIdx].bytes = bytes;
        $('#packetItem-' + packetIdx + '-write-bytes').empty()
        $('#packetItem-' + packetIdx + '-write-bytes').append(writeBytes)
        
    }

    toggleHexDec(byteTypeHex)
}




var wscb = new WebSockets_Callback({
    onOpen: function(){
        console.log('Connected to WS server');
        refreshComPorts();
        refresh_i2c_snapshots();  
    }
});


function compareByteArray(a, b){
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; i++){
        if (a[i] != b[i])
            return false;
    }

    return true;
}

wscb.on('packets', function(msg, respondWith){
    

    packets = msg.packets;
    
    var previousBytes = [];

    $('#packet-table').empty();

    for (var i = 0; i < msg.packets.length; i++){
        var id_start = 'packetItem-' + i;

        packets[i].idx = i;

        var writeBytes = '';
        var readBytes = '';
        
        packets[i].sameAsPrevious = false;
        if (compareByteArray(msg.packets[i].bytes, previousBytes)) packets[i].sameAsPrevious = true;

        previousBytes = msg.packets[i].bytes;

        for (var wb = 0; wb < msg.packets[i].bytes.length; wb++){
            var bT = generateBitTable(msg.packets[i].bytes[wb]);
            var binaryId = id_start + '-write-byte-binary-' + wb;
            writeBytes +=
                '<div style="float:left; position: relative;">' +
                    '<a class="ui red label tiny hex">' + msg.packets[i].bytes[wb]  + '</a>' + 
                    '<a class="ui red label tiny dec">' + hex2dec(msg.packets[i].bytes[wb]) + '</a>' +
                    bT +    
                '</div>';
        }
        
        

        if (msg.packets[i].response != undefined){
            for (var rb = 0; rb < msg.packets[i].response.bytes.length; rb++){
                readBytes += '<a class="ui teal label tiny hex">' + msg.packets[i].response.bytes[rb]  + '</a>' +
                '<a class="ui teal label tiny dec">' + hex2dec(msg.packets[i].response.bytes[rb]) + '</a>' ;
            }
        }


        var sequenceOrder_Write =
            '<td id="' + id_start + '-sequence-order-write" class="packetItem-sequence-order-write write_sequence_bg sequence-width" style="text-align: center;" packet-idx="' + i + '">' +
                    '<i id="packetSequenceOrder-' + i + '-write" class="play red icon"></i>' +
            '</td>'
        ;

        var sequenceOrder_Read =
            '<td id="' + id_start + '-sequence-order-read" class="packetItem-sequence-order-read read_sequence_bg sequence-width" packet-idx="' + i + '">' +
                '<i id="packetSequenceOrder-' + i + '-read" class="play teal icon"></i>' +
            '</td>'
        ;


        
        $('#packet-table').append(
            '<tr id="packetItem_' + i + '" class="packetItem ' + (packets[i].sameAsPrevious ? '' : 'firstOccurance_bg') + '" packet-idx="' + i + '">' +
                sequenceOrder_Write +
                '<td id="' + id_start + '-write-bytes" class="packetItem-write-bytes" packet-idx="' + i + '">' + writeBytes + '</td>' +
                '<td></td>' + // + (readBytes != '' ? '<a class="ui label"> <i class="clock outline icon"></i>' + '30ms' + '</a>': '')  + '</td>' +
                '<td id="' + id_start + '-read-bytes">' + readBytes  + '</td>' +
                '<td>' + (msg.packets[i].delay != undefined ? '<a class="ui tiny label"> <i class="clock outline icon"></i>30ms</a>': '')  + '</td>' +
                sequenceOrder_Read+
            '</tr>'
        )

        $('#packetSequenceOrder-' + i + '-write').hide()
        $('#packetSequenceOrder-' + i + '-read').hide()

        packets[i].jq_el = $('#packetItem_' + i );
    }

    $('.packetItem').click(onPacketItemClicked)
    $('.packetItem-sequence-order-write').click(onPacketItemSequenceWriteOrderClicked)
    $('.packetItem-sequence-order-read').click(onPacketItemSequenceReadOrderClicked)
    $('.packetItem-write-bytes').click(onPacketItemWriteBytesClicked)

    $('.dec').hide()


    respondWith({status: 'ok'})
})



wscb.on('com_data', function(msg, respondWith){
    console.log('[COM]' + msg.data)
    respondWith({status: 'ok'});
})

wscb.on('packetOperation', function(msg, respondWith){
    $('#packetItem-' + msg.idx + '-' + msg.operation + '-bytes').addClass(msg.operation + '_bg');
    
    if (msg.operation == 'read')
        $('#packetItem-' + msg.idx + '-read-bytes').empty()

    $('#packetItem_' + msg.idx).addClass('orange_bg');


    setTimeout(function(){
        $('#packetItem-' + msg.idx + '-' + msg.operation + '-bytes').removeClass(msg.operation + '_bg');
        $('#packetItem_' + msg.idx).removeClass('orange_bg');
    }, 700)



    respondWith({status: 'ok'});

    var container = $([document.documentElement, document.body]);
    var toElement = $('#packetItem_' + msg.idx);
    

    var elmementTopOnScreen = toElement.offset().top - container.scrollTop();
    var deltaFromBottom = (container.height() - elmementTopOnScreen);

    //if (container.height() - toElement.offset().top + toElement.height() >= 300){
    if (deltaFromBottom <= 300){
        container.animate({
            scrollTop: toElement.offset().top + 300
        }, 300);
    }
})

wscb.on('sequenceCompleted', function(msg, respondWith){
    respondWith({status: 'ok'});
    runSequenceBtn.state('stopped')
    runSequenceBtn.label.text(Object.keys(packetSequence).length)
})

var com = {
    send: function(text){
        wscb.send(
            {cmd: 'serialWrite', text: text},
            function(response){
                console.log('Text sent to serial port!')
            }
        )
    }
}

function hex2dec(hex){
    var num = parseInt(hex, 16);
    if (num > 255) { num = 0 }
    return num;
}

function bitArray(hex){
    var bits = [];
    var base2 = hex2dec(hex).toString(2);

    for (var i = 0; i < 8 - base2.length; i++)
        bits.push(0)

    for (var i = 0; i < 8; i++)
        bits.push(base2[i])

    return bits;
}

function generateBitTable(hex){
    var bA = bitArray(hex);
    var bT = ' <table class="bits">';

    for (var i = 0; i < 8; i++)
        bT += '<tr class="bit ' + (bA[i] == "0" || bA[i] == undefined ? 'zero' : 'one' ) + '"></tr>';

    bT += '</table>';
    return bT;
}