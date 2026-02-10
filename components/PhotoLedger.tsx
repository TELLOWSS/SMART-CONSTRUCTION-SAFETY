
import React, { useState } from 'react';
import { PhotoEvidence, PHOTO_CATEGORIES } from '../types';
import { ImagePlus, MapPin, Calendar, X, Camera, Loader2 } from 'lucide-react';

interface Props {
  photos: PhotoEvidence[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  readOnly?: boolean;
}

export const PhotoLedger: React.FC<Props> = ({ photos, setPhotos, readOnly = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Image Compression Utility (Duplicated for component isolation, in a real app would be a shared util)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280; 
          const MAX_HEIGHT = 1280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Image compression failed"));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      try {
        const file = e.target.files[0];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드 가능합니다. (JPEG, PNG, WebP, GIF)');
          return;
        }

        // Validate file size (max 20MB for original)
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (file.size > MAX_FILE_SIZE) {
          alert(`파일 크기가 너무 큽니다. (최대 20MB)\n현재 크기: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
          return;
        }

        const compressedBlob = await compressImage(file);

        const newPhoto: PhotoEvidence = {
          id: crypto.randomUUID(),
          fileUrl: URL.createObjectURL(compressedBlob),
          category: PHOTO_CATEGORIES[0],
          description: '',
          location: '',
          date: new Date().toISOString().split('T')[0],
        };
        setPhotos([...photos, newPhoto]);
      } catch (error) {
        console.error("Photo upload failed", error);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        alert(`사진 처리 중 오류가 발생했습니다.\n${errorMsg}`);
      } finally {
        setIsProcessing(false);
        e.target.value = ''; // Reset input
      }
    }
  };

  const updatePhoto = (id: string, field: keyof PhotoEvidence, value: string) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePhoto = (id: string) => {
    const photoToRemove = photos.find(p => p.id === id);
    if (photoToRemove?.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.fileUrl);
    }
    setPhotos(photos.filter(p => p.id !== id));
  };

  if (readOnly) {
    // Sort photos by date for the report
    const sortedPhotos = [...photos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="break-before-page mt-8">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
          3. 산업안전보건관리비 항목별 증빙 사진대지
        </h3>
        {/* Improved Border Logic: Container has Top/Left, Items have Right/Bottom */}
        <div className="grid grid-cols-2 gap-0 border-t border-l border-slate-400">
          {sortedPhotos.map((photo, index) => (
            <div key={photo.id} className="print-break-inside-avoid border-r border-b border-slate-400 p-2">
              <div className="aspect-[4/3] w-full overflow-hidden border border-slate-200 mb-2 relative bg-gray-100 flex items-center justify-center">
                 <img src={photo.fileUrl} alt={photo.category} className="object-contain w-full h-full" />
              </div>
              <div className="text-sm">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 w-16 p-1.5 text-center font-bold text-slate-700">공종</th>
                      <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{photo.category}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 p-1.5 text-center font-bold text-slate-700">작업내용</th>
                      <td className="border border-slate-300 p-1.5 text-slate-900">{photo.description || '-'}</td>
                    </tr>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 p-1.5 text-center font-bold text-slate-700">위치/일시</th>
                      <td className="border border-slate-300 p-1.5 text-slate-700">
                         {photo.location} <span className="text-slate-400 mx-1">|</span> {photo.date}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {sortedPhotos.length === 0 && (
             <div className="col-span-2 text-center py-24 text-slate-400 bg-slate-50 italic border-r border-b border-slate-400">
               (첨부된 증빙 사진이 없습니다)
             </div>
          )}
          {/* If odd number of photos, fill the empty cell to complete the grid border */}
          {sortedPhotos.length > 0 && sortedPhotos.length % 2 !== 0 && (
             <div className="border-r border-b border-slate-400"></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 no-print hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
          <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
            <Camera className="w-5 h-5" />
          </div>
          증빙 사진 업로드
        </h2>
        <label className={`cursor-pointer bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImagePlus className="w-4 h-4" />}
          {isProcessing ? '처리중...' : '사진 파일 추가'}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isProcessing} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <div key={photo.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="aspect-video w-full bg-slate-100 relative border-b border-slate-100">
              <img src={photo.fileUrl} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 transform hover:scale-110 active:scale-90"
                title="사진 삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">사진 구분 (공종)</label>
                <div className="relative">
                    <select
                    value={photo.category}
                    onChange={(e) => updatePhoto(photo.id, 'category', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium text-slate-700 appearance-none"
                    >
                    {PHOTO_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                    </select>
                     <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">작업 상세 내용</label>
                <input
                  type="text"
                  value={photo.description}
                  onChange={(e) => updatePhoto(photo.id, 'description', e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all bg-slate-50 focus:bg-white placeholder-slate-400"
                  placeholder="예: 101동 1층 계단 안전난간 보수 완료"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                     <MapPin className="w-3 h-3" /> 작업 위치
                   </label>
                   <input
                    type="text"
                    value={photo.location}
                    onChange={(e) => updatePhoto(photo.id, 'location', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white"
                    placeholder="예: 101동"
                  />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1 uppercase tracking-wide">
                     <Calendar className="w-3 h-3" /> 촬영 일자
                   </label>
                   <input
                    type="date"
                    value={photo.date}
                    onChange={(e) => updatePhoto(photo.id, 'date', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:border-indigo-500 outline-none bg-slate-50 focus:bg-white text-slate-600"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50 flex flex-col items-center justify-center transition-colors hover:bg-slate-50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
              <Camera className="w-8 h-8 text-indigo-200" />
            </div>
            <p className="font-medium text-slate-600">등록된 사진이 없습니다.</p>
            <p className="text-sm mt-1 text-slate-400">'사진 파일 추가' 버튼을 눌러 증빙 자료를 업로드하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};
