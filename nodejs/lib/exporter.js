sequenceExporter = {
    init: function(){
        $('#exportSequenceBtn').click(function(){
            sequenceExporter.show()
        })

        $('.export_modal').modal({
            onApprove : function() {
                sequenceExporter.resultEditor.getDoc().setValue(sequenceExporter.generate($('.exportSequence_Platform').attr('selected-platform')));
                $('.export_results').modal('show')
            }
        })

        $('.export_results').modal({
            onApprove : function() {
                $('.export_results').modal('hide')
            }
        })

        $('.export_results').modal({
            onApprove : function() {
                $('.export_results').modal('hide')
            }
        })

        $('.export_platform_type').on('click', function(){


            $(".export_platform_type").checkbox("uncheck");
            
            $('.exportSequence_Platform').attr('selected-platform', $(this).attr('value'))
        })
    },

    delays: {
            write: noUiSlider.create($('.exportSequence_WriteDelay')[0], {
            range: {min: [0], max: [1000]},
            start: [50],
            tooltips: true
        }),

        read: noUiSlider.create($('.exportSequence_ReadDelay')[0], {
            range: {min: [0], max: [1000]},
            start: [50],
            tooltips: true
        })
    },

    resultEditor: CodeMirror.fromTextArea(document.getElementById("export_results_editor"), {
        mode: 'javascript',
        lineNumbers: true,
        styleActiveLine: true,
        matchBrackets: true,
        theme: 'dracula',
        indentUnit: 4,
    }),

    show: function(){ $('.export_modal').modal('show') },
    hide: function(){ $('.export_modal').modal('hide') },

    generate: function(platform){

        var exporters = {
            nodejs: function(){
                function fixBytes(bytes){
                    var newBytes = []
                    for (var i = 0; i < bytes.length; i++) newBytes.push('0x' + bytes[i])
                    return newBytes
                }

                var code = '<command_name>(t, onDone){\n    var as_ = new async();\n    as_.series([\n<commands>\n    ], onDone)\n}'

                var tmp = ''
                for (var i = 0; i < packetSequencer.packets.packets.length; i++){
                    var item =  packetSequencer.packets.packets[i]
                    
                    tmp += '        (cb) => { t.<operation>Single(t, <address>, <bytes>, () => cb(as_) , <delay>); },'.replace('<operation>', item.operation)
                    .replace('<address>', hex2dec('0x' + item.address))
                    .replace('<bytes>', (item.operation == 'write' ? '[<bytes>]' : '<bytes>'))
                    .replace('<bytes>', (item.operation == 'write' ? fixBytes(item.bytes) : item.bytes))
                    .replace('<delay>', (item.operation == 'write' ? parseInt(sequenceExporter.delays.write.get(), 10) : parseInt(sequenceExporter.delays.read.get(), 10))) + (i < packetSequencer.packets.packets.length - 1 ? '\n' : '')
                }
                return code.replace('<command_name>', currentSnapshotName.split('.').join('_')).replace('<commands>', tmp);
            },

            arduino: function(){
                var code =
                    'void setup(){\n' +
                    '  Wire.begin();\n' + 
                    '}\n\n' +
                    
                    'void loop(){\n' +
                    '  <jmp_to_cmd>();\n' +
                    '}\n\n' +
                    
                    'void <command_name>(){\n' +
                    '  <commands>\n' +
                    '}'


                var lastAddress;
                var segments = []
                for (var i = 0; i < packetSequencer.packets.packets.length; i++){
                    var item =  packetSequencer.packets.packets[i]                    
                    if (item.address != lastAddress) segments.push([])
                    segments[segments.length - 1].push(item)
                    lastAddress = item.address
                }

                var tmp = ''
                for (var i = 0; i < segments.length; i++){
                    var segment = segments[i]

                    console.log(segment)
                    console.log(segment.length)

                    if (segment[0].operation == 'write'){
                        tmp += '  wire.beginTransmission(' + segment[0].address+ ');\n'

                        for (var u = 0; u < segment.length; u++){
                            var operation = segment[u];
                            
                            var bytes = ''
                            if (operation.bytes.length > 1){
                                for (var b = 0; b < operation.bytes.length; b++){
                                    var byte = operation.bytes[b]
                                    bytes += byte.replace('0x0', '').replace('0x', '');
                                    if (b < operation.bytes.length - 1) bytes += ', '
                                }

                                var name = 'seg' + i + '_op' + u 
                                tmp +=
                                    '  byte '+ name + '[] = {' + bytes + '};\n' +
                                    '  wire.write(' + name + ', ' + operation.bytes.length + ');\n';
                            
                            } else if (operation.bytes.length == 1){
                                tmp += '  wire.write((byte)' + operation.bytes[0].replace('0x0', '').replace('0x', '') + ');\n';
                            }

                            if (u < segment.length - 1) tmp += '\n'
                        }
                        
                        tmp += '  wire.endTransmission();\n\n'
                    } else {
                        
                    }
                }

                var func_name = currentSnapshotName
                .split('.').join('_')
                .split('-').join('_')
                .split(' ').join('_')
                .split(':').join('_')
                .split('(').join('_')
                .split(')').join('_');
                return code.replace('<jmp_to_cmd>', func_name).replace('<command_name>', func_name).replace('<commands>', tmp);
            }
        }

        return exporters[platform]();
    }
}

sequenceExporter.init()