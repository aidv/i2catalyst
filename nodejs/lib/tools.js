function isHex(h) {
    var h_ = (h == "00" ? "0" : (h[0] == "0" ? h[1] : h))
    var a = parseInt(h_,16);
    var a_ = a.toString(16);
    return (a_ === h_.toLowerCase())
}

function hex2dec(hex){
    var num = parseInt(hex, 16);
    if (num > 255) { num = 0 }
    return num;
}

function dec2hex(dec) {
    var hex = (+dec).toString(16).toUpperCase();
    return (hex.length == 1 ? '0' + hex : hex);
}

function bin2dec(binStr){
    return parseInt((binStr + '')
    .replace(/[^01]/gi, ''), 2);
};

function bitArray(hex){
    var bits = [];
    var base2 = hex2dec(hex).toString(2);

    for (var i = 0; i < 7 - base2.length + 1; i++)
        bits.push("0")

    for (var i = 0; i < base2.length; i++)
        bits.push((base2[i] == undefined ? "0" : base2[i] ))

    return bits;
}

function generateBitTable(hex, opt){
    var bA = bitArray(hex);

    var bitTable = {
        container: $('<table class="bits"></table>').appendTo(opt.owner.container),
        bits: [],
        raw: bA,
        setValue: function(dec){
            var hex = dec2hex(dec)
            var bA = bitArray(hex);
            for (var i = 0; i < 8; i++){
                this.bits[i].removeClass('one')
                this.bits[i].removeClass('zero')
                if (bA[i] == "1") this.bits[i].addClass('one')
            }
        }
    }

    for (var i = 0; i < 8; i++){
        var tr = $('<tr class="bit ' + (bA[i] == "0" ? 'zero' : 'one' ) + '"></tr>').appendTo(bitTable.container);
        tr[0].byteObj = opt.owner;
        tr[0].bitIdx = i;
        tr[0].bitTable = bitTable;

        tr.click(function(e){
            e.stopPropagation()
            var t = $(this);
            
            if (t.hasClass('one')){
                t.removeClass('one')
                t.addClass('zero')
                this.bitTable.raw[this.bitIdx] = "0"
            } else {
                t.removeClass('zero')
                t.addClass('one')
                this.bitTable.raw[this.bitIdx] = "1"
            }

            
            var binStr = this.bitTable.raw.toString().split(',').join('')
            var dec = parseInt(binStr, 2);
            this.byteObj.packet.bytes[this.byteObj.byteIdx] = dec2hex(dec)
            this.byteObj.setValue(dec, {refreshOccurances: true, opt: {from: this.byteObj.row.idx, to: this.byteObj.row.idx + 2}})

        })

        bitTable.bits.push(tr)
    }

    return bitTable;
}

function compareByteArray(a, b){
    if (a.length != b.length) return false;

    for (var i = 0; i < a.length; i++){
        if (a[i] != b[i])
            return false;
    }

    return true;
}