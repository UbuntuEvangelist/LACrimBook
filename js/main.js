//CrimBook with sqlite backend
var State,
    db,
    History = window.History,
    dbName = 'CrimLaws',
    latestDbVersion = '3.1', //Change this on update
    lawSections = [          //Corresponds to West thumb index;
    {'name':'Title 14', 'start': 'RS 000014' },
    {'name':'Title 15', 'start': 'RS 000015' },
    {'name':'Title 32', 'start': 'RS 000032' },
    {'name':'Title 40', 'start': 'RS 000040' },
    {'name':'Title 46', 'start': 'RS 000046' },
    {'name':'Title 56', 'start': 'RS 000056' },
    {'name':'Code of Criminal Procedure', 'start': 'CCRP' },
    {'name':'Code of Evidence', 'start': 'CE' },
    {'name':'Childrens Code', 'start': 'CHC' },
    {'name':'Constitution', 'start': 'CONST' }
],
//Change content depending on state
updateContent = function(State,callback) {
    var target = State.data.id,
        view = State.data.type,
        pos = State.data.pos,
        items,
        laws,
        loc = window.location.toString().queryStringToJSON();

    //Ensure that any alert messages are hidden
    $('.alert').hide();

    //Clear the search term
    if (loc.view === 'search'){
        $('input').val(loc.target);
    } else {
        $('input').val('');
    }

    switch (view) {
    case 'list':
        items = ' <div class="list-group display-rows">';
        db.readTransaction(function (tx){
            tx.executeSql('SELECT id, title, description FROM laws WHERE sortcode LIKE ?;',[target + ' %'],function (tx,res){
                var rows = res.rows;
                for (var i = 0, l = rows.length; i < l; i ++) {
                    items += '<a class="law-link list-group-item" href="#" data-id="' + rows.item(i).id +
                    '">' + rows.item(i).title + ' ' + rows.item(i).description + '</a>';
                }
                items += '</div>';
                $('.panel').html(items);
                $(document).scrollTop(pos);
            },function (tx, err){
                $('.alert').html('Error: ' + err.message).show();
            }), function onReadError(tx,err){
                $('.alert').html('Error: ' + err.message).show();
            };
        });
        break;
    case 'law':
        //check to see if this law has been favorited
        db.readTransaction(function (tx){
            tx.executeSql('SELECT * FROM laws WHERE id = ?',[target],function (tx,res){
                var fav;
                if (localStorage.getItem(target)){
                    fav = '<a href="#" class="favorite upper-right-corner" data-state="saved" data-id="' + target +
                    '" title="Favorite This"><span class="glyphicon glyphicon-star"></span></a>';
                }
                else {
                    fav = '<a href="#" class="favorite upper-right-corner" data-state="unsaved" data-id="' + target +
                    '" title="Favorite This"><span class="glyphicon glyphicon-star-empty"></span></a>';
                }
                var rows = res.rows;
                $('title').text(rows.item(0).description + ' ' + rows.item(0).title);
                $('.panel').css({'padding':'10px'}).html('<h3><span class="lawTitle">' + rows.item(0).description +
                '</span>' + fav + '</h3>' + rows.item(0).law_text);
                $(document).scrollTop(0);
            }, function (tx,err){
                $('.alert').html('Error: ' + err.message).show();
            });
        });
        break;
    case 'search':
        db.readTransaction(function (tx){
            tx.executeSql('SELECT id, title, description, law_text FROM laws WHERE law_text  LIKE ? OR title LIKE ?;',
            ['% ' + target + ' %', '% ' + target],function (tx,res){
                items = '<div class="list-group">';
                var rows = res.rows;
                if (rows.length < 1){
                    items += '<a class="list-group-item">No results found.</a></div>';
                    $('.panel').html(items);
                    $(document).scrollTop(pos);
                } else {
                    for (var i = 0, l = rows.length; i < l; i ++) {
                        var snippet = getExcerpt(rows.item(i).law_text, target, 15);
                        if (snippet){
                            items += '<a class="law-link list-group-item" href="#" data-id="' + rows.item(i).id +
                            '">' + rows.item(i).title + ' ' + rows.item(i).description +
                            '<p class="preview">...' + snippet + '...</p>' + '</a>' ;
                        } else {
                            items += '<a class="law-link list-group-item" href="#" data-id="' + rows.item(i).id +
                            '">' + rows.item(i).title + ' ' + rows.item(i).description + '</a>' ;
                        }
                    }
                    items += '</div>';
                    $('.panel').html(items);
                    $(document).scrollTop(pos);
                }
            },function (tx, err){
                $('.alert').html('Error: ' + err.message).show();
            }), function onReadError(tx,err){
                $('.alert').html('Error: ' + err.message).show();
            };
        });
        break;
    case 'favorites':
        items = ' <div class="list-group display-rows">';
        if (localStorage.length > 0) {
            var q = 'SELECT * FROM laws WHERE id = ?',
            getFavs = function (tx, res){
                var rows = res.rows;
                items += '<a class="law-link list-group-item" href="#" data-id="' + rows.item(0).id + '">' +
                rows.item(0).title + ' ' + rows.item(0).description + '</a>';
            },
            favErr = function (tx, err){
                $('.alert').html(err.messsage).show();
            };
            db.readTransaction(function (tx){
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    tx.executeSql(q,[key],getFavs,favErr);
                }
            },
            function fail(tx,err){
                $('.alert').html(err.messsage).show();
            },
            function success(tx, res){
                items += '</div>';
                $('.panel').html(items);
                $(document).scrollTop(pos);
            });
        }
        else {
            items += '<a class="list-group-item">You don\'t have any favorited laws</a>';
            items += '</div>';
            $('.panel').html(items);
            $(document).scrollTop(pos);
        }

        break;
    default:
        var menu = ' <div class="list-group">';
        for (var int = 0, l = lawSections.length; int < l; int ++) {
            var v = lawSections[int];
            menu += '<a class="nav-link list-group-item list-group-item " data-id="' + v.start + '" href="#">' +
            '<span class="glyphicon glyphicon-chevron-right"></span>  ' + v.name + '</a>';
        }
        menu += '</div>';
        $('.panel').html(menu);
        $(document).scrollTop(pos);
    }
    callback();
},

setCurrentPosition = function () {
    var currentView = window.location.toString().queryStringToJSON();
    var scroll = $(document).scrollTop();
    History.replaceState({type: currentView.view, id: currentView.target, pos: scroll}, currentView.target, '?target=' + currentView.target + '&view=' + currentView.view);
},

updateFavoritesList = function () {
    if (localStorage.length > 0) {
        var favList = '',
        key,
        value,
        i;

        if (localStorage.length > 4) {
            for (i = 0; i < 5; i++) {
                key = localStorage.key(i);
                value = localStorage.getItem(key);
                favList += '<li><a class="fav-link" href="#" data-id="' + key + '">' + value + '</a></li>';
            }
            favList += '<li class="divider"></li><li><a class="fav-all" href="#">View All</a></li>';
        }
        else {
            for (i = 0; i < localStorage.length; i++) {
                key = localStorage.key(i);
                value = localStorage.getItem(key);
                favList += '<li><a class="fav-link" href="#" data-id="' + key + '">' + value + '</a></li>';
            }
        }

        $('.dropdown-menu').html(favList);
    }
},

init = function () {
    alert('init has fired');
    $.ajax({url: 'data/data.json', data:'json', beforeSend: function () { $('.panel').hide(); }})
    .done(function(data){
        var lawData = data,
        onSuccess = function () {
            $('.loading').hide();
            $('.panel').show();
            State = History.getState();
            var t = State.url.queryStringToJSON();
            History.pushState({type: t.view, id: t.target}, $('title').text(), State.urlPath);
            updateContent(History.getState(),function () {
                updateFavoritesList();
            });
            alert('transaction done test.');
        },
        onFail = function (tx,err) {
            alert(err);
        },
        onTransact = function (tx) {
            alert('transaction successful');
            console.log(tx);
        },
        okInsert = function (tx, results) {
            alert('rowsAffected: ' + results.rowsAffected + ' -- should be 1');
        };

        db = window.openDatabase(dbName, '', 'La. Crim Book 6-2014',2 * 1024 * 1024);

        alert('db version' + db.version);
        alert('latest db version' + latestDbVersion);
        if (db.version !== latestDbVersion){

            alert('PhoneGap:' + db.version);
            db.changeVersion(db.version,latestDbVersion);
            db.transaction(function (tx) {
                tx.executeSql('DROP TABLE laws',[], onTransact,onFail);
            });

            db.transaction(function (tx) {
                tx.executeSql('CREATE TABLE IF NOT EXISTS laws ( `id` INTEGER PRIMARY KEY AUTOINCREMENT,' +
                '`docid` TEXT, `sortcode` TEXT, `title` TEXT, `description` TEXT, `law_text` TEXT); ',[], onTransact,onFail);
            });

            db.transaction(function (tx) {
                alert('here we are at the insert');
                alert('lawData length ' + lawData.length);
                var q = 'INSERT INTO laws (docid, sortcode,title,description,law_text) VALUES (?,?,?,?,?)';
                for (var i = 0, l = lawData.length; i < l; i ++) {
                    console.log('in loop');
                    var obj = lawData[i];
                    console.log(obj.hasOwnProperty());
                    var arr = [];
                    for (var key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            var val = obj[key];
                            arr.push(val);
                        }
                    }
                    tx.executeSql(q, arr, okInsert, onFail);
                }
            },  onFail, onSuccess);
        } else {
            onSuccess();
        }
    })
    .fail(function(jqXHR, textStatus, errorThrown){
        $('.alert').html('Error Retrieving Laws:' + errorThrown).show();
    });

    //Handle History
    History.Adapter.bind(window, 'statechange', function () {
        if (typeof spinnerplugin !== 'undefined'){
            spinnerplugin.show({overlay: false, fullscreen: false});
        }
        updateContent(History.getState(), function () {
            updateFavoritesList();
            if (typeof spinnerplugin !== 'undefined'){
                spinnerplugin.hide();
            }
        });
    });

    //Handle clicks
    $('.main').on('click', 'a.nav-link', function (event) {
        event.preventDefault();
        var target = $(this).attr('data-id');
        var scroll = $(document).scrollTop();
        History.pushState({type: 'list', id: target}, target, '?target=' + target + '&view=list');
    });

    $('.main').on('click', 'a.law-link', function (event) {
        event.preventDefault();
        setCurrentPosition();
        var target = $(this).attr('data-id');
        History.pushState({type: 'law', id: target}, target, '?target=' + target + '&view=law');
    });

    $('.search-btn').click(function (event) {
        event.preventDefault();
        var target = $(this).prev().val();
        $(document).scrollTop('0');
        History.pushState({type: 'search', id: target}, target, '?target=' + target + '&view=search');
    });

    $('.main').on('click', 'a.favorite', function (event) {
        event.preventDefault();
        var target = $(this).attr('data-id');
        var saveState = $(this).attr('data-state');
        if (saveState === 'unsaved') {
            var title = $(this).prev().html();
            localStorage.setItem(target, title);
            $('.alert').html('Saved to favorites.').show();
            $('.favorite').html('<span class="glyphicon glyphicon-star"></span');
            $(this).attr('data-state', 'saved');
            updateFavoritesList();
        }
        else {
            localStorage.removeItem(target);
            $(this).attr('data-state', 'unsaved');
            $('.alert').html('Removed from favorites.').show();
            $('.favorite').html('<span class="glyphicon glyphicon-star-empty"></span');
            updateFavoritesList();
        }
    });

    $('.navbar-headnav').on('click', 'a.fav-link', function (event) {
        event.preventDefault();
        setCurrentPosition();
        var target = $(this).attr('data-id');
        History.pushState({type: 'law', id: target}, target, '?target=' + target + '&view=law');
        if ($('.collapse').css('display') === 'block'){
            $('.collapse').collapse('hide');
        }
    });

    $('.navbar-headnav').on('click', 'a.fav-all', function (event) {
        event.preventDefault();
        setCurrentPosition();
        History.pushState({type: 'favorites', id: null}, 'Favorites', '?view=favorites');
        if ($('.collapse').css('display') === 'block'){
            $('.collapse').collapse('hide');
        }
    });

    $('.navbar-headnav').on('click', 'a.go-home', function (event) {
        event.preventDefault();
        var scroll = '0';
        History.pushState({type: 'home', id: null, pos: scroll}, 'Home', '/');
    });

    $('.main').swipe({
        swipe:function(event, direction, distance, duration, fingerCount) {
            if (direction === 'right'){
                History.back();
            }
            if (direction === 'left'){
                History.go(1);
            }
        },
        allowPageScroll: 'vertical'
    });

    $(function() {
        FastClick.attach(document.body);
    });

};

// Check if a new cache is available on page load.
//window.addEventListener('load', function () {
//
//    window.applicationCache.addEventListener('updateready', function () {
//        if (window.applicationCache.status === window.applicationCache.UPDATEREADY) {
//        // Browser downloaded a new app cache.
//        // Swap it in and reload the page to get the new code.
//            window.applicationCache.swapCache();
//            if (confirm('A new version of LaCrimBook is available. Load it?')) {
//                window.location.reload();
//            }
//        }
//        else {
//        // Manifest didn't change. Nothing new to server. Set up data
//        }
//    }, false);
//
//
//}, false);
document.addEventListener('deviceready', init, false);
