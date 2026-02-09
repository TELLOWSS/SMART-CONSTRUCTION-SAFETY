import React, { useState } from 'react';
import { ProjectInfo, Worker, PhotoEvidence, SafetyItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Loader2, FileText, Wand2 } from 'lucide-react';

interface Props {
  projectInfo: ProjectInfo;
  workers: Worker[];
  safetyItems: SafetyItem[];
  photos: PhotoEvidence[];
}

export const GeminiAssistant: React.FC<Props> = ({ projectInfo, workers, safetyItems, photos }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [showModal, setShowModal] = useState(false);

  const generateReport = async () => {
    if (!process.env.API_KEY) {
      alert("API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.");
      return;
    }

    setLoading(true);
    setShowModal(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const totalLaborCost = workers.reduce((acc, curr) => acc + (curr.daysWorked * curr.dailyRate), 0);
      const totalMaterialCost = safetyItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
      
      const workerSummary = workers.map(w => `- ${w.name} (${w.role}): ${w.daysWorked} 공수`).join('\n');
      const itemSummary = safetyItems.map(i => `- ${i.name} (${i.quantity}${i.unit}): ${i.quantity * i.unitPrice}원`).join('\n');
      
      // Group photos by category for better summarization
      const photoGroups = photos.reduce((acc, photo) => {
        if (!acc[photo.category]) {
          acc[photo.category] = { count: 0, descriptions: [] };
        }
        acc[photo.category].count++;
        if (photo.description) {
           acc[photo.category].descriptions.push(photo.description);
        }
        return acc;
      }, {} as Record<string, { count: number, descriptions: string[] }>);

      const photoSummary = Object.entries(photoGroups).map(([category, data]: [string, { count: number, descriptions: string[] }]) => {
          const descText = data.descriptions.length > 0 ? ` (주요내용: ${data.descriptions.slice(0, 3).join(', ')} 등)` : '';
          return `- ${category}: 총 ${data.count}장${descText}`;
      }).join('\n');

      // Professional prompt for Korean Construction Report
      const prompt = `
        당신은 건설현장 안전관리비 담당 전문가입니다. 아래 입력된 월간 데이터를 바탕으로 발주처 또는 감리단에 제출할 '안전관리비 집행 실적 보고서'의 요약본(텍스트)을 작성해주세요.
        
        [입력 데이터]
        - 현장명: ${projectInfo.siteName}
        - 귀속월: ${projectInfo.year}년 ${projectInfo.month}월
        - 담당자: ${projectInfo.managerName}
        - 총 인건비 집행액: ${totalLaborCost.toLocaleString()} 원
        - 총 시설/재료비 집행액: ${totalMaterialCost.toLocaleString()} 원
        
        - 투입 근로자 상세:
        ${workerSummary}

        - 안전시설 구매/설치 상세:
        ${itemSummary}
        
        - 주요 안전 조치 활동(사진대지 요약):
        ${photoSummary}
        
        [요청사항]
        1. 문체: 정중하고 격식 있는 '하십시오'체 (공문서/보고서 스타일).
        2. 구성:
           - [개요]: 현장명과 해당 월의 집행 총액(인건비+재료비) 요약.
           - [인건비 집행 내역]: 인건비 투입 현황을 간략히 요약 (누가 어떤 업무를 했는지).
           - [안전시설비 집행 내역]: 어떤 안전 물품이나 시설이 확충되었는지 요약.
           - [주요 안전 활동 실적]: 사진대지 요약 데이터를 바탕으로 어떤 분야의 안전 관리가 집중적으로 이루어졌는지 분석하여 서술.
           - [맺음말]: 안전 관리에 만전을 기하겠다는 다짐.
        3. 불필요한 미사여구는 빼고, 사실 위주로 명확하게 작성하세요.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setSummary(response.text || "보고서 생성에 실패했습니다.");
    } catch (error) {
      console.error(error);
      setSummary("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!process.env.API_KEY) return null;

  return (
    <>
      <button
        onClick={generateReport}
        className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-violet-700 hover:to-indigo-700 transition-all font-bold text-sm no-print border border-transparent"
      >
        <Wand2 className="w-4 h-4" />
        AI 보고서 초안 생성
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 no-print p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-0 relative animate-in fade-in zoom-in duration-200 overflow-hidden">
            <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-yellow-300" />
                AI 안전관리비 집행 리포트
              </h3>
              <button onClick={() => setShowModal(false)} className="text-indigo-200 hover:text-white transition-colors">
                <span className="sr-only">닫기</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center text-slate-500">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping opacity-75"></div>
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 relative z-10" />
                  </div>
                  <p className="mt-6 text-lg font-medium text-slate-800">현장 데이터를 분석 중입니다...</p>
                  <p className="text-sm text-slate-400 mt-2">Gemini가 최적의 보고서 문구를 작성하고 있습니다.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 font-medium shadow-inner h-[400px] overflow-y-auto custom-scrollbar">
                    {summary}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                     <button 
                       onClick={() => navigator.clipboard.writeText(summary)}
                       className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors"
                     >
                       <FileText className="w-4 h-4" />
                       내용 복사
                     </button>
                     <button 
                       onClick={() => setShowModal(false)}
                       className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-sm transition-colors"
                     >
                       확인 완료
                     </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};