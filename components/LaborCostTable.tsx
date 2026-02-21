
import React, { useState } from 'react';
import { Worker, WORKER_ROLES, DailyAttendance } from '../types';
import { Plus, Trash2, Users, AlertCircle, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  workers: Worker[];
  setWorkers: React.Dispatch<React.SetStateAction<Worker[]>>;
  attendance?: DailyAttendance; // Added for report view
  year?: number; // Added for report view
  month?: number; // Added for report view
  readOnly?: boolean;
}

export const LaborCostTable: React.FC<Props> = ({ workers, setWorkers, attendance = {}, year = new Date().getFullYear(), month = new Date().getMonth() + 1, readOnly = false }) => {
  // For expanding detailed input in edit mode
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);

  const addWorker = () => {
    const newWorker: Worker = {
      id: crypto.randomUUID(),
      name: '',
      role: WORKER_ROLES[0],
      daysWorked: 0,
      dailyRate: 0,
      bankAccountOwner: true,
      notes: '',
      rrn: '',
      address: ''
    };
    setWorkers([...workers, newWorker]);
    setExpandedWorkerId(newWorker.id);
  };

  const updateWorker = (id: string, field: keyof Worker, value: any) => {
    setWorkers(workers.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const removeWorker = (id: string) => {
    setWorkers(workers.filter(w => w.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpandedWorkerId(expandedWorkerId === id ? null : id);
  };

  const totalCost = workers.reduce((acc, curr) => acc + (curr.daysWorked * curr.dailyRate), 0);

  // Helper to generate days array for the report grid
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Helper to check attendance for a specific day
  const getDailyValue = (workerId: string, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return attendance[dateStr]?.[workerId];
  };

  if (readOnly) {
    // Filter workers to show only those with attendance in the report month
    const workersWithAttendance = workers.filter(worker => {
      // Check if worker has any attendance in this month using Array.some() for better readability
      return daysArray.some(day => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const value = attendance[dateStr]?.[worker.id];
        return value && value > 0;
      });
    });

    const hiddenWorkersCount = workers.length - workersWithAttendance.length;

    return (
      <div className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
          1. 유도원 및 감시자 인건비 제출 증빙 양식
        </h3>
        
        {hiddenWorkersCount > 0 && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
            <span>ℹ️</span>
            <span>출역 기록이 없는 근로자 {hiddenWorkersCount}명은 보고서에서 제외되었습니다.</span>
          </div>
        )}
        
        <div className="space-y-4">
          {workersWithAttendance.map((worker, index) => {
             const totalPay = worker.daysWorked * worker.dailyRate;
             const netPay = totalPay; 

             return (
              <div key={worker.id} className="border border-slate-400 text-[10px] break-inside-avoid">
                {/* Header Row: Basic Info */}
                <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400">
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold">성명</div>
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-center bg-white whitespace-nowrap overflow-hidden text-ellipsis">{worker.name}</div>
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-center font-bold">주민등록번호</div>
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-center bg-white">{worker.rrn || '-'}</div>
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold">주소</div>
                  <div className="col-span-4 p-1.5 bg-white text-left px-2 truncate">{worker.address || '-'}</div>
                </div>

                {/* Grid Row: 1-31 Days */}
                <div className="flex border-b border-slate-400">
                  <div className="w-16 shrink-0 border-r border-slate-300 p-1 flex items-center justify-center bg-slate-50 font-bold text-center leading-tight">
                    출력<br/>현황
                  </div>
                  <div className="flex-1 grid grid-cols-[repeat(31,minmax(0,1fr))] text-center">
                    {daysArray.map(day => {
                       const val = getDailyValue(worker.id, day);
                       return (
                        <div key={day} className="border-r border-slate-200 last:border-r-0">
                          <div className="bg-slate-50 border-b border-slate-200 text-[7px] h-4 flex items-center justify-center text-slate-500">{day}</div>
                          <div className="h-6 flex items-center justify-center font-bold text-slate-800 text-[9px] tracking-tighter">
                            {val === 1 ? '1' : val === 0.5 ? '0.5' : ''}
                          </div>
                        </div>
                       );
                    })}
                    {/* Fill remaining empty cells if month < 31 days */}
                    {Array.from({ length: 31 - daysInMonth }).map((_, i) => (
                      <div key={`empty-${i}`} className="border-r border-slate-200 bg-slate-100/50 last:border-r-0"></div>
                    ))}
                  </div>
                </div>

                {/* Footer Row: Financials */}
                <div className="grid grid-cols-12 bg-white">
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50">직종</div>
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">{worker.role}</div>
                  
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50">출력공수</div>
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold">{worker.daysWorked}</div>
                  
                  <div className="col-span-1 border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50">노무비단가</div>
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-right px-2">{worker.dailyRate.toLocaleString()}</div>
                  
                  <div className="col-span-2 border-r border-slate-300 p-1.5 text-center font-bold bg-slate-50">노무비총액</div>
                  <div className="col-span-2 p-1.5 text-right px-2 font-bold text-slate-900">{totalPay.toLocaleString()}</div>
                </div>
              </div>
            );
          })}
          
          {workersWithAttendance.length === 0 && (
             <div className="border border-slate-400 p-8 text-center text-slate-400 italic bg-slate-50">
               등록된 근로자 내역이 없습니다.
             </div>
          )}

          {/* Grand Total */}
          <div className="border border-slate-400 bg-slate-100 p-2 flex justify-between items-center font-bold text-sm">
            <span>총 인건비 지급 합계 (Total)</span>
            <span className="text-indigo-800 text-lg">{totalCost.toLocaleString()} 원</span>
          </div>
        </div>
        
        <div className="mt-3 text-[11px] text-slate-600 flex items-start gap-1.5 leading-relaxed text-justify">
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>본 내역서는 <strong>고용노동부 고시 「건설업 산업안전보건관리비 계상 및 사용기준」 제7조(사용기준)</strong>에 의거하여, 실제 안전보건 업무(유도원, 신호수, 화재감시자 등)를 전담 수행한 근로자의 인건비로 적법하게 집행되었음을 확인하며 이를 청구합니다.</span>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 no-print hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
             <Users className="w-5 h-5" />
          </div>
          유도원 및 감시자 인건비 산출 정보
        </h2>
        <button
          onClick={addWorker}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" />
          근로자 추가
        </button>
      </div>

      <div className="space-y-4">
        {workers.map(worker => (
          <div key={worker.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-all hover:border-indigo-200">
            {/* Primary Row */}
            <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center bg-slate-50/50">
               <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">성명</label>
                    <input
                      type="text"
                      value={worker.name}
                      onChange={(e) => updateWorker(worker.id, 'name', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 outline-none bg-white"
                      placeholder="홍길동"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">직종 (안전보건)</label>
                    <select
                      value={worker.role}
                      onChange={(e) => updateWorker(worker.id, 'role', e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
                    >
                      {WORKER_ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">일 단가</label>
                     <input
                      type="number"
                      value={worker.dailyRate}
                      onChange={(e) => updateWorker(worker.id, 'dailyRate', Number(e.target.value))}
                      // Prevent scroll from changing value
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right font-mono focus:border-indigo-500 outline-none bg-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                     <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">출력공수 (자동)</label>
                     <div className="w-full border border-slate-100 bg-slate-100 rounded-lg px-3 py-2 text-sm text-right font-mono text-slate-500">
                        {worker.daysWorked}
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                  <div className="text-right mr-2 hidden md:block">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">지급 총액</span>
                    <span className="font-bold text-indigo-700">{(worker.daysWorked * worker.dailyRate).toLocaleString()} 원</span>
                  </div>
                  <button
                    onClick={() => toggleExpand(worker.id)}
                    className={`p-2 rounded-lg transition-colors ${expandedWorkerId === worker.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="상세 정보 입력"
                  >
                    {expandedWorkerId === worker.id ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                  </button>
                  <button
                    onClick={() => removeWorker(worker.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {/* Expanded Details Row */}
            {expandedWorkerId === worker.id && (
              <div className="p-4 bg-white border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                 <h4 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-2">
                   <AlertCircle className="w-3 h-3" />
                   지급명세서용 상세 정보 (주민번호/주소 등)
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">주민등록번호</label>
                      <input
                        type="text"
                        value={worker.rrn}
                        onChange={(e) => updateWorker(worker.id, 'rrn', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-slate-300"
                        placeholder="000000-0000000"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 mb-1 block">거주지 주소</label>
                      <input
                        type="text"
                        value={worker.address}
                        onChange={(e) => updateWorker(worker.id, 'address', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-slate-300"
                        placeholder="서울시 ..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 mb-1 block">비고 (계좌정보 등)</label>
                      <input
                        type="text"
                        value={worker.notes}
                        onChange={(e) => updateWorker(worker.id, 'notes', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 placeholder-slate-300"
                        placeholder="특이사항 입력"
                      />
                    </div>
                 </div>
              </div>
            )}
          </div>
        ))}

        {workers.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <p className="font-medium">등록된 근로자가 없습니다.</p>
             <p className="text-xs mt-1">'근로자 추가' 버튼을 눌러 인원을 등록하세요.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end items-center gap-3 border-t border-slate-100 pt-4">
         <span className="text-sm font-bold text-slate-500">총 인건비 예상액</span>
         <span className="text-2xl font-extrabold text-indigo-700">{totalCost.toLocaleString()} 원</span>
      </div>
    </div>
  );
};
