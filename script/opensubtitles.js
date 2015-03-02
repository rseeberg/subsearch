(function (ns) {
    function request(properties) {
        /* inspired by Remy Sharps xhr.js @ https://github.com/remy/libraries */
        var xhr = new XMLHttpRequest();

        xhr.open(properties.type, properties.url);
        xhr.setRequestHeader('Content-Type', properties.contentType);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = function () {
            properties.callback.call(xhr, {
                error: false,
                response: xhr.response
            });
        };

        xhr.onerror = function () {
            properties.callback.call(xhr, {
                error: true,
                response: xhr.response
            });
        };

        xhr.send(properties.data);

        return xhr;
    }

    function POST(data, callback) {
        return request({
            type: 'POST',
            url: ns.properties.url,
            contentType: 'application/text',
            callback: callback,
            data: data
        });
    }

    ns.properties = {
        url: 'http://api.opensubtitles.org/xml-rpc',
        useragent: 'OSTestUserAgent',
        token: ''
    };
   
    ns.hash = function(file, done) {
        var HASH_CHUNK_SIZE = 65536,/*64 * 1024*/
            longs = [],
            temp = file.size;
        
        function read(start, end, callback) {
            var reader = new FileReader();
            reader.onload = function (e) {
                callback.call(reader, process(e.target.result));
            };
            
            if(end === undefined) {
                reader.readAsBinaryString(file.slice(start));
            } else {
                reader.readAsBinaryString(file.slice(start, end));
            }
        }
        
        function process(chunk) {
            for(var i = 0; i < chunk.length; i++) {
                longs[(i + 8) % 8] += chunk.charCodeAt(i);
            }
        }
        
        function binl2hex(a) {
            var b = 255,
                d = '0123456789abcdef',
                e = '',
                c = 7;

            a[1] += a[0] >> 8;
            a[0] = a[0] & b;
            a[2] += a[1] >> 8;
            a[1] = a[1] & b;
            a[3] += a[2] >> 8;
            a[2] = a[2] & b;
            a[4] += a[3] >> 8;
            a[3] = a[3] & b;
            a[5] += a[4] >> 8;
            a[4] = a[4] & b;
            a[6] += a[5] >> 8;
            a[5] = a[5] & b;
            a[7] += a[6] >> 8;
            a[6] = a[6] & b;
            a[7] = a[7] & b;
            for (d, e, c; c > -1; c--) {
                e += d.charAt(a[c] >> 4 & 15) + d.charAt(a[c] & 15);
            }
            return e;
        }
        
        
        for(var i = 0; i < 8; i++) {
            longs[i] = temp & 255;
            temp = temp >> 8;
        }
        
        
        read(0, HASH_CHUNK_SIZE, function() {
            read(file.size - HASH_CHUNK_SIZE,undefined, function() {
                done.call(null, file, binl2hex(longs));
            });
        });
    };
    
    ns.methods = {};
    ns.methods.dummy = function(properties) {
        var data = '<methodCall><methodName>SearchSubtitles</methodName><params><param><value><string>'+ns.properties.token+'</string></value></param><param><value><array><data><value><struct><member><name>sublanguageid</name><value><string>dan,eng</string></value></member><member><name>moviehash</name><value><string>-16cca794e731eaa</string></value></member><member><name>moviebytesize</name><value><double>355866546</double></value></member></struct></value></data></array></value></param></params></methodCall>';
        var xhr = POST(data, function(data) {
            if(properties.callback) {
                properties.callback.call(xhr, data);
            }
        });
        return xhr;
    };
    
    ns.methods.login = function (properties) {
        var data = '<methodCall><methodName>LogIn</methodName><params><param><value><string>' + (properties.username || '') + '</string></value></param><param><value><string>' + (properties.password || '') + '</string></value></param><param><value><string>en</string></value></param><param><value><string>' + ns.properties.useragent + '</string></value></param></params></methodCall>';
        var xhr = POST(data, function (data) {
            data.parsed = new DOMParser().parseFromString(data.response, 'text/xml');
            ns.properties.token = data.parsed.querySelector('methodResponse > params > param > value > struct > member:nth-child(1) > value > string').textContent;
            if(properties.callback) {
                properties.callback.call(xhr, data);
            }
        });

        return xhr;
    };

    ns.methods.search = function (properties) {
        debugger;
        var item = '<value><struct><member><name>sublanguageid</name><value><string>{languageid}</string></value></member><member><name>moviehash</name><value><string>{moviehash}</string></value></member><member><name>moviebytesize</name><value><double>{moviebytesize}</double></value></member></struct></value>';
        var data = '<methodCall><methodName>SearchSubtitles</methodName><params><param><value><string>' + ns.properties.token + '</string></value></param><param><value><array><data>{movies}</data></array></value></param></params></methodCall>';

        var tmp = '';
        for(var i = 0; i < properties.items.length; i++) {
            tmp += item.replace('{languageid}', properties.languages.join(',')).replace('{moviehash}', properties.items[i].hash).replace('{moviebytesize}', properties.items[i].size);
        }

        var xhr = POST(data.replace('{movies}', tmp), function (data) {
            data.parsed = new DOMParser().parseFromString(data.response, 'text/xml');
            if(properties.callback) {
                properties.callback.call(xhr, data);
            }
        });

        return xhr;
    };

    ns.methods.download = function (properties) {

    };
})(window.os = {});