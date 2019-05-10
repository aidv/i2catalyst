//https://codemirror.net/

var scripting = {
    init: function(){
        $('#scriptingArea').val(`function scripting_OnNewDataValues(packet, data){

}`)
    },

    update: function(){
        $('#scripting').empty();
        $('#scripting').append('<script>' + $('#scriptingArea').val() + '</script>')
    }
}

scripting.init()

$('.scripting_MenuItem').click(function(){
    $('.scripting_modal').modal({
        onApprove : function() {
            scripting.update();
        }
    }).modal('show')
})
