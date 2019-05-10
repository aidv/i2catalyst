var packetTable = {
    container: $('#packet-table'),
    rows: [],

    

    globals: {
        valueRepresentation: 'hex',
        firstOccurancesOnly: false,
        binaryOnly: false,
        tagsVisible: true,
    },
    
    clear: function(){
        this.container.empty();
        this.rows = [];
    },

    addRow: function(packet, previousRow){
        var row = $('<tr></tr>').appendTo(this.container)
        row.previousRow = previousRow;
        row.packet = packet;
        row.idx = this.rows.length;

        row.writeSide = {
            idx      : this.rows.length,
            row      : row,
            side     : 'write',
            packet   : (packet.operation == 'write' ? packet : undefined),

            tag      : {container: $('<td class="packetTagContainer"></td>').appendTo(row)},
            sequence : {container: $('<td></td>').appendTo(row)},
            address  : {container: $('<td class="textCenter"></td>').appendTo(row)},
            data     : {container: $('<td class="packetData"></td>').appendTo(row)},

            differencesFromPrevious: function(){
                var res = {}

                if (this.row.writeSide.packet && this.row.previousRow.writeSide.packet){
                    if (this.row.writeSide.packet.address == row.previousRow.writeSide.packet.address)
                        res.address = 'same';

                    var bytes = this.row.writeSide.packet.bytes;
                    var previousBytes = row.previousRow.writeSide.packet.bytes;
                    if (compareByteArray(bytes, previousBytes))
                        res.bytes = 'same';
                }

                if (Object.keys(res).length > 0) res.different = true;

                return res;
            },

            adaptToPrevious: function(){
                if (!this.packet) return;

                var differences = {different: false}
                if (this.row.previousRow)
                    differences = this.row.writeSide.differencesFromPrevious()
                
                this.row.writeSide.address.sameAsPrevious = false;
                this.row.writeSide.address.container.empty()
                packetTable.newElement.newAddress  (row.writeSide)

                this.row.writeSide.data.sameAsPrevious = false;
                this.row.writeSide.data.container.empty()
                packetTable.newElement.newData(this, {allowEditing: true})

                if (differences.address){
                    this.row.writeSide.address.sameAsPrevious = true;
                    this.row.writeSide.address.container.empty()
                    this.row.writeSide.address.container.append('<a class="ui red empty circular label packetAddress doubleOccurance"></a>')
                }
                
                if (differences.bytes){
                    row.writeSide.data.container.addClass('textCenter')
                    
                    this.row.writeSide.data.sameAsPrevious = true;
                    this.row.writeSide.data.container.empty()

                    if (row.writeSide.data.bytes.length > 0){
                        this.row.writeSide.data.container.append('<a class="ui red empty circular label doubleOccurance"></a>')

                    }

                    this.row.writeSide.data.container[0].byteObj = {packet: this.packet, dataObj: this.data}
                }

                if (differences.different == false)
                    this.data.container.removeClass('packetData')
            }
        };

        if (packet.operation == 'write'){        
            packetTable.newElement.newTag      (row.writeSide)
            row.writeSide.tag.container.addClass('textRight')
            packetTable.newElement.newSequence (row.writeSide)
            
            row.writeSide.adaptToPrevious()
        }
        


        row.readSide = {
            idx      : this.rows.length,
            row      : row,
            side     : 'read',
            packet   : (packet.response ? packet.response : (packet.operation == 'read' && !packet.respondsTo ? packet : undefined)),
            
            data     : {container: $('<td></td>').appendTo(row)},
            address  : {container: $('<td class="textCenter"></td>').appendTo(row)},
            sequence : {container: $('<td></td>').appendTo(row)},
            tag      : {container: $('<td class="packetTagContainer"></td>').appendTo(row)},

            differencesFromPrevious: function(){
                var res = {}

                if (this.row.readSide.packet && this.row.previousRow.readSide.packet){
                    if (this.row.readSide.packet.address == row.previousRow.readSide.packet.address)
                        res.address = 'same';

                    var bytes = this.row.readSide.packet.bytes;
                    var previousBytes = row.previousRow.readSide.packet.bytes;
                    if (compareByteArray(bytes, previousBytes))
                        res.bytes = 'same';
                }

                return res;
            }
        };

        if (row.readSide.packet){
            packetTable.newElement.newTag      (row.readSide)
            packetTable.newElement.newSequence (row.readSide)
            packetTable.newElement.newAddress  (row.readSide)
            packetTable.newElement.newData     (row.readSide)

            if (row.previousRow){
                var differences = row.readSide.differencesFromPrevious()

                if (differences.address){
                    row.readSide.address.sameAsPrevious = true;
                    row.readSide.address.container.empty()
                    row.readSide.address.container.append('<a class="ui teal empty circular label doubleOccurance address"></a>')
                }

                if (differences.bytes){
                    row.readSide.data.container.addClass('textCenter')

                    row.readSide.data.sameAsPrevious = true;
                    row.readSide.data.container.empty()

                    if (row.readSide.data.bytes.length > 0)
                        row.readSide.data.container.append('<a class="ui teal empty circular label packetAddress doubleOccurance"></a>')    
                }
            }

            
        }
       
        $('.packetData').unbind().click(onWriteByteClicked);

        if (packetTable.globals.binaryOnly) $('.hex, .doubleOccurance').hide()
            
        this.rows.push(row)

        return row;
    },

    setValueRepresentation: function(representation){
        this.globals.valueRepresentation = representation

        for (var i = 0; i < this.rows.length; i++){
            var row = this.rows[i];

            var newRepresentation = row.packet.address;
            if (representation == 'dec')
                newRepresentation = hex2dec(row.packet.address)

            
            if (row.writeSide.address.updateValueRepresentation) row.writeSide.address.updateValueRepresentation()
            if (row.readSide.address.updateValueRepresentation) row.readSide.address.updateValueRepresentation()

            if (row.writeSide.data.updateValueRepresentation) row.writeSide.data.updateValueRepresentation()
            if (row.readSide.data.updateValueRepresentation) row.readSide.data.updateValueRepresentation()
        }
    },

    toggleValueRepresentation: function(){
        if (this.globals.valueRepresentation == 'hex')
            this.globals.valueRepresentation ='dec'
        else if (this.globals.valueRepresentation == 'dec')
            this.globals.valueRepresentation = 'hex'

        this.setValueRepresentation(this.globals.valueRepresentation)
    },

    hideDoubleOccurances: function(show){
        for (var i = 0; i < this.rows.length; i++){
            var row = this.rows[i];
            var sameAsPrevious = false;
            if (!row.writeSide) continue;
    
            if (row.writeSide.data.sameAsPrevious == true)
                sameAsPrevious = true;
            
            if (!show)
                $(row[0]).show()
            else
                if (sameAsPrevious)
                    $(row[0]).hide()
        }
    },

    toggleFirstOccurances: function(){
        this.globals.firstOccurancesOnly = !this.globals.firstOccurancesOnly;
        this.hideDoubleOccurances(this.globals.firstOccurancesOnly)
    },

    showBinaryOnly: function(show){
        if (!show){
            $('.hex, .doubleOccurance').hide()
            $('.bits').addClass('only')
        } else {
            $('.hex, .doubleOccurance').show()
            $('.bits').removeClass('only')
        }
    },

    toggleBinaryOnly: function(){
        this.globals.binaryOnly = !this.globals.binaryOnly;
        this.showBinaryOnly(!this.globals.binaryOnly)
    },



    tagsVisible: function(visible){
        if (visible)
            $('.packetTagContainer').show()
        else
            $('.packetTagContainer').hide()
    },

    toggleTags: function(){
        this.globals.tagsVisible = !this.globals.tagsVisible;
        this.tagsVisible(this.globals.tagsVisible)
    },

    selectRows: function(side, from, to){
        if (from <= to){
            //e.g 1 to 10
        } else {
            //e.g 10 to 1
        }
    },

    refreshOccurances: function(opt = {from: 0, to: this.rows.length}){       
        for (var i = opt.from; i < opt.to; i++){
            var row = this.rows[i];
            if (!row.writeSide) continue;

            row.writeSide.adaptToPrevious()
        }

        if (packetTable.globals.binaryOnly)
            $('.hex, .doubleOccurance').hide()

        $('.packetData').unbind().click(onWriteByteClicked);
    },

    
    newElement: {

        /** Containers **/
        newTag: function(side){
            var class_ = (this.side == 'write' ? 'packetWriteTag' : 'packetReadTag')
            side.tag = {
                ...side.tag,
                ...{
                    container: side.tag.container,
                    icon  : $('<i class="tag inverted icon packetTag packetTagIcon"></i>').appendTo(side.tag.container),
                    label : $('<a class="ui black ' + (side.side == 'write' ? 'right' : 'left') + ' pointing label packetTag ' + class_ + '">').appendTo(side.tag.container),
                                        
                }
            }

            side.tag.input = $('<div class="ui transparent inverted input"><input type="text" placeholder="Tag..." tabindex="0"></div>').appendTo(side.tag.label)
            side.tag.text = $('<span class="labelText"></span>').appendTo(side.tag.label)

            side.tag.container[0].tagObj = side.tag;

            side.tag.icon.hide()
            side.tag.label.hide()
            
            

            side.tag.container.mouseenter(tagOnMouseEnter).mouseleave(tagOnMouseLeave).click(tagOnMouseClick);
        },

        newSequence: function(side){
            side.sequence.container.addClass('sequence-' + side.side + ' '+ side.side + '_sequence_bg sequence-width')
            side.sequence.icon = $('<i class="play ' + (side.side == 'write' ? 'red' : 'teal') + ' icon"></i>').appendTo(side.sequence.container)
            side.sequence.icon.hide();

            side.sequence.container[0].seqObj           = side.sequence;
            side.sequence.container[0].seqObj.packet    = (side.packet);
            side.sequence.container[0].seqObj.operation = side.side;
            side.sequence.container[0].seqObj.row       = side.row;
            side.sequence.container[0].seqObj.active    = false;

            side.sequence.container.mouseenter(sequenceOnMouseEnter).mouseleave(sequenceOnMouseLeave).click(sequenceOnMouseClick);

            side.sequence.activate = function(activate = true){
                this.active = activate

                var idx = (this.packet.respondsTo ? 'r' + this.packet.respondsTo : this.packet.idx)
                
                if (packetSequencer.packets.indexOf(idx) > -1 && this.active) return;

                if (!this.active){
                    this.icon.hide()
                    packetSequencer.packets.remove(packetSequencer.packets.indexOf(idx))
                } else {
                    this.icon.show()
                    packetSequencer.packets.add(this.packet)
                }
            }
        },

        newAddress: function(side){
            side.address.side = side.side;

            side.address.row = side.row;
            side.address.packet = side.packet;
            side.address.source = side.packet.address;

            this.newByte(side.address, {class: 'packetAddress'})

            side.address.style('circular')
        },

        newData: function(side, opt){
            side.data.container.empty()

            side.data.bytes = [];

            for (var i = 0; i < side.packet.bytes.length; i++){
                side.data.bytes.push({container: $('<div style="float:left; position: relative;"></div>').appendTo(side.data.container)})
                
                var byte = side.data.bytes[side.data.bytes.length - 1];
                byte.row = side.row;
                byte.side = side.side;
                byte.packet = side.packet;
                byte.source = byte.packet.bytes[i]
                byte.byteIdx = i;
                this.newByte(byte, {class: 'packetByte'})
                
                if (opt && opt.allowEditing) byte.container.click(onWriteByteClicked)

                byte.dataObj = side.data;
            }

            side.data.packet = side.packet;
            side.data.row = side.row;
            side.data.side = side

            side.data.setNewValues = function(bytes, opt = {refreshOccurances: false}){
                var output = {new: bytes, output: bytes}
                if (scripting_OnNewDataValues)
                    scripting_OnNewDataValues(side.packet, output)

                this.packet.bytes = output.output;
                packetTable.newElement.newData(this.side, {allowEditing: true})
                if (opt.refreshOccurances == true) packetTable.refreshOccurances(opt.opt)

                
            }

            side.data.updateValueRepresentation = function(){
                for (var i = 0; i < this.bytes.length; i++)
                    this.bytes[i].updateValueRepresentation()
            }

            side.data.updateValueRepresentation();
        },


        /** Singles **/
        newByte: function(byte, opt = {class: ''}){
            byte.label  = $('<a class="ui ' + (byte.side == 'write' ? 'red' : 'teal') + ' label tiny hex ' + opt.class + ' ' + byte.side + 'Byte" operation="' + byte.side + '"></a>').appendTo(byte.container)
            byte.binary = generateBitTable(byte.source, {owner: byte})

            byte.updateValueRepresentation = function(){
                this.label.html((packetTable.globals.valueRepresentation == 'hex' ? byte.source : hex2dec(byte.source)))

                if (packetTable.globals.binaryOnly){
                    this.label.hide()
                    $('.bits').addClass('only')
                }
            }

            byte.showBinaryOnly = function(binaryOnly){
                this.label.show()
                if (binaryOnly) this.label.hide()
            }

            byte.increase = function(amount){
                this.source++;
                this.showAsType(this.valueType)
            }

            byte.style = function(style){
                this.label.removeClass('circular')
                if (style == 'circular') this.label.addClass('circular')
            }

            byte.setValue = function(dec, opt = {refreshOccurances: false}){
                this.label.html((packetTable.globals.valueRepresentation == 'hex' ? dec2hex(dec) : dec))
                this.binary.setValue(dec)
                this.source = dec2hex(dec);
                if (opt.refreshOccurances == true) packetTable.refreshOccurances(opt.opt)
            }

            byte.container[0].byteObj = byte;

            byte.container.bind('mousewheel', scrollByte);

            byte.setValue(hex2dec(byte.source))
        }
        
    }
}