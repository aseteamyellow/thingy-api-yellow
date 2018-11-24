$(function() {
    setInterval(function() {
        $.get('http://172.22.22.192:8080', function(buffer) {
            console.log(buffer);
            $('#camera').attr('src', 'data:image/jpeg;base64,' + buffer);
        });
    }, 500);
});