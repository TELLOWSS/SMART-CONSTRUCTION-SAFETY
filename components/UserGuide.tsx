import React from 'react';
import { Layout, CalendarCheck, FileText, ArrowRight, CheckCircle2, UserPlus, Camera, Printer, BarChart3, HelpCircle, ArrowLeftRight, ShoppingCart, ToggleRight, Download } from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Intro Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold mb-2">세이프닥(SafetyDoc) 시작하기</h2>
          <p className="text-indigo-100 opacity-90 text-lg">
            원도급사 청구용 <b>산업안전보건관리비 사용내역서</b>를 간편하게 작성하세요.<br/>
            복잡한 인건비 상세내역과 증빙 사진대지를 법적 기준에 맞춰 자동으로 완성합니다.
          </p>
          <div className="mt-3 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30">
            ✨ 최신 버전: 재료비 내역 포함/불포함 기능, 섹션별 이동 기능 추가
          </div>
        </div>
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
          <HelpCircle className="w-12 h-12 text-yellow-300" />
        </div>
      </div>

      {/* 2. Process Infographic (Flowchart) */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          한눈에 보는 작업 흐름
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 transform -translate-y-1/2"></div>

          {/* Step 1 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-blue-100">
              <Layout className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">1. 기본 설정</h4>
            <p className="text-xs text-slate-500">현장 정보 및<br/>근로자 명단 등록</p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0" />

          {/* Step 2 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-green-100">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">2. 일일 기록</h4>
            <p className="text-xs text-slate-500">매일 공수 체크 &<br/>안전 조치 사진</p>
          </div>

          <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0" />

          {/* Step 3 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-purple-100">
              <FileText className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">3. 자동 합산</h4>
            <p className="text-xs text-slate-500">지급명세서 자동 생성<br/>(상세 출역표 포함)</p>
          </div>
          
           <ArrowRight className="text-slate-300 w-6 h-6 rotate-90 md:rotate-0" />

          {/* Step 4 */}
          <div className="bg-white p-4 flex flex-col items-center text-center z-10 w-full md:w-1/4">
            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-orange-100">
              <Printer className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 mb-1">4. 출력/제출</h4>
            <p className="text-xs text-slate-500">A4 서식 PDF 저장<br/>원도급사 제출용</p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Guide with Visuals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-start gap-4">
             <div className="bg-indigo-100 p-3 rounded-lg text-indigo-700">
               <UserPlus className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-slate-800 mb-2">법적 증빙 인건비 관리</h4>
               <ul className="text-sm text-slate-600 space-y-2">
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span><b>'기본 설정' 탭</b>에서 주민번호/주소를 입력하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span><b>상세 일별 출역표(1~31일)</b>가 자동으로 생성됩니다.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>고용노동부 고시 기준에 맞춘 양식으로 출력됩니다.</span>
                 </li>
               </ul>
             </div>
           </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-start gap-4">
             <div className="bg-rose-100 p-3 rounded-lg text-rose-700">
               <Camera className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-slate-800 mb-2">안전보건관리비 증빙 사진</h4>
               <ul className="text-sm text-slate-600 space-y-2">
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span><b>안전시설 설치/보수, 교육 사진</b>을 매일 기록하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>사진마다 구체적인 공종과 작업내용을 입력하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>항목별 사진대지가 자동으로 정렬되어 출력됩니다.</span>
                 </li>
               </ul>
             </div>
           </div>
        </div>

        {/* Card 3 - Worker Transfer */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-start gap-4">
             <div className="bg-amber-100 p-3 rounded-lg text-amber-700">
               <ArrowLeftRight className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-slate-800 mb-2">섹션 간 이동 기능</h4>
               <ul className="text-sm text-slate-600 space-y-2">
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>근로자 카드의 <b>이동 버튼</b>으로 유도원 ↔ 안전시설 섹션 간 이동이 가능합니다.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>사진도 섹션 간 <b>전체 이동</b> 버튼으로 간편하게 재배치하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>잘못 입력한 근로자나 사진을 쉽게 올바른 섹션으로 옮길 수 있습니다.</span>
                 </li>
               </ul>
             </div>
           </div>
        </div>

        {/* Card 4 - Materials Toggle */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
           <div className="flex items-start gap-4">
             <div className="bg-orange-100 p-3 rounded-lg text-orange-700">
               <ShoppingCart className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-slate-800 mb-2">안전시설 재료비 내역 관리</h4>
               <ul className="text-sm text-slate-600 space-y-2">
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span><b>'기본 설정' 탭</b>의 <b>'안전시설 재료비 내역'</b> 섹션에서 구매 품목을 등록하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>보고서 탭에서 <b>'안전시설 재료비 내역(품목) 포함'</b> 체크박스로 출력 포함 여부를 선택하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>재료비를 포함하지 않을 경우 인건비 합계만으로 보고서가 구성됩니다.</span>
                 </li>
               </ul>
             </div>
           </div>
        </div>

        {/* Card 5 - Backup & Restore */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
           <div className="flex items-start gap-4">
             <div className="bg-emerald-100 p-3 rounded-lg text-emerald-700">
               <Download className="w-6 h-6" />
             </div>
             <div>
               <h4 className="font-bold text-lg text-slate-800 mb-2">데이터 백업 및 복구</h4>
               <ul className="text-sm text-slate-600 space-y-2 md:columns-2">
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>우측 상단 <b>↓ 버튼</b>으로 모든 데이터를 JSON 파일로 저장하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span><b>↑ 버튼</b>으로 저장된 파일을 불러와 이전 작업을 이어서 진행하세요.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>텍스트 데이터는 브라우저에 <b>자동 임시 저장</b>되어 새로고침 시 복구됩니다.</span>
                 </li>
                 <li className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                   <span>사진은 용량이 크므로 <b>반드시 백업 파일로 저장</b>하세요.</span>
                 </li>
               </ul>
             </div>
           </div>
        </div>

      </div>

      {/* 4. Data Accumulation Visualization (Chart) */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BarChart3 className="w-32 h-32" />
        </div>
        <h3 className="text-xl font-bold mb-6">데이터 자동 합산 원리</h3>
        
        <div className="flex items-end justify-center gap-4 h-40">
           {/* Bar 1 */}
           <div className="flex flex-col items-center gap-2 group">
             <div className="w-16 h-20 bg-indigo-500/50 rounded-t-lg border border-indigo-400/50 flex items-center justify-center text-xs group-hover:bg-indigo-500 transition-colors">
               1일차
             </div>
             <span className="text-xs text-slate-400">일일 기록</span>
           </div>
           <div className="pb-8 text-slate-500">+</div>
           {/* Bar 2 */}
           <div className="flex flex-col items-center gap-2 group">
             <div className="w-16 h-28 bg-indigo-500/50 rounded-t-lg border border-indigo-400/50 flex items-center justify-center text-xs group-hover:bg-indigo-500 transition-colors">
               2일차
             </div>
             <span className="text-xs text-slate-400">일일 기록</span>
           </div>
           <div className="pb-8 text-slate-500">...</div>
           <div className="pb-8 text-white font-bold">=</div>
           {/* Total Bar */}
           <div className="flex flex-col items-center gap-2 group">
             <div className="w-24 h-36 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center justify-center font-bold text-shadow animate-pulse">
               월간 합계
             </div>
             <span className="text-sm font-bold text-emerald-400">자동 완성</span>
           </div>
        </div>
        <p className="text-center text-slate-400 text-sm mt-4">
          매일 공수와 사진만 입력하면, 복잡한 산업안전보건관리비 정산 내역서와 사진대지는 세이프닥이 알아서 처리합니다.
        </p>
      </div>

      {/* 5. New Features Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
        <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
          <ToggleRight className="w-5 h-5" />
          최신 업데이트 기능 요약
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
            <div className="text-emerald-600 font-bold text-sm mb-1">✅ 재료비 내역 포함/불포함</div>
            <p className="text-xs text-slate-600">보고서 출력 시 '안전시설 재료비 내역(품목) 포함' 체크박스로 품목사항을 선택적으로 포함할 수 있습니다.</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
            <div className="text-emerald-600 font-bold text-sm mb-1">✅ 섹션 간 근로자/사진 이동</div>
            <p className="text-xs text-slate-600">유도원/감시자 ↔ 안전시설 인건비 섹션 간 근로자와 사진을 자유롭게 이동할 수 있습니다.</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm">
            <div className="text-emerald-600 font-bold text-sm mb-1">✅ 안전시설 재료비 내역 분리</div>
            <p className="text-xs text-slate-600">'기본 설정' 탭에서 안전시설 재료비 내역이 인건비 섹션과 명확히 분리되어 관리됩니다.</p>
          </div>
        </div>
      </div>

    </div>
  );
};