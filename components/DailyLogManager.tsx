import React, { useState } from 'react';
import { Worker, PhotoEvidence, DailyAttendance, PHOTO_CATEGORIES } from '../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, Camera, Plus, MapPin, ImagePlus, Edit3, User, Clock } from 'lucide-react';

interface Props {
  workers: Worker[];
  attendance: DailyAttendance;
  setAttendance: React.Dispatch<React.SetStateAction<DailyAttendance>>;
  photos: PhotoEvidence[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
}

export const DailyLogManager: React.FC<Props> = ({ workers, attendance, setAttendance, photos, setPhotos }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const updateAttendance = (workerId: string, value: number) => {
    setAttendance(prev => {
      const currentDay = prev[selectedDate] || {};
      const updatedDay = { ...currentDay, [workerId]: value };
      if (value === 0) delete updatedDay[workerId];
      return { ...prev, [selectedDate]: updatedDay };
    });
  };

  const todaysPhotos = photos.filter(p => p.date === selectedDate);
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newPhoto: PhotoEvidence = {
        id: crypto.randomUUID(),
        fileUrl: URL.createObjectURL(file),
        category: PHOTO_CATEGORIES[0],
        description: '',
        location: '',
        date: selectedDate,
      };
      setPhotos([...photos, newPhoto]);
    }
  };

  const updatePhotoDescription = (id: string, description: string) => {
    setPhotos(prevPhotos => 
      prevPhotos.map(p => p.id === id ? { ...p, description } : p)
    );
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Date Navigator Widget */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center sticky top-20 z-20 mx-auto max-w-md transition-all hover:shadow-md">
        <button 
          onClick={() => changeDate(-1)} 
          className="p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center mx-6 min-w-[160px]">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">DATE SELECTOR</span>
          <div className="flex items-center gap-2 relative group cursor-pointer">
             <Calendar className="w-5 h-5 text-indigo-600" />
             <span className="text-2xl font-bold text-slate-800 tracking-tight">{selectedDate}</span>
             <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <button 
          onClick={() => changeDate(1)} 
          className="p-3 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Labor Input */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            금일 투입 인력 체크
          </h3>
          
          <div className="space-y-4">
            {workers.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <User className="w-10 h-10 opacity-30 mb-2"/>
                 <p className="font-medium text-sm">등록된 근로자가 없습니다.</p>
                 <p className="text-xs mt-1">'기본 설정' 탭에서 먼저 등록해주세요.</p>
               </div>
            ) : (
              workers.map(worker => {
                const currentGongsu = attendance[selectedDate]?.[worker.id] || 0;
                
                return (
                  <div key={worker.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group ${currentGongsu > 0 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentGongsu > 0 ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                        {worker.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-base">{worker.name}</div>
                        <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">{worker.role}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 0.5 ? 0 : 0.5)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 0.5 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        0.5
                      </button>
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 1.0 ? 0 : 1.0)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.0 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        1.0
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Photo Input */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
              <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
                <Camera className="w-5 h-5" />
              </div>
              금일 작업 사진
            </h3>
            <label className="cursor-pointer flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95">
              <Plus className="w-3 h-3" /> 사진 추가
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
            </label>
           </div>

           <div className="grid grid-cols-1 gap-5">
             {todaysPhotos.map(photo => (
               <div key={photo.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row group">
                 <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-slate-100">
                   <img src={photo.fileUrl} alt="daily" className="w-full h-full object-cover" />
                   <button 
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-black/40 hover:bg-red-500 text-white p-1.5 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                   >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                   <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg text-center font-medium truncate">
                     {photo.category}
                   </div>
                 </div>
                 <div className="p-4 flex-1 flex flex-col justify-center bg-slate-50/30">
                    <label className="text-xs font-bold text-indigo-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                      <Edit3 className="w-3 h-3" /> 작업 내용 설명
                    </label>
                    <div className="relative">
                        <input 
                          type="text" 
                          value={photo.description}
                          onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                          placeholder="작업 내용을 입력하세요 (예: 101동 안전난간 보수)"
                          className="w-full text-sm border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-2 transition-colors bg-transparent placeholder-slate-400 font-medium text-slate-700"
                        />
                    </div>
                 </div>
               </div>
             ))}
             {todaysPhotos.length === 0 && (
               <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                 <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                    <ImagePlus className="w-6 h-6 text-slate-300" />
                 </div>
                 <p className="text-sm font-medium text-slate-500">오늘 촬영한 사진이 없습니다.</p>
                 <p className="text-xs mt-1 text-slate-400">우측 상단 버튼을 눌러 추가하세요.</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};