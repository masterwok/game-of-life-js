var GameOfLife = function(config) {
    'use strict';

    var ret = {};

    var Position = {
        TopLeft: 0
        , Top: 1
        , TopRight: 2
        , Right: 3
        , BottomRight: 4
        , Bottom: 5
        , BottomLeft: 6
        , Left: 7
    };

    var Grid = function(canvas, context, cellSize) {
        var self = this;
        var ret = {};
        var cellWidth = 0;
        var cellHeight = 0;

        // Private functions
        var getCellCountInSize = function(cellSideLength, size) {
            return ((size - (size % cellSideLength)) / cellSideLength);
        };

        // Public methods
        ret.setCellColorAt = function(row, col, color) {
            context.fillStyle = color;
            context.rect(col * ret.cellWidth, row * ret.cellHeight, ret.cellWidth, ret.cellHeight);
        };

        ret.clearGrid = function() {
            context.clearRect(0, 0, canvas.width, canvas.height);
        };

        // Set row and column counts (also adjust for zero index)
        ret.nCol = getCellCountInSize(cellSize, canvas.width);
        ret.nRow = getCellCountInSize(cellSize, canvas.height);

        // Calculate the pixels remaining using user defined size
        var colRemainder = canvas.width - (ret.nCol * cellSize);
        var rowRemainder = canvas.height - (ret.nRow * cellSize);

        // Adjust user defined size accordingly so the cells fill the entire screen
        ret.cellWidth = (colRemainder / ret.nCol) + cellSize;
        ret.cellHeight = (rowRemainder / ret.nRow) + cellSize;

        return ret;
    };

    var canvas = document.getElementById(config.canvasId);
    var ctx = canvas.getContext('2d');

    if (!canvas) {
        throw 'Canvas not found for given ID: ' + config.canvasId;
    }

    var self = this;
    var grid = null;
    var cells = [];
    var cellColor = null;
    var colorIteration = 0;
    var drawInterval = null;
    var dropCircleAtCount = 0;

    var constrain = function(n, min, max) {
        if (n > max) return max;
        if (n < min) return min;
        return n;
    };

    // Convert a given HSV (Hue Saturation Value) to RGB(Red Green Blue) and set the led to the color
    // Source: (http://eduardofv.com/read_post/179-Arduino-RGB-LED-HSV-Color-Wheel-)
    var getRgbFromHsv = function(h, s, v) {
        var r = 0
            , g = 0
            , b = 0;
        var hf = h / 60.0;
        var i = Math.floor(hf);
        var f = hf - i;
        var pv = v * (1 - s);
        var qv = v * (1 - s * f);
        var tv = v * (1 - s * (1 - f));

        switch (i) {
            case 0:
                r = v;
                g = tv;
                b = pv;
                break;
            case 1:
                r = qv;
                g = v;
                b = pv;
                break;
            case 2:
                r = pv;
                g = v;
                b = tv;
                break;
            case 3:
                r = pv;
                g = qv;
                b = v;
                break;
            case 4:
                r = tv;
                g = pv;
                b = v;
                break;
            case 5:
                r = v;
                g = pv;
                b = qv;
                break;
            case 6:
                r = v;
                g = tv;
                b = pv;
                break;
            case -1:
                r = v;
                g = pv;
                b = qv;
                break;
            default:
                r = g = b = v; // Just pretend its black/white
                break;
        }

        return 'rgb(' + Math.floor(constrain((255.0 * r), 0, 255)) + ', ' + Math.floor(constrain((255.0 * g), 0, 255)) + ', ' + Math.floor(constrain((255.0 * b), 0, 255)) + ')';
    };

    var updateCellColor = function() {
        cellColor = getRgbFromHsv(colorIteration++, 1, 1);
        if (colorIteration > 360) {
            colorIteration = 0;
        }
    };

    var getCellNeighborCount = function(cellValue) {
        // Get number in neighbor count area
        return ((cellValue & 14) >> 1);
    };

    var setCellNeighborCount = function(row, col, cellValue, count) {
        // Clears the neighbor count with AND and then sets with OR
        cells[row][col] = (cellValue & 241) | (count << 1);
    };

    var getPosition = function(position, row, col) {
        switch (position) {
            case Position.TopLeft:
                row = row - 1;
                col = col - 1;
                break;
            case Position.Top:
                row = row - 1;
                break;
            case Position.TopRight:
                row = row - 1;
                col = col + 1;
                break;
            case Position.Right:
                col = col + 1;
                break;
            case Position.BottomRight:
                row = row + 1;
                col = col + 1;
                break;
            case Position.Bottom:
                row = row + 1;
                break;
            case Position.BottomLeft:
                row = row + 1;
                col = col - 1;
                break;
            case Position.Left:
                col = col - 1;
                break;
            default:
                throw 'Unknown position';
        }

        row = row > -1 ? (row < grid.nRow ? row : row - grid.nRow) : grid.nRow - 1;
        col = col > -1 ? (col < grid.nCol ? col : col - grid.nCol) : grid.nCol - 1;

        return [row, col];
    };

    var isAlive = function(cell) {
        return (cell & 1) === 1;
    };

    var setCellAlive = function(row, col) {
        // Do nothing if the cell is already alive
        if (isAlive(cells[row][col]))
            return;

        // Set alive bit to 1
        cells[row][col] = cells[row][col] | 1;

        // Increment the neighbor cells
        for (var p in Position) {
            if (Position.hasOwnProperty(p)) {
                var rowCol = getPosition(Position[p], row, col);
                var cellValue = cells[rowCol[0]][rowCol[1]];
                var cellNeighborCount = getCellNeighborCount(cellValue) + 1;
                setCellNeighborCount(rowCol[0], rowCol[1], cellValue, cellNeighborCount);

            }
        }
    };

    var setCellDead = function(row, col) {
        // Do nothing if the cell is already dead
        if (!isAlive(cells[row][col]))
            return;

        // Set alive bit to 0
        cells[row][col] = cells[row][col] & 254;

        // Decrement the neighbor cells
        for (var p in Position) {
            if (Position.hasOwnProperty(p)) {
                var rowCol = getPosition(Position[p], row, col);
                var cellValue = cells[rowCol[0]][rowCol[1]];
                var cellNeighborCount = getCellNeighborCount(cellValue) - 1;
                setCellNeighborCount(rowCol[0], rowCol[1], cellValue, cellNeighborCount);
            }
        }
    };

    var generateSeedGeneration = function(ratioAlive) {
        var seedAliveCount = Math.floor(grid.nRow * grid.nCol * ratioAlive);
        var n = 0;

        while (n < seedAliveCount) {
            // Pick a random position on the grid to set alice
            var row = Math.floor((Math.random() * grid.nRow));
            var col = Math.floor((Math.random() * grid.nCol));

            // If the current cell isn't already alive, set it to alive
            if (!isAlive(cells[row][col])) {
                setCellAlive(row, col);
                n++;
            }
        }
    };

    var getWrappedPosition = function(row, col) {
        row = row % grid.nRow;
        row = row < 0 ? row + grid.nRow : row;
        col = col % grid.nCol;
        col = col < 0 ? col + grid.nCol : col;
        return [row, col];
    };

    // Draw a circlce on the grid at position (r, c) with specified radius.
    // Midpoint Circle Algorithm (http://en.wikipedia.org/wiki/Midpoint_circle_algorithm)
    var drawCircle = function(r, c, radius) {
        var pos = null;
        var x = radius;
        var y = 0;
        var radiusError = 1 - x;

        while (x >= y) {
            pos = getWrappedPosition(x + r, y + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            pos = getWrappedPosition(-y + r, x + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            pos = getWrappedPosition(-x + r, -y + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            pos = getWrappedPosition(-y + r, -x + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            pos = getWrappedPosition(x + r, -y + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            pos = getWrappedPosition(y + r, -x + c);
            grid.setCellColorAt(pos[0], pos[1], cellColor);
            setCellAlive(pos[0], pos[1]);
            y++;

            if (radiusError < 0) {
                radiusError += 2 * y + 1;
            } else {
                x--;
                radiusError += 2 * (y - x + 1);
            }
        }
    };

    var dropCircleIfCellCountHitsThreshhold = function(cellCount, dropCircleAtCount, maxCircleRadius) {
        var row, col, radius;
        if (cellCount > 0 && cellCount < dropCircleAtCount) {
            radius = Math.floor((Math.random() * maxCircleRadius) + 1);
            row = Math.floor((Math.random() * (grid.nRow - 1)) + 1);
            col = Math.floor((Math.random() * (grid.nCol - 1)) + 1);
            drawCircle(row, col, radius);
            drawCircle(row, col, radius + 2);
        }
    };

    var draw = function(grid) {
        var currentGenerationCount = 0;

        // Create previous generation buffer
        var previousGenerationCells = new Array(grid.nRow);

        // Copy generation into new grid
        for (var row = 0; row < grid.nRow; row++) {
            previousGenerationCells[row] = cells[row].slice();
        }

        grid.clearGrid();

        if (config.cycleColors) {
            updateCellColor();
        }

        ctx.beginPath();
        // Draw normal generation
        for (var r = 0; r < grid.nRow; r++) {
            for (var c = 0; c < grid.nCol; c++) {

                // Only look at alive cells
                if (previousGenerationCells[r][c]) {
                    var count = getCellNeighborCount(previousGenerationCells[r][c]);

                    if (isAlive(previousGenerationCells[r][c])) {
                        if ((count !== 2) && (count !== 3)) {
                            setCellDead(r, c); // clear cell
                        } else {
                            grid.setCellColorAt(r, c, cellColor);
                            currentGenerationCount++;
                        }
                    } else {
                        if (count === 3) {
                            setCellAlive(r, c); // set cell alive
                            grid.setCellColorAt(r, c, cellColor);
                            currentGenerationCount++;
                        }
                    }
                }

            }
        }

        dropCircleIfCellCountHitsThreshhold(currentGenerationCount, dropCircleAtCount, config.maxCircleRadius || Math.floor(grid.nRow * 0.2));

        ctx.fill();
    };

    var startNewInterval = function() {
        if (drawInterval) {
            window.clearInterval(drawInterval);
        }

        generateSeedGeneration(config.ratioAlive);

        drawInterval = setInterval(function() {
            draw(grid);
        }, 100);
    };

    var previousWidth, previousHeight;

    var resizeCanvas = function() {
        // Only resize if the container width/height no longer match that of the canvas.
        // This fixes a bug where mobile chrome url bar hiding was reseting the generation.
        if (canvas.width !== previousWidth || canvas.height !== previousHeight) {
            previousWidth = canvas.width;
            previousHeight = canvas.height;

            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight;

            // When the container is resized, create a new grid
            grid = new Grid(canvas, ctx, config.cellSize);

            dropCircleAtCount = Math.floor((grid.nRow * grid.nCol * config.ratioAlive * config.circleDropThreshold));

            if (!config.cycleColors) {
                cellColor = config.color;
            }

            // Initialize the cells array
            cells = new Array(grid.nRow);
            for (var i = 0; i < grid.nRow; i++) {
                cells[i] = new Array(grid.nCol);
            }

            // Start new render interval
            startNewInterval();

        }

    };

    var run = function() {
        // // resize the canvas to fill browser window dynamically
        window.addEventListener('resize', resizeCanvas, false);

        // // Initial canvas resize
        resizeCanvas();
    };

    // Define public properties and methods
    ret.run = run;

    return ret;
};
