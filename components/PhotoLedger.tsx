
import React, { useEffect, useState, useRef } from 'react';
import { PhotoEvidence, PHOTO_CATEGORIES, CompressionResult, Worker, DailyAttendance, DailyAttendanceRole } from '../types';
import { ImagePlus, MapPin, Calendar, X, Camera, Loader2, ChevronDown, ChevronUp, RotateCcw, CheckCircle2, AlertCircle, Filter, Edit3 } from 'lucide-react';
import { estimateMemoryUsage, optimizeImage, processInChunks } from '../utils/photoOptimization';
import { ZoomableImage } from './ZoomableImage';

interface Props {
  photos: PhotoEvidence[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  workers?: Worker[];
  attendance?: DailyAttendance;
  attendanceRole?: DailyAttendanceRole;
  year?: number;
  month?: number;
  readOnly?: boolean;
  title?: string;
  categoryOptions?: string[]; // Custom category list (e.g., from worker roles)
  uploadQualityPreset?: 'low' | 'balanced' | 'high';
  isCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  defaultCollapsed?: boolean;
}

export const PhotoLedger: React.FC<Props> = ({ photos, setPhotos, workers, attendance, attendanceRole, year, month, readOnly = false, title, categoryOptions, uploadQualityPreset = 'balanced', isCollapsed, onCollapseChange, defaultCollapsed = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(defaultCollapsed);
  const sectionCollapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;
  
  const toggleSectionCollapse = () => {
    if (onCollapseChange) {
      onCollapseChange(!sectionCollapsed);
    } else {
      setLocalCollapsed(!sectionCollapsed);
    }
  };
  const [inferredOrientations, setInferredOrientations] = useState<Record<string, 'portrait' | 'landscape' | 'square'>>({});
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkDescription, setBulkDescription] = useState<string>('');
  const [bulkDate, setBulkDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'editing'>('all');

  const [slotTarget, setSlotTarget] = useState<{ date: string; role: string } | null>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);

  const triggerSlotUpload = (date: string, role: string) => {
    setSlotTarget({ date, role });
    if (slotFileInputRef.current) {
      slotFileInputRef.current.value = '';
      slotFileInputRef.current.click();
    }
  };

  const handleSlotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!slotTarget || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    try {
      const { blob } = await optimizeImage(file, 1280, 1280, 0.68);
      let orientation: 'portrait' | 'landscape' | 'square' = 'landscape';
      try {
        orientation = await getImageOrientation(blob);
      } catch {}
      const newPhoto: PhotoEvidence = {
        id: crypto.randomUUID(),
        fileUrl: URL.createObjectURL(blob),
        category: slotTarget.role,
        date: slotTarget.date,
        description: '',
        location: '',
        orientation,
        status: 'completed',
      };
      setPhotos(prev => [...prev, newPhoto]);
    } catch (err) {
      alert("사진 추가 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setSlotTarget(null);
      e.target.value = '';
    }
  };

  // --- Smart Photo Auto-Matching Logic ---
  const autoMatchPhotosToAttendance = () => {
    if (!attendance || !workers || workers.length === 0 || !year || !month) {
      alert("출역 기록 데이터가 연동되지 않았습니다.");
      return;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const activeSlotsByRole: Record<string, string[]> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAttendance = attendance[dateStr] || {};
      
      const activeRolesOnDay = new Set<string>();
      workers.forEach(w => {
        const gongsu = dayAttendance[w.id] || 0;
        if (gongsu > 0) {
          const role = (attendanceRole?.[dateStr]?.[w.id]) || w.role || '기타';
          activeRolesOnDay.add(role);
        }
      });

      activeRolesOnDay.forEach(role => {
        if (!activeSlotsByRole[role]) activeSlotsByRole[role] = [];
        activeSlotsByRole[role].push(dateStr);
      });
    }

    const roleKeys = Object.keys(activeSlotsByRole);
    if (roleKeys.length === 0) {
      alert(`${year}년 ${month}월에 출역한 근로자 기록이 없어 매칭할 수 없습니다.`);
      return;
    }

    let updatedCount = 0;
    const updatedPhotos = [...photos];

    // For each role, distribute photos across active dates sequentially
    roleKeys.forEach(role => {
      const activeDates = activeSlotsByRole[role];
      const rolePhotos = updatedPhotos.filter(p => p.category === role);

      rolePhotos.forEach((photo, idx) => {
        const targetDate = activeDates[idx % activeDates.length];
        if (photo.date !== targetDate) {
          const pIndex = updatedPhotos.findIndex(p => p.id === photo.id);
          if (pIndex !== -1) {
            updatedPhotos[pIndex] = { ...updatedPhotos[pIndex], date: targetDate };
            updatedCount++;
          }
        }
      });
    });

    setPhotos(updatedPhotos);

    // Summary of missing photos per active role
    const missingSlotSummary: string[] = [];
    roleKeys.forEach(role => {
      const activeDates = activeSlotsByRole[role];
      const photoCount = updatedPhotos.filter(p => p.category === role).length;
      if (photoCount < activeDates.length) {
        missingSlotSummary.push(`• [${role}]: 출역 ${activeDates.length}일 중 사진 ${photoCount}장 (부족: ${activeDates.length - photoCount}장)`);
      }
    });

    let message = `✅ 총 ${updatedCount}장의 사진이 해당 월의 출역일자에 맞게 세분화 공종별로 자동 매칭되었습니다!\n`;
    if (missingSlotSummary.length > 0) {
      message += `\n⚠️ 아래 항목은 출역일수에 비해 증빙 사진이 부족합니다:\n${missingSlotSummary.join('\n')}\n\n[세분화 공종별 사진 매칭 현황] 카드에서 부족한 날짜의 [+사진] 버튼으로 손쉽게 추가하실 수 있습니다.`;
    } else {
      message += `\n🎉 모든 출역일자의 세분화 공종별 사진 매칭이 완벽히 완료되었습니다!`;
    }

    alert(message);
  };

  const availableCategories = (categoryOptions && categoryOptions.length > 0) ? categoryOptions : PHOTO_CATEGORIES;

  useEffect(() => {
    setSelectedPhotoIds(prev => prev.filter(id => photos.some(photo => photo.id === id)));
  }, [photos]);

  useEffect(() => {
    if (!bulkCategory) {
      setBulkCategory(availableCategories[0] || '');
      return;
    }

    if (!availableCategories.includes(bulkCategory)) {
      setBulkCategory(availableCategories[0] || '');
    }
  }, [availableCategories, bulkCategory]);

  useEffect(() => {
    if (!bulkDate) {
      const today = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      setBulkDate(today);
    }
  }, [bulkDate]);

  const getImageOrientation = (blob: Blob): Promise<'portrait' | 'landscape' | 'square'> => {
    return new Promise((resolve, reject) => {
      const imageUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        URL.revokeObjectURL(imageUrl);
        if (height > width) resolve('portrait');
        else if (width > height) resolve('landscape');
        else resolve('square');
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      };

      img.src = imageUrl;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const optimizedBase64List: string[] = [];
        
        const results = await processInChunks(
          validFiles,
          async (file): Promise<CompressionResult & { base64?: string }> => {
            try {
              const baseQuality = uploadQualityPreset === 'low' ? 0.58 : uploadQualityPreset === 'high' ? 0.8 : 0.68;
              const quality = file.size > 8 * 1024 * 1024
                ? Math.max(baseQuality - 0.08, 0.5)
                : file.size > 4 * 1024 * 1024
                  ? Math.max(baseQuality - 0.03, 0.52)
                  : baseQuality;
              const { blob, base64 } = await optimizeImage(file, 1280, 1280, quality);
              return { success: true, blob, file, base64 };
            } catch (error) {
              return { success: false, error, file };
            }
          },
          BATCH_SIZE
        );

        for (const result of results) {
          if (result.success === false) {
            console.error(`Failed to compress ${result.file.name}:`, result.error);
            compressionErrors.push(`"${result.file.name}" 압축 실패: ${result.error instanceof Error ? result.error.message : '알 수 없는 오류'}`);
            continue;
          }

          if (result.base64) optimizedBase64List.push(result.base64);

          let orientation: 'portrait' | 'landscape' | 'square' = 'landscape';
          try {
            orientation = await getImageOrientation(result.blob);
          } catch (orientationError) {
            console.warn(`사진 방향 감지 실패 (${result.file.name})`, orientationError);
          }

          newPhotos.push({
            id: crypto.randomUUID(),
            fileUrl: URL.createObjectURL(result.blob),
            category: (categoryOptions && categoryOptions.length > 0) ? categoryOptions[0] : PHOTO_CATEGORIES[0],
            description: '',
            location: '',
            date: new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
            orientation,
            status: 'completed',
          });
        }

        const estimatedUsage = estimateMemoryUsage(optimizedBase64List);
        
        // Show all errors together if any occurred
        const allErrors = [...validationErrors, ...compressionErrors];
        if (allErrors.length > 0) {
          alert(`다음 파일들을 처리할 수 없습니다:\n\n${allErrors.join('\n')}`);
        }

        if (estimatedUsage.totalMB > 15) {
          alert(`⚠️ 이번 업로드 사진의 예상 저장 용량이 ${estimatedUsage.totalMB.toFixed(1)}MB입니다.\n사진 수가 많으면 복구/백업 속도가 느려질 수 있습니다.`);
        }
        
        if (newPhotos.length > 0) {
          setPhotos([...photos, ...newPhotos]);
        }
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

  const togglePhotoSelection = (id: string) => {
    setSelectedPhotoIds(prev => prev.includes(id) ? prev.filter(photoId => photoId !== id) : [...prev, id]);
  };

  const selectAllPhotos = () => {
    setSelectedPhotoIds(photos.map(photo => photo.id));
  };

  const clearPhotoSelection = () => {
    setSelectedPhotoIds([]);
  };

  const applyBulkCategoryChange = () => {
    if (selectedPhotoIds.length === 0) {
      alert('일괄 수정할 사진을 먼저 선택하세요.');
      return;
    }

    if (!bulkCategory) {
      alert('변경할 공종을 선택하세요.');
      return;
    }

    setPhotos(prev => prev.map(photo => selectedPhotoIds.includes(photo.id) ? { ...photo, category: bulkCategory } : photo));
    setSelectedPhotoIds([]);
  };

  const applyBulkMetaChange = () => {
    if (selectedPhotoIds.length === 0) {
      alert('일괄 수정할 사진을 먼저 선택하세요.');
      return;
    }

    const hasCategory = bulkCategory.trim().length > 0;
    const hasDescription = bulkDescription.trim().length > 0;
    const hasDate = bulkDate.trim().length > 0;

    if (!hasCategory && !hasDescription && !hasDate) {
      alert('변경할 항목을 하나 이상 입력하세요.');
      return;
    }

    setPhotos(prev => prev.map(photo => {
      if (!selectedPhotoIds.includes(photo.id)) return photo;
      return {
        ...photo,
        ...(hasCategory ? { category: bulkCategory } : {}),
        ...(hasDescription ? { description: bulkDescription } : {}),
        ...(hasDate ? { date: bulkDate } : {}),
      };
    }));
    setSelectedPhotoIds([]);
  };

  const applyBulkStatusChange = (status: 'completed' | 'editing') => {
    if (selectedPhotoIds.length === 0) {
      alert('상태를 변경할 사진을 먼저 선택하세요.');
      return;
    }
    setPhotos(prev => prev.map(photo => selectedPhotoIds.includes(photo.id) ? { ...photo, status } : photo));
    setSelectedPhotoIds([]);
  };

  const removePhoto = (id: string) => {
    const photoToRemove = photos.find(p => p.id === id);
    if (photoToRemove?.fileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoToRemove.fileUrl);
    }
    setPhotos(photos.filter(p => p.id !== id));
  };

  useEffect(() => {
    if (!readOnly) return;

    const targets = photos.filter(photo => !photo.orientation && !inferredOrientations[photo.id]);
    if (targets.length === 0) return;

    let isCancelled = false;

    const inferLegacyOrientations = async () => {
      const updates: Record<string, 'portrait' | 'landscape' | 'square'> = {};

      await Promise.all(
        targets.map(async (photo) => {
          try {
            const response = await fetch(photo.fileUrl);
            if (!response.ok) return;
            const blob = await response.blob();
            updates[photo.id] = await getImageOrientation(blob);
          } catch {
            return;
          }
        })
      );

      if (!isCancelled && Object.keys(updates).length > 0) {
        setInferredOrientations(prev => ({ ...prev, ...updates }));
      }
    };

    inferLegacyOrientations();

    return () => {
      isCancelled = true;
    };
  }, [photos, readOnly, inferredOrientations]);

  const getFrameAspectClass = (photo: PhotoEvidence) => {
    const orientation = photo.orientation || inferredOrientations[photo.id] || 'landscape';
    if (orientation === 'portrait') return 'aspect-[3/4]';
    if (orientation === 'square') return 'aspect-square';
    return 'aspect-[4/3]';
  };

  const getObjectPositionClass = (photo: PhotoEvidence) => {
    if (photo.cropPosition === 'top') return 'object-top';
    if (photo.cropPosition === 'bottom') return 'object-bottom';
    return 'object-center';
  };

  if (readOnly) {
    // Sort photos by date for the report
    const sortedPhotos = [...photos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
          {title || "3. 산업안전보건관리비 항목별 증빙 사진대지"}
        </h3>
        {/* Improved Border Logic: Container has Top/Left, Items have Right/Bottom */}
        <div className="grid grid-cols-2 gap-0 border-t border-l border-slate-400">
          {sortedPhotos.map((photo, index) => (
            <div key={photo.id} className="print-break-inside-avoid border-r border-b border-slate-400 p-2">
                <div className={`${getFrameAspectClass(photo)} w-full overflow-hidden border border-slate-200 mb-2 relative bg-gray-100`}>
                  <ZoomableImage src={photo.fileUrl} alt={photo.category} className={`object-cover ${getObjectPositionClass(photo)} w-full h-full`} />
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
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 mb-8 no-print hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center p-8 pb-6">
        <button
          onClick={toggleSectionCollapse}
          className="flex items-center gap-3 text-left flex-1 min-w-0"
        >
          <div className="bg-rose-100 p-2 rounded-xl text-rose-600 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">{title || "증빙 사진 업로드"}</h2>
          {sectionCollapsed ? <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />}
        </button>
        <label className={`ml-4 cursor-pointer bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <ImagePlus className="w-4 h-4" />}
          {isProcessing ? '처리중...' : '사진 파일 추가'}
          <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isProcessing} multiple />
        </label>
      </div>

      <input type="file" ref={slotFileInputRef} className="hidden" accept="image/*" onChange={handleSlotFileUpload} disabled={isProcessing} />

      {!sectionCollapsed && attendance && workers && year && month && (
        <div className="mx-8 mb-4 p-5 bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-pink-50/90 border border-indigo-200/80 rounded-2xl shadow-xs break-keep">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-3 border-b border-indigo-100/80">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0">스마트 기능</span>
              <h3 className="font-extrabold text-slate-800 text-base break-keep leading-snug">출역일자 기준 세분화 공종 사진 자동 매칭</h3>
            </div>

            <button
              type="button"
              onClick={autoMatchPhotosToAttendance}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer whitespace-nowrap active:scale-95 self-start lg:self-auto"
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">⚡ 출역일자별 사진 자동 매칭 실행</span>
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-3 break-keep leading-relaxed font-medium">
            {year}년 {month}월 근로자 출역 기록과 유도원 세분화 공종(갱폼, 지게차, 펌프카 등)을 기반으로 사진 날짜를 자동 일치시킵니다.
          </p>

          {/* Required Active Photo Slots Status Matrix */}
          {(() => {
            const daysInMonth = new Date(year, month, 0).getDate();
            const activeSlotsByRole: Record<string, string[]> = {};

            for (let day = 1; day <= daysInMonth; day++) {
              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAttendance = attendance[dateStr] || {};
              
              const activeRolesOnDay = new Set<string>();
              workers.forEach(w => {
                const gongsu = dayAttendance[w.id] || 0;
                if (gongsu > 0) {
                  const role = (attendanceRole?.[dateStr]?.[w.id]) || w.role || '기타';
                  activeRolesOnDay.add(role);
                }
              });

              activeRolesOnDay.forEach(role => {
                if (!activeSlotsByRole[role]) activeSlotsByRole[role] = [];
                activeSlotsByRole[role].push(dateStr);
              });
            }

            const roleEntries = Object.entries(activeSlotsByRole);
            if (roleEntries.length === 0) return null;

            return (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1.5">
                  <span>📋 세분화 공종별 출역 현황 & 증빙 사진 매칭/검토 상태</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    🟢 완료 / 🟠 수정필요 / 🔴 부족
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roleEntries.map(([role, activeDates]) => {
                    const rolePhotos = photos.filter(p => p.category === role);
                    const isMatched = rolePhotos.length >= activeDates.length;
                    const roleEditingCount = rolePhotos.filter(p => p.status === 'editing').length;
                    const roleCompletedCount = rolePhotos.filter(p => (p.status || 'completed') === 'completed').length;

                    return (
                      <div key={role} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-bold text-slate-800 text-xs truncate" title={role}>{role}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            !isMatched 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : roleEditingCount > 0 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {!isMatched 
                              ? `🔴 ${activeDates.length - rolePhotos.length}장 부족 (${rolePhotos.length}/${activeDates.length}일)` 
                              : roleEditingCount > 0 
                                ? `🟠 수정필요 ${roleEditingCount}건 (${roleCompletedCount}건 완료)` 
                                : `🟢 검토완료 (${rolePhotos.length}/${activeDates.length}일)`}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {activeDates.map(dateStr => {
                            const slotPhoto = photos.find(p => p.category === role && p.date === dateStr);
                            const hasPhoto = !!slotPhoto;
                            const isEditing = slotPhoto?.status === 'editing';
                            const dayNum = parseInt(dateStr.split('-')[2], 10);

                            return (
                              <div key={dateStr} className={`text-[10px] px-2 py-1 rounded-lg border flex items-center gap-1 ${
                                !hasPhoto 
                                  ? 'bg-slate-50 text-slate-400 border-slate-200 font-normal' 
                                  : isEditing
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                                    : 'bg-indigo-50 text-indigo-900 border-indigo-200 font-bold'
                              }`}>
                                <span>{dayNum}일</span>
                                {hasPhoto ? (
                                  isEditing ? (
                                    <AlertCircle className="w-3 h-3 text-amber-600" title="수정 필요/수정중" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" title="검토 완료" />
                                  )
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => triggerSlotUpload(dateStr, role)}
                                    className="text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-1 rounded border border-rose-200 transition-colors ml-0.5 cursor-pointer"
                                    title={`${dateStr} ${role} 사진 추가`}
                                  >
                                    +사진
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!sectionCollapsed && photos.length > 0 && (() => {
        const totalPhotoCount = photos.length;
        const completedPhotoCount = photos.filter(p => (p.status || 'completed') === 'completed').length;
        const editingPhotoCount = photos.filter(p => p.status === 'editing').length;
        const completionPercentage = totalPhotoCount > 0 ? Math.round((completedPhotoCount / totalPhotoCount) * 100) : 0;

        return (
          <div className="mx-8 mb-4 p-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-xs font-extrabold text-slate-800">📸 사진 세부항목별 업로드 & 검토 상태:</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  🟢 완료 {completedPhotoCount}건
                </span>
                {editingPhotoCount > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                    🟠 수정필요/수정중 {editingPhotoCount}건
                  </span>
                )}
                <span className="text-xs font-bold text-slate-500 ml-auto">
                  완료율: {completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0 self-start md:self-auto">
              <span className="text-[11px] font-bold text-slate-400 px-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" /> 필터:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                전체 ({totalPhotoCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                🟢 완료 ({completedPhotoCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('editing')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${statusFilter === 'editing' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                🟠 수정필요 ({editingPhotoCount})
              </button>
            </div>
          </div>
        );
      })()}

      {!sectionCollapsed && photos.length > 0 && (
        <div className="px-8 pb-4 flex flex-col gap-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllPhotos}
              className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              전체 선택
            </button>
            <button
              type="button"
              onClick={clearPhotoSelection}
              className="px-3 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
            >
              선택 해제
            </button>
            <div className="ml-auto text-xs text-slate-500 font-medium">
              선택됨: <span className="font-bold text-slate-800">{selectedPhotoIds.length}</span> / {photos.length}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">일괄 변경 공종</label>
              <div className="relative">
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium text-slate-700 appearance-none"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">일괄 작업내용</label>
              <input
                type="text"
                value={bulkDescription}
                onChange={(e) => setBulkDescription(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-slate-400"
                placeholder="선택 항목에 동일 내용 적용"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">일괄 촬영일자</label>
              <input
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-slate-700"
              />
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={applyBulkMetaChange}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              disabled={selectedPhotoIds.length === 0}
            >
              선택 항목 내용 적용
            </button>
            <button
              type="button"
              onClick={() => applyBulkStatusChange('completed')}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              disabled={selectedPhotoIds.length === 0}
            >
              <CheckCircle2 className="w-4 h-4" />
              선택 항목 완료 처리
            </button>
            <button
              type="button"
              onClick={() => applyBulkStatusChange('editing')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              disabled={selectedPhotoIds.length === 0}
            >
              <AlertCircle className="w-4 h-4" />
              선택 항목 수정 상태 변경
            </button>
          </div>
        </div>
      )}

      {!sectionCollapsed && (() => {
        const displayedPhotos = photos.filter(photo => {
          const currentStatus = photo.status || 'completed';
          if (statusFilter === 'completed') return currentStatus === 'completed';
          if (statusFilter === 'editing') return currentStatus === 'editing';
          return true;
        });

        return (
          <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedPhotos.map((photo) => {
              const isEditing = photo.status === 'editing';

              return (
                <div key={photo.id} className={`border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${
                  isEditing ? 'border-amber-300 ring-2 ring-amber-200/60' : 'border-slate-200'
                }`}>
                  <div className="aspect-video w-full bg-slate-100 relative border-b border-slate-100 overflow-hidden">
                    <ZoomableImage src={photo.fileUrl} alt="preview" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                    
                    {/* Status Badge Tag */}
                    <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-full backdrop-blur-md shadow-md border text-xs font-extrabold flex items-center gap-1 z-10 ${
                      !isEditing
                        ? 'bg-emerald-600/90 text-white border-emerald-400'
                        : 'bg-amber-500/90 text-white border-amber-400 animate-pulse'
                    }`}>
                      {!isEditing ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>완료</span>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>수정필요</span>
                        </>
                      )}
                    </div>

                    <label className="absolute top-2 right-12 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md border border-slate-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10">
                      <input
                        type="checkbox"
                        checked={selectedPhotoIds.includes(photo.id)}
                        onChange={() => togglePhotoSelection(photo.id)}
                        className="h-4 w-4 accent-indigo-600 cursor-pointer"
                        aria-label="사진 선택"
                      />
                    </label>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 transform hover:scale-110 active:scale-90 z-10"
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
                          {availableCategories.map(cat => (
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

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">출력 크롭 위치</label>
                      <div className="relative">
                        <select
                          value={photo.cropPosition || 'center'}
                          onChange={(e) => updatePhoto(photo.id, 'cropPosition', e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer font-medium text-slate-700 appearance-none"
                        >
                          <option value="top">상단 우선</option>
                          <option value="center">중앙 기준</option>
                          <option value="bottom">하단 우선</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>

                    {/* Completion / Editing Status Action Button */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">검토 및 상태 체크</span>
                      <button
                        type="button"
                        onClick={() => updatePhoto(photo.id, 'status', isEditing ? 'completed' : 'editing')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                          !isEditing
                            ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                            : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-400 font-extrabold'
                        }`}
                        title="클릭하여 완료/수정 상태를 전환합니다"
                      >
                        {!isEditing ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>완료 (수정하려면 클릭)</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                            <span>수정중 (완료로 변경)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedPhotos.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50 flex flex-col items-center justify-center transition-colors hover:bg-slate-50">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                  <Camera className="w-8 h-8 text-indigo-200" />
                </div>
                <p className="font-medium text-slate-600">
                  {statusFilter === 'all' ? '등록된 사진이 없습니다.' : statusFilter === 'completed' ? '완료 처리된 사진이 없습니다.' : '수정 필요/수정중인 사진이 없습니다.'}
                </p>
                <p className="text-sm mt-1 text-slate-400">'사진 파일 추가' 버튼을 눌러 증빙 자료를 업로드하세요.</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
