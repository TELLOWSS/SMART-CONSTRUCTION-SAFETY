import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Eraser, PenTool, Image as ImageIcon } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: string) => void;
  title: string;
}

export const SignaturePad: React.FC<Props> = ({ isOpen, onClose, onSave, title }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas context
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Set canvas size based on parent container
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = 200; // Fixed height
        }
        
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [isOpen]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { offsetX, offsetY } = getCoordinates(e, canvas);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    
    // Reset file input value so the same file can be selected again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Clear existing content
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Calculate scaling to fit within canvas while maintaining aspect ratio
          // Add some padding (40px total)
          const padding = 40;
          const availWidth = canvas.width - padding;
          const availHeight = canvas.height - padding;
          
          const scale = Math.min(availWidth / img.width, availHeight / img.height);
          
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          
          const x = (canvas.width - drawWidth) / 2;
          const y = (canvas.height - drawHeight) / 2;

          ctx.drawImage(img, x, y, drawWidth, drawHeight);
          setHasDrawn(true);
        };
        if (event.target?.result) {
            img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper function to trim transparent pixels from canvas
  const trimCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    // Scan for non-transparent pixels
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alpha = data[(y * w + x) * 4 + 3];
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return null; // Canvas is empty

    // Add a small padding around the trimmed content
    const padding = 10;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w, maxX + padding);
    maxY = Math.min(h, maxY + padding);

    const trimmedWidth = maxX - minX;
    const trimmedHeight = maxY - minY;

    // Create a temporary canvas to draw the trimmed image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = trimmedWidth;
    tempCanvas.height = trimmedHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) return null;
    
    tempCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    return tempCanvas.toDataURL('image/png');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      onClose(); // Just close if nothing drawn
      return;
    }
    
    // Use the trim function to get the optimized image
    const trimmedDataUrl = trimCanvas(canvas);
    if (trimmedDataUrl) {
        onSave(trimmedDataUrl);
    } else {
        // Fallback if trim fails (shouldn't happen if hasDrawn is true)
        onSave(canvas.toDataURL('image/png'));
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PenTool className="w-5 h-5 text-indigo-600" />
            {title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 bg-slate-100">
          <div className="bg-white rounded-xl shadow-inner border border-slate-300 overflow-hidden cursor-crosshair touch-none relative">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[200px] block"
            />
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">박스 안에 서명하거나 도장 이미지를 업로드하세요</p>
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-between items-center">
          <div className="flex gap-2">
            <button 
                onClick={clearCanvas}
                className="flex items-center gap-2 text-slate-500 hover:text-red-500 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
            >
                <Eraser className="w-4 h-4" />
                지우기
            </button>
            <label className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-indigo-50 cursor-pointer">
                <ImageIcon className="w-4 h-4" />
                이미지
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/png, image/jpeg, image/jpg" 
                    onChange={handleImageUpload}
                />
            </label>
          </div>
          
          <div className="flex gap-3">
             <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              서명 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};