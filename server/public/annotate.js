const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput'); // New
const addTextBtn = document.getElementById('addTextBtn'); // New
const fontSizeSelect = document.getElementById('fontSizeSelect'); // New
const selectToolBtn = document.getElementById('selectTool'); // New
const drawArrowBtn = document.getElementById('drawArrow');
const drawLineBtn = document.getElementById('drawLine');
const drawRectangleBtn = document.getElementById('drawRectangle');
const drawBlackBoxBtn = document.getElementById('drawBlackBox');
const undoBtn = document.getElementById('undoBtn');
const clearCanvasBtn = document.getElementById('clearCanvas');
const uploadImageBtn = document.getElementById('uploadImage');

let currentImage = new Image();
let activeTool = 'select'; // 'select', 'arrow', 'line', 'rectangle', 'blackbox', 'text'
let isDrawing = false; // For new annotations
let isDragging = false; // For moving existing annotations
let startX, startY;
let annotations = [];
let selectedAnnotation = null;
let dragOffsetX, dragOffsetY; // Offset from mouse click to annotation's origin

// Set initial canvas size (adjust as needed)
canvas.width = 800;
canvas.height = 600;

function loadImageFromURL() {
    const imagepath = location.pathname.split('/').pop()
    console.log('image path: '+imagepath);
    currentImagr = new Image();
    currentImage.onload = () => {
        canvas.width = currentImage.width;
        canvas.height = currentImage.height;

        annotations = [];
        redrawCanvas();
    };
    currentImage.onerror = () => {
        alert('Failed to load image from '+imagepath);
        currentImage.src = '';
        redrawCanvas();

    }
    console.log('Loading image from /p/'+imagepath);
    currentImage.src = '/p/'+imagepath;
}

function setActiveTool(tool) {
    activeTool = tool;
    // Reset canvas cursor based on tool
    if (tool === 'text') {
        canvas.style.cursor = 'text';
    } else if (tool === 'select') {
        canvas.style.cursor = 'default';
    } else {
        canvas.style.cursor = 'crosshair';
    }
    // Highlight active tool button
    document.querySelectorAll('#controls button').forEach(btn => {
        btn.classList.remove('selected-tool');
    });
    document.querySelectorAll('#textControls button').forEach(btn => {
        btn.classList.remove('selected-tool');
    });
    const activeBtn = document.getElementById(`${tool}Tool`) || document.getElementById(tool === 'text' ? 'addTextBtn' : tool);
    if (activeBtn) {
      activeBtn.classList.add('selected-tool');
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentImage.src && currentImage.complete) {
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }

    annotations.forEach(annotation => {
        ctx.beginPath(); // Start a new path for each annotation

        // Apply highlight if selected
        if (annotation === selectedAnnotation) {
            ctx.save(); // Save current context state
            ctx.strokeStyle = 'blue'; // Highlight color
            ctx.lineWidth = 4;
            ctx.setLineDash([5, 5]); // Dashed border for selection
        } else {
            ctx.setLineDash([]); // No dash for unselected
        }

        if (annotation.type === 'line' || annotation.type === 'arrow') {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.lineWidth;
            ctx.moveTo(annotation.startX, annotation.startY);
            ctx.lineTo(annotation.endX, annotation.endY);
            if (annotation.type === 'arrow') {
                drawArrowhead(ctx, annotation.startX, annotation.startY, annotation.endX, annotation.endY);
            }
            ctx.stroke();
        } else if (annotation.type === 'rectangle') {
            ctx.strokeStyle = annotation.color;
            ctx.lineWidth = annotation.lineWidth;
            ctx.rect(annotation.startX, annotation.startY, annotation.width, annotation.height);
            ctx.stroke();
        } else if (annotation.type === 'blackbox') {
            ctx.fillStyle = annotation.color;
            ctx.fillRect(annotation.startX, annotation.startY, annotation.width, annotation.height);
        } else if (annotation.type === 'text') { // New text rendering
            ctx.font = `${annotation.fontSize} Arial`; // Example font
            ctx.fillStyle = annotation.color; // Red
            ctx.shadowColor = annotation.shadowColor; // Black shadow
            ctx.shadowOffsetX = annotation.shadowOffsetX;
            ctx.shadowOffsetY = annotation.shadowOffsetY;
            ctx.shadowBlur = annotation.shadowBlur;
            ctx.fillText(annotation.text, annotation.x, annotation.y);
            // Reset shadow for subsequent drawings
            ctx.shadowColor = 'transparent';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
        }
    });
}

function drawArrowhead(ctx, fromX, fromY, toX, toY) {
    const headlen = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
}

addTextBtn.addEventListener('click', () => setActiveTool('text'));
selectToolBtn.addEventListener('click', () => setActiveTool('select')); // New tool button listener
drawArrowBtn.addEventListener('click', () => setActiveTool('arrow'));
drawLineBtn.addEventListener('click', () => setActiveTool('line'));
drawRectangleBtn.addEventListener('click', () => setActiveTool('rectangle'));
drawBlackBoxBtn.addEventListener('click', () => setActiveTool('blackbox'));

canvas.addEventListener('mousedown', (e) => {
    if (!currentImage.src || !currentImage.complete) {
        return; // Only allow drawing on a loaded image
    }

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    selectedAnnotation = null; // Deselect any previously selected annotation
    isDrawing = false; // Assume not drawing new element initially
    isDragging = false; // Assume not dragging initially
    redrawCanvas(); // Deselect visually

    if (activeTool === 'select') {
        // Check if we clicked on an existing annotation
        for (let i = annotations.length - 1; i >= 0; i--) { // Iterate backwards to select top-most element
            const ann = annotations[i];
            // Simple hit testing (can be made more robust)
            if (ann.type === 'rectangle' || ann.type === 'blackbox') {
                if (startX >= ann.startX && startX <= (ann.startX + ann.width) &&
                    startY >= ann.startY && startY <= (ann.startY + ann.height)) {
                    selectedAnnotation = ann;
                    isDragging = true;
                    dragOffsetX = startX - ann.startX;
                    dragOffsetY = startY - ann.startY;
                    redrawCanvas();
                    return; // Found and started dragging
                }
            } else if (ann.type === 'line' || ann.type === 'arrow') {
                // More complex hit testing for lines/arrows - for simplicity, we'll use a bounding box
                const minX = Math.min(ann.startX, ann.endX);
                const maxX = Math.max(ann.startX, ann.endX);
                const minY = Math.min(ann.startY, ann.endY);
                const maxY = Math.max(ann.startY, ann.endY);
                // Add a small buffer for easier clicking on thin lines
                const buffer = 5;
                if (startX >= minX - buffer && startX <= maxX + buffer &&
                    startY >= minY - buffer && startY <= maxY + buffer) {
                    selectedAnnotation = ann;
                    isDragging = true;
                    dragOffsetX = startX - ann.startX; // Store offsets relative to start point
                    dragOffsetY = startY - ann.startY;
                    redrawCanvas();
                    return;
                }
            } else if (ann.type === 'text') {
                // Rough hit testing for text (needs more accurate bounding box calculation for real apps)
                ctx.font = `${ann.fontSize} Arial`;
                const textWidth = ctx.measureText(ann.text).width;
                const textHeight = parseInt(ann.fontSize, 10); // Estimate height
                if (startX >= ann.x && startX <= (ann.x + textWidth) &&
                    startY >= ann.y - textHeight && startY <= ann.y) { // Text drawn from baseline
                    selectedAnnotation = ann;
                    isDragging = true;
                    dragOffsetX = startX - ann.x;
                    dragOffsetY = startY - ann.y;
                    redrawCanvas();
                    return;
                }
            }
        }
    } else if (activeTool === 'text') {
        const text = textInput.value.trim();
        if (text) {
            annotations.push({
                type: 'text',
                x: startX,
                y: startY,
                text: text,
                fontSize: fontSizeSelect.value,
                color: 'red',
                shadowColor: 'black',
                shadowOffsetX: 2,
                shadowOffsetY: 2,
                shadowBlur: 3
            });
            redrawCanvas();
            textInput.value = '';
        }
    } else { // For drawing new shapes/lines
        isDrawing = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!currentImage.src || !currentImage.complete) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isDragging && selectedAnnotation) {
        // Update position based on mouse movement
        if (selectedAnnotation.type === 'rectangle' || selectedAnnotation.type === 'blackbox') {
            selectedAnnotation.startX = currentX - dragOffsetX;
            selectedAnnotation.startY = currentY - dragOffsetY;
        } else if (selectedAnnotation.type === 'line' || selectedAnnotation.type === 'arrow') {
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;
            selectedAnnotation.startX += deltaX;
            selectedAnnotation.startY += deltaY;
            selectedAnnotation.endX += deltaX;
            selectedAnnotation.endY += deltaY;
            startX = currentX; // Update start for continuous dragging
            startY = currentY;
        } else if (selectedAnnotation.type === 'text') {
            selectedAnnotation.x = currentX - dragOffsetX;
            selectedAnnotation.y = currentY - dragOffsetY;
        }
        redrawCanvas();
        return;
    }

    if (isDrawing && activeTool !== 'select' && activeTool !== 'text') {
        redrawCanvas();

        ctx.beginPath();
        if (activeTool === 'line' || activeTool === 'arrow') {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            if (activeTool === 'arrow') {
                drawArrowhead(ctx, startX, startY, currentX, currentY);
            }
            ctx.stroke();
        } else if (activeTool === 'rectangle') {
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            const width = currentX - startX;
            const height = currentY - startY;
            ctx.rect(startX, startY, width, height);
            ctx.stroke();
        } else if (activeTool === 'blackbox') {
            ctx.fillStyle = 'black';
            const width = currentX - startX;
            const height = currentY - startY;
            ctx.fillRect(startX, startY, width, height);
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!currentImage.src || !currentImage.complete) return;

    if (isDragging) {
        isDragging = false;
        selectedAnnotation = null; // Deselect after drag
        redrawCanvas(); // Redraw without highlight
        return;
    }

    if (isDrawing && activeTool !== 'select' && activeTool !== 'text') {
        isDrawing = false;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const width = endX - startX;
        const height = endY - startY;

        if (activeTool === 'line') {
            annotations.push({
                type: 'line',
                startX, startY, endX, endY,
                color: 'red',
                lineWidth: 2
            });
        } else if (activeTool === 'arrow') {
            annotations.push({
                type: 'arrow',
                startX, startY, endX, endY,
                color: 'red',
                lineWidth: 2
            });
        } else if (activeTool === 'rectangle') {
            annotations.push({
                type: 'rectangle',
                startX, startY, width, height,
                color: 'red',
                lineWidth: 2
            });
        } else if (activeTool === 'blackbox') {
            annotations.push({
                type: 'blackbox',
                startX, startY, width, height,
                color: 'black'
            });
        }
        redrawCanvas();
    }
});

// Undo function
undoBtn.addEventListener('click', () => {
    if (annotations.length > 0) {
        annotations.pop(); // Remove the last annotation
        selectedAnnotation = null; // Clear selection if the undone item was selected
        redrawCanvas(); // Redraw the canvas without it
    }
});

clearCanvasBtn.addEventListener('click', () => {
    annotations = [];
    selectedAnnotation = null; // Clear selection
    redrawCanvas();
});

uploadImageBtn.addEventListener('click', () => {
    if (!currentImage.src || !currentImage.complete) {
        alert("Please load an image first.");
        return;
    }

    const imageDataURL = canvas.toDataURL('image/png');

    const formData = new FormData();
    formData.append('annotatedImage', imageDataURL);
    formData.append('filename', window.location.pathname.split('/').pop());

    fetch('/upload_edited', {
        method: 'POST',
        body: formData
    })
    .then(data => {
        console.log('Upload successful:', data);
        alert('Annotated image uploaded successfully!');
        window.setTimeout(function(){
            window.location.href = data.url;

        }, 2000);
    })
    .catch(error => {
        alert("Upload failed");
        console.error('Error uploading image:', error);
    });
});

// Initialize with 'select' tool active
setActiveTool('select');
redrawCanvas();
loadImageFromURL();
