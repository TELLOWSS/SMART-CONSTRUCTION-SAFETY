import React, { useState } from 'react';
import { ProjectInfo, SignatureStyle } from '../types';
import { Building, Calendar, User, Briefcase, UserCheck, PenTool, X } from 'lucide-react';
import { SignaturePad } from './SignaturePad';

interface Props {
  info: ProjectInfo;
  onChange: (info: ProjectInfo) => void;
  readOnly?: boolean;
}

export const ProjectHeader: React.FC<Props> = ({ info, onChange, readOnly = false }) => {
  const [activeSignatureField, setActiveSignatureField] = useState<'manager' | 'safety' | null>(null);

  const handleChange = (field: keyof ProjectInfo, value: any) => {
    onChange({ ...info, [field]: value });
  };

  const generateDefaultStyle = (): SignatureStyle => {
    return {
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      scale: 1
    };
  };

  const getSignatureStyle = (field: 'manager' | 'safety'): SignatureStyle => {
    if (field === 'manager') {
      return info.managerSignatureStyle || generateDefaultStyle();
    }
    return info.safetyManagerSignatureStyle || generateDefaultStyle();
  };

  const updateSignatureStyle = (field: 'manager' | 'safety', patch: Partial<SignatureStyle>) => {
    if (field === 'manager') {
      onChange({
        ...info,
        managerSignatureStyle: { ...getSignatureStyle('manager'), ...patch }
      });
      return;
    }

    onChange({
      ...info,
      safetyManagerSignatureStyle: { ...getSignatureStyle('safety'), ...patch }
    });
  };

  const handleSignatureSave = (dataUrl: string) => {
    const style = generateDefaultStyle();
    
    if (activeSignatureField === 'manager') {
      onChange({
        ...info,
        managerSignature: dataUrl,
        managerSignatureStyle: style
      });
    } else if (activeSignatureField === 'safety') {
      onChange({
        ...info,
        safetyManagerSignature: dataUrl,
        safetyManagerSignatureStyle: style
      });
    }
    setActiveSignatureField(null);
  };

  const handleClearSignature = (field: 'manager' | 'safety') => {
    if (field === 'manager') {
      onChange({ ...info, managerSignature: undefined, managerSignatureStyle: undefined });
    } else {
      onChange({ ...info, safetyManagerSignature: undefined, safetyManagerSignatureStyle: undefined });
    }
  };

  if (readOnly) {
    return (
      <div className="border-b-2 border-slate-900 pb-6 mb-8 text-center break-inside-avoid">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2 font-serif tracking-tight">산업안전보건관리비 사용내역서</h1>
        <p className="text-slate-500 text-sm mb-8 tracking-wide uppercase font-medium">Statement of Industrial Safety and Health Management Expenses</p>
        
        <div className="grid grid-cols-2 gap-0 border border-slate-300 text-sm">
           <div className="p-3 border-r border-b border-slate-300 bg-slate-50 font-bold text-slate-600 text-center flex items-center justify-center">공 사 명</div>
           <div className="p-3 border-b border-slate-300 font-medium text-slate-900 pl-4 text-left">{info.siteName}</div>
           
           <div className="p-3 border-r border-b border-slate-300 bg-slate-50 font-bold text-slate-600 text-center flex items-center justify-center">사용 연월</div>
           <div className="p-3 border-b border-slate-300 font-medium text-slate-900 pl-4 text-left">{info.year}년 {info.month}월</div>

           <div className="p-3 border-r border-slate-300 bg-slate-50 font-bold text-slate-600 text-center flex items-center justify-center">수급인 (상호)</div>
           <div className="p-3 border-slate-300 font-medium text-slate-900 pl-4 text-left">{info.companyName}</div>

           <div className="p-3 border-r border-l border-slate-300 bg-slate-50 font-bold text-slate-600 text-center flex items-center justify-center">현장대리인</div>
           <div className="p-3 border-slate-300 font-medium text-slate-900 pl-4 text-left">{info.managerName}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 no-print transition-all hover:shadow-md">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <Briefcase className="w-5 h-5" />
          </div>
          공사 개요 및 결재 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">공사명 <span className="text-red-500 font-bold">*</span></label>
            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
              <Building className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={info.siteName}
                onChange={(e) => handleChange('siteName', e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                placeholder="예: OO아파트 신축공사"
                required
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">사용 연월 <span className="text-red-500 font-bold">*</span></label>
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 flex-1 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all">
                <Calendar className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="number"
                  value={info.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium"
                />
                <span className="text-sm text-slate-500 font-bold">년</span>
              </div>
              <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 w-28 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all">
                <input
                  type="number"
                  value={info.month}
                  onChange={(e) => handleChange('month', parseInt(e.target.value))}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium"
                  min={1} max={12}
                />
                <span className="text-sm text-slate-500 font-bold">월</span>
              </div>
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">업체명 (수급인)</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
              <Building className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={info.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                placeholder="(주)세이프건설"
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">보고서 작성일 (제출일)</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
              <Calendar className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="date"
                value={info.reportDate}
                onChange={(e) => handleChange('reportDate', e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-medium text-sm"
              />
            </div>
          </div>

          {/* Manager Input with Signature */}
          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">현장대리인 <span className="text-red-500 font-bold">*</span></label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
                <User className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="text"
                  value={info.managerName}
                  onChange={(e) => handleChange('managerName', e.target.value)}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                  placeholder="김철수"
                  required
                />
              </div>
              <button 
                onClick={() => setActiveSignatureField('manager')}
                className={`flex items-center justify-center px-3 rounded-xl border transition-all ${info.managerSignature ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                title={info.managerSignature ? "서명 수정" : "서명 등록"}
              >
                 {info.managerSignature ? (
                   <img src={info.managerSignature} alt="sig" className="h-6 w-auto mix-blend-multiply" />
                 ) : (
                   <PenTool className="w-5 h-5" />
                 )}
              </button>
              {info.managerSignature && (
                <button
                  onClick={() => handleClearSignature('manager')}
                  className="flex items-center justify-center px-2 rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                  title="서명 초기화"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {info.managerSignature && (
              <div className="mt-3 p-3 border border-indigo-100 rounded-xl bg-indigo-50/50 space-y-2">
                <div className="text-[11px] font-bold text-indigo-700">서명 위치/크기 조정</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="text-slate-600">크기 ({getSignatureStyle('manager').scale.toFixed(2)}x)
                    <input type="range" min="0.6" max="1.8" step="0.05" value={getSignatureStyle('manager').scale} onChange={(e) => updateSignatureStyle('manager', { scale: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">회전 ({Math.round(getSignatureStyle('manager').rotation)}°)
                    <input type="range" min="-20" max="20" step="1" value={getSignatureStyle('manager').rotation} onChange={(e) => updateSignatureStyle('manager', { rotation: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">좌우 ({Math.round(getSignatureStyle('manager').offsetX)}px)
                    <input type="range" min="-40" max="40" step="1" value={getSignatureStyle('manager').offsetX} onChange={(e) => updateSignatureStyle('manager', { offsetX: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">상하 ({Math.round(getSignatureStyle('manager').offsetY)}px)
                    <input type="range" min="-40" max="40" step="1" value={getSignatureStyle('manager').offsetY} onChange={(e) => updateSignatureStyle('manager', { offsetY: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Safety Manager Input with Signature */}
          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">안전팀장 <span className="text-red-500 font-bold">*</span></label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
                <UserCheck className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="text"
                  value={info.safetyManagerName}
                  onChange={(e) => handleChange('safetyManagerName', e.target.value)}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                  placeholder="이영희"
                  required
                />
              </div>
              <button 
                onClick={() => setActiveSignatureField('safety')}
                className={`flex items-center justify-center px-3 rounded-xl border transition-all ${info.safetyManagerSignature ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600'}`}
                 title={info.safetyManagerSignature ? "서명 수정" : "서명 등록"}
              >
                 {info.safetyManagerSignature ? (
                   <img src={info.safetyManagerSignature} alt="sig" className="h-6 w-auto mix-blend-multiply" />
                 ) : (
                   <PenTool className="w-5 h-5" />
                 )}
              </button>
              {info.safetyManagerSignature && (
                <button
                  onClick={() => handleClearSignature('safety')}
                  className="flex items-center justify-center px-2 rounded-xl border border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                  title="서명 초기화"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {info.safetyManagerSignature && (
              <div className="mt-3 p-3 border border-indigo-100 rounded-xl bg-indigo-50/50 space-y-2">
                <div className="text-[11px] font-bold text-indigo-700">서명 위치/크기 조정</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="text-slate-600">크기 ({getSignatureStyle('safety').scale.toFixed(2)}x)
                    <input type="range" min="0.6" max="1.8" step="0.05" value={getSignatureStyle('safety').scale} onChange={(e) => updateSignatureStyle('safety', { scale: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">회전 ({Math.round(getSignatureStyle('safety').rotation)}°)
                    <input type="range" min="-20" max="20" step="1" value={getSignatureStyle('safety').rotation} onChange={(e) => updateSignatureStyle('safety', { rotation: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">좌우 ({Math.round(getSignatureStyle('safety').offsetX)}px)
                    <input type="range" min="-40" max="40" step="1" value={getSignatureStyle('safety').offsetX} onChange={(e) => updateSignatureStyle('safety', { offsetX: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                  <label className="text-slate-600">상하 ({Math.round(getSignatureStyle('safety').offsetY)}px)
                    <input type="range" min="-40" max="40" step="1" value={getSignatureStyle('safety').offsetY} onChange={(e) => updateSignatureStyle('safety', { offsetY: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SignaturePad 
        isOpen={activeSignatureField !== null}
        onClose={() => setActiveSignatureField(null)}
        onSave={handleSignatureSave}
        title={activeSignatureField === 'manager' ? '현장대리인 서명' : '안전팀장 서명'}
      />
    </>
  );
};