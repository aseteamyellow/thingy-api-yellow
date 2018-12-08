$(function() {
    setInterval(function() {
        $.get('http://192.168.43.128:8080', function(buffer) {
            console.log(buffer);
            $('#camera').attr('src', 'data:image/jpeg;base64,' + buffer);
        });
    }, 100);
});