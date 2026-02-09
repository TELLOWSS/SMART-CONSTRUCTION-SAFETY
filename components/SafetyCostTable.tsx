
import React from 'react';
import { SafetyItem } from '../types';
import { Plus, Trash2, ShoppingCart, AlertCircle } from 'lucide-react';

interface Props {
  items: SafetyItem[];
  setItems: React.Dispatch<React.SetStateAction<SafetyItem[]>>;
  readOnly?: boolean;
}

export const SafetyCostTable: React.FC<Props> = ({ items, setItems, readOnly = false }) => {
  const addItem = () => {
    const newItem: SafetyItem = {
      id: crypto.randomUUID(),
      name: '',
      spec: '',
      unit: 'EA',
      quantity: 0,
      unitPrice: 0,
      note: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof SafetyItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const totalAmount = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);

  if (readOnly) {
    return (
      <div className="mb-8 break-inside-avoid">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
          2. 안전시설 월간 관리비(재료비) 집행 상세 내역
        </h3>
        
        <div className="border border-slate-400 text-xs">
          {/* Header */}
          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-400 font-bold text-center">
            <div className="col-span-3 border-r border-slate-300 p-2">품명</div>
            <div className="col-span-2 border-r border-slate-300 p-2">규격</div>
            <div className="col-span-1 border-r border-slate-300 p-2">단위</div>
            <div className="col-span-1 border-r border-slate-300 p-2">수량</div>
            <div className="col-span-2 border-r border-slate-300 p-2">단가</div>
            <div className="col-span-2 border-r border-slate-300 p-2">금액</div>
            <div className="col-span-1 p-2">비고</div>
          </div>

          {/* Rows */}
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 border-b border-slate-200 last:border-b-0 text-center items-center">
              <div className="col-span-3 border-r border-slate-200 p-2 text-left pl-3">{item.name}</div>
              <div className="col-span-2 border-r border-slate-200 p-2">{item.spec || '-'}</div>
              <div className="col-span-1 border-r border-slate-200 p-2">{item.unit}</div>
              <div className="col-span-1 border-r border-slate-200 p-2">{item.quantity.toLocaleString()}</div>
              <div className="col-span-2 border-r border-slate-200 p-2 text-right pr-3">{item.unitPrice.toLocaleString()}</div>
              <div className="col-span-2 border-r border-slate-200 p-2 text-right pr-3 font-bold bg-slate-50">{(item.quantity * item.unitPrice).toLocaleString()}</div>
              <div className="col-span-1 p-2 text-slate-500">{item.note}</div>
            </div>
          ))}

          {items.length === 0 && (
             <div className="p-4 text-center text-slate-400 italic bg-slate-50">
               집행된 안전시설비 내역이 없습니다.
             </div>
          )}

          {/* Total */}
          <div className="grid grid-cols-12 bg-slate-100 font-bold border-t border-slate-400">
             <div className="col-span-9 border-r border-slate-300 p-2 text-center">합 계</div>
             <div className="col-span-2 border-r border-slate-300 p-2 text-right pr-3 text-indigo-900">
               {totalAmount.toLocaleString()}
             </div>
             <div className="col-span-1"></div>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8 no-print hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-800">
          <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
             <ShoppingCart className="w-5 h-5" />
          </div>
          안전시설 관리비(재료비) 내역
        </h2>
        <button
          onClick={addItem}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" />
          품목 추가
        </button>
      </div>

      <div className="space-y-3">
        {/* Header for Edit Mode */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div className="col-span-3">품명</div>
            <div className="col-span-2">규격</div>
            <div className="col-span-1">단위</div>
            <div className="col-span-1">수량</div>
            <div className="col-span-2">단가</div>
            <div className="col-span-2">합계</div>
            <div className="col-span-1"></div>
        </div>

        {items.map(item => (
          <div key={item.id} className="border border-slate-200 rounded-xl p-4 md:p-0 md:border-none md:bg-transparent bg-slate-50 group">
             <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="col-span-3">
                    <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">품명</label>
                    <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:border-indigo-500 outline-none bg-white"
                        placeholder="예: 안전모, 소화기"
                    />
                </div>
                <div className="col-span-2">
                    <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">규격</label>
                    <input
                        type="text"
                        value={item.spec}
                        onChange={(e) => updateItem(item.id, 'spec', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none bg-white"
                        placeholder="규격 입력"
                    />
                </div>
                <div className="col-span-1">
                    <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">단위</label>
                    <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-center focus:border-indigo-500 outline-none bg-white"
                        placeholder="EA"
                    />
                </div>
                <div className="col-span-1">
                    <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">수량</label>
                    <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                        // Prevent scroll from changing value
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right font-mono focus:border-indigo-500 outline-none bg-white"
                    />
                </div>
                <div className="col-span-2">
                    <label className="md:hidden text-xs font-bold text-slate-400 mb-1 block">단가</label>
                    <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                        // Prevent scroll from changing value
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-right font-mono focus:border-indigo-500 outline-none bg-white"
                    />
                </div>
                <div className="col-span-2">
                    <div className="flex justify-between md:justify-end items-center px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-700">
                        <span className="md:hidden text-xs font-normal text-slate-500">합계</span>
                        {(item.quantity * item.unitPrice).toLocaleString()}
                    </div>
                </div>
                <div className="col-span-1 flex justify-end">
                     <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
             </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <p className="font-medium">등록된 품목이 없습니다.</p>
             <p className="text-xs mt-1">'품목 추가' 버튼을 눌러 안전시설/재료 구매 내역을 입력하세요.</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end items-center gap-3 border-t border-slate-100 pt-4">
         <span className="text-sm font-bold text-slate-500">관리비(재료비) 합계</span>
         <span className="text-2xl font-extrabold text-indigo-700">{totalAmount.toLocaleString()} 원</span>
      </div>
    </div>
  );
};
