/*
 Inicializálás:
 <script type="text/javascript"><!--//--><![CDATA[//><!--
     var IndexStatConfig = {
         has_ident_by_default: true,         // Van-e ident beépítve az oldalba (default: true)
         forceIdent: 'aaaa',                 // force-olhatunk egy ident-id-t (pl. appból ha device-id-t akarunk használni)
         device: 'desktop',                  // desktop, mobile, tablet, app, none vagy js (ez utóbbi esetén az alábbi device_callback fut le)
         device_callback: function(){}       // JS function, ami ugyanúgy a fenti értékeket adhatja vissza. (csak ha a device=js!)
         need_ident: true,                   // Kell-e ident-kód alapján történő UU-mérés (default: true)
     };
     var _indexstat = window._indexstat||[];
 //--><!]]></script>

 Használat:
 _indexstat.push([{ id: 261, type: 2 }]);   // Az elküldendő pixelek tömbje
 */

/**
 * Az IndexStatCaller-eket és az ident-kód lekéréséet kezelő osztály
 * @namespace
 * @property {string}   js_version              - A mérő JS verziója (csak debug-célokra)
 * @property {?string}  device                  - Az érzékelt device típusa (desktop, mobile, tablet vagy none)
 * @property {Object[]} caller_pool             - Az IndexStatCaller-ek pool-ja
 * @property {boolean}  need_ident              - Szükség van-e ident-kódra a méréshez (unique user méréshez kell)
 * @property {boolean}  has_ident_by_default    - Van-e az oldalon alapból ident, vagy külön kérnie kell a stat-nak
 * @property {?string}  ident_code              - Az érzékelt ident-ID
 * @property {number}   ident_tries             - Hányszor próbálkoztunk ident-id-t lekérni
 * @property {number}   max_ident_tries         - A lehetséges ident-id lekérések maximum száma
 * @property {?Object}  ident_timeout           - Az ident-id lekérésekhez szükséges timeout objektum
 *
 * @type {{getRawCookie: IndexStatHandler.getRawCookie, setCookie: IndexStatHandler.setCookie, saveIdent: IndexStatHandler.saveIdent, getIdent: IndexStatHandler.getIdent, getDevice: IndexStatHandler.getDevice, processQueueForIdent: IndexStatHandler.processQueueForIdent, _init: IndexStatHandler._init, push: IndexStatHandler.push}}
 */
var IndexStatHandler = {
    js_version: '3.0',
    device: null,
    caller_pool: [],

    // ident tulajdonságok
    need_ident: false,
    ident_code: null,
    ident_tries: 0,
    max_ident_tries: 10,
    ident_timeout: null,
    has_ident_by_default:  true,

    // Általános cookie-kezelés
    /**
     * Cookie értékének kiolvasása
     * @param {string} cookie_name - A keresett cookie neve
     * @returns {?string} A cookie értéke, vagy null, ha nem nem található.
     */
    getRawCookie: function( cookie_name ) {
        var i, x, y, cookieArr = document.cookie.split( ";" );
        for ( i = 0; i < cookieArr.length; i++ ) {
            x = cookieArr[ i ].substr( 0, cookieArr[ i ].indexOf( "=" ) );
            y = cookieArr[ i ].substr( cookieArr[ i ].indexOf( "=" ) + 1 );
            x = x.replace( /^\s+|\s+$/g, "" );
            if ( x == cookie_name ) {
                return decodeURI( y );
            }
        }
        return null;
    },
    /**
     * Letárolja a megadott nevű és értékű cookie-t
     * @param {string} cookie_name - A cookie neve
     * @param {string} value - A cookie értéke
     * @param {?number} days - hány napig maradjon meg a cookie (alapértelmezetten a session végéig)
     */
    setCookie: function( cookie_name, value, days ) {
        var expires = "",
            t = window.location.host.split('.');
        if( t.length > 2 ) {
            t.shift();
        }
        var domain = '; domain=' + '.' + t.join( '.' );
        if ( days ) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = cookie_name + "=" + value + domain + expires + "; path=/";
    },

    // ident-kezelő függvények
    /**
     * Az adott ident-ID lementése cookie-ba, majd az ident-re váró IndexStatCaller-et feldolgozása
     * @param {string} ident_code - A lementendő ident-ID
     */
    saveIdent: function( ident_code ) {
        // lementjük az ident-cookie-t
        IndexStatHandler.setCookie( 'ident', ident_code, 14 );
        IndexStatHandler.ident_code = ident_code;
        IndexStatHandler.processQueueForIdent();
    },
    /**
     * Ident-kór lekérdezése
     */
    getIdent: function() {
        // ha nem is kell, vagy már van, akkor visszafordulunk
        if( !IndexStatHandler.need_ident || IndexStatHandler.ident_code != null ) {
            return;
        }
        if ( !IndexStatHandler.has_ident_by_default ) {
            // ha alapból nincs indent, akkor AJAX-szal próbálunk szerezni
            if( IndexStatHandler.ident_tries <= 1 ) {
                // Ha nem, akkor aktívan lekérünk egy ident-azonosítót az indapass-tól (max kétszer)
                // ha megvan, meghívjuk a IndexStatHandler.saveIdentCookie callback függvényt
                IndexStatHandler.ident_tries++;
                var n = document.createElement('script');
                n.type = 'text/javascript';
                n.async = true;
                n.src = document.location.protocol + '//management.ident.indapass.hu/management/getcookie?jsonp=IndexStatHandler.saveIdent';
                var s = document.getElementsByTagName('script')[0];
                s.parentNode.insertBefore( n, s );
            }
        } else if ( IndexStatHandler.ident_tries <= IndexStatHandler.max_ident_tries ) {
            // Ha alapból van ident, akkor megnézzük, hogy elérhető-e cookie-ként
            var ident_cookie = IndexStatHandler.getRawCookie('ident');
            if( ident_cookie ) {
                IndexStatHandler.ident_code = ident_cookie;
                IndexStatHandler.processQueueForIdent();
            } else {
                // 2 mp múlva újra megpróbáljuk elcsípni (hacsak nem próbáltuk ezt meg túl sokszor már)
                IndexStatHandler.ident_tries++;
                IndexStatHandler.ident_timeout = setTimeout( function() {
                    IndexStatHandler.getIdent();
                }, 2000 );
            }
        }
    },

    /**
     * Megnézzük, hogy milyen device-ról van szó. Vagy config callback függvényéből vagy config stringből dolgozik.
     */
    getDevice: function() {
        if( IndexStatHandler.device ) {
            return;
        }
        if( typeof IndexStatConfig != 'undefined' && typeof IndexStatConfig.device != 'undefined' ){
            if( IndexStatConfig.device == 'js' && typeof IndexStatConfig.device_callback == 'function' ) {
                IndexStatHandler.device = IndexStatConfig.device_callback();
            } else {
                IndexStatHandler.device = IndexStatConfig.device;
            }
        }
        if( !IndexStatHandler.device ) {
            IndexStatHandler.device = 'none';
        }
    },
    /**
     * Ident-re váró IndexStatCaller-et feldolgozása
     */
    processQueueForIdent: function() {
        if( IndexStatHandler.need_ident && IndexStatHandler.ident_code === null ) {
            IndexStatHandler.getIdent();
        }
        for( var i = 0; i < IndexStatHandler.caller_pool.length; i++ ) {
            if( !IndexStatHandler.caller_pool[i].waitForIdent ) {
                continue;
            }
            IndexStatHandler.caller_pool[i].start();
        }
    },

    /**
     * Inicializálja az Indexstat-ot a configból
     * @private
     */
    _init: function() {
        // megnézzük, hogy identes-e az oldal (default az, hacsak nem deklarálod másképp)
        IndexStatHandler.need_ident = typeof IndexStatConfig == 'undefined' || typeof IndexStatConfig.need_ident == 'undefined' || IndexStatConfig.need_ident === true;
        if( IndexStatHandler.need_ident ) {
            if (typeof IndexStatConfig != 'undefined' && IndexStatConfig.has_ident_by_default === false) {
                IndexStatHandler.has_ident_by_default = false;
            }
            if (typeof IndexStatConfig != 'undefined' && typeof IndexStatConfig.forceIdent != 'undefined') {
                // ha force-oltunk ident-id-t, akkor azt használjuk
                IndexStatHandler.ident_code = IndexStatConfig.forceIdent;
            } else {
                // amúgy megnézzük, hogy van-e ident-cookie
                IndexStatHandler.ident_code = IndexStatHandler.getRawCookie('ident');
            }
        }

        // a default tömb feldolgozása
        if( typeof window._indexstat == 'object' && window._indexstat.length ) {
            IndexStatHandler.caller_pool.push( new IndexStatCaller( window._indexstat ) );
        }

        // régi, config-ból jövő pixelek feldolgozása
        if(
            typeof IndexStatConfig != 'undefined' &&
            typeof IndexStatConfig.pixels == 'object' &&
            IndexStatConfig.pixels.length
        ) {
            IndexStatHandler.caller_pool.push( new IndexStatCaller( IndexStatConfig.pixels ) );
        }
        window._indexstat = this;
    },

    /**
     * A kapott pixelekkel létrehoz egy IndexStatCaller-t
     * @param {Object[]} input_pixel_array - A küldendő pixelek tömbje
     */
    push: function( input_pixel_array ) {
        IndexStatHandler.caller_pool.push( new IndexStatCaller( input_pixel_array ) );
    }
};

/**
 * Adott pixel-tömböt feldolgozó objektum
 * @class
 * @param {Object[]} input_pixel_array - A küldendő pixelek egy tömbben
 * @constructor
 */
function IndexStatCaller( input_pixel_array ) {
    this.sent = false;
    this.pixel_pool = [];
    this.deviceCalced = false;
    this.waitForIdent = false;

    /**
     * Kiszámoljuk a device-függő pixeleket, ha kellenek: desktop, mobile, tablet, app vagy none
     */
    this.calcDevicePixels = function() {
        if( this.deviceCalced ) {
            return;
        }
        IndexStatHandler.getDevice();
        if ( IndexStatHandler.device != 'none' ) {
            var device_pixels = [];
            for (var i = 0; i < this.pixel_pool.length; i++) {
                var device_pixel = this.pixel_pool[i].getPixelByDevice();
                if (device_pixel != false) {
                    device_pixels.push(device_pixel);
                }
            }
            this.pixel_pool = this.pixel_pool.concat(device_pixels);
        }
        this.deviceCalced = true;
    };

    /**
     * A küldendő pixelek inicializálása
     * @param {Object[]} input_pixel_array - A küldendő pixelek egy tömbben
     */
    this.push = function( input_pixel_array ) {
        if( typeof input_pixel_array != 'object' || !input_pixel_array.length ) {
            return;
        }
        if ( input_pixel_array[0].length && typeof input_pixel_array[0][0].id != 'undefined' ) {
            // kiszejük az objektumba ágyazott tömböt
            input_pixel_array = input_pixel_array[0];
        }
        for (var i = 0; i < input_pixel_array.length; i++) {
            if( typeof input_pixel_array[i].id == 'undefined' || typeof input_pixel_array[i].type == 'undefined' ) {
                continue;
            }
            this.pixel_pool.push( new IndexStatPixel( input_pixel_array[i].id, input_pixel_array[i].type ) );
        }
    };

    /**
     * Elindítja a pixelek elküldését
     */
    this.start = function() {
        if ( !this.pixel_pool.length ) {
            // Nincsenek pixelek, megállunk
            return;
        }
        this.calcDevicePixels();

        if( !IndexStatHandler.need_ident || IndexStatHandler.ident_code != null ) {
            // ha van ident (vagy nem is kell), indul a menet
            this.waitForIdent = false;
            this.send();
        } else {
            // Ha nincs ident, de kéne, akkor lekérünk
            this.waitForIdent = true;
            IndexStatHandler.getIdent();
        }
    };

    /**
     * Kiküldi a pixeleket tartalmazó kérést
     */
    this.send = function() {
        if ( this.sent ) {
            // Már elküldtük egyszer, mégegyszer nem tesszük
            return;
        }
        if ( !this.pixel_pool || !this.pixel_pool.length ) {
            // Nincsenek pixelek, megállunk
            return;
        }
        var params = [];
        if( !IndexStatHandler.need_ident || IndexStatHandler.ident_code === null ) {
            params.push( 'ident=0' );
        } else {
            params.push( 'ident=' + IndexStatHandler.ident_code );
        }
        for( var i = 0; i < this.pixel_pool.length; i++ ) {
            var pixelString = 'pixels[]=' + this.pixel_pool[ i ].id + '_' + this.pixel_pool[ i ].type;
            if( params.indexOf( pixelString ) === -1 ) {
                // Duplikált pixeleket nem engedünk át
                params.push( pixelString );
            }
        }
        var url = document.location.href == "https://cimlap.blog.hu/" ? "https://index.hu/i2" : document.location.href;

        params.push( 'ui=' + Math.floor( ( Math.random() * 100000 ) + 1 ) );
        params.push( 'url=' + encodeURIComponent( url ) );
        params.push( 'v=' + IndexStatHandler.js_version );
        var pixel = document.createElement( 'img' );
        pixel.height = 1;
        pixel.width = 1;
        pixel.src = document.location.protocol + '//indexstat.index.hu/pixel.php?' + params.join( '&' );
        pixel.style.position = 'absolute';
        if( document.body ) {
            document.body.insertBefore( pixel, document.body.childNodes[ 0 ] );
        }

        this.sent = true;
    };

    // A tényleges inicializálás
    this.push( input_pixel_array );
    this.start();
}

/**
 * Adott pixelt reprezentáló objektum
 * @class
 * @param {int} id - A pixel ID-ja
 * @param {int} type - A pixel tipus azonosítója
 * @constructor
 */
function IndexStatPixel( id, type ) {
    this.id = id;
    this.type = type;
    // ezeket a Elements.php-val szinkronban kell tartani
    this.device_shift_value = 50;
    this.desktop_shift = 1;
    this.mobile_shift = 2;
    this.tablet_shift = 3;
    this.app_shift = 4;
    /**
     * Visszaadja az aktuális pixelnek a device-függő leszármazottját
     * @returns {IndexStatPixel} Új, a device-nak megfelelő pixel
     */
    this.getPixelByDevice = function() {
        var new_type;
        if( IndexStatHandler.device == 'mobile' ) {
            new_type = this.type + ( this.device_shift_value * this.mobile_shift );
        } else if( IndexStatHandler.device == 'tablet' ) {
            new_type = this.type + ( this.device_shift_value * this.tablet_shift );
        } else if( IndexStatHandler.device == 'app' ) {
            new_type = this.type + ( this.device_shift_value * this.app_shift );
        } else {
            new_type = this.type + ( this.device_shift_value * this.desktop_shift );
        }
        return new IndexStatPixel( this.id, new_type );
    }
}

IndexStatHandler._init();
