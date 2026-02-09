
import React, { useState, useEffect, useRef } from 'react';
import { ProjectHeader } from './components/ProjectHeader';
import { LaborCostTable } from './components/LaborCostTable';
import { SafetyCostTable } from './components/SafetyCostTable';
import { PhotoLedger } from './components/PhotoLedger';
import { DailyLogManager } from './components/DailyLogManager';
import { GeminiAssistant } from './components/GeminiAssistant';
import { UserGuide } from './components/UserGuide';
import { ProjectInfo, Worker, PhotoEvidence, DailyAttendance, SafetyItem } from './types';
import { Printer, Layout, FileText, ShieldCheck, CalendarCheck, HelpCircle, BarChart3, ChevronRight, Clock, Download, Upload, RotateCcw, ShoppingCart, Loader2, Save } from 'lucide-react';

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

function App() {
  const [activeTab, setActiveTab] = useState<'setup' | 'daily' | 'preview' | 'guide'>('guide');
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(INITIAL_PROJECT_INFO);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [attendance, setAttendance] = useState<DailyAttendance>({});
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([]);
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState(false); // New state for backup loading
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (workers.length > 0 || photos.length > 0 || safetyItems.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard for Chrome/Firefox
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [workers, photos, safetyItems]);

  // --- Auto-Save & Restore Logic ---
  
  // 1. Auto-save text data to LocalStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only save if there is some data changed from initial
      if (
        projectInfo.siteName || 
        workers.length > 0 || 
        safetyItems.length > 0 || 
        Object.keys(attendance).length > 0
      ) {
        const draft = {
          projectInfo,
          workers,
          attendance,
          safetyItems,
          // Note: Photos are excluded because LocalStorage has 5MB limit and blob URLs are not persistent
          updatedAt: new Date().getTime()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
  }, [projectInfo, workers, attendance, safetyItems]);

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
                if (confirm('이전에 작성 중이던 내용이 발견되었습니다. 복구하시겠습니까?\n(주의: 사진 데이터는 브라우저 보안상 자동 저장되지 않습니다)')) {
                    setProjectInfo(parsed.projectInfo);
                    setWorkers(parsed.workers || []);
                    setAttendance(parsed.attendance || {});
                    setSafetyItems(parsed.safetyItems || []);
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

  const handlePrint = () => {
    setActiveTab('preview');
    // Allow React to render the preview view before printing
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // --- Backup & Restore Logic ---

  const handleBackup = async () => {
    // Check for empty data
    const hasData = projectInfo.siteName || workers.length > 0 || safetyItems.length > 0 || photos.length > 0;
    if (!hasData) {
        alert("저장할 데이터가 없습니다. 기본 설정이나 일일 관리를 먼저 작성해주세요.");
        return;
    }

    if (!confirm("현재 작성 중인 데이터를 파일로 저장하시겠습니까? (사진 용량에 따라 시간이 소요될 수 있습니다)")) return;

    setIsBackingUp(true);

    try {
      // Convert Blob URLs in photos to Base64 for persistent storage
      const photosWithBase64 = await Promise.all(photos.map(async (p) => {
        // If it's already a data URL (base64) or empty, return as is
        if (!p.fileUrl || p.fileUrl.startsWith('data:')) return p;
        
        // If it's a blob URL, fetch and convert
        try {
          const response = await fetch(p.fileUrl);
          const blob = await response.blob();
          return new Promise<PhotoEvidence>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                 resolve({ ...p, fileUrl: reader.result });
              } else {
                 // Should technically not happen with readAsDataURL but good for type safety
                 resolve({ ...p, fileUrl: '' });
              }
            };
            reader.onerror = () => {
              console.error(`Failed to read blob for photo ${p.id}`);
              resolve({ ...p, fileUrl: '' }); // Return empty url on read error
            };
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.error(`Image conversion failed for photo ${p.id}`, e);
          // Vital: Return empty string instead of original blob URL to avoid broken links on restore
          return { ...p, fileUrl: '' }; 
        }
      }));

      const backupData = {
        version: "1.1",
        date: new Date().toISOString(),
        data: {
          projectInfo,
          workers,
          attendance,
          safetyItems,
          photos: photosWithBase64
        }
      };

      // IMPROVED: Use Blob and URL.createObjectURL to handle large files
      const jsonString = JSON.stringify(backupData);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `세이프닥_백업_${projectInfo.siteName || '무제'}_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      
      // Cleanup
      downloadAnchorNode.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Backup failed", error);
      alert("백업 파일 생성 중 오류가 발생했습니다. 데이터 용량이 너무 크거나 브라우저 메모리가 부족할 수 있습니다.");
    } finally {
      setIsBackingUp(false);
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
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsed = JSON.parse(event.target.result as string);
            if (parsed.data) {
               if(confirm("기존 데이터가 덮어씌워집니다. 복구하시겠습니까?")) {
                  // Clean up existing blob URLs to prevent memory leaks before overwriting
                  photos.forEach(p => {
                    if (p.fileUrl && p.fileUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(p.fileUrl);
                    }
                  });

                  setProjectInfo(parsed.data.projectInfo || INITIAL_PROJECT_INFO);
                  setWorkers(parsed.data.workers || []);
                  setAttendance(parsed.data.attendance || {});
                  setSafetyItems(parsed.data.safetyItems || []);
                  setPhotos(parsed.data.photos || []);
                  alert("데이터가 성공적으로 복구되었습니다.");
               }
            } else {
              alert("올바르지 않은 백업 파일 형식입니다.");
            }
          }
        } catch (error) {
          console.error(error);
          alert("파일을 읽는 중 오류가 발생했습니다.");
        }
      };
    }
  };

  const handleReset = () => {
    if (confirm("모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      // Critical: Revoke all object URLs to free memory
      photos.forEach(p => {
        if (p.fileUrl && p.fileUrl.startsWith('blob:')) {
          URL.revokeObjectURL(p.fileUrl);
        }
      });

      setProjectInfo({
        ...INITIAL_PROJECT_INFO,
        reportDate: getLocalDateString()
      });
      setWorkers([]);
      setAttendance({});
      setSafetyItems([]);
      setPhotos([]);
      
      // Also clear local storage draft
      localStorage.removeItem(DRAFT_KEY);
      
      alert("초기화되었습니다.");
    }
  };

  // Calculate stats for dashboard
  const totalLaborCost = workers.reduce((acc, curr) => acc + (curr.daysWorked * curr.dailyRate), 0);
  const totalMaterialCost = safetyItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
  const totalCost = totalLaborCost + totalMaterialCost;
  const totalPhotos = photos.length;

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
              <GeminiAssistant projectInfo={projectInfo} workers={workers} safetyItems={safetyItems} photos={photos} />
              
              {/* Data Management Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className={`p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-md transition-all ${isBackingUp ? 'cursor-wait opacity-50' : ''}`}
                  title="데이터 파일 저장 (백업)"
                >
                  {isBackingUp ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600"/> : <Download className="w-4 h-4" />}
                </button>
                <button 
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
                <button 
                  onClick={handleReset}
                  className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white rounded-md transition-all"
                  title="초기화"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">PDF 저장</span>
              </button>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Modern Dashboard Stats (Show in Setup and Daily tabs) */}
        {(activeTab === 'setup' || activeTab === 'daily') && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 no-print animate-in slide-in-from-bottom-4 duration-500">
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
                <p className="text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">{totalLaborCost.toLocaleString()} <span className="text-sm text-slate-400 font-medium">원</span></p>
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
          </div>
        )}

        {/* Setup Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <ProjectHeader info={projectInfo} onChange={setProjectInfo} />
            <LaborCostTable workers={workers} setWorkers={setWorkers} />
            <SafetyCostTable items={safetyItems} setItems={setSafetyItems} />
            
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
            photos={photos}
            setPhotos={setPhotos}
          />
        )}

        {/* Guide Tab */}
        {activeTab === 'guide' && (
          <UserGuide />
        )}

        {/* Report Preview Tab */}
        {activeTab === 'preview' && (
          <div className="bg-white shadow-2xl min-h-[29.7cm] max-w-[21cm] mx-auto print:shadow-none print:w-full print:max-w-none animate-in zoom-in-95 duration-300 origin-top rounded-sm">
             {/* Report Mode View - Designed to look like paper */}
             <div className="p-[10mm] md:p-[15mm] h-full flex flex-col">
                <div className="border-2 border-slate-900 p-1 flex-1">
                  <div className="border border-slate-600 h-full p-8 relative">
                    
                    <ProjectHeader info={projectInfo} onChange={setProjectInfo} readOnly />
                    
                    {/* 1. Labor Cost Evidence */}
                    <LaborCostTable 
                      workers={workers} 
                      setWorkers={setWorkers} 
                      attendance={attendance}
                      year={projectInfo.year}
                      month={projectInfo.month}
                      readOnly 
                    />
                    
                    {/* 2. Safety Facility Material Cost Evidence */}
                    <SafetyCostTable 
                      items={safetyItems}
                      setItems={setSafetyItems}
                      readOnly
                    />

                    {/* 3. Photo Evidence */}
                    <PhotoLedger photos={photos} setPhotos={setPhotos} readOnly />
                    
                    <div className="mt-16 text-center pt-8 print:mt-12 break-inside-avoid">
                      <p className="text-xl font-bold mb-12 tracking-wider font-serif">위와 같이 산업안전보건관리비(인건비 및 안전시설비) 사용내역을 청구합니다.</p>
                      <div className="flex flex-col items-end pr-8 gap-4">
                         <p className="text-lg font-serif font-bold">{formatDateToKorean(projectInfo.reportDate)}</p>
                         <div className="text-right mt-6">
                           <div className="flex items-center justify-end gap-6 mb-3">
                              <span className="font-bold text-lg font-serif">청 구 인 (현장소장) :</span>
                              <div className="flex items-center gap-8 min-w-[180px] border-b border-slate-800 pb-1 justify-between px-2 relative overflow-visible">
                                <span className="text-lg font-serif relative z-20">{projectInfo.managerName}</span>
                                {projectInfo.managerSignature ? (
                                  <img 
                                    src={projectInfo.managerSignature} 
                                    alt="signature" 
                                    style={{
                                        transform: `rotate(${projectInfo.managerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.managerSignatureStyle?.offsetX || 0}px, ${projectInfo.managerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.managerSignatureStyle?.scale || 1})`,
                                        mixBlendMode: 'multiply'
                                    }}
                                    className="absolute right-2 bottom-1 max-h-16 max-w-[120px] w-auto z-10 origin-center pointer-events-none"
                                  />
                                ) : (
                                  <span className="text-sm text-slate-600 font-serif z-0">(인)</span>
                                )}
                              </div>
                           </div>
                           <div className="flex items-center justify-end gap-6">
                              <span className="font-bold text-lg font-serif">확 인 자 (안전팀장) :</span>
                              <div className="flex items-center gap-8 min-w-[180px] border-b border-slate-800 pb-1 justify-between px-2 relative overflow-visible">
                                <span className="text-lg font-serif relative z-20">{projectInfo.safetyManagerName}</span>
                                {projectInfo.safetyManagerSignature ? (
                                  <img 
                                    src={projectInfo.safetyManagerSignature} 
                                    alt="signature" 
                                    style={{
                                        transform: `rotate(${projectInfo.safetyManagerSignatureStyle?.rotation || 0}deg) translate(${projectInfo.safetyManagerSignatureStyle?.offsetX || 0}px, ${projectInfo.safetyManagerSignatureStyle?.offsetY || 0}px) scale(${projectInfo.safetyManagerSignatureStyle?.scale || 1})`,
                                        mixBlendMode: 'multiply'
                                    }}
                                    className="absolute right-2 bottom-1 max-h-16 max-w-[120px] w-auto z-10 origin-center pointer-events-none"
                                  />
                                ) : (
                                  <span className="text-sm text-slate-600 font-serif z-0">(인)</span>
                                )}
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

        {/* Footer */}
        {activeTab !== 'preview' && (
          <div className="text-center mt-12 py-8 border-t border-slate-200 text-slate-400 text-xs font-medium uppercase tracking-wide flex flex-col items-center gap-2">
            <span>&copy; {new Date().getFullYear()} SafetyDoc Pro. All rights reserved. Construction Safety Management Solution.</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
