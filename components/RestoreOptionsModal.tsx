import React from 'react';

export interface RestoreSelections {
  mode: 'overwrite' | 'merge';
  restoreLabor: boolean;
  restoreLaborAttendance: boolean;
  restoreLaborPhotos: boolean;
  restoreSafety: boolean;
  restoreSafetyAttendance: boolean;
  restoreSafetyPhotos: boolean;
}

export interface RestoreSummary {
  siteName: string;
  workerCount: number;
  laborAttendanceDays: number;
  laborPhotoCount: number;
  safetyWorkerCount: number;
  safetyAttendanceDays: number;
  safetyPhotoCount: number;
  safetyItemCount: number;
}

interface Props {
  isOpen: boolean;
  fileName: string;
  summary: RestoreSummary;
  selections: RestoreSelections;
  onChange: (next: RestoreSelections) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const RestoreOptionsModal: React.FC<Props> = ({ isOpen, fileName, summary, selections, onChange, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const update = (field: keyof RestoreSelections, value: boolean) => {
    const next: RestoreSelections = { ...selections, [field]: value };

    if (field === 'restoreLabor' && !value) {
      next.restoreLaborAttendance = false;
      next.restoreLaborPhotos = false;
    }
    if (field === 'restoreSafety' && !value) {
      next.restoreSafetyAttendance = false;
      next.restoreSafetyPhotos = false;
    }
    if ((field === 'restoreLaborAttendance' || field === 'restoreLaborPhotos') && value) {
      next.restoreLabor = true;
    }
    if ((field === 'restoreSafetyAttendance' || field === 'restoreSafetyPhotos') && value) {
      next.restoreSafety = true;
    }

    onChange(next);
  };

  const disabledConfirm = !selections.restoreLabor && !selections.restoreSafety;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-indigo-900 text-white flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">백업 복구 옵션 선택</h3>
            <p className="text-sm text-indigo-100 mt-1 break-all">파일: {fileName}</p>
          </div>
          <button onClick={onClose} className="text-indigo-100 hover:text-white text-sm font-bold">닫기</button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
              <div className="font-bold text-slate-800 mb-2">백업 정보</div>
              <ul className="space-y-1 text-slate-600">
                <li>현장명: {summary.siteName}</li>
                <li>유도원/감시자 근로자: {summary.workerCount}명</li>
                <li>유도원/감시자 사진: {summary.laborPhotoCount}장</li>
                <li>안전시설 근로자: {summary.safetyWorkerCount}명</li>
                <li>안전시설 품목: {summary.safetyItemCount}개</li>
                <li>안전시설 사진: {summary.safetyPhotoCount}장</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200 p-4 bg-amber-50 text-sm text-amber-900">
              <div className="font-bold mb-2">복구 안내</div>
              <ul className="space-y-1 leading-relaxed">
                <li>• 주민등록번호는 마스킹된 상태로 복구됩니다.</li>
                <li>• 선택하지 않은 항목은 현재 데이터를 유지합니다.</li>
                <li>• 덮어쓰기: 선택 섹션 데이터를 백업 파일 기준으로 교체합니다.</li>
                <li>• 병합: 기존 데이터에 백업 데이터를 추가로 합칩니다.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 p-5 bg-violet-50/50 space-y-3">
            <div className="font-bold text-violet-800">복구 방식</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <label className={`rounded-xl border p-3 cursor-pointer transition-all ${selections.mode === 'overwrite' ? 'border-violet-400 bg-white shadow-sm' : 'border-violet-100 bg-violet-50'}`}>
                <input
                  type="radio"
                  name="restore-mode"
                  checked={selections.mode === 'overwrite'}
                  onChange={() => onChange({ ...selections, mode: 'overwrite' })}
                  className="accent-violet-600 mr-2"
                />
                <span className="font-bold text-slate-800">덮어쓰기</span>
                <div className="text-xs text-slate-500 mt-1">선택한 섹션의 현재 데이터를 백업 데이터로 교체합니다.</div>
              </label>
              <label className={`rounded-xl border p-3 cursor-pointer transition-all ${selections.mode === 'merge' ? 'border-violet-400 bg-white shadow-sm' : 'border-violet-100 bg-violet-50'}`}>
                <input
                  type="radio"
                  name="restore-mode"
                  checked={selections.mode === 'merge'}
                  onChange={() => onChange({ ...selections, mode: 'merge' })}
                  className="accent-violet-600 mr-2"
                />
                <span className="font-bold text-slate-800">병합</span>
                <div className="text-xs text-slate-500 mt-1">현재 데이터는 유지하고 백업 데이터를 추가합니다.</div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-indigo-200 p-5 bg-indigo-50/50 space-y-3">
              <div className="font-bold text-indigo-800">유도원 및 감시자</div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={selections.restoreLabor} onChange={(e) => update('restoreLabor', e.target.checked)} className="accent-indigo-600" />
                근로자/현장 기본정보 복구
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selections.restoreLaborAttendance} disabled={!selections.restoreLabor || summary.laborAttendanceDays === 0} onChange={(e) => update('restoreLaborAttendance', e.target.checked)} className="accent-indigo-600" />
                출력공수 복구 ({summary.laborAttendanceDays}일)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selections.restoreLaborPhotos} disabled={!selections.restoreLabor || summary.laborPhotoCount === 0} onChange={(e) => update('restoreLaborPhotos', e.target.checked)} className="accent-indigo-600" />
                증빙 사진 복구 ({summary.laborPhotoCount}장)
              </label>
            </div>

            <div className="rounded-2xl border border-emerald-200 p-5 bg-emerald-50/50 space-y-3">
              <div className="font-bold text-emerald-800">안전시설</div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={selections.restoreSafety} onChange={(e) => update('restoreSafety', e.target.checked)} className="accent-emerald-600" />
                근로자/품목 복구
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selections.restoreSafetyAttendance} disabled={!selections.restoreSafety || summary.safetyAttendanceDays === 0} onChange={(e) => update('restoreSafetyAttendance', e.target.checked)} className="accent-emerald-600" />
                출력공수 복구 ({summary.safetyAttendanceDays}일)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={selections.restoreSafetyPhotos} disabled={!selections.restoreSafety || summary.safetyPhotoCount === 0} onChange={(e) => update('restoreSafetyPhotos', e.target.checked)} className="accent-emerald-600" />
                증빙 사진 복구 ({summary.safetyPhotoCount}장)
              </label>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold">취소</button>
          <button onClick={onConfirm} disabled={disabledConfirm} className={`px-4 py-2 rounded-xl text-sm font-bold ${disabledConfirm ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
            선택 항목 복구
          </button>
        </div>
      </div>
    </div>
  );
};