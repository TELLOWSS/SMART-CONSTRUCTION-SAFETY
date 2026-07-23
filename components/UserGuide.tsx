import React from 'react';
import { Layout, CalendarCheck, FileText, ArrowRight, CheckCircle2, UserPlus, Camera, Printer, BarChart3, HelpCircle, ArrowLeftRight, ShoppingCart, ToggleRight, Download, Sparkles, Layers, RotateCcw } from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 break-keep">
      
      {/* 1. Intro Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold mb-2 tracking-tight">세이프닥(SafetyDoc) 사용자 가이드</h2>
          <p className="text-indigo-100 opacity-95 text-lg leading-relaxed font-medium">
            원도급사 청구용 <b>산업안전보건관리비 사용내역서</b>를 간편하게 작성하세요.<br/>
            유도원 세분화 직종, 월간 사진 일괄 업로드 & 일자별 자동 매칭, 기성청구 집계표까지 한눈에 완성합니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/30 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>최신 버전: 유도원 세분화 공종(갱폼·지게차·펌프카 등) 지정 & 월간 사진 스마트 자동 매칭 지원</span>
          </div>
        </div>
        <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/20 shrink-0">
          <HelpCircle className="w-12 h-12 text-yellow-300" />
        </div>
      </div>

      {/* 2. Process Infographic (Flowchart) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>한눈에 보는 스마트 작업 흐름</span>
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>

          {/* Step 1 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
              <Layout className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">1. 기본 설정</h4>
            <p className="text-xs text-slate-500">현장 정보 등록 &<br/><b>유도원 직종 세분화</b> 설정</p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0 shrink-0" />

          {/* Step 2 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-green-100">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">2. 일일 출역 & 가변 지정</h4>
            <p className="text-xs text-slate-500">일자별 공수 체크 &<br/><b>일별 세분화 직종 변경</b></p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0 shrink-0" />

          {/* Step 3 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-purple-100">
              <Camera className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">3. 월간 사진 스마트 매칭</h4>
            <p className="text-xs text-slate-500">공종별 월간 사진 일괄 업로드<br/>& <b>출역일자 자동 매칭</b></p>
          </div>
          
          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0 shrink-0" />

          {/* Step 4 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-orange-100">
              <Printer className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">4. 보고서 자동 집계</h4>
            <p className="text-xs text-slate-500">기성청구 집계표 &<br/>증빙 사진대지 PDF 저장</p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Feature Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Subdivided Roles */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-700 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-800 mb-2">유도원 직종 세분화 & 일자별 가변 지정</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><b>'기본 설정' 탭</b>에서 유도원 직종을 <b>갱폼, 지게차, 펌프카, 스키드로더</b> 등으로 세분화 지정 가능합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><b>'일일 관리' 탭</b>에서 근로자가 1일에는 갱폼 유도, 2일에는 지게차 유도로 바뀌더라도 <b>일자별 직종 변경</b>이 지원됩니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>일자별로 지정된 세분화 직종은 월간 기성청구 집계표 및 세분화 현황표에 <b>자동 누계 합산</b>됩니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 2: Bulk Photo Upload & Smart Match */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="bg-purple-100 p-3 rounded-xl text-purple-700 shrink-0">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-800 mb-2">월간 사진 일괄 업로드 & 스마트 자동 매칭</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>세분화 공종별로 한 달 치 사진을 한번에 선택하여 <b>일괄 업로드</b>할 수 있습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>해당 월의 일일 근로자 출역 기록을 분석하여 사진 날짜를 <b>출역일자에 맞춰 자동 배정</b>해 줍니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><b>`[⚡ 월간 사진 전체 자동 매칭]`</b> 버튼으로 출역일과 사진 날짜를 언제든지 1초 만에 재동기화합니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 3: Photo Status Board & Missing Slot Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="bg-rose-100 p-3 rounded-xl text-rose-700 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-800 mb-2">사진 매칭 현황판 & 부족한 날짜 보완 (`+사진`)</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>공종별 출역일수 대비 증빙 사진 보유 상태를 🟢 완료 / 🔴 부족으로 <b>한눈에 파악</b>할 수 있습니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>사진이 부족한 날짜는 <b>`[+사진]`</b> 버튼을 눌러 해당 날짜와 공종이 자동 설정된 상태로 즉시 보완합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>항목별 사진대지가 서식에 맞춰 깔끔하게 자동 정렬되어 출력됩니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 4: Worker & Photo Transfer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="bg-amber-100 p-3 rounded-xl text-amber-700 shrink-0">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-800 mb-2">섹션 간 이동 기능</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>근로자 카드의 <b>이동 버튼</b>으로 유도원 ↔ 안전시설 섹션 간 이동이 가능합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>사진도 섹션 간 <b>전체 이동</b> 버튼으로 간편하게 재배치하세요.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>잘못 입력한 근로자나 사진을 쉽게 올바른 섹션으로 옮길 수 있습니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card 5 - Backup & Restore */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-100 p-3 rounded-xl text-emerald-700 shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-800 mb-2">데이터 백업 및 복구 (완벽 복원 지원)</h4>
              <ul className="text-sm text-slate-600 space-y-2 md:columns-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>우측 상단 <b>↓ 버튼</b>으로 모든 출역/사진/세분화 설정을 JSON 파일로 보관하세요.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span><b>↑ 버튼</b>으로 복원 후 설정을 변경해도 <b>화면 멈춤 없이 안전하게 동작</b>합니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>입력 중인 텍스트는 브라우저에 <b>자동 저장</b>되어 실수로 닫아도 복구됩니다.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>고용량 사진 데이터는 안전을 위해 <b>정기적으로 백업 파일 저장</b>을 권장합니다.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Data Accumulation Visualization (Chart) */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart3 className="w-32 h-32 text-indigo-400" />
        </div>
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>데이터 자동 누계 합산 원리</span>
        </h3>
        
        <div className="flex items-end justify-center gap-4 h-40">
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-20 bg-indigo-500/50 rounded-t-lg border border-indigo-400/50 flex items-center justify-center text-xs group-hover:bg-indigo-500 transition-colors">
              1일차 (갱폼)
            </div>
            <span className="text-xs text-slate-400">일일 기록</span>
          </div>
          <div className="pb-8 text-slate-500">+</div>
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-28 bg-purple-500/50 rounded-t-lg border border-purple-400/50 flex items-center justify-center text-xs group-hover:bg-purple-500 transition-colors">
              2일차 (지게차)
            </div>
            <span className="text-xs text-slate-400">일일 기록</span>
          </div>
          <div className="pb-8 text-slate-500">...</div>
          <div className="pb-8 text-white font-bold">=</div>
          <div className="flex flex-col items-center gap-2 group">
            <div className="w-28 h-36 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center font-bold text-shadow animate-pulse text-center text-xs leading-tight">
              월간 기성청구<br/>직종별 자동 집계
            </div>
            <span className="text-sm font-bold text-emerald-400">자동 완성</span>
          </div>
        </div>
        <p className="text-center text-slate-400 text-sm mt-4">
          매일 공수와 사진만 입력하면, 복잡한 세분화 직종별 월간 기성청구 집계표와 사진대지는 세이프닥이 알아서 완성합니다.
        </p>
      </div>

      {/* 5. New Features Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-200">
        <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
          <ToggleRight className="w-5 h-5" />
          <span>최신 업데이트 주요 기능 총정리</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
            <div className="text-emerald-700 font-bold text-sm mb-1.5">✅ 세분화 공종 사진 일괄 업로드</div>
            <p className="text-xs text-slate-600 leading-relaxed">월간 사진을 한 번에 올리면, 해당 월 근로자의 일자별 출역 기록에 맞게 날짜가 순차적으로 자동 매칭됩니다.</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
            <div className="text-emerald-700 font-bold text-sm mb-1.5">✅ 유도원 직종 세분화 & 가변지정</div>
            <p className="text-xs text-slate-600 leading-relaxed">갱폼, 지게차, 펌프카 등 세분화 직종을 일자별로 자유롭게 변경할 수 있으며, 기성청구 보고서에 자동 반영됩니다.</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs">
            <div className="text-emerald-700 font-bold text-sm mb-1.5">✅ 사진 매칭 상태판 & [+사진]</div>
            <p className="text-xs text-slate-600 leading-relaxed">공종별 매칭 상태(🟢/🔴)를 확인하고, 부족한 날짜에는 `[+사진]` 버튼으로 즉시 해당 날짜/공종에 보완 업로드할 수 있습니다.</p>
          </div>
        </div>
      </div>

    </div>
  );
};