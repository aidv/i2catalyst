var packetSequencer = {
    status: 'stopped',
    delay: {},

    packets: {
        packets: [],

        add: function(packet){
            var idx = (packet.respondsTo ? 'r' + packet.respondsTo : packet.idx)

            var command = {
                operation: packet.operation,
                p_idx: idx,
                address: packet.address,
                bytes: packet.bytes,
            }
            

            if (command.operation == 'read'){
                command.bytes = packet.bytes.length
                if (packet.respondsTo) command.response = true
            }

            packetSequencer.packets.packets.push(command)
            packetSequencer.UI.refresh()

            runSequenceBtn.enabled(true)

            runSequenceBtn.label.text(packetSequencer.packets.packets.length)
        },

        remove: function(idx){
            if (idx < 0 || idx >= packetSequencer.packets.packets.length) return false;
            packetSequencer.packets.packets.splice(idx, 1)
            packetSequencer.UI.refresh()

            if (packetSequencer.packets.packets.length == 0) runSequenceBtn.enabled(false)
            
            runSequenceBtn.label.text(packetSequencer.packets.packets.length)

            return true;
        },
        
        removeFirst: function(){
            packetSequencer.packets.remove(0)
        },

        count: function(){ return packetSequencer.packets.packets.length },

        indexOf: function(p_idx){
            for (var i = 0; i < packetSequencer.packets.packets.length; i++)
                if (packetSequencer.packets.packets[i].p_idx == p_idx)
                    return i;
            
            return -1;
        },

        sequence: []
    },

    run: function(){
        if (packetSequencer.packets.packets.length == 0 || packetSequencer.status == 'running' || !comPortListening) return

        for (var i = 0; i < packetSequencer.packets.packets.length; i++)
            packetSequencer.packets.sequence.push(packetSequencer.packets.packets[i])

        runSequenceBtn.state('running')
        runSequenceBtn.label.text(1 + '/' +packetSequencer.packets.sequence.length)

        for (var i = 0; i < packetSequencer.packets.sequence.length; i++){
            var seqCmd = packetSequencer.packets.sequence[i];
            var p_idx = seqCmd.p_idx;
            try {p_idx = parseInt(p_idx.replace('r', ''))} catch {}
            packets[p_idx].row.addClass('grey_bg');
        }

        setTimeout(function(){
            for (var i = 0; i < packetSequencer.packets.sequence.length; i++){
                var seqCmd = packetSequencer.packets.sequence[i];
                var p_idx = seqCmd.p_idx;
                try {p_idx = parseInt(p_idx.replace('r', ''))} catch {}
                packets[p_idx].row.removeClass('grey_bg');                 
            }
        }, 1000)

        packetSequencer.status = 'running'
        packetSequencer.sendNext()
    },

    stop: function(){
        packetSequencer.status = 'stopped'
        packetSequencer.packets.sequence = []
        runSequenceBtn.state('stopped')
        runSequenceBtn.label.text(packetSequencer.packets.count())
    },


    clear: function(){
        packetSequencer.stop()
        packetSequencer.packets.packets = []
        packetSequencer.packets.sequence = []
    },




    sendNext: function(){
        if (packetSequencer.packets.sequence.length == 0 || packetSequencer.status == 'stopped'){
            packetSequencer.stop()
            return
        }
        packetSequencer.sendOperation(packetSequencer.packets.sequence[0])
    },


    sendOperation: () => {
        var operation = packetSequencer.packets.sequence[0].operation
        var p_idx     = packetSequencer.packets.sequence[0].p_idx
        try {p_idx = parseInt(p_idx.replace('r', ''))} catch {}

        var row       = packets[p_idx].row
        var side      = (operation == 'write' ? row.writeSide : row.readSide)

        if (operation == 'read') side.data.container.empty()
        side.data.container.addClass('orange_bg');


        /**  scroll to current element  **/
        var container = $([document.documentElement, document.body]);
        var toElement = row;
        

        var elmementTopOnScreen = toElement.offset().top - container.scrollTop();
        var deltaFromBottom = (container.height() - elmementTopOnScreen);

        container.stop()
        if (deltaFromBottom <= 300){
            
            container.animate({
                scrollTop: toElement.offset().top + 300
            }, 300);
        }

        

        var data = {cmd: 'operation', operation: packetSequencer.packets.sequence[0]}
        wscb.send(data, function(response){
            function proceed(){
                if (response.operation == 'read' && response.bytes && response.bytes.length > 0) side.data.setNewValues(response.bytes)

                side.data.container.removeClass(response.operation + '_bg');
                side.data.container.removeClass('orange_bg');
                packetSequencer.packets.sequence.splice(0, 1)
                packetSequencer.sendNext()

                if (packetSequencer.packets.sequence.length == 0){
                    runSequenceBtn.state('stopped')
                    runSequenceBtn.label.text(packetSequencer.packets.count())
                }
            }

            if (parseInt(packetSequencer.delay.get(), 10) == 0)
                proceed()
            else
                setTimeout(proceed, parseInt(packetSequencer.delay.get(), 10))
        })
    },









    /***  UI  ***/
    UI: {
        refresh: function(){
            runSequenceBtn.label.text(packetSequencer.packets.count())
        },


    }
}