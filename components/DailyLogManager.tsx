
import React, { useState, useEffect } from 'react';
import { Worker, PhotoEvidence, DailyAttendance, PHOTO_CATEGORIES, CompressionResult } from '../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, Camera, Plus, MapPin, ImagePlus, Edit3, User, Clock, Loader2, EyeOff, Eye } from 'lucide-react';

interface Props {
  workers: Worker[];
  attendance: DailyAttendance;
  setAttendance: React.Dispatch<React.SetStateAction<DailyAttendance>>;
  photos: PhotoEvidence[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  safetyPhotos?: PhotoEvidence[];
  setSafetyPhotos?: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  year: number;
  month: number;
  safetyWorkers?: Worker[];
  safetyAttendance?: DailyAttendance;
  setSafetyAttendance?: React.Dispatch<React.SetStateAction<DailyAttendance>>;
}

export const DailyLogManager: React.FC<Props> = ({ workers, attendance, setAttendance, photos, setPhotos, safetyPhotos = [], setSafetyPhotos, year, month, safetyWorkers = [], safetyAttendance = {}, setSafetyAttendance }) => {
  // Use local date string instead of UTC to fix timezone issues
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    // Default to current date initially
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
  });
  
  const [showCalendar, setShowCalendar] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hideZeroAttendance, setHideZeroAttendance] = useState(false);

  // Sync selectedDate with global project month when it changes
  useEffect(() => {
    const currentSelected = new Date(selectedDate);
    // Note: getMonth() is 0-indexed, month prop is 1-indexed
    if (currentSelected.getFullYear() !== year || (currentSelected.getMonth() + 1) !== month) {
        // Default to the 1st day of the new report month
        const newDate = `${year}-${String(month).padStart(2, '0')}-01`;
        setSelectedDate(newDate);
    }
  }, [year, month]);

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    
    // Optional: You could restrict navigation to within the selected month here
    // For now, we allow navigating freely, but users should know report filters by month
    
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // 캘린더 관련 헬퍼 함수
  const getDaysInMonth = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const getFirstDayOfMonth = (dateStr: string) => {
    const [y, m] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, 1).getDay();
  };

  const getCurrentMonthYear = () => {
    const [y, m] = selectedDate.split('-').map(Number);
    return { year: y, month: m };
  };

  const changeMonth = (delta: number) => {
    const [y, m] = selectedDate.split('-').map(Number);
    let newMonth = m + delta;
    let newYear = y;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    
    const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
    const currentDay = parseInt(selectedDate.split('-')[2]);
    const newDay = Math.min(currentDay, daysInNewMonth);
    
    const newDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const setToday = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    setSelectedDate(localDate.toISOString().split('T')[0]);
  };

  const renderCalendar = () => {
    const [y, m] = selectedDate.split('-').map(Number);
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDayOfMonth = getFirstDayOfMonth(selectedDate);
    const days = [];

    // 빈 셀 추가
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // 날짜 추가
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }

    return days;
  };

  const updateAttendance = (workerId: string, value: number) => {
    setAttendance(prev => {
      const currentDay = prev[selectedDate] || {};
      const updatedDay = { ...currentDay, [workerId]: value };
      if (value === 0) delete updatedDay[workerId];
      return { ...prev, [selectedDate]: updatedDay };
    });
  };

  const updateSafetyAttendance = (workerId: string, value: number) => {
    if (!setSafetyAttendance) return;
    setSafetyAttendance(prev => {
      const currentDay = prev[selectedDate] || {};
      const updatedDay = { ...currentDay, [workerId]: value };
      if (value === 0) delete updatedDay[workerId];
      return { ...prev, [selectedDate]: updatedDay };
    });
  };

  // Filter workers based on hideZeroAttendance toggle
  const filteredWorkers = hideZeroAttendance
    ? workers.filter(worker => {
        const currentGongsu = attendance[selectedDate]?.[worker.id] || 0;
        return currentGongsu > 0;
      })
    : workers;

  const filteredSafetyWorkers = hideZeroAttendance
    ? safetyWorkers.filter(worker => {
        const currentGongsu = safetyAttendance[selectedDate]?.[worker.id] || 0;
        return currentGongsu > 0;
      })
    : safetyWorkers;

  const todaysPhotos = photos.filter(p => p.date === selectedDate);
  const todaysSafetyPhotos = safetyPhotos.filter(p => p.date === selectedDate);
  
  // Image Compression Utility
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1280; // Optimized width for A4 report
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
          }, 'image/jpeg', 0.7); // 70% quality JPEG
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'labor' | 'safety' = 'labor') => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      try {
        const files: File[] = Array.from(e.target.files);
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        const validationErrors: string[] = [];
        const compressionErrors: string[] = [];
        
        // Validate all files first
        const validFiles = files.filter(file => {
          if (!file.type.startsWith('image/')) {
            validationErrors.push(`"${file.name}"는 이미지 파일이 아닙니다.`);
            return false;
          }
          if (file.size > MAX_FILE_SIZE) {
            validationErrors.push(`"${file.name}" 파일 크기가 너무 큽니다. (최대 20MB, 현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            return false;
          }
          return true;
        });

        // Process files in batches to avoid overwhelming the system
        const BATCH_SIZE = 5;
        const newPhotos: PhotoEvidence[] = [];
        
        for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
          const batch = validFiles.slice(i, i + BATCH_SIZE);
          const compressionPromises = batch.map(async (file): Promise<CompressionResult> => {
            try {
              const blob = await compressImage(file);
              return { success: true, blob, file };
            } catch (error) {
              return { success: false, error, file };
            }
          });
          const results = await Promise.all(compressionPromises);
          
          // Process successful compressions and log failures
          for (const result of results) {
            if (result.success === false) {
              console.error(`Failed to compress ${result.file.name}:`, result.error);
              compressionErrors.push(`"${result.file.name}" 압축 실패: ${result.error instanceof Error ? result.error.message : '알 수 없는 오류'}`);
              continue;
            }
            newPhotos.push({
                id: crypto.randomUUID(),
                fileUrl: URL.createObjectURL(result.blob),
                category: PHOTO_CATEGORIES[0],
                description: '',
                location: '',
                date: selectedDate,
              });
          }
        }
        
        // Show all errors together if any occurred
        const allErrors = [...validationErrors, ...compressionErrors];
        if (allErrors.length > 0) {
          alert(`다음 파일들을 처리할 수 없습니다:\n\n${allErrors.join('\n')}`);
        }
        
        if (newPhotos.length > 0) {
          if (target === 'safety' && setSafetyPhotos) {
            setSafetyPhotos(prev => [...prev, ...newPhotos]);
          } else {
            setPhotos(prev => [...prev, ...newPhotos]);
          }
        }
      } catch (error) {
        console.error("Photo upload failed:", error);
        const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
        alert(`사진 처리 중 오류가 발생했습니다.\n${errorMsg}`);
      } finally {
        setIsProcessing(false);
        // Reset input
        e.target.value = '';
      }
    }
  };

  const updatePhotoDescription = (id: string, description: string, target: 'labor' | 'safety' = 'labor') => {
    if (target === 'safety' && setSafetyPhotos) {
      setSafetyPhotos(prevPhotos => 
        prevPhotos.map(p => p.id === id ? { ...p, description } : p)
      );
      return;
    }

    setPhotos(prevPhotos => prevPhotos.map(p => p.id === id ? { ...p, description } : p));
  };

  const removePhoto = (id: string, target: 'labor' | 'safety' = 'labor') => {
    const sourcePhotos = target === 'safety' ? safetyPhotos : photos;
    const photoToRemove = sourcePhotos.find(p => p.id === id);
    if (photoToRemove?.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.fileUrl);
    }

    if (target === 'safety' && setSafetyPhotos) {
      setSafetyPhotos(prev => prev.filter(p => p.id !== id));
      return;
    }

    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Date Navigator Widget */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 max-w-2xl mx-auto transition-all hover:shadow-lg">
        {/* Header with current date and quick buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">선택된 날짜</span>
              <span className="text-2xl font-bold text-slate-800">{selectedDate}</span>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap justify-center">
            <button 
              onClick={setToday}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            >
              오늘
            </button>
            <button 
              onClick={() => changeDate(-1)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              이전일
            </button>
            <button 
              onClick={() => changeDate(1)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              다음일
            </button>
            <button 
              onClick={() => setShowCalendar(!showCalendar)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${showCalendar ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              📅 달력
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {showCalendar && (
          <div className="border-t border-slate-100 pt-4 animate-in slide-in-from-top-2">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              
              <div className="text-center">
                <span className="text-lg font-bold text-slate-800">
                  {new Date(selectedDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </span>
              </div>
              
              <button
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {renderCalendar().map((date, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (date) setSelectedDate(date);
                  }}
                  disabled={!date}
                  className={`py-3 rounded-lg text-xs font-bold transition-all ${
                    !date
                      ? 'bg-slate-50 cursor-not-allowed'
                      : date === selectedDate
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : 'bg-slate-50 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer'
                  }`}
                >
                  {date ? parseInt(date.split('-')[2]) : ''}
                </button>
              ))}
            </div>

            {/* Month Warning */}
            {new Date(selectedDate).getMonth() + 1 !== month && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>주의: 선택한 날짜({new Date(selectedDate).getMonth() + 1}월)가 보고서 월({month}월)과 다릅니다.</span>
              </div>
            )}
          </div>
        )}

        {/* Direct Date Input */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-500 mb-2">직접 입력</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Labor Input */}
        <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              금일 투입 인력 체크
            </h3>
            <button
              onClick={() => setHideZeroAttendance(!hideZeroAttendance)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                hideZeroAttendance
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={hideZeroAttendance ? '모든 근로자 보기' : '출역 인원만 보기'}
            >
              {hideZeroAttendance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {hideZeroAttendance ? '전체보기' : '출역만'}
            </button>
          </div>
          
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">유도원 및 감시자 인건비</div>
          <div className="space-y-4">
            {workers.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <User className="w-10 h-10 opacity-30 mb-2"/>
                 <p className="font-medium text-sm">등록된 근로자가 없습니다.</p>
                 <p className="text-xs mt-1">'기본 설정' 탭에서 먼저 등록해주세요.</p>
               </div>
            ) : filteredWorkers.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                 <EyeOff className="w-10 h-10 opacity-30 mb-2"/>
                 <p className="font-medium text-sm">금일 출역 인원이 없습니다.</p>
                 <p className="text-xs mt-1">'전체보기' 버튼을 눌러 모든 근로자를 확인하세요.</p>
               </div>
            ) : (
              filteredWorkers.map(worker => {
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

          {/* Safety Workers Attendance */}
          {safetyWorkers.length > 0 && setSafetyAttendance && (
            <>
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider mt-6 mb-3">안전시설 인건비</div>
              <div className="space-y-4">
                {filteredSafetyWorkers.length === 0 && hideZeroAttendance ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <EyeOff className="w-8 h-8 opacity-30 mb-2"/>
                    <p className="font-medium text-sm">금일 출역 인원이 없습니다.</p>
                  </div>
                ) : (
                  filteredSafetyWorkers.map(worker => {
                    const currentGongsu = safetyAttendance[selectedDate]?.[worker.id] || 0;
                    return (
                      <div key={worker.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 group ${currentGongsu > 0 ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentGongsu > 0 ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{worker.name}</div>
                            <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">{worker.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 0.5 ? 0 : 0.5)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 0.5 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            0.5
                          </button>
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 1.0 ? 0 : 1.0)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.0 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            1.0
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Right: Photo Input */}
        <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
           <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
              <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
                <Camera className="w-5 h-5" />
              </div>
              금일 작업 사진
            </h3>
            <label className={`cursor-pointer flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
              {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3" />}
              {isProcessing ? '처리중...' : '사진 추가'}
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'labor')} disabled={isProcessing} multiple />
            </label>
           </div>

           <div className="grid grid-cols-1 gap-5">
             {todaysPhotos.map(photo => (
               <div key={photo.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row group">
                 <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-slate-100">
                   <img src={photo.fileUrl} alt="daily" className="w-full h-full object-cover" />
                   <button 
                      onClick={() => removePhoto(photo.id, 'labor')}
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
                          onChange={(e) => updatePhotoDescription(photo.id, e.target.value, 'labor')}
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

        {setSafetyPhotos && (
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
                  <Camera className="w-5 h-5" />
                </div>
                금일 안전시설 사진
              </h3>
              <label className={`cursor-pointer flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin"/> : <Plus className="w-3 h-3" />}
                {isProcessing ? '처리중...' : '사진 추가'}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'safety')} disabled={isProcessing} multiple />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {todaysSafetyPhotos.map(photo => (
                <div key={photo.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row group">
                  <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-slate-100">
                    <img src={photo.fileUrl} alt="daily-safety" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => removePhoto(photo.id, 'safety')}
                        className="absolute top-2 right-2 bg-black/40 hover:bg-red-500 text-white p-1.5 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-lg text-center font-medium truncate">
                      {photo.category}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center bg-slate-50/30">
                      <label className="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        <Edit3 className="w-3 h-3" /> 작업 내용 설명
                      </label>
                      <div className="relative">
                          <input 
                            type="text" 
                            value={photo.description}
                            onChange={(e) => updatePhotoDescription(photo.id, e.target.value, 'safety')}
                            placeholder="작업 내용을 입력하세요"
                            className="w-full text-sm border-b-2 border-slate-200 focus:border-orange-500 outline-none py-2 transition-colors bg-transparent placeholder-slate-400 font-medium text-slate-700"
                          />
                      </div>
                  </div>
                </div>
              ))}
              {todaysSafetyPhotos.length === 0 && (
                <div className="py-16 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                      <ImagePlus className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">오늘 촬영한 안전시설 사진이 없습니다.</p>
                  <p className="text-xs mt-1 text-slate-400">우측 상단 버튼을 눌러 추가하세요.</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
