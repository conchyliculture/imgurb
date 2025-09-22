const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const textInput = document.getElementById('textInput'); // New
const addTextBtn = document.getElementById('addTextBtn'); // New
const fontSizeSelect = document.getElementById('fontSizeSelect'); // New
const drawArrowBtn = document.getElementById('drawArrow');
const drawLineBtn = document.getElementById('drawLine');
const drawRectangleBtn = document.getElementById('drawRectangle');
const drawBlackBoxBtn = document.getElementById('drawBlackBox');
const undoBtn = document.getElementById('undoBtn'); // New
const clearCanvasBtn = document.getElementById('clearCanvas');
const uploadImageBtn = document.getElementById('uploadImage');

let currentImage = new Image();
let drawingMode = null; // 'arrow', 'line', 'rectangle', 'blackbox', 'text'
let isDrawing = false;
let startX, startY;
let annotations = []; // Stores all annotations

// Set initial canvas size (adjust as needed)
canvas.width = 800;
canvas.height = 600;

function loadImageFromURL() {
    const imagepath = location.pathname.split('/').pop()
    console.log('image path: '+imagepath);
    currentImagr = new Image();
    currentImage.onload = () => {
//        const aspectRatio = currentImage.width / currentImage.height;
//        const maxWidth = 800;
//        const maxHeight = 600;
//
//        if (currentImage.width > maxWidth || currentImage.height > maxHeight) {
//            if (currentImage.width / maxWidth > currentImage.height / maxHeight) {
//                canvas.width = maxWidth;
//                canvas.height = maxWidth / aspectRatio;
//            } else {
//                canvas.height = maxHeight;
//                canvas.width = maxHeight * aspectRatio;
//            }
//        } else {
            canvas.width = currentImage.width;
            canvas.height = currentImage.height;
//        }

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

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (currentImage.src && currentImage.complete) {
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    }

    annotations.forEach(annotation => {
        ctx.beginPath();

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

// Event listener for adding text
addTextBtn.addEventListener('click', () => {
    if (!currentImage.src) {
        alert("Please load an image first.");
        return;
    }
    const text = textInput.value.trim();
    if (!text) {
        alert("Please enter some text to add.");
        return;
    }
    drawingMode = 'text';
    canvas.style.cursor = 'text'; // Change cursor for text mode
});

canvas.addEventListener('mousedown', (e) => {
    if (!currentImage.src || !currentImage.complete) {
        return; // Only allow drawing on a loaded image
    }

    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (drawingMode === 'text') {
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
            drawingMode = null; // Exit text mode after placing
            canvas.style.cursor = 'crosshair'; // Reset cursor
            textInput.value = ''; // Clear text input after placing
        }
        // If drawingMode is text but no text, don't start drawing
        return;
    }

    if (drawingMode) { // For other drawing modes (lines, shapes)
        isDrawing = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !drawingMode || !currentImage.src || !currentImage.complete || drawingMode === 'text') return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    redrawCanvas();

    ctx.beginPath();

    if (drawingMode === 'line' || drawingMode === 'arrow') {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
        if (drawingMode === 'arrow') {
            drawArrowhead(ctx, startX, startY, currentX, currentY);
        }
        ctx.stroke();
    } else if (drawingMode === 'rectangle') {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        const width = currentX - startX;
        const height = currentY - startY;
        ctx.rect(startX, startY, width, height);
        ctx.stroke();
    } else if (drawingMode === 'blackbox') {
        ctx.fillStyle = 'black';
        const width = currentX - startX;
        const height = currentY - startY;
        ctx.fillRect(startX, startY, width, height);
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDrawing && drawingMode && currentImage.src && currentImage.complete && drawingMode !== 'text') {
        isDrawing = false;
        const rect = canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const width = endX - startX;
        const height = endY - startY;

        if (drawingMode === 'line') {
            annotations.push({
                type: 'line',
                startX, startY, endX, endY,
                color: 'red',
                lineWidth: 2
            });
        } else if (drawingMode === 'arrow') {
            annotations.push({
                type: 'arrow',
                startX, startY, endX, endY,
                color: 'red',
                lineWidth: 2
            });
        } else if (drawingMode === 'rectangle') {
            annotations.push({
                type: 'rectangle',
                startX, startY, width, height,
                color: 'red',
                lineWidth: 2
            });
        } else if (drawingMode === 'blackbox') {
            annotations.push({
                type: 'blackbox',
                startX, startY, width, height,
                color: 'black'
            });
        }
        redrawCanvas();
    }
});

drawArrowBtn.addEventListener('click', () => { drawingMode = 'arrow'; canvas.style.cursor = 'crosshair'; });
drawLineBtn.addEventListener('click', () => { drawingMode = 'line'; canvas.style.cursor = 'crosshair'; });
drawRectangleBtn.addEventListener('click', () => { drawingMode = 'rectangle'; canvas.style.cursor = 'crosshair'; });
drawBlackBoxBtn.addEventListener('click', () => { drawingMode = 'blackbox'; canvas.style.cursor = 'crosshair'; });

// Undo function
undoBtn.addEventListener('click', () => {
    if (annotations.length > 0) {
        annotations.pop(); // Remove the last annotation
        redrawCanvas(); // Redraw the canvas without it
    }
});

clearCanvasBtn.addEventListener('click', () => {
    annotations = [];
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
        alert("Upload successful");
        window.setTimeout(function(){
            window.location.href = data.url;

        }, 2000);
    })
    .catch(error => {
        alert("Upload failed");
        console.error('Error uploading image:', error);
    });
});

redrawCanvas();
loadImageFromURL();
