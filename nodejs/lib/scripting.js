//https://codemirror.net/

var scripting = {
    update: function(){
        $('#scripting').empty();
        $('#scripting').append('<script>' + scriptingEditor.getDoc().getValue() + '</script>')
    }
}



$('.scripting_MenuItem').click(function(){
    $('.scripting_modal').modal({
        onApprove : function() {
            scripting.update();
        }
    }).modal('show')
})


/*
var scriptingEditor = CodeMirror.fromTextArea(document.getElementById("scriptEditor"), {
    mode: 'javascript',
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true,
    theme: 'dracula',
    indentUnit: 4,
});

scriptingEditor.getDoc().setValue('function scripting_OnNewDataValues(packet, data){\n\n}');

*/