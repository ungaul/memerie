$(document).ready(function () {
    $('.search-result img').on('click', function () {
        let imageUrl = $(this).attr('src');
        let fileName = imageUrl.split('/').pop();

        let a = document.createElement('a');
        a.href = imageUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});