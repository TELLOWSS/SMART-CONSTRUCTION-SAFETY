
import React, { useState, useEffect, useRef } from 'react';
import { Worker, PhotoEvidence, DailyAttendance, PHOTO_CATEGORIES, WORKER_ROLES, CompressionResult } from '../types';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, Camera, Plus, MapPin, ImagePlus, Edit3, User, Clock, Loader2, EyeOff, Eye, RotateCcw } from 'lucide-react';
import { estimateMemoryUsage, optimizeImage, processInChunks } from '../utils/photoOptimization';
import { ZoomableImage } from './ZoomableImage';

interface Props {
  workers: Worker[];
  attendance: DailyAttendance;
  setAttendance: React.Dispatch<React.SetStateAction<DailyAttendance>>;
  attendanceRole?: DailyAttendanceRole;
  setAttendanceRole?: React.Dispatch<React.SetStateAction<DailyAttendanceRole>>;
  photos: PhotoEvidence[];
  setPhotos: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  safetyPhotos?: PhotoEvidence[];
  setSafetyPhotos?: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>;
  year: number;
  month: number;
  safetyWorkers?: Worker[];
  safetyAttendance?: DailyAttendance;
  setSafetyAttendance?: React.Dispatch<React.SetStateAction<DailyAttendance>>;
  safetyAttendanceRole?: DailyAttendanceRole;
  setSafetyAttendanceRole?: React.Dispatch<React.SetStateAction<DailyAttendanceRole>>;
  uploadQualityPreset?: 'low' | 'balanced' | 'high';
  laborCategoryOptions?: string[];
  safetyCategoryOptions?: string[];
}

export const DailyLogManager: React.FC<Props> = ({ workers, attendance, setAttendance, attendanceRole = {}, setAttendanceRole, photos, setPhotos, safetyPhotos = [], setSafetyPhotos, year, month, safetyWorkers = [], safetyAttendance = {}, setSafetyAttendance, safetyAttendanceRole = {}, setSafetyAttendanceRole, uploadQualityPreset = 'balanced', laborCategoryOptions, safetyCategoryOptions }) => {
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
  const [selectedLaborUploadCategory, setSelectedLaborUploadCategory] = useState<string>('');
  const [selectedSafetyUploadCategory, setSelectedSafetyUploadCategory] = useState<string>('');
  const [photoFilterCategory, setPhotoFilterCategory] = useState<string>('all');
  const workerFileInputRef = useRef<HTMLInputElement>(null);
  const [workerPhotoUploadTargetRole, setWorkerPhotoUploadTargetRole] = useState<string>('');
  const [bulkUploadCategory, setBulkUploadCategory] = useState<string>('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Sync selectedDate with global project month when it changes
  useEffect(() => {
    const validYear = Number(year) || new Date().getFullYear();
    const validMonth = Number(month) || (new Date().getMonth() + 1);
    
    if (!selectedDate || typeof selectedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      setSelectedDate(`${validYear}-${String(validMonth).padStart(2, '0')}-01`);
      return;
    }

    const currentSelected = new Date(selectedDate);
    if (isNaN(currentSelected.getTime()) || currentSelected.getFullYear() !== validYear || (currentSelected.getMonth() + 1) !== validMonth) {
      setSelectedDate(`${validYear}-${String(validMonth).padStart(2, '0')}-01`);
    }
  }, [year, month]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    const newDate = current.toISOString().split('T')[0];
    setSelectedDate(newDate);
  };

  // 캘린더 관련 헬퍼 함수
  const getDaysInMonth = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return 30;
    const parts = dateStr.split('-').map(Number);
    const y = parts[0] || year || new Date().getFullYear();
    const m = parts[1] || month || (new Date().getMonth() + 1);
    return new Date(y, m, 0).getDate();
  };

  const getFirstDayOfMonth = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const parts = dateStr.split('-').map(Number);
    const y = parts[0] || year || new Date().getFullYear();
    const m = parts[1] || month || (new Date().getMonth() + 1);
    return new Date(y, m - 1, 1).getDay();
  };

  const getCurrentMonthYear = () => {
    if (!selectedDate || typeof selectedDate !== 'string') {
      return { year: year || new Date().getFullYear(), month: month || (new Date().getMonth() + 1) };
    }
    const parts = selectedDate.split('-').map(Number);
    return { year: parts[0] || year || new Date().getFullYear(), month: parts[1] || month || (new Date().getMonth() + 1) };
  };

  const changeMonth = (delta: number) => {
    const { year: y, month: m } = getCurrentMonthYear();
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
    const parts = (selectedDate || '').split('-');
    const currentDay = parts[2] ? parseInt(parts[2], 10) : 1;
    const newDay = Math.min(isNaN(currentDay) ? 1 : currentDay, daysInNewMonth);
    
    const newDate = `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
    setSelectedDate(newDate);
  };

  const setToday = () => {
    const now = new Date();
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    setSelectedDate(localDate.toISOString().split('T')[0]);
  };

  const renderCalendar = () => {
    const { year: y, month: m } = getCurrentMonthYear();
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

  const updateAttendance = (workerId: string, gongsu: number) => {
    if (!workerId || !selectedDate || !setAttendance) return;
    setAttendance(prevAttendance => {
      const current = prevAttendance || {};
      const dayAttendance = { ...(current[selectedDate] || {}) };
      
      if (gongsu === 0) {
        delete dayAttendance[workerId];
      } else {
        dayAttendance[workerId] = gongsu;
      }

      return {
        ...current,
        [selectedDate]: dayAttendance
      };
    });
  };

  const updateSafetyAttendance = (workerId: string, gongsu: number) => {
    if (!workerId || !selectedDate || !setSafetyAttendance) return;
    setSafetyAttendance(prevAttendance => {
      const current = prevAttendance || {};
      const dayAttendance = { ...(current[selectedDate] || {}) };
      
      if (gongsu === 0) {
        delete dayAttendance[workerId];
      } else {
        dayAttendance[workerId] = gongsu;
      }

      return {
        ...current,
        [selectedDate]: dayAttendance
      };
    });
  };

  const handleRoleChange = (workerId: string, newRole: string) => {
    if (!workerId || !selectedDate || !setAttendanceRole) return;
    setAttendanceRole(prev => {
      const current = prev || {};
      return {
        ...current,
        [selectedDate]: {
          ...(current[selectedDate] || {}),
          [workerId]: newRole
        }
      };
    });
  };

  // Safe state accessors to prevent crashes from uninitialized or old restored backup data
  const safeWorkers = Array.isArray(workers) ? workers : [];
  const safeSafetyWorkers = Array.isArray(safetyWorkers) ? safetyWorkers : [];
  const safeAttendance = attendance || {};
  const safeAttendanceRole = attendanceRole || {};
  const safeSafetyAttendance = safetyAttendance || {};
  const safePhotos = Array.isArray(photos) ? photos : [];
  const safeSafetyPhotos = Array.isArray(safetyPhotos) ? safetyPhotos : [];

  const baseLaborCategories = (laborCategoryOptions && laborCategoryOptions.length > 0 ? laborCategoryOptions : WORKER_ROLES);
  const resolvedLaborCategories = Array.from(new Set([
    ...baseLaborCategories,
    ...safeWorkers.map(w => w?.role).filter(Boolean)
  ]));

  const baseSafetyCategories = (safetyCategoryOptions && safetyCategoryOptions.length > 0 ? safetyCategoryOptions : WORKER_ROLES);
  const resolvedSafetyCategories = Array.from(new Set([
    ...baseSafetyCategories,
    ...safeSafetyWorkers.map(w => w?.role).filter(Boolean)
  ]));

  // Filter workers based on hideZeroAttendance toggle
  const filteredWorkers = hideZeroAttendance
    ? safeWorkers.filter(worker => {
        if (!worker || !worker.id) return false;
        const currentGongsu = safeAttendance[selectedDate]?.[worker.id] || 0;
        return currentGongsu > 0;
      })
    : safeWorkers;

  const filteredSafetyWorkers = hideZeroAttendance
    ? safeSafetyWorkers.filter(worker => {
        if (!worker || !worker.id) return false;
        const currentGongsu = safeSafetyAttendance[selectedDate]?.[worker.id] || 0;
        return currentGongsu > 0;
      })
    : safeSafetyWorkers;

  const todaysPhotos = safePhotos.filter(p => p && p.date === selectedDate);
  const todaysSafetyPhotos = safeSafetyPhotos.filter(p => p && p.date === selectedDate);

  // Real-time daily & monthly attendance statistics
  const todaysLaborGongsu = safeWorkers.reduce((sum, w) => sum + (w?.id ? (safeAttendance[selectedDate]?.[w.id] || 0) : 0), 0);
  const todaysLaborWorkersCount = safeWorkers.filter(w => w?.id && (safeAttendance[selectedDate]?.[w.id] || 0) > 0).length;

  const todaysSafetyGongsu = safeSafetyWorkers.reduce((sum, w) => sum + (w?.id ? (safeSafetyAttendance[selectedDate]?.[w.id] || 0) : 0), 0);
  const todaysSafetyWorkersCount = safeSafetyWorkers.filter(w => w?.id && (safeSafetyAttendance[selectedDate]?.[w.id] || 0) > 0).length;

  const [selYearStr, selMonthStr] = selectedDate.split('-');
  const selYearNum = Number(selYearStr || year);
  const selMonthNum = Number(selMonthStr || month);
  const daysInSelMonth = new Date(selYearNum, selMonthNum, 0).getDate();

  const monthlyLaborGongsu = Array.from({ length: daysInSelMonth }, (_, i) => i + 1).reduce((sum, day) => {
    const dateStr = `${selYearStr}-${selMonthStr}-${String(day).padStart(2, '0')}`;
    const dayAttendance = safeAttendance[dateStr] || {};
    return sum + Object.values(dayAttendance).reduce((s, v) => s + v, 0);
  }, 0);

  const monthlySafetyGongsu = Array.from({ length: daysInSelMonth }, (_, i) => i + 1).reduce((sum, day) => {
    const dateStr = `${selYearStr}-${selMonthStr}-${String(day).padStart(2, '0')}`;
    const dayAttendance = safeSafetyAttendance[dateStr] || {};
    return sum + Object.values(dayAttendance).reduce((s, v) => s + v, 0);
  }, 0);

  // Today's breakdown by subdivided role (considering daily role overrides)
  const todaysRoleBreakdown = safeWorkers.reduce((acc, worker) => {
    if (!worker || !worker.id) return acc;
    const gongsu = safeAttendance[selectedDate]?.[worker.id] || 0;
    if (gongsu > 0) {
      const role = safeAttendanceRole[selectedDate]?.[worker.id] || worker.role || '기타';
      if (!acc[role]) {
        acc[role] = { count: 0, gongsu: 0 };
      }
      acc[role].count += 1;
      acc[role].gongsu += gongsu;
    }
    return acc;
  }, {} as Record<string, { count: number; gongsu: number }>);

  if (safeSafetyWorkers.length > 0) {
    safeSafetyWorkers.forEach(worker => {
      if (!worker || !worker.id) return;
      const gongsu = (safeSafetyAttendance && selectedDate && safeSafetyAttendance[selectedDate]) ? (safeSafetyAttendance[selectedDate][worker.id] || 0) : 0;
      if (gongsu > 0) {
        const role = (safeSafetyAttendanceRole && selectedDate && safeSafetyAttendanceRole[selectedDate] && safeSafetyAttendanceRole[selectedDate][worker.id])
          ? safeSafetyAttendanceRole[selectedDate][worker.id]
          : (worker.role || '안전시설');
        if (!todaysRoleBreakdown[role]) {
          todaysRoleBreakdown[role] = { count: 0, gongsu: 0 };
        }
        todaysRoleBreakdown[role].count += 1;
        todaysRoleBreakdown[role].gongsu += gongsu;
      }
    });
  }
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'labor' | 'safety' = 'labor', customCategory?: string) => {
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

        const targetCategory = customCategory || (
          target === 'safety'
            ? (selectedSafetyUploadCategory || resolvedSafetyCategories[0] || PHOTO_CATEGORIES[0])
            : (selectedLaborUploadCategory || resolvedLaborCategories[0] || WORKER_ROLES[0] || PHOTO_CATEGORIES[0])
        );

        for (const result of results) {
          if (result.success === false) {
            console.error(`Failed to compress ${result.file.name}:`, result.error);
            compressionErrors.push(`"${result.file.name}" 압축 실패: ${result.error instanceof Error ? result.error.message : '알 수 없는 오류'}`);
            continue;
          }
          if (result.base64) optimizedBase64List.push(result.base64);

          newPhotos.push({
            id: crypto.randomUUID(),
            fileUrl: URL.createObjectURL(result.blob),
            category: targetCategory,
            description: '',
            location: '',
            date: selectedDate,
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

  const updatePhotoCategory = (id: string, category: string, target: 'labor' | 'safety' = 'labor') => {
    if (target === 'safety' && setSafetyPhotos) {
      setSafetyPhotos(prevPhotos => 
        prevPhotos.map(p => p.id === id ? { ...p, category } : p)
      );
      return;
    }

    setPhotos(prevPhotos => prevPhotos.map(p => p.id === id ? { ...p, category } : p));
  };

  const triggerWorkerPhotoUpload = (role: string) => {
    setWorkerPhotoUploadTargetRole(role);
    if (workerFileInputRef.current) {
      workerFileInputRef.current.value = '';
      workerFileInputRef.current.click();
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

  const triggerBulkRolePhotoUpload = (role: string) => {
    setBulkUploadCategory(role);
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
      bulkFileInputRef.current.click();
    }
  };

  const handleBulkRolePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const targetRole = bulkUploadCategory || resolvedLaborCategories[0];
    const files: File[] = Array.from(e.target.files);
    
    setIsProcessing(true);
    try {
      const [selY, selM] = selectedDate.split('-');
      const y = Number(selY) || year;
      const m = Number(selM) || month;
      const daysInMonth = new Date(y, m, 0).getDate();
      const activeDatesForRole: string[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayAttendance = safeAttendance[dateStr] || {};
        const isActive = safeWorkers.some(w => {
          const gongsu = dayAttendance[w.id] || 0;
          if (gongsu <= 0) return false;
          const r = safeAttendanceRole[dateStr]?.[w.id] || w.role || '기타';
          return r === targetRole;
        });
        if (isActive) {
          activeDatesForRole.push(dateStr);
        }
      }

      const targetDates = activeDatesForRole.length > 0 ? activeDatesForRole : [selectedDate];

      const newPhotos: PhotoEvidence[] = [];
      const results = await processInChunks(
        files,
        async (file) => {
          try {
            const { blob } = await optimizeImage(file, 1280, 1280, 0.68);
            return { success: true, blob, file };
          } catch (error) {
            return { success: false, error, file };
          }
        },
        5
      );

      results.forEach((res, idx) => {
        if (res.success && res.blob) {
          const assignedDate = targetDates[idx % targetDates.length];
          newPhotos.push({
            id: crypto.randomUUID(),
            fileUrl: URL.createObjectURL(res.blob),
            category: targetRole,
            description: '',
            location: '',
            date: assignedDate,
          });
        }
      });

      if (newPhotos.length > 0) {
        setPhotos(prev => [...prev, ...newPhotos]);
        alert(`✅ [${targetRole}] 사진 ${newPhotos.length}장이 월간 출역일자(${targetDates.length}일)에 순차적으로 자동 배치되었습니다!`);
      }
    } catch (err) {
      console.error("Bulk upload failed", err);
      alert("일괄 사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const autoMatchAllPhotosInDailyLog = () => {
    if (!safeWorkers || safeWorkers.length === 0) {
      alert("출역 기록 데이터가 없습니다.");
      return;
    }
    const [selY, selM] = selectedDate.split('-');
    const y = Number(selY) || year;
    const m = Number(selM) || month;
    const daysInMonth = new Date(y, m, 0).getDate();
    
    const activeSlotsByRole: Record<string, string[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAttendance = safeAttendance[dateStr] || {};
      const activeRoles = new Set<string>();
      safeWorkers.forEach(w => {
        const gongsu = dayAttendance[w.id] || 0;
        if (gongsu > 0) {
          const role = safeAttendanceRole[dateStr]?.[w.id] || w.role || '기타';
          activeRoles.add(role);
        }
      });
      activeRoles.forEach(r => {
        if (!activeSlotsByRole[r]) activeSlotsByRole[r] = [];
        activeSlotsByRole[r].push(dateStr);
      });
    }

    let updatedCount = 0;
    const updatedPhotos = [...safePhotos];

    Object.entries(activeSlotsByRole).forEach(([role, activeDates]) => {
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
    alert(`✅ 총 ${updatedCount}장의 사진이 세분화 직종별 출역일자에 맞춰 자동 매칭되었습니다.`);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Left: Labor Input */}
        <div className="space-y-6">
        <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
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
          
          {/* Real-time Daily & Monthly Attendance Stats Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-300 font-medium">{selectedDate} 금일 출역 집계</div>
                <div className="text-sm font-bold flex flex-wrap items-center gap-2 mt-0.5">
                  <span>금일 출역 인원: <strong className="text-emerald-400 text-base">{todaysLaborWorkersCount + (safetyWorkers.length > 0 ? todaysSafetyWorkersCount : 0)}</strong> 명</span>
                  <span className="text-slate-500">|</span>
                  <span>금일 투입 공수: <strong className="text-amber-300 text-base">{(todaysLaborGongsu + todaysSafetyGongsu) % 1 === 0 ? (todaysLaborGongsu + todaysSafetyGongsu) : (todaysLaborGongsu + todaysSafetyGongsu).toFixed(1)}</strong> 공수</span>
                </div>
              </div>
            </div>
            
            <div className="text-xs text-right bg-white/10 px-3.5 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex items-center gap-3">
              <div>
                <span className="text-slate-300 block text-[10px]">{selMonthNum}월 총 누계 공수</span>
                <span className="font-bold text-indigo-200 text-sm">{(monthlyLaborGongsu + monthlySafetyGongsu) % 1 === 0 ? (monthlyLaborGongsu + monthlySafetyGongsu) : (monthlyLaborGongsu + monthlySafetyGongsu).toFixed(1)} 공수</span>
              </div>
            </div>
          </div>

          {/* Real-time Subdivided Role Breakdown Chips */}
          {Object.keys(todaysRoleBreakdown).length > 0 && (
            <div className="mb-6 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                <span>📊 금일 세분화 항목(직종)별 출역 현황</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(todaysRoleBreakdown).map(([role, data]) => (
                  <div key={role} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-slate-800 rounded-xl text-xs font-bold shadow-xs">
                    <span className="text-indigo-900">{role}:</span>
                    <span className="text-emerald-700 font-extrabold">{data.count}명</span>
                    <span className="text-slate-400 font-medium text-[11px]">({data.gongsu % 1 === 0 ? data.gongsu : data.gongsu.toFixed(1)}공수)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
                if (!worker || !worker.id) return null;
                const workerRole = worker.role || WORKER_ROLES[0] || '기타';
                const workerName = worker.name || '미입력';
                const currentGongsu = safeAttendance[selectedDate]?.[worker.id] || 0;
                const currentAssignedRole = safeAttendanceRole[selectedDate]?.[worker.id] || workerRole;
                const isOverridden = Boolean(safeAttendanceRole[selectedDate]?.[worker.id] && safeAttendanceRole[selectedDate]?.[worker.id] !== workerRole);
                
                return (
                  <div key={worker.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-200 group ${currentGongsu > 0 ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentGongsu > 0 ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                        {workerName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-base flex items-center gap-2">
                          <span>{workerName}</span>
                          {isOverridden && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                              일별 변경됨 (기본: {workerRole})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold">금일 직종:</span>
                          <select
                            value={currentAssignedRole}
                            onChange={(e) => handleRoleChange(worker.id, e.target.value)}
                            className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-indigo-900 outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {resolvedLaborCategories.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                      <button
                        onClick={() => triggerWorkerPhotoUpload(currentAssignedRole)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                        title={`${currentAssignedRole} 사진 업로드`}
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>사진</span>
                      </button>
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 0.5 ? 0 : 0.5)}
                        className={`flex-1 sm:flex-none min-w-[54px] px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 0.5 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        0.5
                      </button>
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 1.0 ? 0 : 1.0)}
                        className={`flex-1 sm:flex-none min-w-[54px] px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.0 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        1.0
                      </button>
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 1.5 ? 0 : 1.5)}
                        className={`flex-1 sm:flex-none min-w-[54px] px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.5 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        1.5
                      </button>
                      <button 
                        onClick={() => updateAttendance(worker.id, currentGongsu === 2.0 ? 0 : 2.0)}
                        className={`flex-1 sm:flex-none min-w-[54px] px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 2.0 ? 'bg-indigo-600 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        2.0
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
                      <div key={worker.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all duration-200 group ${currentGongsu > 0 ? 'bg-orange-50/50 border-orange-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${currentGongsu > 0 ? 'bg-orange-200 text-orange-800' : 'bg-slate-100 text-slate-500'}`}>
                            {worker.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-base">{worker.name}</div>
                            <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">{worker.role}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-1 rounded-xl w-full sm:w-auto">
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 0.5 ? 0 : 0.5)}
                            className={`flex-1 sm:flex-none min-w-[64px] px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 0.5 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            0.5
                          </button>
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 1.0 ? 0 : 1.0)}
                            className={`flex-1 sm:flex-none min-w-[64px] px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.0 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            1.0
                          </button>
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 1.5 ? 0 : 1.5)}
                            className={`flex-1 sm:flex-none min-w-[64px] px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 1.5 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            1.5
                          </button>
                          <button
                            onClick={() => updateSafetyAttendance(worker.id, currentGongsu === 2.0 ? 0 : 2.0)}
                            className={`flex-1 sm:flex-none min-w-[64px] px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${currentGongsu === 2.0 ? 'bg-orange-500 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-200'}`}
                          >
                            2.0
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
          {/* Monthly Subdivided Role Bulk Photo Upload & Auto Match Card */}
          <div className="bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-pink-50/90 p-5 rounded-3xl border border-indigo-200/80 shadow-sm break-keep">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3 pb-3 border-b border-indigo-100/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-indigo-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 shadow-2xs">월간 일괄 기능</span>
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base break-keep leading-snug">
                  세분화 공종별 사진 일괄 업로드 & 출역일자 자동 매칭
                </h4>
              </div>
              
              <button
                type="button"
                onClick={autoMatchAllPhotosInDailyLog}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap active:scale-95 self-start lg:self-auto"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">월간 사진 전체 자동 매칭</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 break-keep leading-relaxed font-medium">
              사진을 세분화 공종별로 한번에 업로드하면, 해당 월의 일일 근로자 출역 기록에 맞춰 사진 날짜가 자동 매칭됩니다.
            </p>

            {/* Select Subdivided Role and Upload Bulk Photos */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white p-3.5 rounded-2xl border border-indigo-100/80 shadow-2xs">
              <div className="sm:col-span-5 flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">대상 세분화 공종 선택</label>
                <select
                  value={bulkUploadCategory || resolvedLaborCategories[0]}
                  onChange={(e) => setBulkUploadCategory(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-indigo-900 outline-none focus:border-indigo-500 cursor-pointer truncate"
                >
                  {resolvedLaborCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-7 flex items-end">
                <button
                  type="button"
                  onClick={() => triggerBulkRolePhotoUpload(bulkUploadCategory || resolvedLaborCategories[0])}
                  className="w-full px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap active:scale-95 mt-1 sm:mt-0"
                >
                  <ImagePlus className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate font-bold">[{bulkUploadCategory || resolvedLaborCategories[0]}] 사진 일괄 업로드</span>
                </button>
                <input
                  type="file"
                  ref={bulkFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleBulkRolePhotoUpload}
                  disabled={isProcessing}
                  multiple
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit break-keep">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-3 text-slate-800 whitespace-nowrap">
                <div className="bg-rose-100 p-2.5 rounded-2xl text-rose-600 shrink-0">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="whitespace-nowrap">금일 작업 사진</span>
              </h3>
              
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold">
                  <span className="text-slate-400 whitespace-nowrap shrink-0">업로드 대상:</span>
                  <select
                    value={selectedLaborUploadCategory || resolvedLaborCategories[0]}
                    onChange={(e) => setSelectedLaborUploadCategory(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-indigo-900 outline-none focus:border-indigo-500 cursor-pointer font-bold truncate max-w-[150px]"
                  >
                    {resolvedLaborCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <label className={`cursor-pointer flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 whitespace-nowrap shrink-0 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin shrink-0"/> : <Plus className="w-4 h-4 shrink-0" />}
                  <span className="whitespace-nowrap">{isProcessing ? '처리중...' : '사진 추가'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'labor')} disabled={isProcessing} multiple />
                </label>
                <input
                  type="file"
                  ref={workerFileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e, 'labor', workerPhotoUploadTargetRole)}
                  disabled={isProcessing}
                  multiple
                />
              </div>
             </div>

           {/* Category Filter Chips */}
           {todaysPhotos.length > 0 && (
             <div className="flex flex-wrap items-center gap-1.5 mb-6 p-2 bg-slate-50 rounded-2xl border border-slate-100">
               <span className="text-xs font-bold text-slate-500 mr-1">필터:</span>
               <button
                 onClick={() => setPhotoFilterCategory('all')}
                 className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                   photoFilterCategory === 'all'
                     ? 'bg-slate-900 text-white shadow-sm'
                     : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                 }`}
               >
                 전체 ({todaysPhotos.length})
               </button>
               {resolvedLaborCategories.filter(cat => todaysPhotos.some(p => p.category === cat)).map(cat => {
                 const count = todaysPhotos.filter(p => p.category === cat).length;
                 return (
                   <button
                     key={cat}
                     onClick={() => setPhotoFilterCategory(cat)}
                     className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                       photoFilterCategory === cat
                         ? 'bg-indigo-600 text-white shadow-sm'
                         : 'bg-white text-indigo-700 border border-slate-200 hover:bg-indigo-50'
                     }`}
                   >
                     {cat} ({count})
                   </button>
                 );
               })}
             </div>
           )}

           <div className="grid grid-cols-1 gap-5">
             {(photoFilterCategory === 'all' ? todaysPhotos : todaysPhotos.filter(p => p.category === photoFilterCategory)).map(photo => (
               <div key={photo.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col sm:flex-row group">
                 <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
                   <ZoomableImage src={photo.fileUrl} alt="daily" />
                   <button 
                      onClick={() => removePhoto(photo.id, 'labor')}
                      className="absolute top-2 right-2 bg-black/40 hover:bg-red-500 text-white p-1.5 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
                   >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                 </div>
                 <div className="p-4 flex-1 flex flex-col justify-between bg-slate-50/30">
                    <div className="mb-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                        세분화 항목 (카테고리)
                      </label>
                      <select
                        value={photo.category}
                        onChange={(e) => updatePhotoCategory(photo.id, e.target.value, 'labor')}
                        className="w-full text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-indigo-900 focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        {resolvedLaborCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                        <Edit3 className="w-3 h-3" /> 작업 내용 설명
                      </label>
                      <div className="relative">
                          <input 
                            type="text" 
                            value={photo.description}
                            onChange={(e) => updatePhotoDescription(photo.id, e.target.value, 'labor')}
                            placeholder="작업 내용을 입력하세요 (예: 101동 지게차 안전 유도)"
                            className="w-full text-xs border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-1.5 transition-colors bg-transparent placeholder-slate-400 font-medium text-slate-700"
                          />
                      </div>
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
          <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-sm border border-slate-100 h-fit">
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
                  <div className="relative w-full sm:w-48 h-40 sm:h-auto shrink-0 bg-slate-100 overflow-hidden">
                    <ZoomableImage src={photo.fileUrl} alt="daily-safety" />
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
