
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ProjectHeader } from './components/ProjectHeader';
import { LaborCostTable } from './components/LaborCostTable';
import { SafetyCostTable } from './components/SafetyCostTable';
import { PhotoLedger } from './components/PhotoLedger';
import { DailyLogManager } from './components/DailyLogManager';
import { RestoreOptionsModal, RestoreSelections, RestoreSummary } from './components/RestoreOptionsModal';
import { ProjectInfo, Worker, PhotoEvidence, DailyAttendance, SafetyItem, WORKER_ROLES } from './types';
import { Printer, Layout, FileText, ShieldCheck, CalendarCheck, HelpCircle, BarChart3, ChevronRight, Clock, Download, Upload, RotateCcw, ShoppingCart, Loader2, Save, FilePlus, ArrowLeftRight, Trash2, Lock, LockOpen } from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  validatePhotoData, 
  createBlobUrlFromBase64, 
  processInChunks,
  getPhotoStats,
  base64ToBlob
} from './utils/photoOptimization';
import { clearPhotoState, loadPhotoState, savePhotoState } from './utils/photoPersistence';

const GeminiAssistant = lazy(() => import('./components/GeminiAssistant').then(module => ({ default: module.GeminiAssistant })));
const UserGuide = lazy(() => import('./components/UserGuide').then(module => ({ default: module.UserGuide })));

// Helper to get local date string (YYYY-MM-DD) correctly considering timezone offset
const getLocalDateString = () => {
  const now = new Date();
  // Adjust for timezone offset to ensure we get the correct local date
  const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return localDate.toISOString().split('T')[0];
};

const INITIAL_PROJECT_INFO: ProjectInfo = {
  siteName: '',
  managerName: '',
  safetyManagerName: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  companyName: '',
  reportDate: getLocalDateString() // Fixed: Use local date
};

const DRAFT_KEY = 'safetydoc_draft_v1';

// 주민등록번호 뒷자리 마스킹 - LocalStorage 평문 저장 방지
const maskRRN = (rrn: string): string => {
  if (!rrn) return '';
  const trimmed = rrn.replace(/\s/g, '');
  if (trimmed.includes('-')) return `${trimmed.split('-')[0]}-*******`;
  if (trimmed.length >= 6) return `${trimmed.slice(0, 6)}-*******`;
  return '*******-*******';
};

const maskWorkersRRN = (workers: Worker[]): Worker[] =>
  workers.map(w => ({ ...w, rrn: maskRRN(w.rrn) }));

const getMonthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

interface RestoreModalState {
  fileName: string;
  parsed: any;
  summary: RestoreSummary;
  selections: RestoreSelections;
}

interface MonthlySnapshot {
  laborCost: number;
  safetyWorkerCost: number;
  materialCost: number;
  totalCost: number;
  photoCount: number;
  updatedAt: number;
  isClosed?: boolean;
  closedAt?: number;
  note?: string;
}

const getPrevMonthKey = (monthKey: string): string => {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month) return monthKey;

  if (month === 1) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month - 1).padStart(2, '0')}`;
};

const getYearMonthFromKey = (monthKey: string): { year: number; month: number } => {
  const [yearStr, monthStr] = monthKey.split('-');
  return {
    year: Number(yearStr) || new Date().getFullYear(),
    month: Number(monthStr) || (new Date().getMonth() + 1),
  };
};

function App() {
  const [activeTab, setActiveTab] = useState<'setup' | 'daily' | 'preview' | 'guide'>('guide');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(INITIAL_PROJECT_INFO);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendance>({});
  const [safetyWorkers, setSafetyWorkers] = useState<Worker[]>([]);
  const [safetyAttendance, setSafetyAttendance] = useState<DailyAttendance>({});
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([]);
  const [laborPhotos, setLaborPhotos] = useState<PhotoEvidence[]>([]);
  const [safetyPhotos, setSafetyPhotos] = useState<PhotoEvidence[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false); // New state for print loading
  const [showLaborCost, setShowLaborCost] = useState(true); // Toggle for 유도원/감시자 인건비 section in Report
  const [showSafetyCost, setShowSafetyCost] = useState(true); // Toggle for 안전시설 인건비 section in Report
  const [showSafetyItems, setShowSafetyItems] = useState(true); // Toggle for 안전시설 재료비 내역(품목) in Report
  const [annualBudget, setAnnualBudget] = useState<number>(0); // 연간 계상액(예산)
  const [uploadQualityPreset, setUploadQualityPreset] = useState<'low' | 'balanced' | 'high'>('balanced');
  const [monthlySnapshots, setMonthlySnapshots] = useState<Record<string, MonthlySnapshot>>({});
  const [aggregationMode, setAggregationMode] = useState<'single' | 'range'>('single');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [rangeStartMonth, setRangeStartMonth] = useState<string>('');
  const [rangeEndMonth, setRangeEndMonth] = useState<string>('');
  const [graphMode, setGraphMode] = useState<'recent6' | 'year12' | 'range'>('recent6');
  const [graphYear, setGraphYear] = useState<string>('');
  const [graphRangeStartMonth, setGraphRangeStartMonth] = useState<string>('');
  const [graphRangeEndMonth, setGraphRangeEndMonth] = useState<string>('');
  const [printScopeMode, setPrintScopeMode] = useState<'single' | 'range'>('single');
  const [printSingleMonth, setPrintSingleMonth] = useState<string>('');
  const [printRangeStartMonth, setPrintRangeStartMonth] = useState<string>('');
  const [printRangeEndMonth, setPrintRangeEndMonth] = useState<string>('');
  const [monthlyFrontCumulativeDisplay, setMonthlyFrontCumulativeDisplay] = useState<'both' | 'full' | 'current'>('both');
  const [restoreModalState, setRestoreModalState] = useState<RestoreModalState | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoStateRef = useRef<{ laborPhotos: PhotoEvidence[]; safetyPhotos: PhotoEvidence[] }>({ laborPhotos: [], safetyPhotos: [] });

  // Clock for Header (KST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // KST is UTC+9
      const kstTime = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short', // (월)
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      setCurrentTime(kstTime);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Prevent accidental data loss on refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only trigger if there is some data
      if (workers.length > 0 || safetyWorkers.length > 0 || laborPhotos.length > 0 || safetyPhotos.length > 0 || safetyItems.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for Chrome/Firefox
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workers, safetyWorkers, laborPhotos, safetyPhotos, safetyItems]);

  // --- Auto-Save & Restore Logic ---
  
  // 1. Auto-save text data to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if there is some data changed from initial
      if (
        projectInfo.siteName || 
        projectInfo.managerName || // Track manager name changes too
        annualBudget > 0 ||
        workers.length > 0 || 
        safetyWorkers.length > 0 ||
        safetyItems.length > 0 || 
        Object.keys(attendance).length > 0
      ) {
        const draft = {
          projectInfo,
          workers: maskWorkersRRN(workers),
          attendance,
          safetyWorkers: maskWorkersRRN(safetyWorkers),
          safetyAttendance,
          safetyItems,
          annualBudget,
          uploadQualityPreset,
          monthlySnapshots,
          // Note: Photos are excluded because LocalStorage has 5MB limit and blob URLs are not persistent
          updatedAt: new Date().getTime()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [projectInfo, workers, attendance, safetyWorkers, safetyAttendance, safetyItems, annualBudget, uploadQualityPreset, monthlySnapshots]);

  // 2. Check for draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Basic validation
        if (parsed.projectInfo && (parsed.workers || parsed.safetyItems)) {
            // Delay confirm to allow UI to paint first
            setTimeout(() => {
              if (confirm('이전에 작성 중이던 내용이 발견되었습니다. 복구하시겠습니까?\n(사진 데이터는 별도 안전 저장소에서 자동 복구됩니다)')) {
                    setProjectInfo(parsed.projectInfo);
                    setWorkers(parsed.workers || []);
                    setAttendance(parsed.attendance || {});
                    setSafetyWorkers(parsed.safetyWorkers || []);
                    setSafetyAttendance(parsed.safetyAttendance || {});
                    setSafetyItems(parsed.safetyItems || []);
                    setAnnualBudget(Number(parsed.annualBudget || 0));
                    setUploadQualityPreset(parsed.uploadQualityPreset || 'balanced');
                    setMonthlySnapshots(parsed.monthlySnapshots || {});
                    setActiveTab('setup'); // Move to setup tab
                } else {
                    // If user declines, clear the draft so it doesn't ask again immediately
                    localStorage.removeItem(DRAFT_KEY);
                }
            }, 100);
        }
      } catch (e) {
        console.error("Failed to restore draft", e);
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // 사진 자동 복구 (IndexedDB)
  useEffect(() => {
    let isCancelled = false;

    const restorePhotosFromIndexedDb = async () => {
      try {
        const savedPhotoState = await loadPhotoState();
        if (!savedPhotoState || isCancelled) return;

        if (savedPhotoState.laborPhotos?.length > 0) {
          setLaborPhotos(prev => prev.length > 0 ? prev : savedPhotoState.laborPhotos);
        }
        if (savedPhotoState.safetyPhotos?.length > 0) {
          setSafetyPhotos(prev => prev.length > 0 ? prev : savedPhotoState.safetyPhotos);
        }
      } catch (error) {
        console.error('사진 자동 복구 실패', error);
      }
    };

    restorePhotosFromIndexedDb();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 사진 자동 저장 (IndexedDB)
  useEffect(() => {
    const timer = setTimeout(() => {
      savePhotoState(laborPhotos, safetyPhotos).catch(error => {
        console.error('사진 자동 저장 실패', error);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [laborPhotos, safetyPhotos]);

  useEffect(() => {
    photoStateRef.current = { laborPhotos, safetyPhotos };
  }, [laborPhotos, safetyPhotos]);

  // 앱 언마운트 시 blob URL 정리
  useEffect(() => {
    return () => {
      [...photoStateRef.current.laborPhotos, ...photoStateRef.current.safetyPhotos].forEach(photo => {
        if (photo.fileUrl && photo.fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(photo.fileUrl);
        }
      });
    };
  }, []);

  // 월 변경 시 근로자 단가 이력에서 해당 월 단가 자동 반영
  useEffect(() => {
    const monthKey = getMonthKey(projectInfo.year, projectInfo.month);
    setWorkers(prev => prev.map(w => {
      const monthlyRate = w.dailyRateHistory?.[monthKey];
      return typeof monthlyRate === 'number' ? { ...w, dailyRate: monthlyRate } : w;
    }));
    setSafetyWorkers(prev => prev.map(w => {
      const monthlyRate = w.dailyRateHistory?.[monthKey];
      return typeof monthlyRate === 'number' ? { ...w, dailyRate: monthlyRate } : w;
    }));
  }, [projectInfo.year, projectInfo.month]);

  // Calculate daysWorked from attendance
  useEffect(() => {
    setWorkers(prevWorkers => 
      prevWorkers.map(worker => {
        let totalDays = 0;
        Object.values(attendance).forEach(dailyRecord => {
          totalDays += dailyRecord[worker.id] || 0;
        });
        return { ...worker, daysWorked: totalDays };
      })
    );
  }, [attendance]);

  // Calculate daysWorked for safety workers from safetyAttendance
  useEffect(() => {
    setSafetyWorkers(prevWorkers =>
      prevWorkers.map(worker => {
        let totalDays = 0;
        Object.values(safetyAttendance).forEach(dailyRecord => {
          totalDays += dailyRecord[worker.id] || 0;
        });
        return { ...worker, daysWorked: totalDays };
      })
    );
  }, [safetyAttendance]);

  // Validation function for required fields before report generation
  const validateBeforePrint = (options: {
    includeLaborCost: boolean;
    includeSafetyCost: boolean;
    includeSafetyItems: boolean;
  }): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Required fields validation
    if (!projectInfo.siteName?.trim()) {
      errors.push("공사명을 입력하세요.");
    }
    if (!projectInfo.managerName?.trim()) {
      errors.push("현장대리인 이름을 입력하세요.");
    }
    if (!projectInfo.safetyManagerName?.trim()) {
      errors.push("안전팀장 이름을 입력하세요.");
    }
    if (!projectInfo.companyName?.trim()) {
      errors.push("업체명(수급인)을 입력하세요.");
    }
    
    // Business logic validation (선택한 출력 항목 기준)
    if (options.includeLaborCost && workers.length === 0) {
      errors.push("유도원/감시자 인건비 출력을 위해 최소 1명 이상의 근로자를 등록하세요.");
    }

    const hasSafetyWorkers = safetyWorkers.length > 0;
    const hasSafetyItems = options.includeSafetyItems && safetyItems.length > 0;
    if (options.includeSafetyCost && !hasSafetyWorkers && !hasSafetyItems) {
      errors.push("안전시설 인건비 출력을 위해 안전시설 근로자 또는 재료비 내역을 등록하세요.");
    }
    
    // Year month validation
    if (!projectInfo.year || projectInfo.year < 1900 || projectInfo.year > 2100) {
      errors.push("올바른 연도를 입력하세요.");
    }
    if (!projectInfo.month || projectInfo.month < 1 || projectInfo.month > 12) {
      errors.push("올바른 월을 입력하세요.");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handlePrintWithOptions = (options: {
    includeLaborCost: boolean;
    includeSafetyCost: boolean;
    includeSafetyItems: boolean;
  }) => {
    if (!options.includeLaborCost && !options.includeSafetyCost) {
      alert('출력할 보고서 항목이 없습니다.\n\n최소 1개 이상(유도원/감시자 또는 안전시설) 항목을 포함으로 설정해주세요.');
      setActiveTab('preview');
      return;
    }

    const validation = validateBeforePrint(options);
    
    if (!validation.isValid) {
      alert(`❌ 보고서를 생성할 수 없습니다.\n다음 항목들을 확인하세요:\n\n${validation.errors.map(e => `• ${e}`).join('\n')}`);
      setActiveTab('setup');
      return;
    }

    setShowLaborCost(options.includeLaborCost);
    setShowSafetyCost(options.includeSafetyCost);
    setShowSafetyItems(options.includeSafetyItems);

    setIsPrinting(true);
    setActiveTab('preview');
    // Allow React to render the preview view completely before triggering print
    // Increased timeout to ensure browser layout is finalized
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 800);
  };

  const handlePrint = () => {
    handlePrintWithOptions({
      includeLaborCost: showLaborCost,
      includeSafetyCost: showSafetyCost,
      includeSafetyItems: showSafetyItems,
    });
  };

  const handlePrintLaborOnly = () => {
    handlePrintWithOptions({
      includeLaborCost: true,
      includeSafetyCost: false,
      includeSafetyItems: false,
    });
  };

  const handlePrintSafetyOnly = () => {
    handlePrintWithOptions({
      includeLaborCost: false,
      includeSafetyCost: true,
      includeSafetyItems: showSafetyItems,
    });
  };

  // --- Backup & Restore Logic ---

  // Helper: Convert Blob to Base64 string with optimization
  const blobToBase64Optimized = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error("Base64 변환 실패"));
          }
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("파일 읽기 실패"));
      reader.readAsDataURL(blob);
    });
  };

  // Helper: Convert Blob to Base64 string
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return blobToBase64Optimized(blob);
  };

  const handleBackup = async () => {
    // Check for empty data - Expanded conditions
    const hasData = 
      projectInfo.siteName || 
      projectInfo.managerName || 
      projectInfo.safetyManagerName || 
      projectInfo.companyName || 
      workers.length > 0 || 
      safetyWorkers.length > 0 ||
      safetyItems.length > 0 || 
      laborPhotos.length > 0 ||
      safetyPhotos.length > 0;

    if (!hasData) {
        alert("저장할 데이터가 없습니다. 기본 설정 정보를 입력하거나 사진을 추가해주세요.");
        return;
    }

    if (!confirm(`현재 작성 중인 데이터를 파일(JSON)로 저장하시겠습니까?\n\n- 공사명: ${projectInfo.siteName || '(미입력)'}\n- 유도원/감시자 근로자: ${workers.length}명\n- 안전시설 근로자: ${safetyWorkers.length}명\n- 유도원/감시자 증빙 사진: ${laborPhotos.length}장\n- 안전시설 증빙 사진: ${safetyPhotos.length}장\n\n(사진 용량에 따라 시간이 소요될 수 있습니다)`)) return;

    setIsBackingUp(true);
    setBackupProgress(0);

    try {
      // Helper for converting a single photo's blob URL to base64
      const convertPhotoToBase64 = async (p: PhotoEvidence): Promise<PhotoEvidence> => {
        if (!p.fileUrl || p.fileUrl.startsWith('data:')) return p;
        try {
          const response = await fetch(p.fileUrl);
          if (!response.ok) {
            console.warn(`사진 ${p.id} 로드 실패 (HTTP ${response.status})`);
            return { ...p, fileUrl: '' };
          }
          const blob = await response.blob();
          const base64 = await blobToBase64Optimized(blob);
          return { ...p, fileUrl: base64 };
        } catch (e) {
          console.error(`사진 내보내기 실패 ${p.id}`, e);
          return { ...p, fileUrl: '' };
        }
      };

      // 1. Convert laborPhotos: Handle Blob URLs to Base64 (청크 단위 처리로 메모리 효율)
      const laborPhotosWithBase64 = await processInChunks(
        laborPhotos,
        convertPhotoToBase64,
        5, // 청크 크기: 5개씩
        (current, total) => {
          setBackupProgress(Math.round((current / total) * 50));
        }
      );

      // 2. Convert safetyPhotos
      const safetyPhotosWithBase64 = await processInChunks(
        safetyPhotos,
        convertPhotoToBase64,
        5,
        (current, total) => {
          if (total > 0) setBackupProgress(50 + Math.round((current / total) * 50));
        }
      );

      // 사진 통계 계산 (전체 합산)
      const allPhotosForStats = [...laborPhotosWithBase64, ...safetyPhotosWithBase64].filter(p => p.fileUrl);
      const photoStats = getPhotoStats(
        allPhotosForStats
          .map(p => ({
            id: p.id,
            filename: p.category,
            size: Math.round((p.fileUrl.length * 0.75)), // Base64는 33% 크기 증가
            mimeType: p.fileUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
            timestamp: p.date,
            checksum: '', // 개별 체크섬은 이미 생성됨
            quality: 70 // 기본 품질
          }))
      );

      const backupData = {
        version: "1.3",
        date: new Date().toISOString(),
        appVersion: "1.0",
        photoStats: {
          totalCount: photoStats.totalCount,
          totalMB: photoStats.totalMB,
          formats: photoStats.formats,
          qualities: photoStats.qualities,
          notes: '사진은 자동으로 최적화되어 저장됩니다'
        },
        data: {
          projectInfo,
          workers: maskWorkersRRN(workers),
          attendance,
          safetyWorkers: maskWorkersRRN(safetyWorkers),
          safetyAttendance,
          safetyItems,
          annualBudget,
          uploadQualityPreset,
          monthlySnapshots,
          laborPhotos: laborPhotosWithBase64,
          safetyPhotos: safetyPhotosWithBase64
        }
      };

      const jsonString = JSON.stringify(backupData);
      
      // Check estimated size
      const estimatedSize = new Blob([jsonString]).size;
      if (estimatedSize > 100 * 1024 * 1024) {
        alert("⚠️ 백업 파일이 너무 큽니다 (100MB 이상).\n사진을 일부 삭제하고 다시 시도하세요.");
        return;
      }

      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename
      const safeSiteName = (projectInfo.siteName || '무제').replace(/[/\\?%*:|"<>]/g, '-');
      link.download = `세이프닥_백업_${safeSiteName}_${getLocalDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      
      // Delay cleanup to ensure download triggers on all browsers
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      const laborSaved = laborPhotosWithBase64.filter(p => p.fileUrl).length;
      const safetySaved = safetyPhotosWithBase64.filter(p => p.fileUrl).length;
      alert(`✅ 백업이 완료되었습니다.\n파일 크기: ${(blob.size / 1024 / 1024).toFixed(1)}MB\n유도원/감시자 사진: ${laborSaved}/${laborPhotos.length}장\n안전시설 사진: ${safetySaved}/${safetyPhotos.length}장`);

    } catch (error) {
      console.error("Backup failed", error);
      if (error instanceof RangeError) {
        alert("⚠️ 데이터가 너무 큽니다.\n사진을 일부 삭제하고 다시 시도하세요.");
      } else if (error instanceof TypeError) {
        alert("⚠️ 데이터 변환 중 오류가 발생했습니다.\n (특정 파일이 손상되었을 가능성)");
      } else {
        alert("백업 파일 생성 중 오류가 발생했습니다.\n(메모리 부족 또는 브라우저 제한일 수 있습니다)");
      }
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Reset to allow same file selection
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.name.endsWith('.json')) {
        alert('JSON 형식의 세이프닥 백업 파일을 선택하세요.');
        return;
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        alert('파일이 너무 큽니다. (최대 100MB)');
        return;
      }

      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            
            // Enhanced validation
            if (!parsed.data) {
              alert("올바르지 않은 백업 파일 형식입니다.\n'data' 필드가 없습니다.");
              return;
            }

            // Version check (optional but recommended for future compatibility)
            const version = parsed.version || "1.0";
            if (version.startsWith("2") || version.startsWith("3")) {
              alert(`⚠️ 이 백업 파일은 더 최신 버전(${version})으로 생성되었습니다.\n앱을 최신 버전으로 업데이트하세요.`);
              return;
            }

            const summary: RestoreSummary = {
              siteName: parsed.data.projectInfo?.siteName || '미입력',
              workerCount: Array.isArray(parsed.data.workers) ? parsed.data.workers.length : 0,
              laborAttendanceDays: parsed.data.attendance ? Object.keys(parsed.data.attendance).length : 0,
              laborPhotoCount: Array.isArray(parsed.data.laborPhotos) ? parsed.data.laborPhotos.length : (Array.isArray(parsed.data.photos) ? parsed.data.photos.length : 0),
              safetyWorkerCount: Array.isArray(parsed.data.safetyWorkers) ? parsed.data.safetyWorkers.length : 0,
              safetyAttendanceDays: parsed.data.safetyAttendance ? Object.keys(parsed.data.safetyAttendance).length : 0,
              safetyPhotoCount: Array.isArray(parsed.data.safetyPhotos) ? parsed.data.safetyPhotos.length : 0,
              safetyItemCount: Array.isArray(parsed.data.safetyItems) ? parsed.data.safetyItems.length : 0,
            };

            setRestoreModalState({
              fileName: file.name,
              parsed,
              summary,
              selections: {
                mode: 'overwrite',
                restoreLabor: summary.workerCount > 0,
                restoreLaborAttendance: summary.laborAttendanceDays > 0,
                restoreLaborPhotos: summary.laborPhotoCount > 0,
                restoreSafety: summary.safetyWorkerCount > 0 || summary.safetyItemCount > 0,
                restoreSafetyAttendance: summary.safetyAttendanceDays > 0,
                restoreSafetyPhotos: summary.safetyPhotoCount > 0,
              }
            });
          }
        } catch (error) {
          console.error("Restore failed:", error);
          if (error instanceof SyntaxError) {
            alert("파일 형식이 손상되었습니다. 올바른 JSON 백업 파일인지 확인하세요.");
          } else {
            alert(`파일을 읽는 중 오류가 발생했습니다:\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          }
        }
      };
      
      fileReader.onerror = () => {
        alert("파일 읽기에 실패했습니다. 다시 시도하세요.");
      };

      e.target.value = '';
    }
  };

  const applyRestoreSelections = async () => {
    if (!restoreModalState) return;

    const { parsed, summary, selections } = restoreModalState;
    const isMergeMode = selections.mode === 'merge';
    const mergeWorkers = (current: Worker[], incoming: Worker[]) => {
      const merged = new Map(current.map(worker => [worker.id, worker]));
      incoming.forEach(worker => {
        const previous = merged.get(worker.id) || {};
        merged.set(worker.id, { ...previous, ...worker });
      });
      return Array.from(merged.values()) as Worker[];
    };
    const mergeAttendance = (current: DailyAttendance, incoming: DailyAttendance) => {
      const merged: DailyAttendance = { ...current };
      Object.entries(incoming || {}).forEach(([date, entries]) => {
        merged[date] = {
          ...(merged[date] || {}),
          ...(entries || {}),
        };
      });
      return merged;
    };
    const mergeItems = (current: SafetyItem[], incoming: SafetyItem[]) => {
      const merged = new Map(current.map(item => [item.id, item]));
      incoming.forEach(item => merged.set(item.id, item));
      return Array.from(merged.values());
    };
    const mergePhotos = (current: PhotoEvidence[], incoming: PhotoEvidence[]) => {
      const merged = new Map(current.map(photo => [photo.id, photo]));
      incoming.forEach(photo => merged.set(photo.id, photo));
      return Array.from(merged.values());
    };

    if (!selections.restoreLabor && !selections.restoreSafety) {
      alert('복구할 항목을 하나 이상 선택하세요.');
      return;
    }

    setMonthlySnapshots(prev => {
      const incomingSnapshots = restoreModalState.parsed.data.monthlySnapshots;
      if (!incomingSnapshots || typeof incomingSnapshots !== 'object') return prev;
      return isMergeMode ? { ...prev, ...incomingSnapshots } : incomingSnapshots;
    });

    if (!isMergeMode && selections.restoreLabor && selections.restoreLaborPhotos) {
      laborPhotos.forEach(p => {
        if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
      });
    }
    if (!isMergeMode && selections.restoreSafety && selections.restoreSafetyPhotos) {
      safetyPhotos.forEach(p => {
        if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
      });
    }

    if (selections.restoreLabor) {
      setProjectInfo(prev => isMergeMode ? { ...prev, ...parsed.data.projectInfo } : {
        ...INITIAL_PROJECT_INFO,
        ...parsed.data.projectInfo,
      });
      setAnnualBudget(prev => isMergeMode ? (Number(parsed.data.annualBudget || 0) || prev) : Number(parsed.data.annualBudget || 0));
      setUploadQualityPreset(prev => isMergeMode ? (parsed.data.uploadQualityPreset || prev) : (parsed.data.uploadQualityPreset || 'balanced'));
      setWorkers(prev => {
        const incomingWorkers = Array.isArray(parsed.data.workers) ? parsed.data.workers : [];
        return isMergeMode ? mergeWorkers(prev, incomingWorkers) : incomingWorkers;
      });
      setAttendance(prev => {
        const incomingAttendance = selections.restoreLaborAttendance && parsed.data.attendance && typeof parsed.data.attendance === 'object' ? parsed.data.attendance : {};
        return isMergeMode ? mergeAttendance(prev, incomingAttendance) : incomingAttendance;
      });

      if (selections.restoreLaborPhotos) {
        const restored = await restorePhotosWithValidation(
          Array.isArray(parsed.data.laborPhotos) ? parsed.data.laborPhotos : (Array.isArray(parsed.data.photos) ? parsed.data.photos : []),
          undefined
        );
        setLaborPhotos(prev => isMergeMode ? mergePhotos(prev, restored) : restored);
      }
    }

    if (selections.restoreSafety) {
      setSafetyWorkers(prev => {
        const incomingWorkers = Array.isArray(parsed.data.safetyWorkers) ? parsed.data.safetyWorkers : [];
        return isMergeMode ? mergeWorkers(prev, incomingWorkers) : incomingWorkers;
      });
      setSafetyAttendance(prev => {
        const incomingAttendance = selections.restoreSafetyAttendance && parsed.data.safetyAttendance && typeof parsed.data.safetyAttendance === 'object' ? parsed.data.safetyAttendance : {};
        return isMergeMode ? mergeAttendance(prev, incomingAttendance) : incomingAttendance;
      });
      setSafetyItems(prev => {
        const incomingItems = Array.isArray(parsed.data.safetyItems) ? parsed.data.safetyItems : [];
        return isMergeMode ? mergeItems(prev, incomingItems) : incomingItems;
      });

      if (selections.restoreSafetyPhotos) {
        const restored = await restorePhotosWithValidation(
          Array.isArray(parsed.data.safetyPhotos) ? parsed.data.safetyPhotos : [],
          undefined
        );
        setSafetyPhotos(prev => isMergeMode ? mergePhotos(prev, restored) : restored);
      }
    }

    const restoredSections: string[] = [];
    if (selections.restoreLabor) restoredSections.push(`유도원/감시자 인건비 (근로자 ${summary.workerCount}명${selections.restoreLaborAttendance ? `, 출역 날짜 ${summary.laborAttendanceDays}일` : ', 출력공수 초기화'}${selections.restoreLaborPhotos ? `, 사진 ${summary.laborPhotoCount}장` : ', 사진 제외'})`);
    if (selections.restoreSafety) restoredSections.push(`안전시설 인건비 (근로자 ${summary.safetyWorkerCount}명, 품목 ${summary.safetyItemCount}개${selections.restoreSafetyAttendance ? `, 출역 날짜 ${summary.safetyAttendanceDays}일` : ', 출력공수 초기화'}${selections.restoreSafetyPhotos ? `, 사진 ${summary.safetyPhotoCount}장` : ', 사진 제외'})`);

    setRestoreModalState(null);
    setActiveTab('setup');
    alert(`✅ 복구가 완료되었습니다.\n\n복구 방식: ${isMergeMode ? '병합' : '덮어쓰기'}\n\n복구된 항목:\n${restoredSections.map(s => `• ${s}`).join('\n')}`);
  };

  // 사진 복구 - 추가된 안전성 검증
  const restorePhotosWithValidation = async (
    photosToRestore: PhotoEvidence[],
    setPhotosFn?: React.Dispatch<React.SetStateAction<PhotoEvidence[]>>
  ) => {
    const restoredPhotos: PhotoEvidence[] = [];
    const failedPhotos: string[] = [];

    for (const photo of photosToRestore) {
      try {
        if (!photo.fileUrl) {
          console.warn(`사진 ${photo.id}: URL 없음`);
          continue;
        }

        // Base64 데이터 검증
        if (photo.fileUrl.startsWith('data:')) {
          // Base64 형식 검증
          if (!photo.fileUrl.includes(',')) {
            failedPhotos.push(photo.id);
            continue;
          }

          // Blob URL 재생성
          try {
            const mimeType = photo.fileUrl.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            const blobUrl = createBlobUrlFromBase64(photo.fileUrl, mimeType);
            
            if (blobUrl) {
              restoredPhotos.push({
                ...photo,
                fileUrl: blobUrl
              });
            } else {
              failedPhotos.push(photo.id);
            }
          } catch (error) {
            console.error(`사진 ${photo.id} Blob URL 생성 실패:`, error);
            failedPhotos.push(photo.id);
          }
        } else {
          // 기존 Blob URL는 그대로 사용
          restoredPhotos.push(photo);
        }
      } catch (error) {
        console.error(`사진 복구 중 오류 ${photo.id}:`, error);
        failedPhotos.push(photo.id);
      }

      // 메모리 부담 완화를 위한 짧은 대기
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (setPhotosFn) {
      setPhotosFn(restoredPhotos);
    }

    // 복구 결과 알림
    if (failedPhotos.length > 0) {
      console.warn(`${failedPhotos.length}개의 사진이 복구되지 않았습니다:`, failedPhotos);
      alert(`⚠️ ${restoredPhotos.length}/${photosToRestore.length}개의 사진이 복구되었습니다.\n(${failedPhotos.length}개는 손상되었거나 복구할 수 없습니다)`);
    }

    return restoredPhotos;
  };

  // New Feature: Reset only monthly data (keep workers)
  const handleNewMonth = () => {
    if (confirm("현재 등록된 '근로자'와 '현장 정보'는 유지하고,\n'일일 출역'과 '사진'만 초기화하여 새로운 달을 시작하시겠습니까?")) {
        // Clear daily log data
        setAttendance({});
        setSafetyAttendance({});
        setLaborPhotos(prev => {
            prev.forEach(p => {
                if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
            });
            return [];
        });
        setSafetyPhotos(prev => {
            prev.forEach(p => {
                if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
            });
            return [];
        });
        
        // Advance month automatically (optional convenience)
        setProjectInfo(prev => {
           let nextMonth = prev.month + 1;
           let nextYear = prev.year;
           if (nextMonth > 12) {
               nextMonth = 1;
               nextYear += 1;
           }
           return {
               ...prev,
               year: nextYear,
               month: nextMonth,
               reportDate: getLocalDateString() // Reset report date to today
           };
        });

        clearPhotoState().catch(error => console.error('사진 저장소 초기화 실패', error));

        alert("월간 데이터가 초기화되었습니다.\n근로자 명단은 유지됩니다.");
        setActiveTab('daily');
    }
  };

  const handleReset = () => {
    if (confirm("모든 데이터를 완전히 삭제하고 초기화하시겠습니까?\n(이 작업은 되돌릴 수 없습니다)")) {
      // Critical: Revoke all object URLs to free memory
      laborPhotos.forEach(p => {
        if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
      });
      safetyPhotos.forEach(p => {
        if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl);
      });

      setProjectInfo({
        ...INITIAL_PROJECT_INFO,
        reportDate: getLocalDateString()
      });
      setWorkers([]);
      setAttendance({});
      setSafetyWorkers([]);
      setSafetyAttendance({});
      setSafetyItems([]);
      setLaborPhotos([]);
      setSafetyPhotos([]);
      setAnnualBudget(0);
      setMonthlySnapshots({});
      
      // Also clear local storage draft
      localStorage.removeItem(DRAFT_KEY);
      clearPhotoState().catch(error => console.error('사진 저장소 초기화 실패', error));
      
      alert("초기화되었습니다.");
    }
  };

  // --- Worker Delete Logic (with attendance cleanup) ---

  const deleteWorkerFromLabor = (workerId: string) => {
    setWorkers(prev => prev.filter(w => w.id !== workerId));
    setAttendance(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        if (updated[date]?.[workerId] !== undefined) {
          const day = { ...updated[date] };
          delete day[workerId];
          updated[date] = day;
        }
      });
      return updated;
    });
  };

  const deleteWorkerFromSafety = (workerId: string) => {
    setSafetyWorkers(prev => prev.filter(w => w.id !== workerId));
    setSafetyAttendance(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(date => {
        if (updated[date]?.[workerId] !== undefined) {
          const day = { ...updated[date] };
          delete day[workerId];
          updated[date] = day;
        }
      });
      return updated;
    });
  };

  // --- Worker Transfer Logic ---

  // Move a worker from 유도원/감시자 section to 안전시설 section
  const moveWorkerToSafety = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    // Move attendance data
    const newAttendance = { ...attendance };
    const newSafetyAttendance = { ...safetyAttendance };
    Object.keys(newAttendance).forEach(date => {
      if (newAttendance[date]?.[workerId] !== undefined) {
        newSafetyAttendance[date] = { ...(newSafetyAttendance[date] || {}), [workerId]: newAttendance[date][workerId] };
        const updatedDay = { ...newAttendance[date] };
        delete updatedDay[workerId];
        newAttendance[date] = updatedDay;
      }
    });
    setWorkers(prev => prev.filter(w => w.id !== workerId));
    setSafetyWorkers(prev => [...prev, worker]);
    setAttendance(newAttendance);
    setSafetyAttendance(newSafetyAttendance);
  };

  // Move a worker from 안전시설 section to 유도원/감시자 section
  const moveWorkerToLabor = (workerId: string) => {
    const worker = safetyWorkers.find(w => w.id === workerId);
    if (!worker) return;
    // Move attendance data
    const newAttendance = { ...attendance };
    const newSafetyAttendance = { ...safetyAttendance };
    Object.keys(newSafetyAttendance).forEach(date => {
      if (newSafetyAttendance[date]?.[workerId] !== undefined) {
        newAttendance[date] = { ...(newAttendance[date] || {}), [workerId]: newSafetyAttendance[date][workerId] };
        const updatedDay = { ...newSafetyAttendance[date] };
        delete updatedDay[workerId];
        newSafetyAttendance[date] = updatedDay;
      }
    });
    setSafetyWorkers(prev => prev.filter(w => w.id !== workerId));
    setWorkers(prev => [...prev, worker]);
    setAttendance(newAttendance);
    setSafetyAttendance(newSafetyAttendance);
  };

  // Move a photo from 유도원/감시자 to 안전시설 증빙사진
  const movePhotoToSafety = (photoId: string) => {
    const photo = laborPhotos.find(p => p.id === photoId);
    if (!photo) return;
    setLaborPhotos(prev => prev.filter(p => p.id !== photoId));
    setSafetyPhotos(prev => [...prev, photo]);
  };

  // Move a photo from 안전시설 to 유도원/감시자 증빙사진
  const movePhotoToLabor = (photoId: string) => {
    const photo = safetyPhotos.find(p => p.id === photoId);
    if (!photo) return;
    setSafetyPhotos(prev => prev.filter(p => p.id !== photoId));
    setLaborPhotos(prev => [...prev, photo]);
  };

  // Calculate stats for dashboard
  const totalLaborCost = workers.reduce((acc, curr) => acc + (curr.daysWorked * curr.dailyRate), 0);
  const totalSafetyWorkersCost = safetyWorkers.reduce((acc, curr) => acc + (curr.daysWorked * curr.dailyRate), 0);
  const totalMaterialCost = safetyItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const totalSafetyCost = totalSafetyWorkersCost + totalMaterialCost;
  const totalCost = totalLaborCost + totalSafetyCost;
  const totalPhotos = laborPhotos.length + safetyPhotos.length;
  const executionRate = annualBudget > 0 ? Math.min((totalCost / annualBudget) * 100, 999.9) : 0;
  const remainingBudget = Math.max(annualBudget - totalCost, 0);
  const currentMonthKey = getMonthKey(projectInfo.year, projectInfo.month);
  const currentMonthSnapshot = monthlySnapshots[currentMonthKey];
  const isCurrentMonthClosed = currentMonthSnapshot?.isClosed === true;
  const currentMonthClosedAt = currentMonthSnapshot?.closedAt
    ? new Date(currentMonthSnapshot.closedAt).toLocaleString('ko-KR')
    : '';
  const allSortedMonthlySnapshots = Object.entries(monthlySnapshots).sort(([a], [b]) => a.localeCompare(b));
  const availableMonthKeys = allSortedMonthlySnapshots.map(([monthKey]) => monthKey);
  const normalizedSelectedMonth = selectedMonth || currentMonthKey;

  const normalizedRangeStart = rangeStartMonth || availableMonthKeys[0] || currentMonthKey;
  const normalizedRangeEnd = rangeEndMonth || availableMonthKeys[availableMonthKeys.length - 1] || currentMonthKey;
  const [rangeFrom, rangeTo] = normalizedRangeStart.localeCompare(normalizedRangeEnd) <= 0
    ? [normalizedRangeStart, normalizedRangeEnd]
    : [normalizedRangeEnd, normalizedRangeStart];

  const selectedSnapshotEntries = aggregationMode === 'single'
    ? allSortedMonthlySnapshots.filter(([monthKey]) => monthKey === normalizedSelectedMonth)
    : allSortedMonthlySnapshots.filter(([monthKey]) => monthKey >= rangeFrom && monthKey <= rangeTo);

  const selectedMonthsCount = selectedSnapshotEntries.length;
  const selectedLaborCost = selectedSnapshotEntries.reduce((sum, [, snapshot]) => sum + snapshot.laborCost, 0);
  const selectedSafetyWorkerCost = selectedSnapshotEntries.reduce((sum, [, snapshot]) => sum + snapshot.safetyWorkerCost, 0);
  const selectedMaterialCost = selectedSnapshotEntries.reduce((sum, [, snapshot]) => sum + snapshot.materialCost, 0);
  const selectedTotalCost = selectedSnapshotEntries.reduce((sum, [, snapshot]) => sum + snapshot.totalCost, 0);
  const selectedAverageCost = selectedMonthsCount > 0 ? selectedTotalCost / selectedMonthsCount : 0;
  const selectedPeriodLabel = aggregationMode === 'single'
    ? normalizedSelectedMonth
    : `${rangeFrom} ~ ${rangeTo}`;

  const previousPeriodEntries = aggregationMode === 'single'
    ? allSortedMonthlySnapshots.filter(([monthKey]) => monthKey === getPrevMonthKey(normalizedSelectedMonth))
    : allSortedMonthlySnapshots
        .filter(([monthKey]) => monthKey < rangeFrom)
        .slice(-selectedMonthsCount);

  const previousPeriodTotal = previousPeriodEntries.reduce((sum, [, snapshot]) => sum + snapshot.totalCost, 0);
  const deltaFromPrevious = selectedTotalCost - previousPeriodTotal;
  const deltaRateFromPrevious = previousPeriodTotal > 0
    ? (deltaFromPrevious / previousPeriodTotal) * 100
    : (selectedTotalCost > 0 ? 100 : 0);
  const selectedExecutionRate = annualBudget > 0 ? (selectedTotalCost / annualBudget) * 100 : 0;

  const availableYears = Array.from(new Set(availableMonthKeys.map(monthKey => monthKey.slice(0, 4))))
    .filter(Boolean)
    .sort();
  const normalizedGraphYear = graphYear || String(projectInfo.year);
  const normalizedGraphRangeStart = graphRangeStartMonth || availableMonthKeys[0] || currentMonthKey;
  const normalizedGraphRangeEnd = graphRangeEndMonth || availableMonthKeys[availableMonthKeys.length - 1] || currentMonthKey;
  const [graphRangeFrom, graphRangeTo] = normalizedGraphRangeStart.localeCompare(normalizedGraphRangeEnd) <= 0
    ? [normalizedGraphRangeStart, normalizedGraphRangeEnd]
    : [normalizedGraphRangeEnd, normalizedGraphRangeStart];

  const graphSnapshots = graphMode === 'recent6'
    ? allSortedMonthlySnapshots.slice(-6)
    : graphMode === 'year12'
      ? allSortedMonthlySnapshots.filter(([monthKey]) => monthKey.startsWith(`${normalizedGraphYear}-`)).slice(-12)
      : allSortedMonthlySnapshots.filter(([monthKey]) => monthKey >= graphRangeFrom && monthKey <= graphRangeTo);

  const graphTitleDescription = graphMode === 'recent6'
    ? '최근 6개월 기준 집행액 변동을 확인합니다.'
    : graphMode === 'year12'
      ? `${normalizedGraphYear}년 월별 집행액 추이를 확인합니다.`
      : `${graphRangeFrom} ~ ${graphRangeTo} 기간 집행액 추이를 확인합니다.`;

  const currentMonthGraphSnapshot: MonthlySnapshot = isCurrentMonthClosed && currentMonthSnapshot
    ? currentMonthSnapshot
    : {
        laborCost: totalLaborCost,
        safetyWorkerCost: totalSafetyWorkersCost,
        materialCost: totalMaterialCost,
        totalCost,
        photoCount: totalPhotos,
        updatedAt: Date.now(),
        isClosed: false,
      };
  const hasCurrentMonthInGraph = graphSnapshots.some(([monthKey]) => monthKey === currentMonthKey);
  const graphSnapshotsForDisplay: Array<[string, MonthlySnapshot]> = hasCurrentMonthInGraph
    ? graphSnapshots
    : [...graphSnapshots, [currentMonthKey, currentMonthGraphSnapshot] as [string, MonthlySnapshot]]
        .sort(([a], [b]) => a.localeCompare(b));

  const snapshotByMonth = new Map<string, MonthlySnapshot>(allSortedMonthlySnapshots);
  snapshotByMonth.set(currentMonthKey, currentMonthGraphSnapshot);

  const graphMonthlyRows = graphSnapshotsForDisplay.map(([monthKey, snapshot]) => {
    const prevMonthSnapshot = snapshotByMonth.get(getPrevMonthKey(monthKey));
    const monthlyLaborCost = snapshot.laborCost - (prevMonthSnapshot?.laborCost || 0);
    const monthlySafetyWorkerCost = snapshot.safetyWorkerCost - (prevMonthSnapshot?.safetyWorkerCost || 0);
    const monthlyMaterialCost = snapshot.materialCost - (prevMonthSnapshot?.materialCost || 0);
    const monthlyTotalCost = snapshot.totalCost - (prevMonthSnapshot?.totalCost || 0);

    return {
      monthKey,
      snapshot,
      monthlyLaborCost,
      monthlySafetyWorkerCost,
      monthlyMaterialCost,
      monthlyTotalCost,
    };
  });

  const maxGraphDisplayTotal = Math.max(...graphMonthlyRows.map(row => Math.max(row.monthlyTotalCost, 0)), 1);

  const allMonthKeysForPrint = Array.from(snapshotByMonth.keys()).sort((a, b) => a.localeCompare(b));
  const monthlyDeltaRowsAll = allMonthKeysForPrint.map(monthKey => {
    const snapshot = snapshotByMonth.get(monthKey)!;
    const prevMonthSnapshot = snapshotByMonth.get(getPrevMonthKey(monthKey));
    return {
      monthKey,
      snapshot,
      monthlyLaborCost: snapshot.laborCost - (prevMonthSnapshot?.laborCost || 0),
      monthlySafetyWorkerCost: snapshot.safetyWorkerCost - (prevMonthSnapshot?.safetyWorkerCost || 0),
      monthlyMaterialCost: snapshot.materialCost - (prevMonthSnapshot?.materialCost || 0),
      monthlyTotalCost: snapshot.totalCost - (prevMonthSnapshot?.totalCost || 0),
    };
  });

  const normalizedPrintSingleMonth = printSingleMonth || currentMonthKey;
  const normalizedPrintRangeStart = printRangeStartMonth || allMonthKeysForPrint[0] || currentMonthKey;
  const normalizedPrintRangeEnd = printRangeEndMonth || allMonthKeysForPrint[allMonthKeysForPrint.length - 1] || currentMonthKey;
  const [printRangeFrom, printRangeTo] = normalizedPrintRangeStart.localeCompare(normalizedPrintRangeEnd) <= 0
    ? [normalizedPrintRangeStart, normalizedPrintRangeEnd]
    : [normalizedPrintRangeEnd, normalizedPrintRangeStart];

  const printSelectedRows = printScopeMode === 'single'
    ? monthlyDeltaRowsAll.filter(row => row.monthKey === normalizedPrintSingleMonth)
    : monthlyDeltaRowsAll.filter(row => row.monthKey >= printRangeFrom && row.monthKey <= printRangeTo);

  const printPeriodLabel = printScopeMode === 'single'
    ? normalizedPrintSingleMonth
    : `${printRangeFrom} ~ ${printRangeTo}`;

  const printRowsWithRunningTotal = printSelectedRows.reduce<Array<typeof printSelectedRows[number] & { runningTotal: number }>>((acc, row) => {
    const previous = acc.length > 0 ? acc[acc.length - 1].runningTotal : 0;
    acc.push({ ...row, runningTotal: previous + row.monthlyTotalCost });
    return acc;
  }, []);

  const printPeriodLaborCost = printSelectedRows.reduce((sum, row) => sum + row.monthlyLaborCost, 0);
  const printPeriodSafetyWorkerCost = printSelectedRows.reduce((sum, row) => sum + row.monthlySafetyWorkerCost, 0);
  const printPeriodMaterialCost = printSelectedRows.reduce((sum, row) => sum + row.monthlyMaterialCost, 0);
  const printPeriodTotalCost = printSelectedRows.reduce((sum, row) => sum + row.monthlyTotalCost, 0);

  const printReferenceMonthKey = (printSelectedRows[printSelectedRows.length - 1]?.monthKey) || currentMonthKey;
  const { year: printReferenceYear, month: printReferenceMonth } = getYearMonthFromKey(printReferenceMonthKey);
  const printProjectInfo: ProjectInfo = {
    ...projectInfo,
    year: printReferenceYear,
    month: printReferenceMonth,
  };

  useEffect(() => {
    if (selectedMonth) return;
    setSelectedMonth(currentMonthKey);
  }, [selectedMonth, currentMonthKey]);

  useEffect(() => {
    if (!rangeStartMonth) {
      setRangeStartMonth(availableMonthKeys[0] || currentMonthKey);
    }
    if (!rangeEndMonth) {
      setRangeEndMonth(availableMonthKeys[availableMonthKeys.length - 1] || currentMonthKey);
    }
  }, [rangeStartMonth, rangeEndMonth, availableMonthKeys, currentMonthKey]);

  useEffect(() => {
    if (graphYear) return;
    setGraphYear(String(projectInfo.year));
  }, [graphYear, projectInfo.year]);

  useEffect(() => {
    if (!graphRangeStartMonth) {
      setGraphRangeStartMonth(availableMonthKeys[0] || currentMonthKey);
    }
    if (!graphRangeEndMonth) {
      setGraphRangeEndMonth(availableMonthKeys[availableMonthKeys.length - 1] || currentMonthKey);
    }
  }, [graphRangeStartMonth, graphRangeEndMonth, availableMonthKeys, currentMonthKey]);

  useEffect(() => {
    if (printSingleMonth) return;
    setPrintSingleMonth(currentMonthKey);
  }, [printSingleMonth, currentMonthKey]);

  useEffect(() => {
    if (!printRangeStartMonth) {
      setPrintRangeStartMonth(allMonthKeysForPrint[0] || currentMonthKey);
    }
    if (!printRangeEndMonth) {
      setPrintRangeEndMonth(allMonthKeysForPrint[allMonthKeysForPrint.length - 1] || currentMonthKey);
    }
  }, [printRangeStartMonth, printRangeEndMonth, allMonthKeysForPrint, currentMonthKey]);

  useEffect(() => {
    setMonthlySnapshots(prev => {
      const existing = prev[currentMonthKey];
      if (existing?.isClosed) {
        return prev;
      }

      return {
        ...prev,
        [currentMonthKey]: {
          laborCost: totalLaborCost,
          safetyWorkerCost: totalSafetyWorkersCost,
          materialCost: totalMaterialCost,
          totalCost,
          photoCount: totalPhotos,
          updatedAt: Date.now(),
          isClosed: false,
          closedAt: undefined,
          note: existing?.note,
        }
      };
    });
  }, [currentMonthKey, totalLaborCost, totalSafetyWorkersCost, totalMaterialCost, totalCost, totalPhotos]);

  const handleCloseCurrentMonth = () => {
    const noteInput = prompt('월 마감 메모를 입력하세요. (선택)');
    if (noteInput === null) return;

    setMonthlySnapshots(prev => ({
      ...prev,
      [currentMonthKey]: {
        laborCost: totalLaborCost,
        safetyWorkerCost: totalSafetyWorkersCost,
        materialCost: totalMaterialCost,
        totalCost,
        photoCount: totalPhotos,
        updatedAt: Date.now(),
        isClosed: true,
        closedAt: Date.now(),
        note: noteInput.trim() || undefined,
      }
    }));

    alert(`${currentMonthKey} 월이 마감되었습니다.\n마감 해제 전까지 자동 집계 갱신이 중지됩니다.`);
  };

  const handleReopenCurrentMonth = () => {
    if (!confirm(`${currentMonthKey} 월 마감을 해제하시겠습니까?\n해제 후에는 데이터 변경 시 월간 집계가 다시 자동 갱신됩니다.`)) {
      return;
    }

    setMonthlySnapshots(prev => {
      const existing = prev[currentMonthKey];
      if (!existing) return prev;

      return {
        ...prev,
        [currentMonthKey]: {
          ...existing,
          isClosed: false,
          closedAt: undefined,
        }
      };
    });

    alert(`${currentMonthKey} 월 마감이 해제되었습니다.`);
  };

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      {
        현장명: projectInfo.siteName || '',
        귀속연도: projectInfo.year,
        귀속월: projectInfo.month,
        업체명: projectInfo.companyName || '',
        현장대리인: projectInfo.managerName || '',
        안전팀장: projectInfo.safetyManagerName || '',
        연간계상액: annualBudget,
        총인건비: totalLaborCost + totalSafetyWorkersCost,
        총재료비: totalMaterialCost,
        총집행액: totalCost,
        집행률: `${executionRate.toFixed(1)}%`,
        잔액: remainingBudget,
        사진품질프리셋: uploadQualityPreset === 'low' ? '저용량' : uploadQualityPreset === 'high' ? '고품질' : '표준',
      }
    ]);

    const laborSheet = XLSX.utils.json_to_sheet(
      [
      ...workers.map(worker => ({
        구분: '유도원/감시자',
        성명: worker.name,
        직종: worker.role,
        주민등록번호: maskRRN(worker.rrn),
        주소: worker.address,
        출력공수: worker.daysWorked,
        일단가: worker.dailyRate,
        노무비총액: worker.daysWorked * worker.dailyRate,
      })),
      {
        구분: '합계',
        성명: '',
        직종: '',
        주민등록번호: '',
        주소: '',
        출력공수: workers.reduce((sum, worker) => sum + worker.daysWorked, 0),
        일단가: '',
        노무비총액: totalLaborCost,
      }
      ]
    );

    const safetyWorkerSheet = XLSX.utils.json_to_sheet(
      [
      ...safetyWorkers.map(worker => ({
        구분: '안전시설',
        성명: worker.name,
        직종: worker.role,
        주민등록번호: maskRRN(worker.rrn),
        주소: worker.address,
        출력공수: worker.daysWorked,
        일단가: worker.dailyRate,
        노무비총액: worker.daysWorked * worker.dailyRate,
      })),
      {
        구분: '합계',
        성명: '',
        직종: '',
        주민등록번호: '',
        주소: '',
        출력공수: safetyWorkers.reduce((sum, worker) => sum + worker.daysWorked, 0),
        일단가: '',
        노무비총액: totalSafetyWorkersCost,
      }
      ]
    );

    const itemSheet = XLSX.utils.json_to_sheet(
      [
      ...safetyItems.map(item => ({
        품명: item.name,
        규격: item.spec,
        단위: item.unit,
        수량: item.quantity,
        단가: item.unitPrice,
        금액: item.quantity * item.unitPrice,
        비고: item.note,
      })),
      {
        품명: '합계',
        규격: '',
        단위: '',
        수량: safetyItems.reduce((sum, item) => sum + item.quantity, 0),
        단가: '',
        금액: totalMaterialCost,
        비고: '',
      }
      ]
    );

    const sortedMonthlyEntries = Object.entries(monthlySnapshots)
      .sort(([a], [b]) => a.localeCompare(b));

    let cumulativeTotal = 0;
    const monthlyTrendRows = sortedMonthlyEntries.map(([monthKey, snapshot], index) => {
      cumulativeTotal += snapshot.totalCost;
      const previousTotal = index > 0 ? sortedMonthlyEntries[index - 1][1].totalCost : 0;
      const deltaAmount = snapshot.totalCost - previousTotal;
      const deltaRate = previousTotal > 0
        ? (deltaAmount / previousTotal) * 100
        : (snapshot.totalCost > 0 ? 100 : 0);
      const cumulativeExecutionRate = annualBudget > 0 ? (cumulativeTotal / annualBudget) * 100 : 0;

      return {
        월: monthKey,
        유도원인건비: snapshot.laborCost,
        안전시설인건비: snapshot.safetyWorkerCost,
        재료비: snapshot.materialCost,
        총집행액: snapshot.totalCost,
        전월대비증감액: deltaAmount,
        전월대비증감률: `${deltaRate.toFixed(1)}%`,
        누적집행액: cumulativeTotal,
        누적집행률: `${cumulativeExecutionRate.toFixed(1)}%`,
        사진수: snapshot.photoCount,
        월마감: snapshot.isClosed ? '확정' : '진행중',
        최종갱신: new Date(snapshot.updatedAt).toLocaleString('ko-KR'),
      };
    });

    const monthlyTrendSheet = XLSX.utils.json_to_sheet(monthlyTrendRows);

    summarySheet['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 14 }
    ];
    laborSheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 14 }
    ];
    safetyWorkerSheet['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 24 }, { wch: 10 }, { wch: 12 }, { wch: 14 }
    ];
    itemSheet['!cols'] = [
      { wch: 18 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 20 }
    ];
    monthlyTrendSheet['!cols'] = [
      { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
    ];
    summarySheet['!autofilter'] = { ref: 'A1:M2' };
    laborSheet['!autofilter'] = { ref: `A1:H${workers.length + 2}` };
    safetyWorkerSheet['!autofilter'] = { ref: `A1:H${safetyWorkers.length + 2}` };
    itemSheet['!autofilter'] = { ref: `A1:G${safetyItems.length + 2}` };
    monthlyTrendSheet['!autofilter'] = { ref: `A1:L${Object.keys(monthlySnapshots).length + 1}` };

    XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');
    XLSX.utils.book_append_sheet(workbook, laborSheet, '유도원인건비');
    XLSX.utils.book_append_sheet(workbook, safetyWorkerSheet, '안전시설인건비');
    XLSX.utils.book_append_sheet(workbook, itemSheet, '안전시설재료비');
    XLSX.utils.book_append_sheet(workbook, monthlyTrendSheet, '월별추이');

    const safeSiteName = (projectInfo.siteName || '무제').replace(/[/\\?%*:|"<>]/g, '-');
    XLSX.writeFile(workbook, `세이프닥_집행내역_${safeSiteName}_${getMonthKey(projectInfo.year, projectInfo.month)}.xlsx`);
  };

  // Unique worker roles for photo 공종 category options
  const laborWorkerRoles = [...new Set(workers.map(w => w.role))].filter(Boolean);
  const safetyWorkerRoles = [...new Set(safetyWorkers.map(w => w.role))].filter(Boolean);

  const formatDateToKorean = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      {/* Top Navigation Bar - Sticky with dedicated status bar for clock */}
      <header className="sticky top-0 z-40 no-print flex flex-col bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        
        {/* 1. Status Bar (Clock) - Dedicated row to prevent crowding */}
        <div className="w-full bg-slate-50 border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-1.5 flex justify-end">
           <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 tabular-nums tracking-tight">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{currentTime}</span>
           </div>
        </div>

        {/* 2. Main Header Content */}
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3 gap-x-4">
           
           {/* Left: Logo */}
           <div className="flex items-center gap-3 cursor-pointer group shrink-0 mr-auto" onClick={() => setActiveTab('guide')}>
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 group-hover:scale-105 transition-all duration-300">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-xl font-extrabold text-slate-900 leading-none tracking-tight group-hover:text-indigo-700 transition-colors font-display">
                    세이프닥 <span className="text-indigo-600">SafetyDoc</span>
                 </h1>
                 <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">Smart Construction Safety</p>
              </div>
           </div>

           {/* Middle: Tabs (Order 3 on mobile to drop down, Order 2 on desktop to be center) */}
           <div className="order-3 md:order-2 w-full md:w-auto flex justify-center md:flex-1 overflow-x-auto no-scrollbar mask-gradient md:mask-none">
              <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50 shadow-inner min-w-fit">
                <button 
                  onClick={() => setActiveTab('guide')}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'guide' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <HelpCircle className="w-4 h-4"/>
                  <span>가이드</span>
                </button>
                <div className="w-px bg-slate-300/50 my-1.5"></div>
                <button 
                  onClick={() => setActiveTab('setup')}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'setup' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <Layout className="w-4 h-4"/>
                  <span>기본 설정</span>
                </button>
                <button 
                  onClick={() => setActiveTab('daily')}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'daily' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <CalendarCheck className="w-4 h-4"/>
                  <span>일일 관리</span>
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                >
                  <FileText className="w-4 h-4"/>
                  <span>보고서</span>
                </button>
              </div>
           </div>

           {/* Right: Actions (Order 2 on mobile to be right, Order 3 on desktop) */}
           <div className="order-2 md:order-3 flex items-center gap-2 shrink-0">
              <Suspense fallback={null}>
                <GeminiAssistant projectInfo={projectInfo} workers={workers} safetyItems={safetyItems} photos={[...laborPhotos, ...safetyPhotos]} />
              </Suspense>
              
              {/* Data Management Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  type="button"
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className={`p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all ${isBackingUp ? 'cursor-wait opacity-50' : ''}`}
                  title="데이터 파일 저장 (백업)"
                >
                  {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/> : <Download className="w-4 h-4" />}
                </button>
                <button 
                  type="button"
                  onClick={handleRestoreClick}
                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all"
                  title="데이터 파일 불러오기 (복구)"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".json"
                />
                
                <div className="w-px h-4 bg-slate-300 mx-0.5"></div>
                
                {/* New Month Button */}
                <button 
                  type="button"
                  onClick={handleNewMonth}
                  className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-all"
                  title="새로운 달 작성 (근로자/현장정보 유지, 데이터 초기화)"
                >
                  <FilePlus className="w-4 h-4" />
                </button>
                
                <button 
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-md transition-all"
                  title="전체 초기화 (모두 삭제)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
                  title="Excel 파일로 내보내기"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button 
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className={`flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap ${isPrinting ? 'opacity-70 cursor-wait' : ''}`}
                  title="현재 선택 기준으로 PDF 저장"
                >
                  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  <span className="hidden sm:inline">{isPrinting ? '준비 중...' : '전체 PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintLaborOnly}
                  disabled={isPrinting}
                  className={`inline-flex items-center px-2.5 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${isPrinting ? 'opacity-60 cursor-wait border-slate-200 text-slate-400 bg-slate-100' : 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}
                  title="유도원/감시자만 PDF 저장"
                >
                  유도원
                </button>
                <button
                  type="button"
                  onClick={handlePrintSafetyOnly}
                  disabled={isPrinting}
                  className={`inline-flex items-center px-2.5 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${isPrinting ? 'opacity-60 cursor-wait border-slate-200 text-slate-400 bg-slate-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                  title="안전시설만 PDF 저장"
                >
                  안전시설
                </button>
              </div>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Modern Dashboard Stats (Show in Setup and Daily tabs) */}
        {(activeTab === 'setup' || activeTab === 'daily') && (
          <div className="space-y-6 mb-10 no-print animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">안전관리비 총계</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{totalCost.toLocaleString()} <span className="text-sm text-slate-400 font-medium">원</span></p>
              </div>
            </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                     <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                        <CalendarCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">인건비 합계</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{(totalLaborCost + totalSafetyWorkersCost).toLocaleString()} <span className="text-sm text-slate-400 font-medium">원</span></p>
               </div>
            </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                     <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <ShoppingCart className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">시설/재료비 합계</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{totalMaterialCost.toLocaleString()} <span className="text-sm text-slate-400 font-medium">원</span></p>
               </div>
            </div>
             <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                     <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">증빙 사진</p>
                </div>
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{totalPhotos} <span className="text-sm text-slate-400 font-medium">장</span></p>
               </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
               <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-violet-100 p-2 rounded-lg text-violet-600">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">누계 집행 현황</p>
                </div>
                <input
                  type="number"
                  value={annualBudget}
                  onChange={(e) => setAnnualBudget(Number(e.target.value) || 0)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-right font-mono focus:border-violet-500 outline-none bg-white"
                  placeholder="연간 계상액 입력"
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">사진 업로드 품질</label>
                  <select
                    value={uploadQualityPreset}
                    onChange={(e) => setUploadQualityPreset(e.target.value as 'low' | 'balanced' | 'high')}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                  >
                    <option value="low">저용량 (빠름/작은 파일)</option>
                    <option value="balanced">표준 (권장)</option>
                    <option value="high">고품질 (선명/큰 파일)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>집행률</span>
                    <span>{executionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${Math.min(executionRate, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 pt-1">
                    <span>예산 {annualBudget.toLocaleString()} 원</span>
                    <span>잔액 {remainingBudget.toLocaleString()} 원</span>
                  </div>
                </div>
               </div>
            </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">월별 집행 추이</h3>
                  <p className="text-xs text-slate-500 mt-1">{graphTitleDescription} (월 증분 기준)</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-medium text-slate-400">기준월: {currentMonthKey}</div>
                  {isCurrentMonthClosed ? (
                    <button
                      type="button"
                      onClick={handleReopenCurrentMonth}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      월 마감 해제
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCloseCurrentMonth}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      월 마감 확정
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">그래프 기준</label>
                  <select
                    value={graphMode}
                    onChange={(e) => setGraphMode(e.target.value as 'recent6' | 'year12' | 'range')}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                  >
                    <option value="recent6">최근 6개월</option>
                    <option value="year12">연간 12개월</option>
                    <option value="range">기간 지정</option>
                  </select>
                </div>

                {graphMode === 'year12' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">조회 연도</label>
                    <select
                      value={normalizedGraphYear}
                      onChange={(e) => setGraphYear(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                    >
                      {(availableYears.length > 0 ? availableYears : [String(projectInfo.year)]).map(year => (
                        <option key={year} value={year}>{year}년</option>
                      ))}
                    </select>
                  </div>
                ) : graphMode === 'range' ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">시작 월</label>
                      <select
                        value={graphRangeStartMonth || normalizedGraphRangeStart}
                        onChange={(e) => setGraphRangeStartMonth(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                      >
                        {(availableMonthKeys.length > 0 ? availableMonthKeys : [currentMonthKey]).map(monthKey => (
                          <option key={monthKey} value={monthKey}>{monthKey}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">종료 월</label>
                      <select
                        value={graphRangeEndMonth || normalizedGraphRangeEnd}
                        onChange={(e) => setGraphRangeEndMonth(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                      >
                        {(availableMonthKeys.length > 0 ? availableMonthKeys : [currentMonthKey]).map(monthKey => (
                          <option key={monthKey} value={monthKey}>{monthKey}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 font-medium">
                    최근 6개월은 자동으로 최신 월 기준으로 표시됩니다.
                  </div>
                )}
              </div>

              {isCurrentMonthClosed && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">
                  현재 월은 마감 상태입니다{currentMonthClosedAt ? ` · 마감시각 ${currentMonthClosedAt}` : ''}
                  {currentMonthSnapshot?.note ? ` · 메모: ${currentMonthSnapshot.note}` : ''}
                </div>
              )}

              {graphSnapshotsForDisplay.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-400">
                  아직 저장된 월별 추이 데이터가 없습니다.
                </div>
              ) : (
                <div className="space-y-4">
                  {graphMonthlyRows.map(({ monthKey, snapshot, monthlyLaborCost, monthlySafetyWorkerCost, monthlyMaterialCost, monthlyTotalCost }) => {
                    const isCurrentRow = monthKey === currentMonthKey;
                    const displaySnapshot = isCurrentRow ? currentMonthGraphSnapshot : snapshot;
                    const barBaseAmount = Math.max(monthlyTotalCost, 0);
                    const barWidth = `${Math.max((barBaseAmount / maxGraphDisplayTotal) * 100, barBaseAmount > 0 ? 6 : 0)}%`;
                    const laborRatio = monthlyTotalCost > 0 ? (monthlyLaborCost / monthlyTotalCost) * 100 : 0;
                    const safetyWorkerRatio = monthlyTotalCost > 0 ? (monthlySafetyWorkerCost / monthlyTotalCost) * 100 : 0;
                    const materialRatio = monthlyTotalCost > 0 ? (monthlyMaterialCost / monthlyTotalCost) * 100 : 0;
                    return (
                      <div
                        key={monthKey}
                        className={`grid grid-cols-1 lg:grid-cols-[110px_1fr_160px] gap-3 items-center rounded-2xl px-3 py-2 ${isCurrentRow ? 'bg-indigo-50 border border-indigo-200' : ''}`}
                      >
                        <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                          <span>{monthKey}</span>
                          {isCurrentRow && <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">당월</span>}
                          {displaySnapshot.isClosed && <Lock className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <div>
                          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full overflow-hidden flex" style={{ width: barWidth }}>
                              <div className="h-full bg-indigo-500" style={{ width: `${laborRatio}%` }} />
                              <div className="h-full bg-violet-500" style={{ width: `${safetyWorkerRatio}%` }} />
                              <div className="h-full bg-emerald-500" style={{ width: `${materialRatio}%` }} />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>유도원 {monthlyLaborCost.toLocaleString()}원</span>
                            <span>안전시설 {monthlySafetyWorkerCost.toLocaleString()}원</span>
                            <span>재료비 {monthlyMaterialCost.toLocaleString()}원</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900">{monthlyTotalCost.toLocaleString()} 원</div>
                          <div className="text-[11px] text-slate-400 mt-1">사진 {displaySnapshot.photoCount}장</div>
                          {isCurrentRow && <div className="text-[11px] text-indigo-600 font-bold mt-1">당월 금액 (월 증분)</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">월간 금액 집계 조회</h3>
                  <p className="text-xs text-slate-500 mt-1">원하는 단월 또는 기간 기준으로 집계 금액을 확인합니다.</p>
                </div>
                <div className="text-xs font-medium text-slate-400">조회 기준: {selectedPeriodLabel}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">조회 방식</label>
                  <select
                    value={aggregationMode}
                    onChange={(e) => setAggregationMode(e.target.value as 'single' | 'range')}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                  >
                    <option value="single">단월</option>
                    <option value="range">기간</option>
                  </select>
                </div>

                {aggregationMode === 'single' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">조회 월</label>
                    <select
                      value={normalizedSelectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                    >
                      {availableMonthKeys.length === 0 ? (
                        <option value={currentMonthKey}>{currentMonthKey}</option>
                      ) : (
                        availableMonthKeys.map(monthKey => (
                          <option key={monthKey} value={monthKey}>{monthKey}</option>
                        ))
                      )}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">시작 월</label>
                      <select
                        value={rangeStartMonth || normalizedRangeStart}
                        onChange={(e) => setRangeStartMonth(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                      >
                        {availableMonthKeys.length === 0 ? (
                          <option value={currentMonthKey}>{currentMonthKey}</option>
                        ) : (
                          availableMonthKeys.map(monthKey => (
                            <option key={monthKey} value={monthKey}>{monthKey}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">종료 월</label>
                      <select
                        value={rangeEndMonth || normalizedRangeEnd}
                        onChange={(e) => setRangeEndMonth(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:border-violet-500 outline-none bg-white"
                      >
                        {availableMonthKeys.length === 0 ? (
                          <option value={currentMonthKey}>{currentMonthKey}</option>
                        ) : (
                          availableMonthKeys.map(monthKey => (
                            <option key={monthKey} value={monthKey}>{monthKey}</option>
                          ))
                        )}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {selectedMonthsCount === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-400">
                  선택한 조건에 해당하는 월간 집계 데이터가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">총집행액</div>
                    <div className="text-lg font-extrabold text-slate-900 mt-1">{selectedTotalCost.toLocaleString()} 원</div>
                    <div className="text-[11px] text-slate-500 mt-1">대상월 {selectedMonthsCount}개월</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">항목별 합계</div>
                    <div className="text-[11px] text-slate-600 mt-1">유도원 {selectedLaborCost.toLocaleString()} 원</div>
                    <div className="text-[11px] text-slate-600">안전시설 {selectedSafetyWorkerCost.toLocaleString()} 원</div>
                    <div className="text-[11px] text-slate-600">재료비 {selectedMaterialCost.toLocaleString()} 원</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">평균/집행률</div>
                    <div className="text-[11px] text-slate-600 mt-1">월평균 {selectedAverageCost.toLocaleString()} 원</div>
                    <div className="text-[11px] text-slate-600">예산대비 {selectedExecutionRate.toFixed(1)}%</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-[11px] font-bold text-slate-500">전기 대비</div>
                    <div className={`text-lg font-extrabold mt-1 ${deltaFromPrevious >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {deltaFromPrevious >= 0 ? '+' : ''}{deltaFromPrevious.toLocaleString()} 원
                    </div>
                    <div className={`text-[11px] mt-1 ${deltaFromPrevious >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {deltaRateFromPrevious >= 0 ? '+' : ''}{deltaRateFromPrevious.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <ProjectHeader info={projectInfo} onChange={setProjectInfo} />
            <LaborCostTable
              workers={workers}
              setWorkers={setWorkers}
              onMoveWorker={moveWorkerToSafety}
              moveLabel="→ 안전시설로 이동"
              onDeleteWorker={deleteWorkerFromLabor}
              onResetAttendance={() => setAttendance({})}
            />

            {/* Worker Transfer Divider */}
            <div className="flex items-center gap-4 no-print">
              <div className="flex-1 h-px bg-slate-200"></div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
                <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                <span>각 근로자 카드의 이동 버튼으로 섹션 간 이동 가능</span>
              </div>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <LaborCostTable
              workers={safetyWorkers}
              setWorkers={setSafetyWorkers}
              sectionTitle="안전시설 인건비 근로자 산출 정보"
              reportTitle="안전시설 인건비 근로자 증빙 양식"
              onMoveWorker={moveWorkerToLabor}
              moveLabel="← 유도원으로 이동"
              onDeleteWorker={deleteWorkerFromSafety}
              onResetAttendance={() => setSafetyAttendance({})}
            />
            <SafetyCostTable items={safetyItems} setItems={setSafetyItems} />

            {/* Labor Photos in Setup Tab for Transfer */}
            <PhotoLedger
              photos={laborPhotos}
              setPhotos={setLaborPhotos}
              title="유도원 및 감시자 인건비 증빙 사진"
              categoryOptions={laborWorkerRoles.length > 0 ? laborWorkerRoles : WORKER_ROLES}
              uploadQualityPreset={uploadQualityPreset}
            />

            {/* Photo Transfer Divider */}
            <div className="flex items-center gap-4 no-print">
              <div className="flex-1 h-px bg-slate-200"></div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full">
                  <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                  <span>사진 이동</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (laborPhotos.length === 0) { alert('유도원/감시자 증빙 사진이 없습니다.'); return; }
                      if (confirm(`유도원/감시자 증빙 사진 ${laborPhotos.length}장을 모두 안전시설 증빙사진으로 이동하시겠습니까?`)) {
                        setSafetyPhotos(prev => [...prev, ...laborPhotos]);
                        setLaborPhotos([]);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg border border-amber-200 transition-colors"
                  >
                    전체 → 안전시설로
                  </button>
                  <button
                    onClick={() => {
                      if (safetyPhotos.length === 0) { alert('안전시설 증빙 사진이 없습니다.'); return; }
                      if (confirm(`안전시설 증빙 사진 ${safetyPhotos.length}장을 모두 유도원/감시자 증빙사진으로 이동하시겠습니까?`)) {
                        setLaborPhotos(prev => [...prev, ...safetyPhotos]);
                        setSafetyPhotos([]);
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg border border-amber-200 transition-colors"
                  >
                    ← 유도원으로 전체
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-red-50 border border-red-200 px-4 py-2 rounded-full mt-1">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>증빙사진 전체삭제</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (laborPhotos.length === 0) { alert('유도원/감시자 증빙 사진이 없습니다.'); return; }
                      if (confirm(`유도원/감시자 증빙 사진 ${laborPhotos.length}장을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                        laborPhotos.forEach(p => { if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl); });
                        setLaborPhotos([]);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    유도원 사진 전체삭제
                  </button>
                  <button
                    onClick={() => {
                      if (safetyPhotos.length === 0) { alert('안전시설 증빙 사진이 없습니다.'); return; }
                      if (confirm(`안전시설 증빙 사진 ${safetyPhotos.length}장을 모두 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
                        safetyPhotos.forEach(p => { if (p.fileUrl && p.fileUrl.startsWith('blob:')) URL.revokeObjectURL(p.fileUrl); });
                        setSafetyPhotos([]);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 rounded-lg border border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    안전시설 사진 전체삭제
                  </button>
                </div>
              </div>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <PhotoLedger
              photos={safetyPhotos}
              setPhotos={setSafetyPhotos}
              title="안전시설 인건비 증빙 사진"
              categoryOptions={safetyWorkerRoles.length > 0 ? safetyWorkerRoles : WORKER_ROLES}
              uploadQualityPreset={uploadQualityPreset}
            />
            
            <div className="bg-gradient-to-r from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 text-sm text-indigo-900 flex items-start gap-4 shadow-sm">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0">
                  <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-lg mb-1">다음 단계 안내</p>
                <p className="text-indigo-700 leading-relaxed">
                    근로자 및 안전물품 등록이 완료되셨나요?<br/>
                    상단 탭의 <span className="font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 mx-1 shadow-sm">일일 관리</span> 메뉴로 이동하여 날짜별 공수와 작업 사진을 입력해주세요.
                </p>
              </div>
              <div className="ml-auto self-center">
                  <button onClick={() => setActiveTab('daily')} className="flex items-center gap-1 text-indigo-600 font-bold hover:underline">
                      이동하기 <ChevronRight className="w-4 h-4" />
                  </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Save className="w-4 h-4 text-indigo-400" />
                <span>안전을 위해 입력하신 텍스트 정보(근로자 등)는 브라우저에 자동 임시 저장됩니다. (사진은 자동 저장되지 않으므로 '백업' 기능을 이용해주세요)</span>
            </div>
          </div>
        )}

        {/* Daily Input Tab */}
        {activeTab === 'daily' && (
          <DailyLogManager 
            workers={workers}
            attendance={attendance}
            setAttendance={setAttendance}
            photos={laborPhotos}
            setPhotos={setLaborPhotos}
            safetyPhotos={safetyPhotos}
            setSafetyPhotos={setSafetyPhotos}
            year={projectInfo.year}
            month={projectInfo.month}
            safetyWorkers={safetyWorkers}
            safetyAttendance={safetyAttendance}
            setSafetyAttendance={setSafetyAttendance}
            uploadQualityPreset={uploadQualityPreset}
            laborCategoryOptions={laborWorkerRoles.length > 0 ? laborWorkerRoles : WORKER_ROLES}
            safetyCategoryOptions={safetyWorkerRoles.length > 0 ? safetyWorkerRoles : WORKER_ROLES}
          />
        )}

        {/* Guide Tab */}
        {activeTab === 'guide' && (
          <Suspense fallback={null}>
            <UserGuide />
          </Suspense>
        )}

        {/* Report Preview Tab */}
        {activeTab === 'preview' && (
          <div className="flex flex-col items-center w-full">
            {/* Print Options Toolbar */}
            <div className="w-full max-w-[21cm] mb-3 sm:mb-4 flex flex-col items-end gap-1.5 sm:gap-2 no-print animate-in fade-in slide-in-from-top-2 sticky top-[5.25rem] sm:top-[6rem] z-30 bg-slate-50/90 backdrop-blur-sm p-2 rounded-xl border border-slate-200/70">
              <div className="w-full flex flex-wrap justify-end gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold border transition-all ${isPrinting ? 'opacity-60 cursor-wait border-slate-200 text-slate-400 bg-slate-100' : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'}`}
                >
                  전체 PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintLaborOnly}
                  disabled={isPrinting}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold border transition-all ${isPrinting ? 'opacity-60 cursor-wait border-slate-200 text-slate-400 bg-slate-100' : 'border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'}`}
                >
                  유도원 PDF
                </button>
                <button
                  type="button"
                  onClick={handlePrintSafetyOnly}
                  disabled={isPrinting}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-bold border transition-all ${isPrinting ? 'opacity-60 cursor-wait border-slate-200 text-slate-400 bg-slate-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                >
                  안전시설 PDF
                </button>
              </div>
              <div className="w-full flex flex-wrap justify-end gap-1.5 sm:gap-2">
                <label className="flex items-center gap-2 bg-indigo-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-all select-none text-indigo-700 font-bold text-xs sm:text-sm">
                    <input 
                      type="checkbox" 
                      checked={showLaborCost} 
                      onChange={(e) => setShowLaborCost(e.target.checked)}
                      className="accent-indigo-600 w-4 h-4"
                    />
                    <span>유도원/감시자 인건비 내역 포함</span>
                </label>
                <label className="flex items-center gap-2 bg-emerald-50 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-all select-none text-emerald-700 font-bold text-xs sm:text-sm">
                    <input 
                      type="checkbox" 
                      checked={showSafetyCost} 
                      onChange={(e) => setShowSafetyCost(e.target.checked)}
                      className="accent-emerald-600 w-4 h-4"
                    />
                    <span>안전시설 인건비 내역 포함</span>
                </label>
                <label className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border cursor-pointer transition-all select-none text-xs sm:text-sm font-bold ${showSafetyCost ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed'}`}>
                    <input 
                      type="checkbox" 
                      checked={showSafetyItems} 
                      onChange={(e) => setShowSafetyItems(e.target.checked)}
                      disabled={!showSafetyCost}
                      className="accent-emerald-600 w-4 h-4"
                    />
                    <span>안전시설 재료비 내역(품목) 포함</span>
                </label>
              </div>
              <div className="w-full grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-2">
                <select
                  value={printScopeMode}
                  onChange={(e) => setPrintScopeMode(e.target.value as 'single' | 'range')}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                >
                  <option value="single">출력 기준: 단월</option>
                  <option value="range">출력 기준: 기간</option>
                </select>

                {printScopeMode === 'single' ? (
                  <select
                    value={normalizedPrintSingleMonth}
                    onChange={(e) => setPrintSingleMonth(e.target.value)}
                    className="sm:col-span-3 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                  >
                    {(allMonthKeysForPrint.length > 0 ? allMonthKeysForPrint : [currentMonthKey]).map(monthKey => (
                      <option key={monthKey} value={monthKey}>{monthKey}</option>
                    ))}
                  </select>
                ) : (
                  <>
                    <select
                      value={printRangeStartMonth || normalizedPrintRangeStart}
                      onChange={(e) => setPrintRangeStartMonth(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                    >
                      {(allMonthKeysForPrint.length > 0 ? allMonthKeysForPrint : [currentMonthKey]).map(monthKey => (
                        <option key={monthKey} value={monthKey}>{monthKey}</option>
                      ))}
                    </select>
                    <select
                      value={printRangeEndMonth || normalizedPrintRangeEnd}
                      onChange={(e) => setPrintRangeEndMonth(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                    >
                      {(allMonthKeysForPrint.length > 0 ? allMonthKeysForPrint : [currentMonthKey]).map(monthKey => (
                        <option key={monthKey} value={monthKey}>{monthKey}</option>
                      ))}
                    </select>
                    <div className="border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50">
                      {printPeriodLabel}
                    </div>
                  </>
                )}
              </div>
              {printScopeMode === 'range' && (
                <div className="w-full flex justify-end">
                  <select
                    value={monthlyFrontCumulativeDisplay}
                    onChange={(e) => setMonthlyFrontCumulativeDisplay(e.target.value as 'both' | 'full' | 'current')}
                    className="border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50"
                  >
                    <option value="both">월별 갑지 누계 표기: 둘 다</option>
                    <option value="full">월별 갑지 누계 표기: 기간 전체 누계</option>
                    <option value="current">월별 갑지 누계 표기: 해당 월 누계</option>
                  </select>
                </div>
              )}
            </div>

            {printRowsWithRunningTotal.length > 0 && (
              <div className="bg-white shadow-2xl max-w-[21cm] w-full mx-auto print:shadow-none print:max-w-none animate-in zoom-in-95 duration-300 origin-top rounded-sm print:break-after-page">
                <div className="p-[10mm] md:p-[15mm] h-full flex flex-col">
                  <div className="border-2 border-slate-900 p-1 flex-1">
                    <div className="border border-slate-600 h-full p-8">
                      <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center break-inside-avoid">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 기간 월별 사용금액 첨부 】</p>
                        <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {printPeriodLabel}</p>
                      </div>

                      {(() => {
                        const cols = [
                          { key: 'month', label: '월', always: true },
                          { key: 'labor', label: '유도원', always: false, show: showLaborCost },
                          { key: 'safety', label: '안전시설', always: false, show: showSafetyCost },
                          { key: 'material', label: '재료비', always: false, show: showSafetyItems && showSafetyCost },
                          { key: 'monthTotal', label: '월 사용액', always: true },
                          { key: 'running', label: '기간 누계', always: true },
                        ].filter(c => c.always || c.show);
                        const colStyle = { gridTemplateColumns: `repeat(${cols.length}, 1fr)` };
                        const cell = 'border-r border-slate-300 p-2 last:border-r-0';
                        const dataCell = 'border-r border-slate-200 p-2 last:border-r-0';
                        const getRowTotal = (row: typeof printRowsWithRunningTotal[number]) =>
                          (showLaborCost ? row.monthlyLaborCost : 0)
                          + (showSafetyCost ? row.monthlySafetyWorkerCost : 0)
                          + (showSafetyItems && showSafetyCost ? row.monthlyMaterialCost : 0);
                        const periodTotal =
                          (showLaborCost ? printPeriodLaborCost : 0)
                          + (showSafetyCost ? printPeriodSafetyWorkerCost : 0)
                          + (showSafetyItems && showSafetyCost ? printPeriodMaterialCost : 0);
                        return (
                          <div className="border border-slate-400 text-xs">
                            <div className="grid bg-slate-100 border-b border-slate-400 font-bold text-center" style={colStyle}>
                              {cols.map(c => <div key={c.key} className={cell}>{c.label}</div>)}
                            </div>
                            {printRowsWithRunningTotal.map(row => (
                              <div key={row.monthKey} className="grid border-b border-slate-200 text-center items-center" style={colStyle}>
                                {cols.map(c => {
                                  if (c.key === 'month') return <div key={c.key} className={`${dataCell} font-bold bg-slate-50`}>{row.monthKey}</div>;
                                  if (c.key === 'labor') return <div key={c.key} className={`${dataCell} text-right pr-2`}>{row.monthlyLaborCost.toLocaleString()}</div>;
                                  if (c.key === 'safety') return <div key={c.key} className={`${dataCell} text-right pr-2`}>{row.monthlySafetyWorkerCost.toLocaleString()}</div>;
                                  if (c.key === 'material') return <div key={c.key} className={`${dataCell} text-right pr-2`}>{row.monthlyMaterialCost.toLocaleString()}</div>;
                                  if (c.key === 'monthTotal') return <div key={c.key} className={`${dataCell} text-right pr-2 font-bold`}>{getRowTotal(row).toLocaleString()}</div>;
                                  if (c.key === 'running') return <div key={c.key} className={`${dataCell} text-right pr-2 font-bold text-indigo-700`}>{row.runningTotal.toLocaleString()}</div>;
                                  return null;
                                })}
                              </div>
                            ))}
                            <div className="grid bg-slate-100 font-bold border-t border-slate-400 text-center items-center" style={colStyle}>
                              {cols.map((c, i) => {
                                if (c.key === 'month') return <div key={c.key} className={cell} style={{ gridColumn: `1 / span ${cols.length - 2}` }}>기간 합계</div>;
                                if (c.key === 'monthTotal') return <div key={c.key} className={cell + ' text-right pr-2 text-indigo-900'}>{periodTotal.toLocaleString()}</div>;
                                if (c.key === 'running') return <div key={c.key} className={'p-2 text-right pr-2 text-indigo-900'}>{periodTotal.toLocaleString()}</div>;
                                return null;
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {printScopeMode === 'range' && printRowsWithRunningTotal.map(row => (
              <div key={`monthly-front-${row.monthKey}`} className="bg-white shadow-2xl min-h-[29.7cm] max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm print:break-after-page">
                <div className="p-[10mm] md:p-[15mm] h-full flex flex-col">
                  <div className="border-2 border-slate-900 p-1 flex-1">
                    <div className="border border-slate-600 h-full p-8 relative">
                      <div className="border-b-2 border-slate-900 pb-3 mb-8 text-center break-inside-avoid">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 월별 갑지 】</p>
                        <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {row.monthKey}</p>
                      </div>

                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                        <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
                        월별 안전관리비 사용 내역 요약
                      </h3>

                      <div className="border border-slate-400 text-sm">
                        <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 font-bold text-center">
                          <div className="col-span-1 border-r border-slate-300 p-2">번호</div>
                          <div className="col-span-5 border-r border-slate-300 p-2">구 분</div>
                          <div className="col-span-4 border-r border-slate-300 p-2">금 액 (원)</div>
                          <div className="col-span-2 p-2">비 고</div>
                        </div>
                        {showLaborCost && (
                        <div className="grid grid-cols-12 border-b border-slate-200 text-center items-center">
                          <div className="col-span-1 border-r border-slate-300 p-2 font-bold bg-slate-50">1</div>
                          <div className="col-span-5 border-r border-slate-300 p-2 text-left pl-3">유도원 및 감시자 인건비</div>
                          <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 font-bold">{row.monthlyLaborCost.toLocaleString()}</div>
                          <div className="col-span-2 p-2 text-xs text-slate-500">월 사용액</div>
                        </div>
                        )}
                        {showSafetyCost && (
                        <div className="grid grid-cols-12 border-b border-slate-200 text-center items-center">
                          <div className="col-span-1 border-r border-slate-300 p-2 font-bold bg-slate-50">{showLaborCost ? 2 : 1}</div>
                          <div className="col-span-5 border-r border-slate-300 p-2 text-left pl-3">안전시설 인건비/재료비</div>
                          <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 font-bold">{(row.monthlySafetyWorkerCost + row.monthlyMaterialCost).toLocaleString()}</div>
                          <div className="col-span-2 p-2 text-xs text-slate-500">월 사용액</div>
                        </div>
                        )}
                        <div className="grid grid-cols-12 bg-slate-100 font-bold border-t border-slate-400 text-center items-center">
                          <div className="col-span-6 border-r border-slate-300 p-2">월 합계</div>
                          <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 text-indigo-900">
                            {((showLaborCost ? row.monthlyLaborCost : 0) + (showSafetyCost ? row.monthlySafetyWorkerCost + row.monthlyMaterialCost : 0)).toLocaleString()}
                          </div>
                          <div className="col-span-2 p-2"></div>
                        </div>
                      </div>

                      <div className="mt-4 text-right text-sm font-bold text-indigo-800 space-y-1">
                        {(monthlyFrontCumulativeDisplay === 'both' || monthlyFrontCumulativeDisplay === 'full') && (
                          <div>
                            기간 전체 누계 ({printRangeFrom} ~ {printRangeTo}) : {printPeriodTotalCost.toLocaleString()} 원
                          </div>
                        )}
                        {(monthlyFrontCumulativeDisplay === 'both' || monthlyFrontCumulativeDisplay === 'current') && (
                          <div>
                            해당 월 누계 ({printRangeFrom} ~ {row.monthKey}) : {row.runningTotal.toLocaleString()} 원
                          </div>
                        )}
                      </div>

                      {/* 월별 근로자 세부 내역 */}
                      {showLaborCost && workers.length > 0 && (() => {
                        const { year: rowYear, month: rowMonth } = getYearMonthFromKey(row.monthKey);
                        return (
                          <div className="mt-6 border-t border-slate-300 pt-4">
                            <h4 className="text-base font-bold mb-2 text-slate-700">
                              유도원 및 감시자 세부 내역 ({row.monthKey})
                            </h4>
                            <LaborCostTable
                              workers={workers}
                              setWorkers={setWorkers}
                              attendance={attendance}
                              year={rowYear}
                              month={rowMonth}
                              readOnly
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ===== 갑지 1: 유도원 및 감시자 인건비 (Front Sheet – Page 1) ===== */}
            {showLaborCost && (
            <div className="bg-white shadow-2xl min-h-[29.7cm] max-w-[21cm] w-full mx-auto print:shadow-none print:max-w-none animate-in zoom-in-95 duration-300 origin-top rounded-sm print:break-after-page">
             <div className="p-[10mm] md:p-[15mm] h-full flex flex-col">
                <div className="border-2 border-slate-900 p-1 flex-1">
                  <div className="border border-slate-600 h-full p-8 relative">
                    
                    <ProjectHeader info={printProjectInfo} onChange={setProjectInfo} readOnly />
                    
                    {/* 유도원 및 감시자 인건비 요약 (갑지 1) */}
                    <div className="mb-8 break-inside-avoid">
                      <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                        <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
                        안전관리비 사용 내역 요약
                      </h3>
                      <div className="border border-slate-400 text-sm">
                        <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 font-bold text-center">
                          <div className="col-span-1 border-r border-slate-300 p-2">번호</div>
                          <div className="col-span-5 border-r border-slate-300 p-2">구 분</div>
                          <div className="col-span-4 border-r border-slate-300 p-2">금 액 (원)</div>
                          <div className="col-span-2 p-2">비 고</div>
                        </div>
                        <div className="grid grid-cols-12 border-b border-slate-200 text-center items-center">
                          <div className="col-span-1 border-r border-slate-300 p-2 font-bold bg-slate-50">1</div>
                          <div className="col-span-5 border-r border-slate-300 p-2 text-left pl-3">유도원 및 감시자 인건비</div>
                          <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 font-bold">{printPeriodLaborCost.toLocaleString()}</div>
                          <div className="col-span-2 p-2 text-xs text-slate-500">첨부 1 참조</div>
                        </div>
                        <div className="grid grid-cols-12 bg-slate-100 font-bold border-t border-slate-400 text-center items-center">
                          <div className="col-span-6 border-r border-slate-300 p-2">합 계</div>
                          <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 text-indigo-900">{printPeriodLaborCost.toLocaleString()}</div>
                          <div className="col-span-2 p-2"></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Signature Section – ends 갑지 1 */}
                    <div className="mt-12 text-center pt-6 print:mt-8 break-inside-avoid">
                      <p className="text-xl font-bold mb-8 tracking-wider font-serif">위와 같이 산업안전보건관리비(유도원 및 감시자 인건비) 사용내역을 청구합니다.</p>
                      <div className="flex flex-col items-end pr-8 gap-3">
                         <p className="text-lg font-serif font-bold mb-4">{formatDateToKorean(projectInfo.reportDate)}</p>
                         <div className="text-right space-y-3">
                           {/* Safety Manager Signature (작성자) */}
                           <div className="flex items-center justify-end gap-4">
                              <span className="font-bold text-lg font-serif">작 성 자 (안전팀장) :</span>
                              <div className="inline-flex items-center border-b-2 border-slate-900 h-16 min-w-[7rem] px-2 gap-1">
                                <span className="text-lg font-serif text-slate-900 whitespace-nowrap">{projectInfo.safetyManagerName}</span>
                                <span className="relative flex-shrink-0">
                                  <span className="text-lg font-serif text-slate-400">(인)</span>
                                  {projectInfo.safetyManagerSignature && (
                                    <img 
                                      src={projectInfo.safetyManagerSignature} 
                                      alt="safety_signature" 
                                      className="absolute top-1/2 left-1/2 h-14 w-auto origin-center pointer-events-none"
                                      style={{
                                          transform: `translate(-50%, -50%) rotate(${projectInfo.safetyManagerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.safetyManagerSignatureStyle?.offsetX || 0}px, ${projectInfo.safetyManagerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.safetyManagerSignatureStyle?.scale || 1.0})`,
                                          mixBlendMode: 'darken'
                                      }}
                                    />
                                  )}
                                </span>
                              </div>
                           </div>

                           {/* Manager Signature (청구인) */}
                           <div className="flex items-center justify-end gap-4">
                              <span className="font-bold text-lg font-serif">청 구 인 (현장소장) :</span>
                              <div className="inline-flex items-center border-b-2 border-slate-900 h-16 min-w-[7rem] px-2 gap-1">
                                <span className="text-lg font-serif text-slate-900 whitespace-nowrap">{projectInfo.managerName}</span>
                                <span className="relative flex-shrink-0">
                                  <span className="text-lg font-serif text-slate-400">(인)</span>
                                  {projectInfo.managerSignature && (
                                    <img 
                                      src={projectInfo.managerSignature} 
                                      alt="manager_signature" 
                                      className="absolute top-1/2 left-1/2 h-14 w-auto origin-center pointer-events-none"
                                      style={{
                                          transform: `translate(-50%, -50%) rotate(${projectInfo.managerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.managerSignatureStyle?.offsetX || 0}px, ${projectInfo.managerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.managerSignatureStyle?.scale || 1.0})`,
                                          mixBlendMode: 'darken'
                                      }}
                                    />
                                  )}
                                </span>
                              </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
            </div>
            )}

            {/* ===== 첨부 1: 유도원 및 감시자 인건비 제출 증빙 양식 (Attachment 1) ===== */}
            {showLaborCost && (
            <div className="bg-white shadow-2xl max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm print:break-after-page">
              <div className="p-[10mm] md:p-[15mm]">
                <div className="border-2 border-slate-900 p-1">
                  <div className="border border-slate-600 p-8">
                    <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center break-inside-avoid">
                      <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 첨 부 1 】</p>
                      <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {printPeriodLabel}</p>
                    </div>
                      <LaborCostTable
                      workers={workers}
                      setWorkers={setWorkers}
                      attendance={attendance}
                      year={printReferenceYear}
                      month={printReferenceMonth}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* ===== 갑지 2: 안전시설 인건비 (Front Sheet – Page 2) ===== */}
            {showSafetyCost && (
              <div className="bg-white shadow-2xl min-h-[29.7cm] max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm print:break-after-page">
               <div className="p-[10mm] md:p-[15mm] h-full flex flex-col">
                  <div className="border-2 border-slate-900 p-1 flex-1">
                    <div className="border border-slate-600 h-full p-8 relative">
                      
                      <ProjectHeader info={printProjectInfo} onChange={setProjectInfo} readOnly />
                      
                      {/* 안전시설 인건비 요약 (갑지 2) */}
                      <div className="mb-8 break-inside-avoid">
                        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
                          <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
                          안전관리비 사용 내역 요약
                        </h3>
                        <div className="border border-slate-400 text-sm">
                          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 font-bold text-center">
                            <div className="col-span-1 border-r border-slate-300 p-2">번호</div>
                            <div className="col-span-5 border-r border-slate-300 p-2">구 분</div>
                            <div className="col-span-4 border-r border-slate-300 p-2">금 액 (원)</div>
                            <div className="col-span-2 p-2">비 고</div>
                          </div>
                          <div className="grid grid-cols-12 border-b border-slate-200 text-center items-center">
                            <div className="col-span-1 border-r border-slate-300 p-2 font-bold bg-slate-50">1</div>
                            <div className="col-span-5 border-r border-slate-300 p-2 text-left pl-3">안전시설 인건비 (근로자)</div>
                            <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 font-bold">{printPeriodSafetyWorkerCost.toLocaleString()}</div>
                            <div className="col-span-2 p-2 text-xs text-slate-500">첨부 1 참조</div>
                          </div>
                          {showSafetyItems && (
                          <div className="grid grid-cols-12 border-b border-slate-200 text-center items-center">
                            <div className="col-span-1 border-r border-slate-300 p-2 font-bold bg-slate-50">2</div>
                            <div className="col-span-5 border-r border-slate-300 p-2 text-left pl-3">안전시설 재료비</div>
                            <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 font-bold">{printPeriodMaterialCost.toLocaleString()}</div>
                            <div className="col-span-2 p-2 text-xs text-slate-500">첨부 1 참조</div>
                          </div>
                          )}
                          <div className="grid grid-cols-12 bg-slate-100 font-bold border-t border-slate-400 text-center items-center">
                            <div className="col-span-6 border-r border-slate-300 p-2">합 계</div>
                            <div className="col-span-4 border-r border-slate-300 p-2 text-right pr-3 text-indigo-900">{(showSafetyItems ? printPeriodTotalCost : printPeriodSafetyWorkerCost).toLocaleString()}</div>
                            <div className="col-span-2 p-2"></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Signature Section – ends 갑지 2 */}
                      <div className="mt-12 text-center pt-6 print:mt-8 break-inside-avoid">
                        <p className="text-xl font-bold mb-8 tracking-wider font-serif">위와 같이 산업안전보건관리비(안전시설 인건비) 사용내역을 청구합니다.</p>
                        <div className="flex flex-col items-end pr-8 gap-3">
                           <p className="text-lg font-serif font-bold mb-4">{formatDateToKorean(projectInfo.reportDate)}</p>
                           <div className="text-right space-y-3">
                             {/* Safety Manager Signature (작성자) */}
                             <div className="flex items-center justify-end gap-4">
                                <span className="font-bold text-lg font-serif">작 성 자 (안전팀장) :</span>
                                <div className="inline-flex items-center border-b-2 border-slate-900 h-16 min-w-[7rem] px-2 gap-1">
                                  <span className="text-lg font-serif text-slate-900 whitespace-nowrap">{projectInfo.safetyManagerName}</span>
                                  <span className="relative flex-shrink-0">
                                    <span className="text-lg font-serif text-slate-400">(인)</span>
                                    {projectInfo.safetyManagerSignature && (
                                      <img 
                                        src={projectInfo.safetyManagerSignature} 
                                        alt="safety_signature" 
                                        className="absolute top-1/2 left-1/2 h-14 w-auto origin-center pointer-events-none"
                                        style={{
                                            transform: `translate(-50%, -50%) rotate(${projectInfo.safetyManagerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.safetyManagerSignatureStyle?.offsetX || 0}px, ${projectInfo.safetyManagerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.safetyManagerSignatureStyle?.scale || 1.0})`,
                                            mixBlendMode: 'darken'
                                        }}
                                      />
                                    )}
                                  </span>
                                </div>
                             </div>

                             {/* Manager Signature (청구인) */}
                             <div className="flex items-center justify-end gap-4">
                                <span className="font-bold text-lg font-serif">청 구 인 (현장소장) :</span>
                                <div className="inline-flex items-center border-b-2 border-slate-900 h-16 min-w-[7rem] px-2 gap-1">
                                  <span className="text-lg font-serif text-slate-900 whitespace-nowrap">{projectInfo.managerName}</span>
                                  <span className="relative flex-shrink-0">
                                    <span className="text-lg font-serif text-slate-400">(인)</span>
                                    {projectInfo.managerSignature && (
                                      <img 
                                        src={projectInfo.managerSignature} 
                                        alt="manager_signature" 
                                        className="absolute top-1/2 left-1/2 h-14 w-auto origin-center pointer-events-none"
                                        style={{
                                            transform: `translate(-50%, -50%) rotate(${projectInfo.managerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.managerSignatureStyle?.offsetX || 0}px, ${projectInfo.managerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.managerSignatureStyle?.scale || 1.0})`,
                                            mixBlendMode: 'darken'
                                        }}
                                      />
                                    )}
                                  </span>
                                </div>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
              </div>
            )}

            {/* ===== 첨부 1 (갑지 2 소속): 안전시설 인건비 집행 상세 내역 (Attachment) ===== */}
            {showSafetyCost && (
              <div className="bg-white shadow-2xl max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm print:break-after-page">
                <div className="p-[10mm] md:p-[15mm]">
                  <div className="border-2 border-slate-900 p-1">
                    <div className="border border-slate-600 p-8">
                      <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center break-inside-avoid">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 첨 부 1 】</p>
                        <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {printPeriodLabel}</p>
                      </div>
                      {safetyWorkers.length > 0 && (
                        <LaborCostTable
                          workers={safetyWorkers}
                          setWorkers={setSafetyWorkers}
                          attendance={safetyAttendance}
                          year={printReferenceYear}
                          month={printReferenceMonth}
                          reportTitle="안전시설 인건비 근로자 증빙 양식"
                          includeAllWorkersInReport
                          readOnly
                        />
                      )}
                      {showSafetyItems && (
                      <SafetyCostTable 
                        items={safetyItems}
                        setItems={setSafetyItems}
                        readOnly
                      />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== 첨부 2: 유도원 및 감시자 인건비 증빙 사진대지 (Attachment 2 – Labor) ===== */}
            {showLaborCost && (
            <div className="bg-white shadow-2xl max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm print:break-after-page">
              <div className="p-[10mm] md:p-[15mm]">
                <div className="border-2 border-slate-900 p-1">
                  <div className="border border-slate-600 p-8">
                    <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center break-inside-avoid">
                      <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 첨 부 2 】</p>
                      <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {printPeriodLabel}</p>
                    </div>
                    <PhotoLedger photos={laborPhotos} setPhotos={setLaborPhotos} readOnly title="2. 유도원 및 감시자 인건비 증빙 사진대지" />
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* ===== 첨부 2 (갑지 2 소속): 안전시설 인건비 증빙 사진대지 (Attachment 2 – Safety) ===== */}
            {showSafetyCost && (
              <div className="bg-white shadow-2xl max-w-[21cm] w-full mx-auto mt-8 print:shadow-none print:max-w-none print:mt-0 rounded-sm">
                <div className="p-[10mm] md:p-[15mm]">
                  <div className="border-2 border-slate-900 p-1">
                    <div className="border border-slate-600 p-8">
                      <div className="border-b-2 border-slate-900 pb-3 mb-6 text-center break-inside-avoid">
                        <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">【 첨 부 2 】</p>
                        <p className="text-sm text-slate-500">{projectInfo.siteName} &nbsp;|&nbsp; {printPeriodLabel}</p>
                      </div>
                      <PhotoLedger photos={safetyPhotos} setPhotos={setSafetyPhotos} readOnly title="2. 안전시설 인건비 증빙 사진대지" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {activeTab !== 'preview' && (
          <div className="text-center mt-12 py-8 border-t border-slate-200 text-slate-400 text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-2">
            <span>&copy; {new Date().getFullYear()} SafetyDoc Pro. All rights reserved. Construction Safety Management Solution.</span>
          </div>
        )}
      </main>

      <RestoreOptionsModal
        isOpen={restoreModalState !== null}
        fileName={restoreModalState?.fileName || ''}
        summary={restoreModalState?.summary || {
          siteName: '',
          workerCount: 0,
          laborAttendanceDays: 0,
          laborPhotoCount: 0,
          safetyWorkerCount: 0,
          safetyAttendanceDays: 0,
          safetyPhotoCount: 0,
          safetyItemCount: 0,
        }}
        selections={restoreModalState?.selections || {
          mode: 'overwrite',
          restoreLabor: false,
          restoreLaborAttendance: false,
          restoreLaborPhotos: false,
          restoreSafety: false,
          restoreSafetyAttendance: false,
          restoreSafetyPhotos: false,
        }}
        onChange={(next) => setRestoreModalState(prev => prev ? { ...prev, selections: next } : prev)}
        onClose={() => setRestoreModalState(null)}
        onConfirm={applyRestoreSelections}
      />
    </div>
  );
}

export default App;
