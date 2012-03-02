if (!RPG) var RPG = {};

if (typeof exports != 'undefined') {
    Object.merge(
	RPG,require('../../optionConfig.js'),
	RPG,require('./Tiles.js'),
	RPG,require('../Generators/Utilities.js'));
    module.exports = RPG;
}

/**
 * Required options:
 * tiles : obj = {row:{col:[tile,tile]..}..}  or array [tile,tile],
 * cache : tile cache = {terrain:{solid:{..}},
 * row : int, //ignore if tiles is an array
 * col : int, //ignore if tiles is an array
 * zoom : int
 */
RPG.getMapTileStyles = function(options) {
    var styles = {
	width : options.zoom,
	height : options.zoom
    };
    var r = ((options.row && Number.from(options.row)) || 0) + options.rowOffset;
    var c = ((options.col && Number.from(options.col)) || 0) + options.colOffset;

    if (options.map.tiles && (typeOf(options.map.tiles) == 'array' || (options.map.tiles[r] && options.map.tiles[r][c]))) {
	var tiles = (typeOf(options.map.tiles) == 'array' && options.map.tiles) || options.map.tiles[r][c];

	styles['background-image'] = '';
	styles['background-position'] = '';
	styles['background-size'] = '';
	styles['background-repeat'] = '';

	var len = tiles.length;
	for (var x=0; x<len;x++) {
	    var t = tiles[x];
	    var theTile = Object.getFromPath(options.map.cache,t);
	    if (!theTile) {

		continue;
	    }
	    styles['background-image'] = 'url("/common/Map/Tiles/'+t.slice(1,t.length-1).join('/')+'/'+escape(theTile.options.property.image.name)+'"),' + styles['background-image'];
	    styles['background-position'] = (theTile.options.property.image.left?theTile.options.property.image.left+'% ':'0% ') + (theTile.options.property.image.top?theTile.options.property.image.top+'%,':'0%,') + styles['background-position'];
	    styles['background-size'] = (theTile.options.property.image.size?theTile.options.property.image.size+'%,':'100%,') + styles['background-size'];
	    styles['background-repeat'] = (theTile.options.property.image.repeat?theTile.options.property.image.repeat+',':'no-repeat,') + styles['background-repeat'];
	    theTile = null;

	}

	styles['background-image'] = styles['background-image'].substr(0, styles['background-image'].length-1);
	styles['background-position'] = styles['background-position'].substr(0, styles['background-position'].length-1);
	styles['background-size'] = styles['background-size'].substr(0, styles['background-size'].length-1);
	styles['background-repeat'] = styles['background-repeat'].substr(0, styles['background-repeat'].length-1);

	tiles = null;
	return styles;
    } else {
	styles['background-image'] = 'none'
    }
    return styles;

}

/**
 * Required Options:
 * universe
 * character
 * point
 *
 */
RPG.canMoveToTile = function(options) {
    var map = options.universe.maps[options.character.location.mapName];
    var tiles = map.tiles[options.point[0]] && map.tiles[options.point[0]][options.point[1]];


    if (!tiles) return false;
    var traversable = false
    tiles.each(function(tile){
	var c = Object.getFromPath(map.cache,tile);
	if (c && c.options && c.options.property && c.options.property.traversableBy) {
	    traversable = true;
	} else {
	    traversable = false;
	}
    });
    return traversable;
}

/*
 * returns a listing of folder names from the specified world/terrain/npc etc object
 */
RPG.tileFolderList = function(obj,folderPath,allowRandom) {
    var folder = Object.getFromPath(obj,folderPath.split('.'));
    var keys = Object.keys(folder);
    var len = keys.length;
    var ret = [];
    if (allowRandom) {
	ret.push(folderPath+'.Random');
    }
    for(var i=0;i<len;i++) {
	if (/options/i.test(keys[i])) continue;
	ret.push(folderPath + '.' + keys[i]);
    }
    return ret;
}

/**
 * 'path' to to inster defaults into: eg : [folder].terrain.earth.solid.grass.[name]
 * defaults : eg : property : { name : default } }
 * defPath : path of current default location: eg ['property','name']
 *
 * optional:
 * cache object or new one is created and returned
 */
RPG.getTileDefaults = function(options,defaults,defPath) {
    options = options || {};
    defPath = defPath || [];

    var defObj = Object.getFromPath(defaults,defPath);
    if (!defObj) return {};

    if (typeOf(defObj) != 'object') {
	if (defObj) {
	    var key = defPath.pop();
	    if (typeOf(defObj) == 'array') {
		if (typeOf(defObj[0]) == 'number' && typeOf(defObj[0]) == 'number' && defObj[2]) {
		    Object.pathToObject(options,defPath).child[key] = defObj[2];
		} else if (typeOf(defObj[0]) == 'string' && typeOf(defObj[1]) == 'number' && typeOf(defObj[2]) == 'number' && defObj[3]) {
		    Object.pathToObject(options,defPath).child[key] = defObj[3];
		} else if (typeOf(defObj[0]) == 'string') {
		    Object.pathToObject(options,defPath).child[key] = defObj[0];
		}
	    } else {
		Object.pathToObject(options,defPath).child[key] = defObj;
	    }
	    defPath.push(key);
	}


    } else {
	Object.each(defObj,function(content,key) {
	    defPath.push(key);
	    RPG.getTileDefaults(options,defaults,defPath);
	    defPath.pop();
	});
    }
    return options;
}

RPG.createTile = function(path, cache, options) {
    if (!options || !options.property || !options.property.tileName) throw 'No property.tileName specified for ' + path.toString();
    if (!path) return null;
    if (!options.property.folderName) throw 'No property.folderName specified for ' + path.toString();
    if (typeOf(path) == 'string') {
	path = path.split('.');
    }
    var newPath = Array.clone(path);
    newPath.unshift(options.property.folderName);
    newPath.push(options.property.tileName);
    var cacheTile = Object.getFromPath(cache,newPath);
    var obj = null;
    if (cacheTile) {
    //	Object.merge(cacheTile,{
    //	    options : options
    //	});
    }else {
	obj = Object.pathToObject(null,newPath);
	obj.child.options = options;
	var defaults = {
	    options : RPG.optionValidator.getConstraintOptions(path,RPG.Tiles)
	};
	obj.child.options = Object.merge(RPG.getTileDefaults({},defaults),obj.child).options;
	Object.merge(cache,obj.root);
    }
    path = obj = cacheTile = null;
    return newPath;
}

RPG.cloneTile = function(tiles, clonePath, point, cache,options) {
    var toClone = RPG.tilesContainsPartialPath(tiles,clonePath,point);
    if (!toClone) return null;
    if (!toClone[0]) return null;
    if (!clonePath) return null;
    var clone = Object.clone(Object.getFromPath(cache, toClone[0]));
    Object.merge(clone.options,options);
    toClone = null;
    return RPG.createTile(clonePath,cache,clone.options);
}

RPG.removeAllTiles = function(tiles,point) {
    if (!tiles) return;
    if (!tiles[point[0]]) return;
    Object.erase(tiles[point[0]],point[1]);
}

RPG.removeTile = function(tiles,path,point) {
    if (!path) return null;
    var rem = RPG.tilesContainsPath(tiles,path,point);
    if (!rem) return false;
    rem.each(function(tile){
	tiles[point[0]][point[1]].erase(tile);
    });
    return rem;
}

RPG.pushTile = function(tiles,point,path) {
    if (!path) return;
    var r = point[0];
    var c = point[1];
    if (!RPG.tilesContainsPath(tiles,path,point) && !RPG.isTileBlocked(tiles,point)) {
	if (!tiles[r]) tiles[r] = {};
	if (!tiles[r][c]) tiles[r][c] = [];
	tiles[r][c].push(typeOf(path) == 'string'?path.split('.'):path);
    }
    r=c=null;
}
RPG.pushTiles = function(tiles,point,paths) {
    if (!paths) return;
    if (typeOf(paths[0]) == 'array') {
	var len = paths.length;
	for (var i=0;i<len;i++) {
	    RPG.pushTile(tiles,point,paths[i]);
	}
    } else {
	RPG.pushTile(tiles,point,paths)
    }
}

RPG.appendTile = function(tiles,point,path) {
    if (!path) return;
    var r = point[0];
    var c = point[1];
    if (!RPG.tilesContainsPath(tiles,path,point) && !RPG.isTileBlocked(tiles,point)) {
	if (!tiles[r]) tiles[r] = {};
	if (!tiles[r][c]) tiles[r][c] = [];

	tiles[r][c].append(typeOf(path) == 'string'?path.split('.'):path);
    }
    r=c=null;
}

RPG.setTile = function(tiles,point,path) {
    var r = point[0];
    var c = point[1];
    if (!RPG.tilesContainsPath(tiles,path,r,c)) {
	if (!tiles[r]) tiles[r] = {};
	if (!tiles[r][c]) tiles[r][c] = [];
	tiles[r][c] = [(typeOf(path) == 'string'?path.split('.'):path)];
    }
    r=c=null;
}

RPG.unshiftTile = function(tiles,point,path) {
    var r = point[0];
    var c = point[1];
    if (!path) return;
    if (!RPG.tilesContainsPath(tiles,path,r,c) && !RPG.isTileBlocked(tiles,r,c)) {
	if (!tiles[r]) tiles[r] = {};
	if (!tiles[r][c]) tiles[r][c] = [];
	tiles[r][c].unshift(typeOf(path) == 'string'?path.split('.'):path);
    }
    r=c=null;
}

RPG.replaceTile = function(tiles,oldPath,point,newPath) {
    var r = point[0];
    var c = point[1];
    if (!newPath || !oldPath) return;
    if (!tiles[r]) tiles[r] = {};
    if (!tiles[r][c]) tiles[r][c] = [];
    if (typeOf(oldPath) == 'array') oldPath = oldPath.join('.');
    if (typeOf(newPath) == 'string') newPath = newPath.split('.');
    if (typeOf(tiles[r][c]) == 'string') {
	if (oldPath == tiles[r][c]) {
	    tiles[r][c] = [newPath];
	}
	return;
    }
    var replaced = false;
    tiles[r][c].each(function(tp,index){
	if (tp.join('.') == oldPath) {
	    tiles[r][c][index] = newPath;
	    replaced = true;
	}
    });
    if (!replaced) {
	tiles[r][c].push(newPath);
    }
    r=c=null;
}

RPG.blockTiles = function(tiles, points) {
    points = Array.from(points);
    points.each(function(point){
	RPG.pushTile(tiles,point,['blocked']);
    });
}
RPG.isTileBlocked = function(tiles,point) {
    return !!RPG.tilesContainsPath(tiles,['blocked'],point);
}

RPG.trimPathOfNameAndFolder = function(path) {
    return path.slice(1,path.length-1);
}

/**
 * Attempts to determine a tiles orientation based on surrounding Above/Below/Left/Right tiles
 */
RPG.getTileOrientation = function(tiles,path,point) {
    if (!RPG.tilesContainsPath(tiles,path,point)) return null;
    var ablr = RPG.getAboveBelowLeftRight(tiles,path,point);
    switch (true) {
	case !!(ablr.above && ablr.below && ablr.left && ablr.right) :
	    return 'fi';//Full Intersection
	case !!(ablr.left && ablr.right && ablr.above && !ablr.below) :
	    return 'bi';//Bottom T Intersection
	case !!(ablr.left && ablr.right && ablr.below && !ablr.above) :
	    return 'ti';//Top T Intersection
	case !!(ablr.left && ablr.above && ablr.below && !ablr.right) :
	    return 'li';//Left T Intersection
	case !!(ablr.right && ablr.above && ablr.below && !ablr.left) :
	    return 'ri';//Right T Intersection
	case !!(ablr.right && ablr.above && !ablr.below && !ablr.left) :
	    return 'blc';//bottom left cornor
	case !!(ablr.left && ablr.above && !ablr.below && !ablr.right) :
	    return 'brc';//bottom right cornor
	case !!(ablr.left && ablr.below && !ablr.right && !ablr.above) :
	    return 'trc';//top right cornor
	case !!(ablr.right && ablr.below && !ablr.left && !ablr.above) :
	    return 'tlc';//top left cornor
	case !!((ablr.above || ablr.below) && !ablr.left && !ablr.right) :
	    return 'v'; //vertical
	case !!((ablr.right || ablr.left) && !ablr.above && !ablr.below) :
	    return 'h';//horizontal
	default :
	    return null;//unknown
    }
}

RPG.orientTiles = function(tiles,path,callback) {
    var tilesClone = Object.clone(tiles);//take a clone of the object because the callback will modify the tiles
    var rMin = Object.keys(tilesClone).min();
    var rMax = Object.keys(tilesClone).max();
    var cMin = 0;
    var cMax = 0;
    var r = 0;
    var c = 0;
    for(r=rMin; r<=rMax; r++) {
	var row = tiles[r];
	if (!row) continue;
	var cols = Object.keys(row);
	cMin = cols.min();
	cMax = cols.max();
	cols = null;
	for (c=cMin; c<=cMax; c++) {
	    callback(RPG.getTileOrientation(tilesClone,path,[r,c]),[r,c]);
	}
    }
    rMin = cMin = rMax = cMax = r = c = tilesClone = null;
}

/**
 * determines whether the specified path exists in one of the tiles surrounding the tile at row 'r' and col 'c'
 */
RPG.getAboveBelowLeftRight = function(tiles,path,point) {
    return {
	above:RPG.tilesContainsPath(tiles,path,RPG.n(point,1)),
	below:RPG.tilesContainsPath(tiles,path,RPG.s(point,1)),
	left:RPG.tilesContainsPath(tiles,path,RPG.w(point,1)),
	right:RPG.tilesContainsPath(tiles,path,RPG.e(point,1))
    };
}

/**
 * returns false if the array of tiles at row 'r' and col 'c' does not contain a specific tile path
 * returns array of tiles matching the path provided
 */
RPG.tilesContainsPath = function(tiles,path,point) {
    var paths = null;
    if (!point || !tiles[point[0]]) return false;
    var tilelist = tiles[point[0]][point[1]];
    if (!tilelist || (tilelist && (typeOf(tilelist) != 'string' && typeOf(tilelist) != 'array'))) return false;
    if (typeOf(tilelist) == 'string') {
	return path == tilelist ? path : false;
    }
    if (typeOf(path) == 'array') path = path.join('.');
    paths = [];
    var len = tilelist.length;
    for(var i=0;i<len;i++) {
	var t = tilelist[i];
	if (t && (t.join('.') == path)) {
	    paths.push(t);
	}
    }
    if (paths.length > 0) {
	return paths
    }
    tilelist = len = paths = null;
    return false;
}

/**
 * returns false if the array of tiles at row point[0] and col point[1] does not contain a specific tile path
 * returns array of tiles matching the path provided
 */
RPG.tilesContainsPartialPath = function(tiles,path,point) {
    var paths = null;
    if (!tiles[point[0]]) return false;
    var tilelist = tiles[point[0]][point[1]];
    if (!tilelist || (tilelist && (typeOf(tilelist) != 'string' && typeOf(tilelist) != 'array'))) return false;
    if (typeOf(tilelist) == 'string') {
	return path == tilelist ? path : false;
    }
    if (typeOf(path) == 'array') path = path.join('.');
    path = path.escapeRegExp();
    paths = [];
    var len = tilelist.length;
    for(var i=0;i<len;i++) {
	var t = tilelist[i];
	if (t && (t.join('.').test(path))) {
	    paths.push(t);
	}
    }
    if (paths.length > 0) {
	return paths
    }
    tilelist = len = paths = null;
    return false;
}

RPG.offsetTiles = function(tiles,offset,directionFunc,offset2,directionFunc2) {
    var newTiles = {};
    var rows = Object.keys(tiles);
    var cols = null;
    var rLen = rows.length;
    var r = 0;
    var c = 0;
    var cLen = 0;
    var point = null;
    for(r=0;r<rLen;r++) {
	if (!tiles[rows[r]]) continue;
	cols = Object.keys(tiles[rows[r]]);
	cLen = cols.length;
	for(c=0;c<cLen;c++) {
	    point = directionFunc([rows[r]*1,cols[c]*1],offset);
	    if (offset2 && directionFunc2) {
		point = directionFunc2(point,offset2);
	    }
	    if (!newTiles[point[0]]) newTiles[point[0]] = {};
	    newTiles[point[0]][point[1]] = tiles[rows[r]][cols[c]];
	}
    }
    return newTiles;
}

/**
 * Takes and array of Tiles objects ie : { 1 : { 2 : [tiles[,..]]}} whee 1 is the row and 2 is the col
 * and merges them into a single Tiles object
 */
RPG.mergeTiles = function(mergeInto, tilesArr,stripBlocked) {
    var len = tilesArr.length;
    var x = 0;
    var tileArr = tilesArr[x];
    var rMin = 0;
    var rMax = 0;
    var cMin = 0;
    var cMax = 0;
    var r = 0;
    var c = 0;
    var row = null;
    var cols = null;
    for (x = 0; x<len; x++) {
	tileArr = tilesArr[x];
	if (!tileArr) continue;
	rMin = Object.keys(tileArr).min();
	rMax = Object.keys(tileArr).max();
	cMin = 0;
	cMax = 0;
	r = 0;
	c = 0;
	for(r=rMin; r<=rMax; r++) {
	    row = tileArr[r];
	    if (!row) continue;
	    cols = Object.keys(row);
	    cMin = cols.min();
	    cMax = cols.max();
	    cols = null;
	    for (c=cMin; c<=cMax; c++) {
		if (row[c]) {
		    if (stripBlocked) {
			RPG.removeTile(tileArr,['blocked'],[r,c]);
		    }
		    RPG.appendTile(mergeInto,[r,c],row[c]);
		}
	    }
	}
    }
    tileArr = row = cols = x = len = rMin = cMin = rMax = cMax = r = c = null;
    return mergeInto;
}


RPG.paintPoints = function(tiles,points,paths) {
    if (!paths) return;
    var i = 0;
    var len = points.length;
    var x = 0;
    var len2 = 0;
    for (i=0;i<len;i++){
	if (typeOf(points[i]) == 'array' && typeOf(points[i][0]) == 'array') {
	    len2 = points[i].length;
	    for(x=0;x<len2;x++) {
		RPG.pushTiles(tiles,points[i][x],paths);
	    }
	} else {
	    RPG.pushTiles(tiles,points[i],paths);
	}
    }
    len = i = null;
}

RPG.paintAreas = function(tiles,areas,paths) {
    if (!paths) return;
    var len = areas.length;
    var i = 0;
    for(i=0; i<len; i++) {
	RPG.paintArea(tiles,areas[i],paths);
    }
    i = len = null;
}

/**
 * Paints an area with the specified path.
 * Path is either a string or a function which returns a string
 * function is called each time a tile is painted.
 *
 * paintPath is used by paintRoomArea and is not needed unless you use a path-function which needs access to it
 */
RPG.paintArea = function(tiles,area,paths,paintPath){
    if (!paths) return;
    if (!paintPath) paintPath = [];
    var i = 0;
    var len = 0;
    var k = 0;
    if (typeOf(area) == 'object') {
	k = Object.keys(area);
	len = k.length;
	for(i = 0; i<len; i++) {
	    paintPath.push(k[i]);
	    RPG.paintArea(tiles,area[k[i]],paths,paintPath);
	    paintPath.pop();
	}
    } else if (typeOf(area) == 'array' && typeOf(area[0]) == 'array') {
	len = area.length;
	for(i=0;i<len;i++){
	    if (!area[i]) continue;
	    if (typeOf(paths) != 'function') {
		RPG.pushTiles(tiles,area[i],paths);
	    } else if (typeOf(paths) == 'function') {
		//call the function and give them he current area, and point within that area and the index of the area point
		RPG.pushTiles(tiles,area[i],paths(paintPath,area,area[i],i));
	    }

	}
    }
//    else if (typeOf(area) == 'array') {
//	len = area.length;
//	for (i = 0; i<len; i++) {
//	    RPG.paintArea(tiles,area[i],path,paintPath);
//	}
//    }
}
/**
 * tiles: the tiles object to paint to
 * rooms
 */
RPG.paintRoomArea = function(tiles,rooms,options) {
    var r = 0;
    rooms = Array.from(rooms);
    var rLen = rooms.length;

    var i = 0;
    var k = Object.keys(options);
    var oLen = k.length;

    var x = 0;
    var pLen = 0;
    var area = null;

    //loop through each of the options keys.
    //these keys are paths to areas in the rooms to paint
    for (i=0;i<oLen;i++) {

	//split the key path up in case we are paiting more thant 1 area with the same tilePath
	var toPaint = k[i].split(',');
	pLen = toPaint.length;
	//loop through each of the split keys
	for (x=0;x<pLen;x++){


	    //loop through each room and paint the area retrieved from the room based on the key path
	    for (r=0;r<rLen;r++) {
		if (toPaint[x].contains('.Random')) {
		    var parent = Object.getFromPath(rooms[r],toPaint[x].replace('.Random',''));
		    if (!parent) continue;
		    var tmp = Object.getSRandom(parent);
		    if (tmp) {
			toPaint[x] = toPaint[x].replace('Random',tmp.key);
		    }
		}
		area = Object.getFromPath(rooms[r],toPaint[x]);
		if (!area) continue;
		RPG.paintArea(tiles,area,options[k[i]],toPaint[x].split('.'));
	    }
	}
    }
}