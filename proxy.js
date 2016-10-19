var http = require('http'),
    httpProxy = require('http-proxy');

var proxy=httpProxy.createProxyServer({target:'http://localhost:9200'}).listen(8200);

proxy.on('proxyReq', function(proxyReq, req, res, options) {
// collect request data
    req.body='';
    req.on('data', function (chunk) {
        req.body +=chunk;
    });
    req.on('end', function () {
    });

});

proxy.on('error',
    function(err)
    {
        console.error(err);
    });


// assign events
proxy.on('proxyRes', function (proxyRes, req, res) {

    // collect response data
    var proxyResData='';
    proxyRes.on('data', function (chunk) {
        proxyResData +=chunk;
    });
    proxyRes.on('end',function () {


        var snifferData =
        {
            request:{
                data:req.body,
                headers:req.headers,
                url:req.url,
                method:req.method},
            response:{
                data:proxyResData,
                headers:proxyRes.headers,
                statusCode:proxyRes.statusCode}
        };
        console.log(snifferData);
    });

    //    console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
});


