import React, { useState } from 'react';
import { ProjectInfo, SignatureStyle } from '../types';
import { Building, Calendar, User, Briefcase, UserCheck, PenTool } from 'lucide-react';
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

  const generateRandomStyle = (): SignatureStyle => {
    return {
      rotation: Math.random() * 12 - 6, // -6 to 6 degrees
      offsetX: Math.random() * 20 - 10, // -10 to 10 px
      offsetY: Math.random() * 10 - 5,  // -5 to 5 px
      scale: 0.9 + Math.random() * 0.2  // 0.9 to 1.1
    };
  };

  const handleSignatureSave = (dataUrl: string) => {
    const style = generateRandomStyle();
    
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
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">공사명 (현장명)</label>
            <div className="flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
              <Building className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={info.siteName}
                onChange={(e) => handleChange('siteName', e.target.value)}
                className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                placeholder="예: OO아파트 신축공사"
              />
            </div>
          </div>

          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">사용 연월</label>
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
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">현장대리인 (청구인)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
                <User className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="text"
                  value={info.managerName}
                  onChange={(e) => handleChange('managerName', e.target.value)}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                  placeholder="김철수"
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
            </div>
          </div>

          {/* Safety Manager Input with Signature */}
          <div className="group">
            <label className="block text-xs font-semibold text-slate-500 mb-2 ml-1 uppercase tracking-wider">안전팀장 (확인자)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:border-transparent transition-all duration-200">
                <UserCheck className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="text"
                  value={info.safetyManagerName}
                  onChange={(e) => handleChange('safetyManagerName', e.target.value)}
                  className="bg-transparent w-full outline-none text-slate-800 font-medium placeholder-slate-400"
                  placeholder="이영희"
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
            </div>
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