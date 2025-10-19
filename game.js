const obj = {
	EMPTY: ".",
	PLAYER: "p",
	WALL: "#",
	BOX: "b",
	SHIFTBOX: "+",
	SHIFTBOXHOR: "-",
	SHIFTBOXVER: "|",
	TARGET: "t",
	LEVELONE: "1",
	LEVELTWO: "2",
	LEVELTHREE: "3",
	LEVELFOUR: "4",
	LEVELFIVE: "5",
	LEVELSIX: "6",
	LEVELSEVEN: "7",
	RUBBLE: "r",
	GATE: "g",
}; //all lowercase if applicable!

const sfx = {
	SELECT: 0,
	BUMP: 1,
	WALK: 2,
	SHIFT: 3,
	VICTORY: 4,
	UNDO: 5,
	RESTART: 6,
	MENU: 7,
	BACK: 8,
	GAMEEND: 9,
	PUSH: 10
}

const fontDefault = "px sans-serif";

var scale = 70;
var roughSeed = 1;
var usePerfectShapes = false;

const timing = new Timing((1/ 10), (1 / 60));

var defaultRoughness = 1;


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const roughCanvas = rough.canvas(canvas, {roughness: defaultRoughness});

const levelCanvas = document.createElement("canvas");
const levelCtx = levelCanvas.getContext("2d");
const roughLevel = rough.canvas(levelCanvas, {roughness: defaultRoughness});

const pathCanvas = document.createElement("canvas");
const pathCtx = pathCanvas.getContext("2d");
const roughPath = rough.canvas(pathCanvas);

const wallCanvas = document.createElement("canvas");
const wallCtx = wallCanvas.getContext("2d");
const roughWall = rough.canvas(wallCanvas);
const wallMargin = 10;

const playerCanvas = document.createElement("canvas");
const PlayerCtx = playerCanvas.getContext("2d");
const roughPlayer = rough.canvas(playerCanvas);

const boxCanvas = document.createElement("canvas");
const boxCtx = boxCanvas.getContext("2d");
const roughBox = rough.canvas(boxCanvas, {roughness: defaultRoughness});
const boxMargin = 10;

const targetCanvas = document.createElement("canvas");
const targetCtx = targetCanvas.getContext("2d");
const roughTarget = rough.canvas(targetCanvas, {roughness: defaultRoughness});
const targetMargin = 15;

const rubbleCanvas = document.createElement("canvas");
const rubbleCtx = rubbleCanvas.getContext("2d");
const roughRubble = rough.canvas(rubbleCanvas);
const rubbleMargin = 15;






let undoStack = [];

var camShakeX = 0;
var camShakeY = 0;

var gameName = "Edge Not Found ";
var subTitle = "Press any key";

var levelName = "";
var levelOffsetX = 0;
var levelOffsetY = 0; //Can't both be non-zero!

var autoScrollX = 0; //Between -1 and 1
var autoScrollY = 0;

var prevLevelOffsetX = 0; //Between -1 and 1
var prevLevelOffsetY = 0;

onkeydown = function(e) {
	if (e.key == "ArrowDown" || e.key == "ArrowUp" || e.key == " " || e.key == "Backspace")
	{
		e.preventDefault();
	}

	input(e);
};

window.onbeforeunload = function() {
	if (level != 0) {
		return "Quit?";
	}
};

var favicon = null;
var wroteFavicon = false;
onload = function(e) {
	favicon = document.querySelector('link[rel="icon"]');
};



var level = 0;
var sandboxMode = false;
var sandboxLevel = null;
var sandboxGridWidth = 10;
var sandboxGridHeight = 10;
var selectedTool = obj.WALL;
var isDragging = false;
var showSizeDialog = false;
var tempGridWidth = 10;
var tempGridHeight = 10;
var sandboxOffsetX = 0;
var sandboxOffsetY = 0;

var toolbarItems = [
	{type: obj.EMPTY, name: "Empty"},
	{type: obj.WALL, name: "Wall"},
	{type: obj.BOX, name: "Box"},
	{type: obj.SHIFTBOXHOR, name: "Shift Box (H)"},
	{type: obj.SHIFTBOXVER, name: "Shift Box (V)"},
	{type: obj.SHIFTBOX, name: "Shift Box (Both)"},
	{type: obj.TARGET, name: "Target"},
	{type: obj.RUBBLE, name: "Rubble"},
	{type: obj.PLAYER, name: "Player"}
];





//Init level
var gridHeight = levels[level].length;
var gridWidth = levels[level][0].length;

setCanvasScales(scale);

var player = {x: 0, y: 0};
//var playerTarget 
var walls = [];
var boxes = [];
var targets = [];
var levelNodes = [];
var gates = [];
var rubble = [];

var steps = "";
var prevHorDelta = 0;
var prevVerDelta = 0;

//Set up timers, these are all in seconds
var timeSinceLastAction = 0;
var timeToCompleteTween = 0.1;

var timeToUpdateRenders = 0.4;
var timeSinceUpdatedRenders = timeToUpdateRenders;

var timeUntilLevelEnd = 4;
var timeUntilLevelSelected = 1;
var timeSinceLevelWon = timeUntilLevelEnd;

var timeSinceLevelStart = 0;
var timeToLoadLevel = 1;

var timeUntilChangableTheme = 0.2;
var timeSinceLastThemeChange = 0;

var timeUntilPlayableAudio = 0.075;
var timeSinceLastAudio = 0;

var timeToDisplayLevelName = 0.2;
var timeSinceLevelNameChanged = 0;

var timeToToggleMenu = 0.25;
var timeSinceMenuToggled = timeToToggleMenu;

var menuOpened = false;
var menuSelection = 0;

var splashScreen = true;
var splashScreenImage = new Image(800,600);
var splashScreenImageLoaded = false;
var splashScreenURL = null;
if (splashScreenURL) {
	splashScreenImage.onload = function() {splashScreenImageLoaded = true};
	splashScreenImage.src = splashScreenURL;
} else {
	splashScreen = false;
}

var forceUnlockAllLevels = false;

canvas.addEventListener('click', function() { 
	domain = window.location.origin;
    var validDomain = true; //Overwrite to sitelock the game
	if (splashScreen && splashScreenImageLoaded) {
		if (validDomain) {
			splashScreen = false;
		} else {
			window.alert("Sorry, this game is sitelocked!");
		}
	}
}, false);




// ADD THESE NEW EVENT LISTENERS HERE:
canvas.addEventListener('mousedown', function(e) {
	if (!sandboxMode) return;
	handleSandboxClick(e);
	isDragging = true;
}, false);

canvas.addEventListener('mousemove', function(e) {
	if (!sandboxMode || !isDragging) return;
	handleSandboxClick(e);
}, false);

canvas.addEventListener('mouseup', function() {
	isDragging = false;
}, false);

canvas.addEventListener('contextmenu', function(e) {
	if (sandboxMode) {
		e.preventDefault();
		selectedTool = obj.EMPTY;
		handleSandboxClick(e);
	}
}, false);




var titleScreen = true;

var verticalInput = new InputHandler(["KeyS", "ArrowDown"], ["KeyW", "ArrowUp"], timing, 0.1, 0.2);
var horizontalInput = new InputHandler(["KeyD", "ArrowRight"], ["KeyA", "ArrowLeft"], timing, 0.1, 0.2);
var undoInput = new InputHandler(["KeyZ", "Backspace"], [], timing, 0.1, 0.2);
var confirmInput = new InputHandler(["KeyX", "Space", "Enter"], [], timing, 0.1, 0.2);

var colors = []; //Note that all colors must be defined as a hex with 6 numbers for color blending to work.
colors[0] = ["Sketchbook", "#ffffff", "#000000", "#808080", "#ff0000"]; //name, bg, main, in-between, trail, shiftbox line
colors[1] = ["Scratchpad", "#202020", "#ffffff", "#808080", "#ffd700"];
colors[2] = ["Golden Ticket", "#303030", "#b29700", "#8e7900", "#efe7d6"];
colors[3] = ["Ikaniko", "#1E2A26", "#7CA49B", "#267B75", "#C8EEE5"];
colors[4] = ["BackFlipped", "#223e32", "#b3dd52", "#04bf00", "#A7C06D"];
var colorTheme = 0;
var audioEnabled = true;
var reduceMotion = false;

var freshState = true; //If the level was either just loaded or just reset
var victory = false; //If the level is finished, no input is accepted until the next level loads
var targetLevel = 0;

var dirtyRender = true; //Mark as true when theme changes and on some other rare occurences.
var previousScale = 0;

window.onresize = function() {
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	dirtyRender = true;
};

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

var levelSolved = [];
for(var i = 0; i != levels.length; i += 1) {
	levelSolved[i] = 0; //0 = new, 1 = tried, 2 = solved.
}
var amountOfLevelsSolved = 0;

loadGame();

loadLevel(level);

function gameLoop() {
	try {
		//Init
		timing.update();
		horizontalInput.update();
		verticalInput.update();
		undoInput.update();
		confirmInput.update();
		
		// Reset input handled flags
		if (horizontalInput.fired) horizontalInput.wasHandled = false;
		if (verticalInput.fired) verticalInput.wasHandled = false;
		if (confirmInput.fired) confirmInput.wasHandled = false;
		if (undoInput.fired) undoInput.wasHandled = false;
		//Input
		if (!victory && !titleScreen && !sandboxMode) {
			if (!menuOpened) {
				if (verticalInput.fired) {
					MovePlayer(0, verticalInput.delta);
				}
				if (horizontalInput.fired) {
					MovePlayer(horizontalInput.delta, 0);
				}
				if (undoInput.fired == true && undoStack.length != 0) {
					audio(sfx.UNDO);

					var stateToRestore = undoStack.pop();

					player = stateToRestore.player;
					boxes = stateToRestore.boxes;
					levelOffsetX = stateToRestore.xOff;
					levelOffsetY = stateToRestore.yOff;

					steps = steps.slice(0, -1);
					if (steps.length == 0 || steps.slice(-1) == " ") {
						freshState = true;
					} else {
						freshState = false;
					}

					if (level == 0) {
						var lvl = hasLevelNode(player.x, player.y);
						setLevelName(lvl,1);
					};

					timeSinceLastAction = timeToCompleteTween;

					//console.warn("Popped the undo stack, remaining entries:", undoStack.length);

					dirtyRender = true;
				}
				if (confirmInput.fired) {
					if (timeSinceLevelStart >= timeToLoadLevel) {
						var lvlNode = hasLevelNode(player.x, player.y);
						if (lvlNode != null) {
							targetLevel = levelNodes[lvlNode].target;
							victory = true;
							timeSinceLevelWon = 0;
							audio(sfx.SELECT);
						}
					}
				}
			} else {//Menu input
				var items = 5;
				if (level == 0 || sandboxMode) {
					items = 4;
				}
		
				if (verticalInput.fired && verticalInput.delta == 1) {
					menuSelection += 1; if (menuSelection >= items) {menuSelection = 0;}
				}
				else if (verticalInput.fired && verticalInput.delta == -1) {
					menuSelection -= 1; if (menuSelection < 0) {menuSelection = items-1;}
				}
				else if (confirmInput.fired) {
					switch(menuSelection) {
						case 0: 
							menuOpened = !menuOpened;
							audio(sfx.SELECT, true);
							break;
						case 1:
							audioEnabled = !audioEnabled;
							if (audioEnabled) {
								audio(sfx.MENU, true);
							}
							saveGame();
							break;
						case 2:
							reduceMotion = !reduceMotion;
							audio(sfx.WALK, true);
							saveGame();
							break;
						case 3:
							if (timeSinceLastThemeChange >= timeUntilChangableTheme) {
								timeSinceLastThemeChange = 0;
								colorTheme++;
								if (colorTheme >= colors.length) {
									colorTheme = 0;
								}
								dirtyRender = true;
								wroteFavicon = false;
								audio(sfx.WALK, true);
							}
							saveGame();
							break;
						case 4:
							// CHANGE THIS SECTION:
							if (level == 999) {
								exitSandbox();
								audio(sfx.BACK, true);
							} else {
								loadLevel(0);
								audio(sfx.BACK, true);
							}
							menuOpened = !menuOpened;
					}
				}
			}
		}

		if (favicon != null && !wroteFavicon) {
			const faviconCanvas = document.createElement("canvas");
			faviconCanvas.width = 64;
			faviconCanvas.height = 64;
			const faviconCtx = faviconCanvas.getContext("2d");
			const roughFavicon = rough.canvas(faviconCanvas);

			faviconCtx.fillStyle = colors[colorTheme][1];
			faviconCtx.fillRect(0,0,canvas.width, canvas.height);
			roughFavicon.rectangle(8, 8, 48, 48, {stroke: colors[colorTheme][2], fill: colors[colorTheme][2], strokeWidth: 2, bowing: 2, seed: roughSeed});

			favicon.href = faviconCanvas.toDataURL('image/png');
			wroteFavicon = true;
		}

		//Rendering
		timeSinceLastAction = Math.min(timeSinceLastAction + timing.currentFrameLength, timeToCompleteTween);
		timeSinceUpdatedRenders = Math.min(timeSinceUpdatedRenders + timing.currentFrameLength, timeToUpdateRenders);
		timeSinceLevelStart = Math.min(timeSinceLevelStart + timing.currentFrameLength, timeToLoadLevel);
		timeSinceLevelWon = Math.min(timeSinceLevelWon + timing.currentFrameLength, timeUntilLevelEnd); //Don't forget about the level select level end!
		timeSinceLastThemeChange = Math.min(timeSinceLastThemeChange + timing.currentFrameLength, timeUntilChangableTheme);
		timeSinceLastAudio = Math.min(timeSinceLastAudio + timing.currentFrameLength, timeUntilPlayableAudio);
		timeSinceLevelNameChanged = Math.min(timeSinceLevelNameChanged + timing.currentFrameLength, timeToDisplayLevelName);
		timeSinceMenuToggled = Math.min(timeSinceMenuToggled + timing.currentFrameLength, timeToToggleMenu);

		if (titleScreen) {
			timeSinceLevelStart = timeToLoadLevel * .5;
		}

		var zoom = 1;
		if (canvas.width < 700 || canvas.height < 700) {
			scale = 40;
			zoom = 0.6;
		} else if (canvas.width < 1000 || canvas.height < 900) {
			scale = 55;
			zoom = 0.8;
		} else {
			scale = 70;
		}

		// Skip fade animations for sandbox mode
		if (sandboxMode || (level == 999 && !victory)) {
			timeSinceLevelStart = timeToLoadLevel;
			timeSinceLevelWon = timeUntilLevelEnd;
		}


		var alph = 1;
		var localScale = scale;
		if (timeSinceLevelStart < timeToLoadLevel) {
			alph = timeSinceLevelStart / timeToLoadLevel;
			localScale = (scale + 20 * zoom) - 20 * zoom * EaseInOut(timeSinceLevelStart / timeToLoadLevel);
		} else if (timeSinceLevelWon < timeUntilLevelEnd && level != 0) {
			alph = 1 - (timeSinceLevelWon / timeUntilLevelEnd);
			localScale = (scale - 50 * zoom) + 50 * zoom * (1-EaseInOut(timeSinceLevelWon / timeUntilLevelEnd));
		} else if (timeSinceLevelWon < timeUntilLevelSelected && level == 0) {
			alph = 1 - (timeSinceLevelWon / timeUntilLevelSelected);
			localScale = (scale) - 20 * zoom * (EaseInOut(timeSinceLevelWon / timeUntilLevelSelected));
		} else if (((timeSinceLevelWon >= timeUntilLevelEnd && level != 0) || (timeSinceLevelWon >= timeUntilLevelSelected && level == 0)) && victory) {
			if (level == 0) {
				loadLevel(targetLevel);
			} else {
				if (level == levels.length-1) {
					gameName = "Victory! ";
					subTitle = "Thank you for playing!";
					titleScreen = true;
					audio(sfx.GAMEEND);
				}
				loadLevel(0);
			}
			alph = 0;
		}

		if (localScale < 0) {
			localScale = 0
		}

		if (reduceMotion) {
			var localScale = scale;
		}

		var verHeight = gridHeight * localScale;
		var horWidth = gridWidth * localScale;
		var rerendered = false;

		//Render
		if ((!reduceMotion && timeSinceUpdatedRenders >= timeToUpdateRenders) || localScale != previousScale || dirtyRender) {
			if (!reduceMotion && timeSinceUpdatedRenders >= timeToUpdateRenders) {
				roughSeed += 1;
				timeSinceUpdatedRenders = 0;
			}

			rerendered = true;

			if (localScale != previousScale) {
				setCanvasScales(localScale);
			} else {
				PlayerCtx.clearRect(0,0, playerCanvas.width, playerCanvas.height);
				PlayerCtx.beginPath();

				wallCtx.clearRect(0,0, wallCanvas.width, wallCanvas.height);
				wallCtx.beginPath();
				
				boxCtx.clearRect(0,0, boxCanvas.width, boxCanvas.height);
				boxCtx.beginPath();

				rubbleCtx.clearRect(0,0, rubbleCanvas.width, rubbleCanvas.height);
				rubbleCtx.beginPath();

				targetCtx.clearRect(0,0, targetCanvas.width, targetCanvas.height);
				targetCtx.beginPath();
			}

			//Render player
			var size = 0.8;
			if (usePerfectShapes) {
				PlayerCtx.beginPath(); 
				PlayerCtx.arc(localScale * .5, localScale * .5, localScale * size * 0.5, 0, Math.PI * 2); 
				PlayerCtx.fillStyle = colors[colorTheme][1]; 
				PlayerCtx.fill(); 
				PlayerCtx.strokeStyle = colors[colorTheme][2];
				PlayerCtx.lineWidth = 1; 
				PlayerCtx.stroke();
			} else {
				// roughPlayer.circle(localScale * .5, localScale * .5,
				// localScale * size, {fill: colors[colorTheme][1], fillStyle: "solid", stroke: colors[colorTheme][2], strokeWidth: 1});
				PlayerCtx.beginPath(); 
				PlayerCtx.arc(localScale * .5, localScale * .5, localScale * size * 0.5, 0, Math.PI * 2); 
				PlayerCtx.fillStyle = colors[colorTheme][1]; 
				PlayerCtx.fill(); 
				PlayerCtx.strokeStyle = colors[colorTheme][2];
				PlayerCtx.lineWidth = 1; 
				PlayerCtx.stroke();
			}


			// Wall
			var size = 1;
			if (usePerfectShapes) {
				const wallImg = new Image();
				wallImg.src = "images/wall.png";
				wallImg.onload = () => {
					wallCtx.drawImage(
						wallImg,
						wallMargin * 0.5,
						wallMargin * 0.5,
						localScale,
						localScale
					);
				};
			} else {
				roughWall.rectangle(wallMargin * 0.5, wallMargin * 0.5, 
				localScale, localScale, {stroke: "none", fill: colors[colorTheme][2], strokeWidth: 1});
			}


			// Box
			var size = 0.8;
			if (usePerfectShapes) {
				const boxImg = new Image();
				boxImg.src = "images/box.png";
				boxImg.onload = () => {
					boxCtx.drawImage(
						boxImg,
						boxMargin * 0.5 + (1-size) * 0.5 * localScale,
						boxMargin * 0.5 + (1-size) * 0.5 * localScale,
						localScale * size,
						localScale * size
					);
				};
			} else {
				roughBox.rectangle(boxMargin * 0.5 + (1-size) * 0.5 * localScale, boxMargin * 0.5 + (1-size) * 0.5 * localScale, 
				localScale * size, localScale * size, {stroke: colors[colorTheme][2], fill: colors[colorTheme][2], strokeWidth: 2});
			}


			// Rubble
			if (usePerfectShapes) {
				var size = 1.1;
				roughRubble.rectangle(rubbleMargin * 0.5 + (1-size) * 0.5 * localScale, rubbleMargin * 0.5 + (1-size) * 0.5 * localScale, 
				localScale * size, localScale * size, {stroke: "none", fill: colors[colorTheme][2], fillStyle: "dots", fillWeight: localScale / 70, strokeWidth: 2});
			} else {
				var size = 1.1;
				roughRubble.rectangle(rubbleMargin * 0.5 + (1-size) * 0.5 * localScale, rubbleMargin * 0.5 + (1-size) * 0.5 * localScale, 
				localScale * size, localScale * size, {stroke: "none", fill: colors[colorTheme][2], fillStyle: "dots", fillWeight: localScale / 70, strokeWidth: 2});
			}


			// Target
			var size = 0.9;
			if (usePerfectShapes) {
				const targetImg = new Image();
				targetImg.src = "images/target.png";
				targetImg.onload = () => {
					targetCtx.drawImage(
						targetImg,
						targetMargin * 0.5 + (1-size) * 0.5 * localScale,
						targetMargin * 0.5 + (1-size) * 0.5 * localScale,
						localScale * size,
						localScale * size
					);
				};
			} else {
				roughTarget.rectangle(targetMargin * 0.5 + (1-size) * 0.5 * localScale, targetMargin * 0.5 + (1-size) * 0.5 * localScale, 
				localScale * size, localScale * size, {fillStyle: "solid", fill: colors[colorTheme][1], stroke: colors[colorTheme][2], bowing: 4, strokeWidth: 1, fillWeight: 0.25});
			}
		}

		var shaking = (camShakeX != 0 || camShakeY != 0);
		var reduceCamShake = 2;
		if (camShakeX > 0) {camShakeX = Math.max(0, camShakeX - reduceCamShake)}
		else if (camShakeX < 0) {camShakeX = Math.min(0, camShakeX + reduceCamShake)}

		if (camShakeY > 0) {camShakeY = Math.max(0, camShakeY - reduceCamShake)}
		else if (camShakeY < 0) {camShakeY = Math.min(0, camShakeY + reduceCamShake)}

		var levelMargin = 20; //In pixels, positive
		if (!sandboxMode && (rerendered || timeSinceUpdatedRenders >= timeToUpdateRenders || timeSinceLastAction <= timeToCompleteTween * 2 || alph != 1 || shaking)) {
			//Render level
			if (localScale != previousScale || dirtyRender) {
				levelCanvas.width = horWidth+levelMargin;
				levelCanvas.height = verHeight+levelMargin;
				pathCanvas.width = horWidth+levelMargin;
				pathCanvas.height = verHeight+levelMargin;
			} else {
				levelCtx.clearRect(0,0, levelCanvas.width, levelCanvas.height);
				levelCtx.beginPath();
				pathCtx.clearRect(0,0, pathCanvas.width, pathCanvas.height);
				pathCtx.beginPath();
			}
			
			dirtyRender = false;

			drawLevel(0, 0, gridWidth, gridHeight, localScale);

			rerendered = true;
		}
		
		if (sandboxMode) {
			dirtyRender = false;
		}

		if (rerendered || titleScreen) {
			var shakeMultiplier = 1;
			if (reduceMotion) {shakeMultiplier = 0}

			var cameraX = Math.round(canvas.width * 0.5 - horWidth * 0.5 - levelMargin * 0.5 + camShakeX * 0.25 * shakeMultiplier);
			var cameraY = Math.round(canvas.height * 0.5 - verHeight * 0.5 - levelMargin * 0.5+ camShakeY * 0.25 * shakeMultiplier);
				
			var clipOffset = 10; //In pixels, positive
			var screenWidthRatio = Math.ceil(((canvas.width - horWidth + clipOffset) / horWidth * 0.5));
			var screenHeightRatio = Math.ceil(((canvas.height - verHeight + clipOffset) / verHeight * 0.5));

			//Add a little safety padding in case the level wrapping is offset
			if (levelOffsetX != 0) {screenWidthRatio += 2}
			if (levelOffsetY != 0) {screenHeightRatio += 2}

			var tweenOffsetX = levelOffsetX - prevLevelOffsetX * (1-EaseInOut(Math.min(timeSinceLastAction / timeToCompleteTween, 1)));
			var tweenOffsetY = levelOffsetY - prevLevelOffsetY * (1-EaseInOut(Math.min(timeSinceLastAction / timeToCompleteTween, 1)));

			ctx.globalAlpha = 1;
			ctx.fillStyle = colors[colorTheme][1];
			ctx.fillRect(0,0,canvas.width, canvas.height);

			function drawRepeat(img) {
				for(let y = 0; y <= screenHeightRatio; y++) {
					for(let x = 0; x <= screenWidthRatio; x++) {
						ctx.globalAlpha = alph; // Changed from the fading calculation

						if (ctx.globalAlpha > 0) {
							ctx.drawImage(img, 
							cameraX + horWidth * x + tweenOffsetX * localScale * y,
							cameraY + verHeight * y + tweenOffsetY * localScale * x);

							if (x != 0 && y != 0) {
							ctx.drawImage(img, 
									cameraX + horWidth * (-x) + tweenOffsetX * localScale * (-y),
									cameraY + verHeight * (-y) + tweenOffsetY * localScale * (-x));
							}
								
							if (y != 0) {
								ctx.drawImage(img, 
									cameraX + horWidth * (x) + tweenOffsetX * localScale * (-y),
									cameraY + verHeight * (-y) + tweenOffsetY * localScale * (x));
							}
							if (x != 0) {
								ctx.drawImage(img, 
									cameraX + horWidth * (-x) + tweenOffsetX * localScale * (y),
									cameraY + verHeight * (y) + tweenOffsetY * localScale * (-x));
							}
						}
					}
				}
			}

			if (!reduceMotion && !sandboxMode) {
				drawRepeat(pathCanvas);
			}
			if (!sandboxMode) {
				drawRepeat(levelCanvas);
			}


			// Only draw border if not in sandbox mode
			if (!sandboxMode) {
				const borderOffset = 5;
				if (usePerfectShapes) {
					ctx.strokeStyle = colors[colorTheme][2];
					ctx.lineWidth = 2;
					ctx.strokeRect(Math.round(cameraX-borderOffset + camShakeX * 0.5 * shakeMultiplier), 
						Math.round(cameraY-borderOffset + camShakeY * 0.5 * shakeMultiplier), 
						horWidth + borderOffset + levelMargin, verHeight + borderOffset + levelMargin);
				} else {
					// roughCanvas.rectangle(Math.round(cameraX-borderOffset + camShakeX * 0.5 * shakeMultiplier), Math.round(cameraY-borderOffset + camShakeY * 0.5 * shakeMultiplier), 
					// 	horWidth + borderOffset + levelMargin, verHeight + borderOffset + levelMargin, {stroke: colors[colorTheme][2], seed: roughSeed});
					ctx.strokeStyle = colors[colorTheme][2];
					ctx.lineWidth = 2;
					ctx.strokeRect(Math.round(cameraX-borderOffset + camShakeX * 0.5 * shakeMultiplier), 
						Math.round(cameraY-borderOffset + camShakeY * 0.5 * shakeMultiplier), 
						horWidth + borderOffset + levelMargin, verHeight + borderOffset + levelMargin);
				}
			}
			ctx.globalAlpha = alph;

			//Draw rectangle
			if (!sandboxMode && menuOpened) {
				ctx.globalAlpha = 0.4;
				ctx.fillStyle = colors[colorTheme][1];
				ctx.fillRect(-1, -1, canvas.width + 2, canvas.height + 2);
				ctx.globalAlpha = 1;
			}

			//Draw level name
			if (!titleScreen && !sandboxMode) {  // Add !sandboxMode here
				ctx.textAlign = "left";
				ctx.font = (40 * zoom) + fontDefault;
				ctx.globalAlpha = EaseInOut(timeSinceLevelNameChanged / timeToDisplayLevelName);
				drawStroked(ctx, levelName, 40, canvas.height - 40);
				ctx.globalAlpha = 1;
			}

			ctx.font = 22 + fontDefault;
			ctx.fillStyle = colors[colorTheme][1];
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";

			//Draw title screen
			if (splashScreen) {
				ctx.fillStyle = "#242424";
				ctx.fillRect(0,0, canvas.width, canvas.height);
				ctx.font = Math.round(scale * 0.5) + fontDefault;
				ctx.textAlign = "center";
				if (splashScreenImageLoaded) {
					ctx.drawImage(splashScreenImage, canvas.width * 0.5 - 400, canvas.height * 0.5 - 300);
					drawStroked(ctx, "Click anywhere to continue!",canvas.width * .5,canvas.height * .8);
				} else {

					drawStroked(ctx, "Loading...",canvas.width * .5,canvas.height * .6);
				}
			}
			else if (titleScreen) {
				ctx.font = Math.round(scale * 1.2) + fontDefault;
				ctx.textAlign = "left";
				ctx.textBaseline = "center";
				ctx.fillStyle = "black";
				ctx.globalAlpha = 1;
				var txt = gameName;

				var textWidth = ctx.measureText(txt).width;
				var amount = Math.ceil(canvas.width / textWidth)+1;

				txt = txt.repeat(amount);

				var startX = 0;
				var startX = (timing.timePlaying % 5) / 5;


				drawStroked(ctx, txt,-startX * textWidth,canvas.height * .5);

				ctx.font = Math.round(scale * 0.5) + fontDefault;
				ctx.textAlign = "center";
				drawStroked(ctx, subTitle,canvas.width * .5,canvas.height * .6);
				// REMOVE THIS LINE:
				//drawStroked(ctx, "[S] Sandbox Mode",canvas.width * .5,canvas.height * .7);
			}
			else if (sandboxMode) {
				// Draw level grid in real-time
				if (sandboxLevel) {
					var localScale = scale;
					var horWidth = sandboxGridWidth * localScale;
					var verHeight = sandboxGridHeight * localScale;
					var levelMargin = 20;
					var cameraX = Math.round(canvas.width * 0.5 - horWidth * 0.5 - levelMargin * 0.5);
					var cameraY = Math.round(canvas.height * 0.5 - verHeight * 0.5 - levelMargin * 0.5);
					
					// Draw grid
					for (let y = 0; y < sandboxGridHeight; y++) {
						for (let x = 0; x < sandboxGridWidth; x++) {
							var cellType = sandboxLevel[y][x];
							var drawX = cameraX + 10 + x * localScale;
							var drawY = cameraY + 10 + y * localScale;
							
							// Draw based on cell type
							if (cellType == obj.WALL) {
								ctx.drawImage(wallCanvas, drawX - wallMargin * 0.5, drawY - wallMargin * 0.5);
							} else if (cellType == obj.BOX || cellType == obj.SHIFTBOXHOR || cellType == obj.SHIFTBOXVER || cellType == obj.SHIFTBOX) {
								ctx.drawImage(boxCanvas, drawX - boxMargin * 0.5, drawY - boxMargin * 0.5);
								if (cellType == obj.SHIFTBOXHOR || cellType == obj.SHIFTBOX) {
									roughCanvas.line(drawX + localScale * 0.2, drawY + localScale * 0.5, 
										drawX + localScale * 0.8, drawY + localScale * 0.5, 
										{stroke: colors[colorTheme][4], strokeWidth: localScale / 7, seed: roughSeed});
								}
								if (cellType == obj.SHIFTBOXVER || cellType == obj.SHIFTBOX) {
									roughCanvas.line(drawX + localScale * 0.5, drawY + localScale * 0.2, 
										drawX + localScale * 0.5, drawY + localScale * 0.8, 
										{stroke: colors[colorTheme][4], strokeWidth: localScale / 7, seed: roughSeed});
								}
							} else if (cellType == obj.TARGET) {
								ctx.drawImage(targetCanvas, drawX - targetMargin * 0.5, drawY - targetMargin * 0.5);
							} else if (cellType == obj.RUBBLE) {
								ctx.drawImage(rubbleCanvas, drawX - rubbleMargin * 0.5, drawY - rubbleMargin * 0.5);
							} else if (cellType == obj.PLAYER) {
								ctx.drawImage(playerCanvas, drawX, drawY);
							}
						}
					}
					
					// Draw border
					if (usePerfectShapes) {
						ctx.strokeStyle = colors[colorTheme][2];
						ctx.lineWidth = 2;
						ctx.strokeRect(cameraX - 5, cameraY - 5, horWidth + 15 + levelMargin, verHeight + 15 + levelMargin);
					} else {
						roughCanvas.rectangle(cameraX - 5, cameraY - 5, 
							horWidth + 15 + levelMargin, verHeight + 15 + levelMargin, 
							{stroke: colors[colorTheme][2], seed: roughSeed});
					}
					
					// Draw resize arrows
					ctx.font = 30 + fontDefault;
					ctx.textAlign = "center";
					ctx.fillStyle = colors[colorTheme][2];
					ctx.fillText("→", cameraX + horWidth + 15, cameraY + verHeight/2);
					ctx.fillText("←", cameraX - 15, cameraY + verHeight/2);
					ctx.fillText("↓", cameraX + horWidth/2, cameraY + verHeight + 15);
					ctx.fillText("↑", cameraX + horWidth/2, cameraY - 15);
				}
				
				// Draw toolbar at BOTTOM
				var toolbarY = canvas.height - 60;
				var toolbarItemWidth = 150;
				ctx.font = 18 + fontDefault;
				ctx.textAlign = "center";
				
				for (let i = 0; i < toolbarItems.length; i++) {
					var toolX = 10 + i * toolbarItemWidth;
					
					if (selectedTool == toolbarItems[i].type) {
						ctx.fillStyle = colors[colorTheme][2];
						ctx.fillRect(toolX, toolbarY, toolbarItemWidth - 5, 50);
					}
					ctx.fillStyle = selectedTool == toolbarItems[i].type ? colors[colorTheme][1] : colors[colorTheme][2];
					ctx.fillText((i+1) + ". " + toolbarItems[i].name, toolX + toolbarItemWidth/2 - 2, toolbarY + 30);
				}
				
				// Draw controls at top
				ctx.textAlign = "right";
				ctx.fillStyle = colors[colorTheme][2];
				ctx.font = 20 + fontDefault;
				ctx.fillText("[P] Play Level", canvas.width - 20, 40);
				ctx.fillText("[G] Grid Size", canvas.width - 20, 70);
				//ctx.fillText("[Esc] Menu", canvas.width - 20, 100);
				ctx.fillText("Right Click: Delete", canvas.width - 20, 130);
				
				ctx.textAlign = "left";
				ctx.fillText("X Offset: " + sandboxOffsetX + " [Q/W]", 20, 40);
				ctx.fillText("Y Offset: " + sandboxOffsetY + " [Z/X]", 20, 70);
				
				// Size dialog with selection system
				if (showSizeDialog) {
					ctx.globalAlpha = 0.7;
					ctx.fillStyle = colors[colorTheme][1];
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.globalAlpha = 1;
					
					ctx.fillStyle = colors[colorTheme][2];
					ctx.fillRect(canvas.width/2 - 150, canvas.height/2 - 100, 300, 200);
					
					ctx.fillStyle = colors[colorTheme][1];
					ctx.font = 24 + fontDefault;
					ctx.textAlign = "center";
					ctx.fillText("Grid Size", canvas.width/2, canvas.height/2 - 60);
					
					// Track which field is selected (0 = width, 1 = height)
					if (!window.gridSizeSelection) window.gridSizeSelection = 0;
					
					// Draw width with selection indicator
					if (window.gridSizeSelection === 0) {
						ctx.fillStyle = colors[colorTheme][1];
						ctx.fillText("> Width: " + sandboxGridWidth + " <", canvas.width/2, canvas.height/2 - 20);
					} else {
						ctx.fillStyle = colors[colorTheme][3];
						ctx.fillText("Width: " + sandboxGridWidth, canvas.width/2, canvas.height/2 - 20);
					}
					
					// Draw height with selection indicator
					if (window.gridSizeSelection === 1) {
						ctx.fillStyle = colors[colorTheme][1];
						ctx.fillText("> Height: " + sandboxGridHeight + " <", canvas.width/2, canvas.height/2 + 20);
					} else {
						ctx.fillStyle = colors[colorTheme][3];
						ctx.fillText("Height: " + sandboxGridHeight, canvas.width/2, canvas.height/2 + 20);
					}
					
					ctx.fillStyle = colors[colorTheme][1];
					ctx.font = 18 + fontDefault;
					ctx.fillText("[↑/↓] Select  [←/→] Change  [Enter] Confirm", canvas.width/2, canvas.height/2 + 70);
					
					if (confirmInput.fired && !confirmInput.wasHandled) {
						confirmInput.wasHandled = true;
						showSizeDialog = false;
						sandboxGridWidth = Math.max(3, Math.min(30, sandboxGridWidth));
						sandboxGridHeight = Math.max(3, Math.min(30, sandboxGridHeight));
						initializeSandboxLevel();
						window.gridSizeSelection = 0;
						audio(sfx.SELECT, true);
					}
					
					// Up/Down to select field - only when dialog is shown
					if (verticalInput.fired && !verticalInput.wasHandled) {
						verticalInput.wasHandled = true;
						if (verticalInput.delta === 1) {
							window.gridSizeSelection = Math.min(1, window.gridSizeSelection + 1);
						} else if (verticalInput.delta === -1) {
							window.gridSizeSelection = Math.max(0, window.gridSizeSelection - 1);
						}
					}
					
					// Left/Right to change value - only when dialog is shown
					if (horizontalInput.fired && !horizontalInput.wasHandled) {
						horizontalInput.wasHandled = true;
						if (window.gridSizeSelection === 0) {
							sandboxGridWidth += horizontalInput.delta;
							sandboxGridWidth = Math.max(3, Math.min(30, sandboxGridWidth));
						} else {
							sandboxGridHeight += horizontalInput.delta;
							sandboxGridHeight = Math.max(3, Math.min(30, sandboxGridHeight));
						}
					}
				}
			}
			else if (!menuOpened) {
				if (!victory) {
					//Menu
					if (usePerfectShapes) {
						ctx.save();
						ctx.fillStyle = colors[colorTheme][2];
						ctx.fillRect(-5, -5, 85, 85);
						ctx.restore();
					} else {
						//roughCanvas.rectangle(-5, -5, 85, 85, {fill: colors[colorTheme][2], fillWeight: 4, stroke: "none", seed: Math.round(roughSeed / 2)});
						ctx.save();
						ctx.fillStyle = colors[colorTheme][2];
						ctx.fillRect(-5, -5, 85, 85);
						ctx.restore();
					}
					ctx.fillText("[Esc]",50,60);
 
					if (level != 0) {
						if (!freshState) {
							ctx.globalAlpha = 1;
						} else {
							ctx.globalAlpha = 0.25;
						}

						//Reset
						if (usePerfectShapes) {
							ctx.save();
							ctx.fillStyle = colors[colorTheme][2];
							ctx.fillRect(canvas.width-160, canvas.height - 80, 100, 50);
							ctx.restore();
						} else {
							//roughCanvas.rectangle(canvas.width-160, canvas.height - 80, 100, 50, {fill: colors[colorTheme][2], fillWeight: 4, stroke: "none", seed: Math.round(roughSeed / 2)});
							ctx.save();
							ctx.fillStyle = colors[colorTheme][2];
							ctx.fillRect(canvas.width-160, canvas.height - 80, 100, 50);
							ctx.restore();
						}
						ctx.fillText("[R] Retry",canvas.width-110,canvas.height - 55);

						if (undoStack.length > 0) {
							ctx.globalAlpha = 1;
						} else {
							ctx.globalAlpha = 0.25;
						}
						//Undo
						if (usePerfectShapes) {
							ctx.save();
							ctx.fillStyle = colors[colorTheme][2];
							ctx.fillRect(canvas.width-280, canvas.height - 80, 100, 50);
							ctx.restore();
						} else {
							//roughCanvas.rectangle(canvas.width-280, canvas.height - 80, 100, 50, {fill: colors[colorTheme][2], fillWeight: 4, stroke: "none", seed: Math.round(roughSeed / 2) + 10});
							ctx.save();
							ctx.fillStyle = colors[colorTheme][2];
							ctx.fillRect(canvas.width-280, canvas.height - 80, 100, 50);
							ctx.restore();
						}
						ctx.fillText("[Z] Undo",canvas.width-230,canvas.height - 55);
						}
					}
				} else {
				ctx.globalAlpha = 1;
				var growth = 1;
				if (!reduceMotion) {
					var growth = EaseInOut(timeSinceMenuToggled / timeToToggleMenu);
				}
				var width = 400 * growth;
				//roughCanvas.rectangle(-5, -5, width + 5, 55 + 250 * growth, {fill: colors[colorTheme][2], fillWeight: 4, stroke: "none"}); //, seed: Math.round(roughSeed / 2)

				var textBase = 50;
				var textOffset = 50 * growth;
				ctx.globalAlpha = growth;
				if (usePerfectShapes) {
					ctx.save();
					ctx.fillStyle = colors[colorTheme][2];
					ctx.fillRect(canvas.width-40, canvas.height - 80, 100, 50);
					ctx.restore();
				} else {
					// roughCanvas.rectangle(20, textBase * 0.5 + menuSelection * textOffset, width - 40, textOffset, {fillStyle: "none", stroke: colors[colorTheme][1], seed: roughSeed});
					ctx.save();
					ctx.fillStyle = colors[colorTheme][2];
					ctx.fillRect(canvas.width - canvas.width, canvas.height - canvas.height, 400, 300);
					ctx.restore();
					ctx.save();
					ctx.save();
					ctx.strokeStyle = colors[colorTheme][1]; // stroke color replaces rough stroke
					ctx.lineWidth = 2; // optional, adjust as needed
					ctx.strokeRect(
						20, 
						textBase * 0.5 + menuSelection * textOffset, 
						width - 40, 
						textOffset
					);
					ctx.restore();

				}	
				

				ctx.fillStyle = colors[colorTheme][1];
				ctx.textAlign = "center";

				var txt = "Audio: ";
				if (audioEnabled == true) {
					txt += "ON";
				} else {
					txt += "OFF";
				}
				ctx.fillText(txt, width * 0.5,textBase + textOffset * 1);

				ctx.fillText("[Esc] Resume", width * 0.5,textBase);
				var txt = "Reduce Motion: ";
				if (reduceMotion == true) {
					txt += "ON";
				} else {
					txt += "OFF";
				}
				ctx.fillText(txt, width * 0.5,textBase + textOffset * 2);

				txt = "Theme: "+colors[colorTheme][0] + " ("+(colorTheme+1) + "/" + colors.length + ")";
				ctx.fillText(txt, width * 0.5,textBase + textOffset * 3);

				if (level == 999) {
					ctx.fillText("Exit Sandbox", width * 0.5, textBase + textOffset * 4 );
				} else if (level != 0) {
					ctx.fillText("Back to Level Select", width * 0.5, textBase + textOffset * 4 );
				} else {
					ctx.font = 16 + fontDefault;
					ctx.fillText("Game by Death - v1.0.0", width * 0.5, textBase + textOffset * 3.8);
				}

				ctx.globalAlpha = 1;
			}
		}
	
		previousScale = localScale;
		window.requestAnimationFrame(gameLoop);
	}
	catch (e) {
		console.error("Whoops! The game crashed.", e);
		console.log("Please report this information to the dev. (It might contain some personal information.)");
		console.log("Your user agent is:",navigator.userAgent);
		console.log("Are your cookies enabled?",navigator.cookieEnabled);
		
		const canvas = document.getElementById("canvas");
		if (canvas) {
			console.log("Size of the canvas:",{width: canvas.width, height: canvas.height});
			ctx.font = "24px sans-serif";
			ctx.fillStyle = "red";
			ctx.textAlign = "center";
			ctx.fillText("Whoops, the game crashed! See the console for more info.",canvas.clientWidth/2,50);
		}
	}
};



window.requestAnimationFrame(gameLoop);

function drawLevel(rootX,rootY, gridWidth, gridHeight, localScale) {

	function drawWrapped(object, drawFunction) {
		drawFunction(0,0);

		if (autoScrollX || autoScrollY) {return;}

		if (object.x <= 0.5) {
			var wrapY = ((object.y + levelOffsetY + gridHeight) % gridHeight) - object.y;
			drawFunction(gridWidth * localScale, wrapY * localScale);
		} else if (object.x >= gridWidth-1.5) {
			var wrapY = ((object.y - levelOffsetY + gridHeight) % gridHeight) - object.y;
			drawFunction(-gridWidth * localScale, wrapY * localScale);
		}
		
		if (object.y <= 0.5) {
			var wrapX = ((object.x + levelOffsetX + gridWidth) % gridWidth) - object.x;
			drawFunction(wrapX * localScale, gridHeight * localScale);
		} else if (object.y >= gridHeight-1.5) {
			var wrapX = ((object.x - levelOffsetX + gridWidth) % gridWidth) - object.x;
			drawFunction(wrapX * localScale, -gridHeight * localScale);
		}
	}

	var off = 10;

	var playerTween = tweenPlayer();

	//Path
	if (undoStack.length > 0) {// && !reduceMotion
		var lnt = steps.length;
		var last = steps.lastIndexOf(" ");
		var tot = lnt - last;

		var amt = Clamp(undoStack.length, 1, 7);
		amt = Math.min(amt, tot);
		for(var i = 0; i < amt; i += 1) {
			var index = undoStack.length - amt + i;

			if (index < 0 || index > undoStack.length || index > steps.length) {
				break;
			}

			var percent = 1;
			if (index == undoStack.length-1) {
				percent = timeSinceLastAction / timeToCompleteTween;
			};

			var blend = Math.max(0.01, ((i + (percent)) / (amt)) * 0.25 - ((1 / amt * 0.25)));
			var clr = blendColors(colors[colorTheme][1], colors[colorTheme][3], blend);

			var p1 = {x: undoStack[index].player.x, y: undoStack[index].player.y};
			var p2 = {x: undoStack[index].player.x, y: undoStack[index].player.y};

			switch (steps[index].toLowerCase()) {
				case "u":
					p1.y += 0.2;
					p2.y -= 1.2 * percent; break;
				case "d":
					p1.y -= 0.2;
					p2.y += 1.2 * percent; break;
				case "l":
					p1.x += 0.2;
					p2.x -= 1.2 * percent; break;
				case "r":
					p1.x += 0.2;
					p2.x += 1.2 * percent; break;
			}

			function drawLine(offsetX = 0, offsetY = 0) {
				roughPath.line(PosX(p1.x + .5)+offsetX, PosY(p1.y + .5) +offsetY, PosX(p2.x + .5) +offsetX, PosY(p2.y + .5) +offsetY, {strokeWidth: localScale * 0.4, stroke: clr, seed: roughSeed+i, roughness: 0.75});
			}

			drawWrapped(p1, drawLine);
		}
	}

	//Rubble
	for(let i = 0; i != rubble.length; i++) {
		levelCtx.drawImage(rubbleCanvas, PosX(rubble[i].x) - rubbleMargin * 0.5, PosY(rubble[i].y) - rubbleMargin * 0.5);
	}

	//Target
	for(let i = 0; i != targets.length; i++) {
		if (hasBox(targets[i].x, targets[i].y)) {
			levelCtx.globalAlpha = 1;
		} else {
			levelCtx.globalAlpha = 0.7;
		}
		levelCtx.drawImage(targetCanvas, PosX(targets[i].x) - targetMargin * 0.5, PosY(targets[i].y) - targetMargin * 0.5);
	}

	levelCtx.globalAlpha = 1;

	//Gate image
	for(let i = 0; i != gates.length; i++) {
		if (gates[i].target <= amountOfLevelsSolved) {
			levelCtx.globalAlpha = 0.2;
		} else {
			levelCtx.globalAlpha = 1;
		}
		levelCtx.drawImage(boxCanvas, PosX(gates[i].x) - boxMargin * 0.5, PosY(gates[i].y) - boxMargin * 0.5);
	}
	levelCtx.globalAlpha = 1;

	//Walls
	for(let i = 0; i != walls.length; i++) {
		levelCtx.drawImage(wallCanvas, PosX(walls[i].x) - wallMargin * 0.5, PosY(walls[i].y) - wallMargin * 0.5);
	}

	//LevelNode image
	for(let i = 0; i != levelNodes.length; i++) {
		if (player.x == levelNodes[i].x && player.y == levelNodes[i].y) {
			levelCtx.globalAlpha = 1;
		} else {
			levelCtx.globalAlpha = 0.7;
		}
		levelCtx.drawImage(targetCanvas, PosX(levelNodes[i].x) - targetMargin * 0.5, PosY(levelNodes[i].y) - targetMargin * 0.5);
	}
	levelCtx.globalAlpha = 1;

	//Player
	function drawPlayer(offsetX = 0, offsetY = 0) {
		levelCtx.drawImage(playerCanvas, PosX(playerTween.x) + offsetX + camShakeX, 
		PosY(playerTween.y) + offsetY + camShakeY);
	}

	drawWrapped(player, drawPlayer);

	//Boxes
	for(let i = 0; i != boxes.length; i++) {
		var boxTween = tweenBox(i);

		function drawBox(offsetX = 0, offsetY = 0) {
			levelCtx.drawImage(boxCanvas, PosX(boxTween.x) - boxMargin * .5 + offsetX, 
				PosY(boxTween.y) - boxMargin * 0.5 + offsetY);
			if (boxes[i].shift == 1 || boxes[i].shift == 3) {
				roughLevel.line(PosX(boxTween.x) + localScale * 0.2 + offsetX, PosY(boxTween.y) + localScale * 0.5 + offsetY, 
					PosX(boxTween.x) + localScale * 0.8 + offsetX, PosY(boxTween.y) + localScale * 0.5 + offsetY, 
					{stroke: colors[colorTheme][4], strokeWidth: localScale / 7, seed: roughSeed})
			}
			if (boxes[i].shift == 2 || boxes[i].shift == 3) {
				roughLevel.line(PosX(boxTween.x) + localScale * 0.5 + offsetX, PosY(boxTween.y) + localScale * 0.2 + offsetY, 
					PosX(boxTween.x) + localScale * 0.5 + offsetX, PosY(boxTween.y) + localScale * 0.8 + offsetY, 
					{stroke: colors[colorTheme][4], strokeWidth: localScale / 7, seed: roughSeed})
			}
		}
		
		drawWrapped(boxes[i], drawBox);
	}

	//LevelNode text
	levelCtx.textAlign = "center";
	levelCtx.textBaseline = "middle";
	levelCtx.fillStyle = colors[colorTheme][2];
	levelCtx.globalAlpha = 1;
	for(let i = 0; i != levelNodes.length; i++) {
		//drawStroked()
		levelCtx.font = Math.round(0.5 * localScale) + fontDefault;
		
		// Get the level data safely
		var targetLevel = levelNodes[i].target;
		var levelData = levels[targetLevel];
		var displayText = "";
		
		if (levelData && levelData[0] && levelData[0].nr !== undefined) {
			displayText = levelData[0].nr.toString();
		} else if (targetLevel === 25) {
			displayText = "S"; // "S" for Sandbox
		} else {
			displayText = "?";
		}
		
		levelCtx.fillText(displayText, PosX(levelNodes[i].x) + targetCanvas.width * 0.5 - targetMargin * 0.5, PosY(levelNodes[i].y) - targetMargin * 0.5 + targetCanvas.height * 0.5);
		
		if (levelSolved[i+1] == 2) {
			levelCtx.font = Math.round(0.4 * localScale)+ fontDefault;
			levelCtx.fillText("✓", PosX(levelNodes[i].x) + targetCanvas.width * 0.75 - targetMargin * 0.5, PosY(levelNodes[i].y) - targetMargin * 0.5 + targetCanvas.height * 0.75);
		} else if (levelSolved[i+1] == 0) {
			levelCtx.font = "bold " + Math.round(0.25 * localScale)+ fontDefault;
			levelCtx.fillText("New!", PosX(levelNodes[i].x) + targetCanvas.width * 0.5 - targetMargin * 0.5, PosY(levelNodes[i].y) - targetMargin * 0.5 + targetCanvas.height * 0.775);
		}
	}

	//Gates text
	levelCtx.font = Math.round(0.4 * localScale)+ fontDefault;
	levelCtx.textAlign = "center";
	levelCtx.textBaseline = "middle";
	levelCtx.fillStyle = colors[colorTheme][2];
	for(let i = 0; i != gates.length; i++) {
		if (gates[i].target <= amountOfLevelsSolved) {
			levelCtx.globalAlpha = 1;
		} else {
			levelCtx.globalAlpha = 1;
		}
		drawStroked(levelCtx, amountOfLevelsSolved + "/" + gates[i].target, PosX(gates[i].x) + boxCanvas.width * 0.5 - boxMargin * 0.5, PosY(gates[i].y) - boxMargin * 0.5 + boxCanvas.height * 0.5)
	}
	levelCtx.globalAlpha = 1;

	function tweenPlayer() {
		if (undoStack.length > 0) {
			var lastState = undoStack[undoStack.length-1];
			var source = lastState.player;
			return tweenObject(player, source);
		}
		else {
			return({x: player.x, y: player.y});
		}
	}

	function tweenBox(id) {
		if (undoStack.length > 0) {
			var lastState = undoStack[undoStack.length-1];
			var source = lastState.boxes[id];
			return tweenObject(boxes[id], source);
		}
		else {
			return({x: boxes[id].x, y: boxes[id].y});
		}
	}

	function tweenObject(current, source) {
		var percent = 1-Clamp((timeSinceLastAction / timeToCompleteTween), 0, 1);

		if (percent != 0) {
			var diffX = Math.round(current.x - source.x);
			var diffY = Math.round(current.y - source.y);

			if (diffX != 0 && diffY != 0) {
				if (prevHorDelta != 0) {
					diffX -= Math.sign(diffX) * gridWidth;
					diffY = 0;
				} else {
					diffY -= Math.sign(diffY) * gridHeight;
					diffX = 0;
				}
			} else if (Math.abs(diffX) > 1) {
				diffX -= Math.sign(diffX) * gridWidth;
			} else if (Math.abs(diffY) > 1) {
				diffY -= Math.sign(diffY) * gridHeight;
			}

			percent = EaseInOut(percent);

			return ({x: current.x - (diffX * percent), y: current.y - (diffY * percent)});
		} else {
			return({x: current.x, y: current.y});
		}
	}

	function PosX(val) {
		return (rootX + off + val * localScale);
	}

	function PosY(val) {
		return (rootY + off + val * localScale);
	}
}

function input(event) {
	if (victory) {return;}
	// Ignore all non-sandbox editor inputs
	if (sandboxMode) {
		// Only allow editor-related keys to work, block game menu or level select
		const allowedKeys = ["p", "P", "g", "G", "q", "Q", "w", "W", "z", "Z", "x", "X", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Escape","1","2","3","4","5","6","7","8","9","0"];
		if (!allowedKeys.includes(event.key)) {
			event.preventDefault();
			return;
		}
	}

	// Sandbox mode input handling
	if (sandboxMode && !showSizeDialog && !menuOpened) {
		var key = event.key;
		if (key >= '1' && key <= '9') {
			var index = parseInt(key) - 1;
			if (index < toolbarItems.length) {
				selectedTool = toolbarItems[index].type;
			}
		}
		if (key == 'p' || key == 'P') {
			playSandboxLevel();
			return;
		}
		if (key == 'g' || key == 'G') {
			showSizeDialog = true;
			return;
		}
		if (key == 'q' || key == 'Q') {
			sandboxOffsetX--;
			dirtyRender = true;
			// Update the stored state immediately
			if (window.savedSandboxState) {
				window.savedSandboxState.offsetX = sandboxOffsetX;
			}
			return;
		}
		if (key == 'w' || key == 'W') {
			sandboxOffsetX++;
			dirtyRender = true;
			// Update the stored state immediately
			if (window.savedSandboxState) {
				window.savedSandboxState.offsetX = sandboxOffsetX;
			}
			return;
		}
		if (key == 'z' || key == 'Z') {
			sandboxOffsetY--;
			dirtyRender = true;
			// Update the stored state immediately
			if (window.savedSandboxState) {
				window.savedSandboxState.offsetY = sandboxOffsetY;
			}
			return;
		}
		if (key == 'x' || key == 'X') {
			sandboxOffsetY++;
			dirtyRender = true;
			// Update the stored state immediately
			if (window.savedSandboxState) {
				window.savedSandboxState.offsetY = sandboxOffsetY;
			}
			return;
		}
	}
		if (titleScreen && !splashScreen) {
		audio(sfx.SELECT, true);
		titleScreen = false;
		return;
	}
	var key = event.key;
	var code = event.code;

	dirtyRender = true;

	if (key === "Escape") {
		timeSinceMenuToggled = 0.1;

		// Prevent menu toggle while editing sandbox
		if (sandboxMode) {
			audio(sfx.BACK, true);  // Fixed: was audiosfx.BACK
			return;
		}

		// If in sandbox play mode (level 999 only), exit back to sandbox editor
		if (level === 999 && !sandboxMode) {
			exitSandbox();
			audio(sfx.BACK, true);  // Fixed: was audiosfx.BACK
			return;
		}

		menuOpened = !menuOpened;
		if (menuOpened) audio(sfx.MENU, true);  // Fixed: was audiosfx.MENU
		else audio(sfx.SELECT, true);  // Fixed: was audiosfx.SELECT

		horizontalInput.reset();
		verticalInput.reset();
		undoInput.reset();
		timeSinceMenuToggled = 0;
		menuSelection = 0;
	}


	if (!menuOpened) {
		if (code == "KeyR") {
			if (!freshState) {
				audio(sfx.RESTART);
				undoStack.push({player: player, boxes: boxes.slice(), xOff: levelOffsetX, yOff: levelOffsetY});
				horizontalInput.reset();
				verticalInput.reset();
				undoInput.reset();
				loadLevel(level, false);
			}
			return;
		} else if (event.shiftKey && key == "n" || key == "N") {
			loadLevel(Math.min(level + 1, levels.length-1 ));
			return;
		} else if (event.shiftKey && key == "b" || key == "B") {
			loadLevel(Math.max(level - 1, 0 ));
			return;
		}
	}
}

function loadLevel(number, resetStack = true) {
	level = number;

	// Check if entering sandbox mode (level 25 or last level)
	if ((number == 25 || number == levels.length - 1) && !sandboxMode) {
		enterSandboxMode();
		return;
	}
	
	// If already in sandbox mode and trying to load level 999, skip normal level loading
	if (number == 999 && sandboxMode) {
		return;
	}

	var levelToLoad = levels[number].slice();
	var metadata = levelToLoad.shift();

	if (levelSolved[level] == 0) {
		levelSolved[level] = 1;
	}

	saveGame();

	dirtyRender = true;
	
	player = {x: 0, y: 0};
	walls.length = 0;
	boxes.length = 0;
	targets.length = 0;
	levelNodes.length = 0;
	rubble.length = 0;
	gates.length = 0;

	camShakeX = 0;
	camShakeY = 0;

	freshState = true;

	victory = false;

	setLevelName(level);

	if (levelSolved[level] == 2 && level != 0) {
		levelName += " ✓";
	}

	if (metadata.xOff) {
		levelOffsetX = metadata.xOff;
	} else {
		levelOffsetX = 0;
	}

	if (metadata.yOff) {
		levelOffsetY = metadata.yOff;
	} else {
		levelOffsetY = 0;
	}

	if (metadata.autoX) {
		autoScrollX = metadata.autoX;
	} else {
		autoScrollX = 0;
	}

	if (metadata.autoY) {
		autoScrollY = metadata.autoX;
	} else {
		autoScrollY = 0;
	}

	var placedPlayer = false;
	var levelsPlaced = null;
	if (metadata.levelSpread) {
		var levelsPlaced = metadata.levelSpread.slice();
	}
	var gatesPlaced = 0;

	function checkPlayer(x, y, lvl) {
		if (lvl == targetLevel && !placedPlayer) {
			player = {x: x, y: y};
			placedPlayer = true;

			// Check if it's the sandbox level
			if (targetLevel === 25) {
				levelName = " ";
			} else if (levels[targetLevel] && levels[targetLevel][0]) {
				levelName = levels[targetLevel][0].nr + ": " + levels[targetLevel][0].name + " - [Space] to enter";
			} else {
				levelName = "Unknown Level - [Space] to enter";
			}
			timeSinceLevelNameChanged = 0;
		}
	}

	gridHeight = levelToLoad.length;
	gridWidth = 0;

	for(let y = 0; y < gridHeight; y++) {
		gridWidth = Math.max(gridWidth, levelToLoad[y].length);
		for(let x = 0; x < levelToLoad[y].length; x++) {
			var str = levelToLoad[y].substring(x,x+1).toLowerCase();
			switch (str) {
				case obj.PLAYER:
					if (!placedPlayer) {
						player = {x: x, y: y};
					}
					break;
				case obj.WALL:
					walls.push({x: x, y: y});
					break;
				case obj.BOX:
					boxes.push({x: x, y: y, shift: 0});
					break;
				case obj.SHIFTBOXHOR:
					boxes.push({x: x, y: y, shift: 1});
					break;
				case obj.SHIFTBOXVER:
					boxes.push({x: x, y: y, shift: 2});
					break;
				case obj.SHIFTBOX:
					boxes.push({x: x, y: y, shift: 3});
					break;
				case obj.TARGET:
					targets.push({x: x, y: y});
					break;
				case obj.LEVELONE:
					levelNodes.push({x: x, y: y, target: levelsPlaced[0]});
					checkPlayer(x, y, levelsPlaced[0]);
					levelsPlaced[0]++;
					break;
				case obj.LEVELTWO:
					AddLevelNode(1, x, y);
					break;
				case obj.LEVELTHREE:
					AddLevelNode(2, x, y);
					break;
				case obj.LEVELFOUR:
					AddLevelNode(3, x, y);
					break;
				case obj.LEVELFIVE:
					AddLevelNode(4, x, y);
					break;
				case obj.LEVELSIX:
					AddLevelNode(5, x, y);
					break;
				case obj.LEVELSEVEN:
					levelNodes.push({x: x, y: y, target: 25}); // Directly target level 25 (sandbox)
					checkPlayer(x, y, 25);
					break;
				case obj.RUBBLE:
					rubble.push({x: x, y: y});
					break;
				case obj.GATE:
					gates.push({x: x, y: y, target: metadata.gates[gatesPlaced]});
					gatesPlaced++;
			}
		}
	}

	function AddLevelNode(worldNumber, x, y) {
		if (amountOfLevelsSolved < metadata.gates[worldNumber] && !forceUnlockAllLevels) {
			if (worldNumber != 0 && amountOfLevelsSolved < metadata.gates[worldNumber-1] || worldNumber == 1) {
				targets.push({x: x, y: y});
			} else {
				gates.push({x: x, y: y, target: metadata.gates[worldNumber]});
			}
			return;
		}
		levelNodes.push({x: x, y: y, target: levelsPlaced[worldNumber]});
		checkPlayer(x, y, levelsPlaced[worldNumber]);
		levelsPlaced[worldNumber]++;
	}

	if (resetStack) {
		undoStack = [];
		steps = "";
		timeSinceLevelStart = 0;
		timeSinceLevelWon = timeUntilLevelEnd;
	} else {
		steps += " ";
	}
}

function wrapCoords(newX, newY) {
	function wrapX() {
		if (newX >= gridWidth) {
			newX -= gridWidth;
			newY -= levelOffsetY;
			return true;
		} else if (newX < 0) {
			newX += gridWidth;
			newY += levelOffsetY;
			return true;
		}
		return false;
	}

	function wrapY() {
		if (newY >= gridHeight) {
			newY -= gridHeight;
			newX -= levelOffsetX;
			return true;
		} else if (newY < 0) {
			newY += gridHeight;
			newX += levelOffsetX;
			return true;
		}
		return false;
	}

	var wrappedOnX = wrapX();
	var wrappedOnY = wrapY();
	if (!wrappedOnX && wrappedOnY) {
		wrapX();
	}

	return {x: newX, y: newY, wrapped: (wrappedOnX || wrappedOnY)}
}

function hasThing(array, x, y) { //Returns INDEX, not OBJECT!
	for(let i = 0; i != array.length; i++) {
		if (array[i].x == x && array[i].y == y) {
			return i;
		}
	}
	return null;
}

function hasWall(x, y) { //Returns INDEX, not OBJECT!
	return hasThing(walls, x, y)
}

function hasBox(x, y) { //Returns INDEX, not OBJECT!
	return hasThing(boxes, x, y)
}

function hasTarget(x, y) { //Returns INDEX, not OBJECT!
	return hasThing(targets, x, y)
}

function hasLevelNode(x, y) { //Returns INDEX, not OBJECT!
	return hasThing(levelNodes, x, y)
}

function hasRubble(x, y) { //Returns INDEX, not OBJECT!
	return hasThing(rubble, x, y)
}

function hasClosedGate(x, y) { //Returns INDEX, not OBJECT!
	var gate = hasThing(gates, x, y);
	if (gates[gate] != null) {
		if (gates[gate].target <= amountOfLevelsSolved) {
			return null;
		}
	}
	return gate;
}

function even(val) {
	return ((val % 2) == 0)
}

function EaseInOut(t) {
	return(t*(2-t));
}

//From https://stackoverflow.com/questions/13627111/drawing-text-with-an-outer-stroke-with-html5s-canvas
function drawStroked(ctx, text, x, y) {
	ctx.miterLimit = 2;
	ctx.strokeStyle = colors[colorTheme][2];
	ctx.lineWidth = 8;
	ctx.strokeText(text, x, y);
	ctx.fillStyle = colors[colorTheme][1];
	ctx.fillText(text, x, y);
}

function MovePlayer(horDelta, verDelta) {
	var dir = "";

	if (horDelta == -1) {dir = "l"}
	else if (horDelta == 1) {dir = "r"}
	else if (verDelta == 1) {dir = "d"}
	else if (verDelta == -1) {dir = "u"}
	else {console.warn("MovePlayer was not called with valid arguments.")}

	if (horDelta != 0 || verDelta != 0) {
		undoStack.push({player: player, boxes: boxes.slice(), xOff: levelOffsetX, yOff: levelOffsetY}); //Other objects can't move, so aren't stored.

		var movementResolved = false;
		var boxPushed = false;

		prevLevelOffsetX = 0;
		prevLevelOffsetY = 0;

		var target = wrapCoords(player.x + horDelta, player.y + verDelta);
		var targetX = target.x;
		var targetY = target.y;

		// 1. ADD THIS VARIABLE near the top of your code (around line 50 with other config variables):
		var maxBoxPushCount = 6; // Change this number to set how many boxes can be pushed at once
		
		
		// 2. REPLACE the box-checking section in MovePlayer function (around line 1065-1080)
		// Find this part and replace it:
		
		// NEW: Check for a chain of boxes
		var boxChain = [];
		var checkX = targetX;
		var checkY = targetY;
		
		// Build the chain of boxes in the push direction
		for (let i = 0; i < maxBoxPushCount; i++) {
			let foundBox = hasBox(checkX, checkY);
			if (foundBox !== null) {
				boxChain.push(foundBox);
				// Check next position
				var nextPos = wrapCoords(checkX + horDelta, checkY + verDelta);
				checkX = nextPos.x;
				checkY = nextPos.y;
			} else {
				break; // No more boxes in chain
			}
		}
		
		// If we found boxes, try to push them
		if (boxChain.length > 0) {
			// Check if the space after the last box is empty
			var finalTarget = wrapCoords(targetX + horDelta * boxChain.length, targetY + verDelta * boxChain.length);
			let finalX = finalTarget.x;
			let finalY = finalTarget.y;
		
			if (hasWall(finalX, finalY) === null && 
				hasBox(finalX, finalY) === null && 
				hasRubble(finalX, finalY) === null) {
				
				// Push all boxes in the chain (from back to front)
				for (let i = boxChain.length - 1; i >= 0; i--) {
					let boxIndex = boxChain[i];
					let newPos = wrapCoords(boxes[boxIndex].x + horDelta, boxes[boxIndex].y + verDelta);
					boxes[boxIndex] = {x: newPos.x, y: newPos.y, shift: boxes[boxIndex].shift};
				}
				
				player = {x: targetX, y: targetY};
				movementResolved = true;
				boxPushed = true;
		
				// ✅ Handle shift boxes for all boxes in the chain
				for (let i = 0; i < boxChain.length; i++) {
					let shiftType = boxes[boxChain[i]].shift;
					if (shiftType != 0) {
						if (shiftType == 1 || shiftType == 3) {
							ShiftX(horDelta);
						}
						if (shiftType == 2 || shiftType == 3) {
							ShiftY(verDelta);
						}
					}
				}
			}
		}



// REMOVE the old code that looked like this:
/*
		let foundBox = hasBox(targetX, targetY);
		if (foundBox !== null) {
			var boxTarget = wrapCoords(targetX + horDelta, targetY + verDelta);
			let boxTargetX = boxTarget.x;
			let boxTargetY = boxTarget.y;

			if (hasWall(boxTargetX, boxTargetY) === null && hasBox(boxTargetX, boxTargetY) === null && hasRubble(boxTargetX, boxTargetY) === null) {
				boxes[foundBox] = {x: boxTargetX, y: boxTargetY, shift: boxes[foundBox].shift};
				player = {x: targetX, y: targetY};
				movementResolved = true;
				boxPushed = true;

				if (boxes[foundBox].shift != 0) {
					if (boxes[foundBox].shift == 1 || boxes[foundBox].shift == 3) {
						ShiftX(horDelta);
					}
					
					if (boxes[foundBox].shift == 2 || boxes[foundBox].shift == 3) {
						ShiftY(verDelta);
					}
				}
			}
		}
*/
		else if (hasWall(targetX, targetY) === null) {
			player = {x: targetX, y: targetY};
			movementResolved = true;
		}
	}

	if (movementResolved) {
		if (!boxPushed) {
			steps += dir;
		} else {
			steps += dir.toUpperCase();
		}
		timeSinceLastAction = 0;

		prevHorDelta = horDelta;
		prevVerDelta = verDelta;

		freshState = false;

		if (level == 0) {
			if (hasClosedGate(targetX, targetY) !== null) {
				var gate = hasClosedGate(targetX, targetY);
				var leftToSolve = gates[gate].target - amountOfLevelsSolved;
				setLevelName(-leftToSolve,1);
			} else {
				var lvl = hasLevelNode(player.x, player.y);
				setLevelName(lvl,1);
			}
		}

		if (autoScrollX) {
			ShiftX(autoScrollX);
		} else if (autoScrollY) {
			ShiftY(autoScrollY);
		}

		//Check if won
		var hasWon = true;
		if (boxPushed && targets.length > 0) { //Only check win condition when a box has moved
			for(let i = 0; i != targets.length; i++) {
				if (hasBox(targets[i].x, targets[i].y) === null) {
					hasWon = false; break;
				}
			}
		} else {
			hasWon = false;
		}

		if (hasWon) {
			// Skip victory screen for sandbox levels
			if (level == 999) {
				exitSandbox();
				audio(sfx.VICTORY, true);
				return;
			}
			
			if (levelSolved[level] != 2) {
				levelSolved[level] = 2;
				amountOfLevelsSolved++;
			}
			saveGame();

			audio(sfx.VICTORY, true);
			victory = true;
			timeSinceLevelWon = 0;
		} else {
			if (boxPushed) {
				if (prevLevelOffsetX != 0 || prevLevelOffsetY != 0) {
					audio(sfx.SHIFT);
				} else {
					audio(sfx.PUSH);
				}
			} else {
				audio(sfx.WALK);
			}
		}
	} else {
		if (horDelta != 0 || verDelta != 0) {
			audio(sfx.BUMP);
			undoStack.pop(); //Nothing changed, so discard Undo state.
		}
		camShakeX = horDelta * 12;
		camShakeY = verDelta * 12;
	}

	function ShiftX(horDelta) {
		if (levelOffsetY == 0) {
			levelOffsetX -= horDelta;
			prevLevelOffsetX = -horDelta;
			timeSinceLastAction = 0;
			if (levelOffsetX > gridWidth * 0.5) {
				levelOffsetX -= gridWidth;
			} else if (levelOffsetX < -gridWidth * 0.5) {
				levelOffsetX += gridWidth;
			}
		} else {
			console.log("Shifting not resolved: Cannot shift X when Y is shifted")
		}
	}

	function ShiftY(verDelta) {
		if (levelOffsetX == 0) {
			levelOffsetY -= verDelta;
			prevLevelOffsetY = -verDelta;
			timeSinceLastAction = 0;
			if (levelOffsetY >= gridHeight * 0.5) {
				levelOffsetY -= gridHeight;
			} else if (levelOffsetY <= -gridHeight * 0.5) {
				levelOffsetY += gridHeight;
			}
		} else {
			console.log("Shifting not resolved: Cannot shift Y when X is shifted")
		}
	}
}

function audio(soundID, alwaysPlay = false) {
	if (!audioEnabled) {return;}

	if (timeSinceLastAudio >= timeUntilPlayableAudio || alwaysPlay) {
		if (!alwaysPlay) {timeSinceLastAudio = 0;}
		switch (soundID) {
			case sfx.SELECT:
				zzfx(...[,.3,176,.02,,.08,3,.4,-0.7,-21,-127,.01,.05,,,,.38,,.03]);
				break;
			case sfx.BUMP:
				zzfx(...[,.3,220,.02,,.08,3,.4,-0.7,-21,-127,.01,.05,,,,.38,,.03]);
			case sfx.WALK:
				zzfx(...[.6,.1,176,.02,,.01,3,.4,-0.7,-21,-127,.01,.05,,,,.1,,.02]);
				break;
			case sfx.PUSH:
				zzfx(...[.5,.1,220,.02,,.01,3,.4,-0.7,-21,-127,.01,.05,,,,.1,,.02]);
				break;
			case sfx.SHIFT:
				zzfx(...[.45,.1,250,.02,,.01,3,.4,-0.7,-21,-127,.01,.05,,,.1,.1,,.02]);
				break;
			case sfx.VICTORY:
				zzfx(...[.6,,934,.12,.38,.93,1,.27,,.4,-434,.08,.2,.1,,.1,.17,.55,1,.46]);
				break;
			case sfx.UNDO: 
				zzfx(...[,,110,,,,1,1.82,,.1,,,,.1,,.1,.01,.7,.02,.15]);
				break;
			case sfx.RESTART:
				zzfx(...[,,283,.02,,.11,,.38,,,,,.07,,,.1,.08,.63,.02]);
				break;
			case sfx.MENU:
				zzfx(...[,.02,1638,,.05,.17,1,,,,490,.09,,,,.1,.05,.5,.03]);
				break;
			case sfx.BACK:
				zzfx(...[,,98,.08,.18,.02,2,2.47,36,.5,,,.04,.1,,.9,.44,,.04]);
				break;
			case sfx.GAMEEND:
				zzfx(...[,,525,.18,.28,.17,1,1.24,8.3,-9.7,-151,.03,.06,,,,,.93,.02,.14]);
		}
	}
}

function saveGame() {
	var ls = window.localStorage;

	var levelsSaved = "";
	for (var i = 1; i != levelSolved.length; i += 1) {
		if (levelSolved[i] == 2) {
			levelsSaved += "t";
		} else if (levelSolved[i] == 1) {
			levelsSaved += "f";
		} else {
			levelsSaved += "n";
		}
	}

	ls.setItem("enf-l",levelsSaved);
	ls.setItem("enf-c",colorTheme);
	ls.setItem("enf-a", audioEnabled);
	ls.setItem("enf-r", reduceMotion);
	ls.setItem("enf-u", forceUnlockAllLevels);
	ls.setItem("enf-v", 1);
	if (targetLevel != 0) {
		ls.setItem("enf-t", targetLevel);
	}
}

function loadGame() {
	var ls = window.localStorage;

	var loadedValue = ls.getItem("enf-l");
	if (loadedValue != null) {
		for (var i = 1; i != levelSolved.length; i += 1) {
			if (loadedValue[i-1] == "t") {
				levelSolved[i] = 2;
				amountOfLevelsSolved++;
			} else if (loadedValue[i-1] == "f") {
				levelSolved[i] = 1;
			}
		}
	}

	var loadedValue = parseInt(ls.getItem("enf-c"), 0);
	if (loadedValue >= 0 && loadedValue < colors.length) {
		colorTheme = loadedValue;
	}

	var loadedValue = parseInt(ls.getItem("enf-t"), 0);
	if (loadedValue >= 0 && loadedValue < levels.length) {
		targetLevel = loadedValue;
	}

	var loadedValue = ls.getItem("enf-a");
	if (loadedValue == "false") {
		audioEnabled = false;
	}

	var loadedValue = ls.getItem("enf-r");
	reduceMotion = loadedValue == "true";

	var loadedValue = ls.getItem("enf-u");
	forceUnlockAllLevels = loadedValue == "true";
}

function setLevelName(targetLevel, offset = 0) {
	var prevName = levelName;

	if (targetLevel < 0) { //Negative values for locked levels
		if (targetLevel == -1) {
			levelName = "Solve 1 more puzzle to unlock!";
		} else {
			levelName = "Solve "+(-targetLevel)+" more puzzles to unlock!";
		}
	} else if (level != 0 && !levelSolved.includes(2)) {
		levelName = "Push the box to the goal!";
	} else if (targetLevel != null && targetLevel + offset != 0) {
		var levelIndex = targetLevel + offset;
		var levelData = levels[levelIndex];
		
		// Check if it's the sandbox level or has proper structure
		if (levelIndex === 25 || (levelData && levelData[0] && levelData[0].name === "Sandbox Editor")) {
			levelName = "999: Sandbox Editor";
		} else if (levelData && levelData[0] && levelData[0].nr !== undefined) {
			levelName = levelData[0].nr + ": " + levelData[0].name;
		} else {
			levelName = "Unknown Level";
		}
		
		if (level == 0) {
			levelName += " - [Space] to enter";
		}
	} else if (!levelSolved.includes(2)) {
		levelName = "WASD/Arrow Keys to move";
	} else {
		levelName = "";
	}

	if (prevName != levelName) {
		timeSinceLevelNameChanged = 0;
	}
}

//https://stackoverflow.com/a/56348573
// blend two hex colors together by an amount
function blendColors(colorA, colorB, amount) {
	const [rA, gA, bA] = colorA.match(/\w\w/g).map((c) => parseInt(c, 16));
	const [rB, gB, bB] = colorB.match(/\w\w/g).map((c) => parseInt(c, 16));
	const r = Math.round(rA + (rB - rA) * amount).toString(16).padStart(2, '0');
	const g = Math.round(gA + (gB - gA) * amount).toString(16).padStart(2, '0');
	const b = Math.round(bA + (bB - bA) * amount).toString(16).padStart(2, '0');
	return '#' + r + g + b;
  }

function setCanvasScales(ls) {
	playerCanvas.width = ls;
	playerCanvas.height = ls;

	wallCanvas.width = ls+wallMargin;
	wallCanvas.height = ls+wallMargin;

	boxCanvas.width = ls+boxMargin;
	boxCanvas.height = ls+boxMargin;

	rubbleCanvas.width = ls+rubbleMargin;
	rubbleCanvas.height = ls+rubbleMargin;

	targetCanvas.width = ls+targetMargin;
	targetCanvas.height = ls+targetMargin;
}








// ADD THESE NEW FUNCTIONS AT THE END:
function enterSandboxMode() {
	sandboxMode = true;
	titleScreen = false;
	victory = false;
	menuOpened = false;
	showSizeDialog = false;
	level = 999;
	if (!sandboxLevel) {
		sandboxGridWidth = 10;
		sandboxGridHeight = 10;
		initializeSandboxLevel();
	}
	audio(sfx.SELECT, true);
	dirtyRender = true;
}

function initializeSandboxLevel() {
	sandboxLevel = [];
	for (let y = 0; y < sandboxGridHeight; y++) {
		sandboxLevel[y] = obj.EMPTY.repeat(sandboxGridWidth);
	}
	
	// Add some default items for a starter level
	if (sandboxGridWidth >= 10 && sandboxGridHeight >= 10) {
		// Place player in center
		var centerX = Math.floor(sandboxGridWidth / 2);
		var centerY = Math.floor(sandboxGridHeight / 2);
		setSandboxCell(centerX, centerY, obj.PLAYER);
		
		// Add some walls around the edges
		for (let x = 0; x < sandboxGridWidth; x++) {
			setSandboxCell(x, 0, obj.WALL);
			setSandboxCell(x, sandboxGridHeight - 1, obj.WALL);
		}
		for (let y = 1; y < sandboxGridHeight - 1; y++) {
			setSandboxCell(0, y, obj.WALL);
			setSandboxCell(sandboxGridWidth - 1, y, obj.WALL);
		}
		
		// Add a box and target
		setSandboxCell(centerX - 1, centerY, obj.BOX);
		setSandboxCell(centerX - 2, centerY, obj.TARGET);
	}
}

function handleSandboxClick(e) {
	if (showSizeDialog) return;
	
	var rect = canvas.getBoundingClientRect();
	var mouseX = e.clientX - rect.left;
	var mouseY = e.clientY - rect.top;
	
	var localScale = scale;
	var horWidth = sandboxGridWidth * localScale;
	var verHeight = sandboxGridHeight * localScale;
	var levelMargin = 20;
	
	var cameraX = Math.round(canvas.width * 0.5 - horWidth * 0.5 - levelMargin * 0.5);
	var cameraY = Math.round(canvas.height * 0.5 - verHeight * 0.5 - levelMargin * 0.5);
	
	var gridX = Math.floor((mouseX - cameraX - 10) / localScale);
	var gridY = Math.floor((mouseY - cameraY - 10) / localScale);
	
	if (gridX >= 0 && gridX < sandboxGridWidth && gridY >= 0 && gridY < sandboxGridHeight) {
		setSandboxCell(gridX, gridY, selectedTool);
	}
	
	var arrowSize = 30;
	if (mouseX > cameraX + horWidth - arrowSize && mouseX < cameraX + horWidth &&
		mouseY > cameraY + verHeight/2 - arrowSize/2 && mouseY < cameraY + verHeight/2 + arrowSize/2) {
		sandboxGridWidth++;
		for (let y = 0; y < sandboxLevel.length; y++) {
			sandboxLevel[y] += obj.EMPTY;
		}
	}
	if (mouseX > cameraX - arrowSize && mouseX < cameraX &&
		mouseY > cameraY + verHeight/2 - arrowSize/2 && mouseY < cameraY + verHeight/2 + arrowSize/2) {
		if (sandboxGridWidth > 3) sandboxGridWidth--;
		for (let y = 0; y < sandboxLevel.length; y++) {
			sandboxLevel[y] = sandboxLevel[y].slice(0, -1);
		}
	}
	if (mouseY > cameraY + verHeight - arrowSize && mouseY < cameraY + verHeight &&
		mouseX > cameraX + horWidth/2 - arrowSize/2 && mouseX < cameraX + horWidth/2 + arrowSize/2) {
		sandboxGridHeight++;
		sandboxLevel.push(obj.EMPTY.repeat(sandboxGridWidth));
	}
	if (mouseY > cameraY - arrowSize && mouseY < cameraY &&
		mouseX > cameraX + horWidth/2 - arrowSize/2 && mouseX < cameraX + horWidth/2 + arrowSize/2) {
		if (sandboxGridHeight > 3) {
			sandboxGridHeight--;
			sandboxLevel.pop();
		}
	}
	
	dirtyRender = true;
}

function setSandboxCell(x, y, type) {
	// If placing player, remove old player
	if (type == obj.PLAYER) {
		for (let i = 0; i < sandboxLevel.length; i++) {
			sandboxLevel[i] = sandboxLevel[i].replace(obj.PLAYER, obj.EMPTY);
		}
	}
	
	// If painting over player with something else, it will replace it
	var line = sandboxLevel[y];
	sandboxLevel[y] = line.substring(0, x) + type + line.substring(x + 1);
	dirtyRender = true;
}

function playSandboxLevel() {
	// Create temporary level data
	var levelData = [{nr: 999, name: "Custom Level", xOff: sandboxOffsetX, yOff: sandboxOffsetY}];

	// Check if player exists
	var hasPlayer = false;
	for (let y = 0; y < sandboxLevel.length; y++) {
		if (sandboxLevel[y].includes(obj.PLAYER)) {
			hasPlayer = true;
			break;
		}
	}
	
	if (!hasPlayer) {
		audio(sfx.BUMP, true);
		return; // Don't play if no player
	}
	
	// Store the current sandbox state before playing
	var savedSandboxLevel = [];
	for (let y = 0; y < sandboxLevel.length; y++) {
		savedSandboxLevel.push(sandboxLevel[y]);
	}
	var savedWidth = sandboxGridWidth;
	var savedHeight = sandboxGridHeight;
	var savedOffsetX = sandboxOffsetX;
	var savedOffsetY = sandboxOffsetY;
	
	// Store sandbox state
	window.savedSandboxState = {
		level: savedSandboxLevel,
		width: savedWidth,
		height: savedHeight,
		offsetX: savedOffsetX,
		offsetY: savedOffsetY
	};
	
	// Create temporary level data
	var levelData = [{nr: 999, name: "Custom Level", xOff: sandboxOffsetX, yOff: sandboxOffsetY}];
	for (let y = 0; y < sandboxLevel.length; y++) {
		levelData.push(sandboxLevel[y]);
	}
	
	levels[999] = levelData;
	
	// Directly set variables without calling loadLevel
	sandboxMode = false;
	level = 999;
	victory = false;
	titleScreen = false;
	menuOpened = false;
	
	// Manually load the level data
	var levelToLoad = levels[999].slice();
	var metadata = levelToLoad.shift();
	
	player = {x: 0, y: 0};
	walls.length = 0;
	boxes.length = 0;
	targets.length = 0;
	levelNodes.length = 0;
	rubble.length = 0;
	gates.length = 0;
	
	levelOffsetX = metadata.xOff || 0;
	levelOffsetY = metadata.yOff || 0;
	autoScrollX = 0;
	autoScrollY = 0;
	
	freshState = true;
	camShakeX = 0;
	camShakeY = 0;
	
	gridHeight = levelToLoad.length;
	gridWidth = 0;
	
	var placedPlayer = false;
	
	for(let y = 0; y < gridHeight; y++) {
		gridWidth = Math.max(gridWidth, levelToLoad[y].length);
		for(let x = 0; x < levelToLoad[y].length; x++) {
			var str = levelToLoad[y].substring(x,x+1).toLowerCase();
			switch (str) {
				case obj.PLAYER:
					if (!placedPlayer) {
						player = {x: x, y: y};
						placedPlayer = true;
					}
					break;
				case obj.WALL:
					walls.push({x: x, y: y});
					break;
				case obj.BOX:
					boxes.push({x: x, y: y, shift: 0});
					break;
				case obj.SHIFTBOXHOR:
					boxes.push({x: x, y: y, shift: 1});
					break;
				case obj.SHIFTBOXVER:
					boxes.push({x: x, y: y, shift: 2});
					break;
				case obj.SHIFTBOX:
					boxes.push({x: x, y: y, shift: 3});
					break;
				case obj.TARGET:
					targets.push({x: x, y: y});
					break;
				case obj.RUBBLE:
					rubble.push({x: x, y: y});
					break;
			}
		}
	}
	
	undoStack = [];
	steps = "";
	timeSinceLevelStart = 0;
	timeSinceLevelWon = timeUntilLevelEnd;
	
	levelName = "999: Custom Level";
	timeSinceLevelNameChanged = 0;
	
	dirtyRender = true;
	audio(sfx.SELECT, true);
}

function exitSandbox() {
    // Restore last saved sandbox editor state
    if (window.savedSandboxState) {
        sandboxLevel = window.savedSandboxState.level;
        sandboxGridWidth = window.savedSandboxState.width;
        sandboxGridHeight = window.savedSandboxState.height;
        sandboxOffsetX = window.savedSandboxState.offsetX;
        sandboxOffsetY = window.savedSandboxState.offsetY;
    }

    // Reset gameplay and menu elements
    sandboxMode = true;
    victory = false;
    level = 999;
    menuOpened = false;
    titleScreen = false;

    // Clear all level data so nothing shows behind editor
    player = { x: 0, y: 0 };
    boxes = [];
    targets = [];
    walls = [];
    rubble = [];
    gates = [];
    levelNodes = [];
    undoStack = [];
    steps = "";
    
    // DON'T change gridWidth/gridHeight here - remove these lines:
    // gridWidth = sandboxGridWidth;
    // gridHeight = sandboxGridHeight;
    
    // Clear level name
    levelName = "";

    dirtyRender = true;
}



//Hidden command to unlock all levels.
function unlockAllLevels() {
	if (amountOfLevelsSolved != levels.length) {
		forceUnlockAllLevels = true;
		if (level == 0) {
			loadLevel(0);
		}
	}
}


