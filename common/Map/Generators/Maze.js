if (!RPG) var RPG = {};
if (!RPG.Generator) RPG.Generator = {};

if (typeof exports != 'undefined') {
    Object.merge(RPG,require('./Utilities.js'));
    Object.merge(RPG,require('../Tiles/Utilities.js'));
    Object.merge(RPG,require('../Tiles/Tiles.js'));
    module.exports = RPG;
}

RPG.Generator.Maze = new (RPG.Generator.MazeClass = new Class({
    Implements : [Options],
    constraints : {
	name : ["/^[a-zA-Z0-9_.]+$/",1,50,'g'],
	seed : [0,99999999999,Math.floor((Math.random() * (99999999999 - 1) + 1))],
	randomSeed : false,
	tileGroup :  ['world.road.asphalt'],
	height : [8,1024,25],
	width : [8,1024,45],
	sparse : [0,512,0],
	offsetRow : [-9999,9999,0],
	offsetCol : [-9999,9999,0]
    },
    options : {},
    initialize : function(options) {
	this.setOptions(options);
    },

    generate : function(options,rand){
	var maze = {
	    cache : {},
	    tiles : {},
	    str : '',
	    array2d : []
	};

	if (options.randomSeed) {
	    options.seed = (Math.random() * (99999999999 - 1) + 1);
	}
	rand = rand || RPG.Random;
	rand.seed = options.seed;

	options.height = Number.from(options.height) ||  10;
	options.width = Number.from(options.height) ||  10;
	options.offsetRow = Number.from(options.offsetRow) || 0;
	options.offsetCol = Number.from(options.offsetCol) || 0;


	maze.str = this.mazeToStr(this.createMaze(options,rand));

	var strRows = maze.str.split('\r\n');
	var r = 0;
	var c = 0;
	//clean the string
	maze.array2d = [];

	options.maze = {};
	options.maze_cache = {};

	strRows.each(function(row) {
	    //console.log(row+'\r\n');
	    row = row.replace(/\+/gi,options.tileGroup+',');
	    row = row.replace(/[s]{3}/gi,'s,');
	    row = row.replace(/[e]{1}/gi,'e,');
	    row = row.replace(/[1]{3}/gi,'1,');
	    row = row.replace(/[2]{1}/gi,'2,');
	    row = row.replace(/[3]{3}/gi,'3,');
	    row = row.replace(/[-]{3}/gi,options.tileGroup+',');
	    row = row.replace(/\|/gi,options.tileGroup+',');
	    row = row.substring(0,row.length-1);
	    maze.array2d.push(row.split(','));
	});
	maze.array2d.pop();

	for (var x=0;x<Number.from(options.sparse);x++) {
	    r=0;
	    c=0;
	    maze.array2d.each(function(row,index,rows) {
		row.each(function(col) {
		    if (!rows[r]) return;
		    if (!rows[r][c]) return;
		    var ablr = RPG.getAboveBelowLeftRight(rows,options.tileGroup,[r,c]);
		    if (r > 0 && c > 0 && r<rows.length-1 && c < rows[r].length-1) {
			//trim single walls
			if (((ablr.above?1:0) + (ablr.below?1:0) + (ablr.left?1:0) + (ablr.right?1:0)) == 1) {
			    rows[r][c] = '3';
			}
		    }
		    ablr = null;
		    c++;
		});
		c=0;
		r++;
	    });
	}
	r=0;
	c=0;
	maze.array2d.each(function(row,rIdx,rows) {
	    row.each(function(col, cIdx) {

		switch (col) {
		    case options.tileGroup:
			var orientation = RPG.getTileOrientation(maze.array2d,options.tileGroup,[rIdx,cIdx]);
			if (orientation) {

			    RPG.replaceTile(maze.tiles,options.tileGroup,[r+options.offsetRow,c+options.offsetCol],
				RPG.createTile(options.tileGroup,maze.cache,{
				    property : {
					tileName : orientation,
					folderName : options.name,
					image : {
					    name : orientation+'.png',
					    size : 150,
					    left : 50,
					    top : 50
					}
				    }
				})
				);
			}
			break;
		    default:
			RPG.pushTile(maze.tiles,[r+options.offsetRow,c+options.offsetCol],
			    RPG.createTile('terrain.earth.solid.grass',maze.cache,{
				property : {
				    tileName : 'g3',
				    folderName : options.name,
				    image : {
					name : 'g3.png'
				    }
				}
			    })
			    );
			break;
		}
		c++;
	    });
	    row = null;
	    c=0;
	    r++;
	});
	strRows = r = c = null;

	return maze;
    },
    createMaze : function(options,rand) {
	rand = rand || RPG.Random;
	var y  = Math.floor(options.width /2);
	var x  = Math.floor(options.height /2);
	var n=x*y-1;
	var j = 0;
	var k = 0;
	var next = null;
	if (n<0) {
	    return null;
	}
	var horiz=[];
	for (j= 0; j<x+1; j++) horiz[j]= [];
	var verti=[];
	for (j= 0; j<x+1; j++) verti[j]= [];
	var here= [Math.floor(rand.random()*x), Math.floor(rand.random()*y)];
	var path= [here];
	var unvisited= [];
	for (j= 0; j<x+2; j++) {
	    unvisited[j]= [];
	    for (k= 0; k<y+1; k++)
		unvisited[j].push(j>0 && j<x+1 && k>0 && (j != here[0]+1 || k != here[1]+1));
	}
	while (0<n) {
	    var potential= [[here[0]+1, here[1]], [here[0],here[1]+1],
	    [here[0]-1, here[1]], [here[0],here[1]-1]];
	    var neighbors= [];
	    for (j= 0; j < 4; j++)
		if (unvisited[potential[j][0]+1][potential[j][1]+1])
		    neighbors.push(potential[j]);
	    if (neighbors.length) {
		n=n-1;
		next= neighbors[Math.floor(rand.random()*neighbors.length)];
		unvisited[next[0]+1][next[1]+1]= false;
		if (next[0] == here[0])
		    horiz[next[0]][(next[1]+here[1]-1)/2]= true;
		else
		    verti[(next[0]+here[0]-1)/2][next[1]]= true;
		path.push(here= next);
	    } else
		here= path.pop();
	}
	return ({
	    x: x,
	    y: y,
	    horiz: horiz,
	    verti: verti
	});
    },

    mazeToStr : function(m) {
	var text= [];
	for (var j= 0; j<m.x*2+1; j++) {
	    var line= [];
	    if (0 == j%2)
		for (var k=0; k<m.y*4+1; k++)
		    if (0 == k%4)
			line[k]= '+';
		    else
		    if (j>0 && m.verti[j/2-1][Math.floor(k/4)])
			line[k]= '1';
		    else
			line[k]= '-';
	    else
		for (var k=0; k<m.y*4+1; k++)
		    if (0 == k%4)
			if (k>0 && m.horiz[(j-1)/2][k/4-1])
			    line[k]= '2';
			else
			    line[k]= '|';
		    else
			line[k]= '3';

	    if (0 == j) line[0] = 'sss'
	    if (0 == j) line[1] = line[2]= line[3]= 's';
	    if (m.x*2-1==j|| m.x*2==j) line[4*m.y]= 'e';
	    text.push(line.join('')+'\r\n');
	}
	return text.join('');
    }
}))();