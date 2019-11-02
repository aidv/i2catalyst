


packetSequencer.delay = noUiSlider.create($('.sequenceDelay')[0], {
    range: {
        'min': [0],
        '30%': [70],
        '50%': [300],
        '70%': [700],
        'max': [1000]
    },
    start: [500],
    tooltips: true
});

var comPortListening = false;


var progressModal = {
    start: function(total, filename, onShown){
        $('.progress_ProgressBar').progress('set total', total)
        $('.loadingText').html('Loading ' + filename + '... Please wait, this may take a while.')
        $('.loadingModal').modal({
            blurring: true,
            onVisible: onShown
          }).modal('show')
    },

    stop: function(){
        $('.loadingModal').modal('hide')
        $('.progress_ProgressBar').progress('reset')
    },

    progress: function(value){
        $('.progress_ProgressBar').progress('set progress', value)
    }
}

var scrollByteTrigger = {
    current: 0,
    threshold: 3500,
}

var captureTagInput = undefined;


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





$('.ui.dropdown').dropdown({});



$('.comPort_MenuItem').click(refreshComPorts)
$('.snapshots_MenuItem').click(refresh_i2c_snapshots)

function onComPortItemClick(){
    wscb.send({cmd: 'start_com_port', port: $(this).attr('data-value')},
        function(response){
            if (response.status == 'listening'){
                console.log('[SUCCESS] COM port listening!');
                setComPortStatus('connected')
                $('#disconnectComPort').removeClass('disabled')
            } else {
                console.log('[ERROR] COM port error: ' + response.error);
                setComPortStatus('disconnected')
                $('#disconnectComPort').addClass('disabled')
            }
        }
    )
}

var currentSnapshotName = ''
function onSnapshotItemClick(){
    var filename = $(this).attr('data-value');
    currentSnapshotName = filename

    $('.snapshotsTitle').html('Snapshot: ' + filename)

    clearSequence();
    
    progressModal.start(0, filename, function(){

        wscb.send({cmd: 'load_snapshot', snapshot: filename},
        function(response){
            if (response.status == 'loading'){
                
            }
            else if (response.status == 'ok'){
                console.log('[SUCCESS] Snapshot!');
            } else {
                console.log('[ERROR] Snapshot could not be loaded');
                progressModal.stop()
            }
        }
    )
    })

    
}

function setComPortStatus(status){
    comPortListening = false
    $('#port_status_icon').removeClass('check green');
    $('#port_status_icon').removeClass('times red');

    if (status == 'connected'){
        $('#port_status_icon').addClass('check green');
        comPortListening = true
        return;
    }

    $('#port_status_icon').addClass('times red');
}

function refreshComPorts(){
    $('#comPortList').empty();
    $('#comPortList').append(`<div class="item" style="margin-top: 1rem; margin-bottom: 1rem;">
        <div class="ui tiny active loader"></div>
    </div>`);

    wscb.send({cmd: 'list_com_ports'},
        function(response){
            $('#comPortList').empty();
            
            $('#comPortList').append('<div class="header">Remote I2C Host</div>')
            $('#comPortList').append('<div id="connectToRemoteI2CHost" class="item">Connect to...</div>')

            $('#connectToRemoteI2CHost').click(() => {
                $('.remote_i2c_host_modal').modal({
                    blurring: true,
                    
                    //onVisible: onShown
                    onDeny    : function(){
                        $('.remote_i2c_host_modal').modal('hide');
                        return false;
                    },
                    onApprove : function() {
                        var opt = {
                            cmd: 'connectToRemoteI2CHost',
                            address:  $('#connectToRemoteI2CHost_address').val(),
                            port: $('#connectToRemoteI2CHost_port').val()
                        }

                        wscb.send(opt,
                            (response) => {
                                console.log(response)
                                if (response.status == 'ok'){
                                    $('.remote_i2c_host_modal').modal('hide');
                                    setComPortStatus('connected')
                                } else {
                                    alert('Could not connect to remote I2C host. Error code: ' + response.message)
                                    setComPortStatus('disconnected')
                                }
                            }
                        )
                        return false;
                    }
                  }).modal('setting', 'transition', 'fade up').modal('show')
            })

            $('#comPortList').append('<div class="divider"></div>')
            $('#comPortList').append('<div class="header">COM Ports</div>')


            for (var i = 0; i < response.ports.length; i++)
                $('#comPortList').append('<div class="item comPortItem" data-value="' + response.ports[i].comName + '">' + response.ports[i].comName + '</div>');        
        
            /*$('#comPortListItems').on('change', function(){
                console.log('COM port selected: ' + this.value);
            })*/

            $('.comPortItem').click(onComPortItemClick)



            $('#comPortList').append('<div class="divider"></div>')
            $('#comPortList').append('<div class="header">Fake I2C Bridge</div>')
            $('#comPortList').append('<div id="connectFakeBridge" class="item">Connect fake I2C Bridge</div>');
            $('#connectFakeBridge').click(function(){
                wscb.send({cmd: 'connectToFakeI2CBridge'},
                    (response) => {
                        if (response.status == 'ok'){
                            setComPortStatus('connected')
                        } else {
                            alert('Could not connect to Fake I2C bridge. Error code: ' + response.message)
                            setComPortStatus('disconnected')
                        }
                    }
                )
            })


            $('#comPortList').append('<div class="divider"></div>')
            $('#comPortList').append('<div id="disconnectComPort" class="item ' + (comPortListening ? '' : 'disabled') + '">Disconnect</div>')

            $('#disconnectComPort').click(function(){
                wscb.send({cmd: 'disconnectComPort'},
                    (response) => {
                        setComPortStatus('disconnected')
                        $('#disconnectComPort').addClass('disabled')
                    }
                )
            })
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
    if (captureTagInput != undefined){
        if (e.which == 27 || e.which == 13){
            var newText = captureTagInput.input.find('input').val();

            captureTagInput.text.html((e.which == 27 ? captureTagInput.lastText : newText))
            captureTagInput.text.show()

            captureTagInput.input.hide()

            var TagInput = captureTagInput.text.html().toLowerCase();
            if (TagInput == ''){
                captureTagInput.label.hide();
                if (captureTagInput.lastText.toLowerCase() == 'loop start') packetSequencer.loop.start = undefined;
                if (captureTagInput.lastText.toLowerCase() == 'loop end') packetSequencer.loop.end = undefined;
                
            }

            captureTagInput.label.removeClass('black');
            
            if (TagInput.indexOf('loop start') > -1 || TagInput.indexOf('loop end') > -1){ captureTagInput.label.addClass('blue'); } else { captureTagInput.label.addClass('black'); }

            var packet = captureTagInput.label[0].tagObj.packet;
            var packet_idx = (packet.respondsTo ? packet.respondsTo + 1 : packet.idx)
            packet = packets[packet_idx]
            var row = packet.row;
            var side = (packet.respondsTo ? row.readSide : row.writeSide);
            var tag = side.tag
            
            if (TagInput.indexOf('loop start') > -1){
                //if (packetSequencer.loop.start != packet_idx) tag.text.html(packetSequencer.loop.start.tag.text.html().replace('loop start', '').trim())
                packetSequencer.loop.start = row.idx
            }

            if (TagInput.indexOf('loop end') > -1){
                //if (packetSequencer.loop.end != packet_idx) tag.text.html(packetSequencer.loop.end.tag.text.html().replace('loop end', '').trim())
                packetSequencer.loop.end = row.idx
            }

            packetSequencer.loop.refresh();

            console.log(packetSequencer.loop)


            captureTagInput = undefined;
        }
        return;
    }

    switch(e.which) {
        case 68:
            packetTable.toggleValueRepresentation();
            $('#toggleHexDec').checkbox((packetTable.globals.valueRepresentation == 'hex' ? 'uncheck' : 'check'));
        break;

        case 88: clearSequence(); break;
        case 65: selectAllSequence(); break;
        case 82: packetSequencer.run(); break;
        case 27: packetSequencer.stop(); break;

        case 70: packetTable.toggleFirstOccurances(); break;
        case 66: packetTable.toggleBinaryOnly(); break;
        case 84: packetTable.toggleTags(); break;

        default: console.log(e.which)
    }
})

$('#toggleBinaryOnly').click(function(){packetTable.toggleBinaryOnly()})
$('#filterFirstOccurances').click(function(){packetTable.toggleFirstOccurances()})
$('#toggleTags').click(function(){packetTable.toggleTags()})
$('#toggleHexDec').checkbox({
    onChecked: function(){ packetTable.setValueRepresentation('dec'); },
    onUnchecked: function(){ packetTable.setValueRepresentation('hex'); }
})

var packets = [];

function scrollByte(e){
    var delta = e.originalEvent.wheelDelta;

    if (e.shiftKey){
        e.preventDefault()

        scrollByteTrigger.current += delta*2;
        if ((scrollByteTrigger.current < 0 && scrollByteTrigger.current > 0 - scrollByteTrigger.threshold) || (scrollByteTrigger.current > 0 && scrollByteTrigger.current < scrollByteTrigger.threshold)){
            return;
        }
        scrollByteTrigger.current = 0;

        var byte = this.byteObj
        var packetIdx = this.byteObj.packet.idx
        var packet = this.byteObj.packet
    

        var dec;
        if (this.byteObj.label.hasClass('packetByte')){
            var byteIdx = byte.byteIdx
            var hex = packet.bytes[byteIdx]

            dec = hex2dec(hex) + (delta < 0 ? 1 : -1);

            if (dec < 0) dec = 255;
            if (dec > 255) dec = 0;
            
            hex = dec2hex(dec);
            if (hex.length == 1) hex = "0" + hex;
            packet.bytes[byteIdx] = hex;

            var opt = {refreshOccurances: false, opt: {}}
            
            if (packetTable.rows[byte.row.idx + 1].writeSide){
                if (packetTable.rows[byte.row.idx + 1].writeSide.data.sameAsPrevious){
                    opt.refreshOccurances = true
                    opt.opt.from = byte.row.idx
                    opt.opt.to = opt.opt.from + 2
                } else {
                    if (packetTable.rows[byte.row.idx + 1].writeSide.differencesFromPrevious().bytes){
                        opt.refreshOccurances = true
                        opt.opt.from = byte.row.idx
                        opt.opt.to = opt.opt.from + 2
                    }
                }
            }    
            

            byte.dataObj.setNewValues(packet.bytes, opt)
        } else if (this.byteObj.label.hasClass('packetAddress')) {
            var addr = parseInt(hex2dec(packet.address)) + (delta < 0 ? 1 : -1)
            
            if (addr < 0) addr = 128;
            if (addr > 128) addr = 0;

            packet.address = dec2hex(addr);

            console.log(packet.address)

            var opt = {refreshOccurances: false, opt: {}}
            
            if (packetTable.rows[byte.row.idx + 1].writeSide){
                if (packetTable.rows[byte.row.idx + 1].writeSide.address.sameAsPrevious){
                    opt.refreshOccurances = true
                    opt.opt.from = byte.row.idx;
                    opt.opt.to = opt.opt.from + 2
                } else {
                    if (packetTable.rows[byte.row.idx + 1].writeSide.differencesFromPrevious().address){
                        opt.refreshOccurances = true
                        opt.opt.from = byte.row.idx
                        opt.opt.to = opt.opt.from + 2
                    }
                }
            }

            byte.setValue(addr, opt)
        }
    }
}







/**********************/

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

runSequenceBtn.enabled = function(enabled){
    this.button.removeClass('disabled')
    if (!enabled) this.button.addClass('disabled')
}

$('#sequenceAction').on('click', function(){
    if (runSequenceBtn.button.hasClass('disabled')) return;
    if (runSequenceBtn.state() == 'running') packetSequencer.stop(); else packetSequencer.run();
})

runSequenceBtn.enabled(false)


/**********************/


function clearSequence(){
    for (var i = 0; i < packets.length; i++){
        if (packetTable.globals.firstOccurancesOnly && packets[i].row.writeSide.data.sameAsPrevious) continue;

        var side = (packets[i].operation == 'write' ? packets[i].row.writeSide : packets[i].row.readSide)
        side.sequence.activate(false)
    }

    runSequenceBtn.enabled(false)
}

function selectAllSequence(){
    for (var i = 0; i < packets.length; i++){
        if (packetTable.globals.firstOccurancesOnly && packets[i].row.writeSide.data.sameAsPrevious) continue;

        var side = (packets[i].operation == 'write' ? packets[i].row.writeSide : packets[i].row.readSide)
        side.sequence.activate()
    }

    runSequenceBtn.enabled(true)
}



function onWriteByteClicked(){
    event.stopPropagation();

    var byte = this.byteObj;

    var newBytes = prompt("Please enter hex values. Separate with comma (,):", byte.packet.bytes);

    if (newBytes == null || newBytes == "") {
        alert('Invalid hex values, ignoring')
    } else {
        newBytes = newBytes.split(' ').join('').split(',')
        
        for (var i = 0; i < newBytes.length; i++){
            var isHex_ = isHex(newBytes[i])
            if (newBytes[i].length < 2 || newBytes[i].length > 2 || !isHex_){
                alert('One or more hex values are too short or too long, or not a valid HEX value. HEX value example: FF,B0,C3')
                return;
            }
        }

        this.byteObj.dataObj.setNewValues(newBytes)
    }

    packetTable.refreshOccurances();
}




var wscb = new WebSockets_Callback({
    onOpen: function(){
        console.log('Connected to WS server');
        refreshComPorts();
        refresh_i2c_snapshots();  
    }
});





function tagOnMouseEnter(){
    if (captureTagInput == undefined && $(this).find( ".labelText" ).html() == '')
        $(this).find( ".icon" ).show();
}

function tagOnMouseLeave(){
    $(this).find( ".icon" ).hide();    
}

function tagOnMouseClick(e){
    e.stopPropagation();

    var tag = $(this)[0].tagObj;

    if (captureTagInput != undefined) return;

    tag.text.hide()
    captureTagInput = {
        lastText : tag.text.html(),
        label    : tag.label,
        text     : tag.text,
        input    : tag.input
    }

    tag.icon.hide()
    tag.input.find('input').val(captureTagInput.lastText)
    tag.input.focus();

    captureTagInput.input.show()
    
    tag.label.show()
}




function sequenceOnMouseEnter(){
    $(this)[0].seqObj.icon.show();
}

function sequenceOnMouseLeave(){
    if (!$(this)[0].seqObj.active)
        $(this)[0].seqObj.icon.hide();
}

function sequenceOnMouseClick(e){
    e.stopPropagation();

    var seqObj = this.seqObj;

    seqObj.activate(!seqObj.active)
}


/**  **/

wscb.on('packets', function(msg, respondWith){
    progressModal.stop()
    packets = msg.packets;
    packetTable.clear()

    for (var i = 0; i < msg.packets.length; i++){
        var packet = packets[i];
        packet.idx = i;

        var row;
        if (packet.respondsTo)
            row = packets[packet.respondsTo].row
        else
            row = packetTable.addRow(packet, (i > 0 ? packetTable.rows[i - 1] : undefined));
        
        packet.row = row;

        /*if (i == 50){
            console.log("BREAK TEST");
            break;
        }*/


    }

    //xivmap()

    respondWith({status: 'ok'})
})



/**  COM  **/

wscb.on('com_data', function(msg, respondWith){
    console.log('[COM]' + msg.data)
    respondWith({status: 'ok'});
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
