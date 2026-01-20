import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Users, Coffee, DollarSign, Clock, Star,
  LayoutDashboard, X, Menu, Package, UserCheck, Calendar, Settings,
  Bell, Plus, Edit3, Trash2, CheckCircle, AlertTriangle, Download,
  Search, Wallet, Receipt, Moon, Sun, Store, BarChart2, ShoppingCart,
  Percent, ArrowUpRight, ArrowDownRight, Zap, Phone, RefreshCw,
  Database, FileText, Printer, LogOut, Loader2, Cloud, CloudOff
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/AuthPage';
import BusinessTypeSelect from './components/BusinessTypeSelect';
import { useStoreData } from './hooks/useFirestore';

// ========== 유틸리티 ==========
const formatCurrency = (n) => {
  if (n >= 100000000) return `${(n/100000000).toFixed(1)}억`;
  if (n >= 10000000) return `${(n/10000000).toFixed(1)}천만`;
  if (n >= 10000) return `${Math.round(n/10000)}만`;
  return n?.toLocaleString() || '0';
};

const formatNumber = (n) => n?.toLocaleString() || '0';

const useLocalStorage = (key, initial) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

// CSV 내보내기
const exportToCSV = (data, filename) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};

// 프린트 기능
const printReport = (title, content) => {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><title>${title}</title>
    <style>
      body { font-family: 'Malgun Gothic', sans-serif; padding: 40px; }
      h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
      th { background: #f5f5f5; }
      .text-right { text-align: right; }
      .summary { background: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 8px; }
      .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
    </style>
    </head><body>${content}<div class="footer">생성일: ${new Date().toLocaleString('ko-KR')}</div></body></html>
  `);
  printWindow.document.close();
  printWindow.print();
};

// ========== 초기 데이터 ==========
const generateSalesData = () => {
  const data = [];
  const base = 1500000;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const factor = (isWeekend ? 1.35 : 1) * (0.85 + Math.random() * 0.3);
    const revenue = Math.round(base * factor);
    const cost = Math.round(revenue * (0.28 + Math.random() * 0.07));
    data.push({
      date: d.toISOString().split('T')[0],
      label: `${d.getMonth()+1}/${d.getDate()}`,
      revenue, cost, profit: revenue - cost,
      orders: Math.round(revenue / 6200),
      visitors: Math.round(revenue / 4800)
    });
  }
  return data;
};

// 기본 데이터 (Firebase에서 업종별 데이터를 가져오므로 빈 배열로 시작)
const defaultProducts = [];
const defaultStaff = [];
const defaultReservations = [];
const defaultCustomers = [];

// ========== 컴포넌트 ==========
const StatCard = ({ title, value, change, icon: Icon, trend, color, subtitle, onClick }) => (
  <div onClick={onClick} className={`bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 card-hover ${onClick ? 'cursor-pointer' : ''}`}>
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {change}%
        </div>
      )}
    </div>
    <p className="text-slate-400 text-sm mb-1">{title}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
    {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
    {badge > 0 && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>}
  </button>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className={`rounded-2xl w-full ${sizes[size]} max-h-[85vh] overflow-hidden fade-in`} style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #334155' }}>
          <h3 className="text-lg font-semibold" style={{ color: '#fff' }}>{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition"><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">{children}</div>
      </div>
    </div>
  );
};

const Badge = ({ children, variant = 'default' }) => {
  const styles = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    default: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    vip: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gold: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    silver: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
    bronze: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[variant]}`}>{children}</span>;
};

const Input = ({ label, ...props }) => (
  <div>
    {label && <label className="block text-sm text-slate-400 mb-1.5">{label}</label>}
    <input {...props} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
  </div>
);

// 전화번호 자동 하이픈 포맷팅 (uncontrolled)
const PhoneInput = ({ label, defaultValue, ...props }) => {
  const [value, setValue] = useState(defaultValue || '');

  const formatPhone = (val) => {
    const numbers = val.replace(/[^\d]/g, '').slice(0, 11);
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  };

  const handleChange = (e) => {
    setValue(formatPhone(e.target.value));
  };

  useEffect(() => {
    setValue(defaultValue || '');
  }, [defaultValue]);

  return (
    <div>
      {label && <label className="block text-sm text-slate-400 mb-1.5">{label}</label>}
      <input {...props} value={value} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition" />
    </div>
  );
};

// 기타 직접 입력 가능한 Select (uncontrolled)
const SelectWithCustom = ({ label, options, defaultValue, name, placeholder = "직접 입력..." }) => {
  const isDefaultCustom = defaultValue && !options.some(opt => opt.value === defaultValue);
  const [isCustom, setIsCustom] = useState(isDefaultCustom);
  const [selectValue, setSelectValue] = useState(isDefaultCustom ? '__custom__' : (defaultValue || options[0]?.value || ''));
  const [customValue, setCustomValue] = useState(isDefaultCustom ? defaultValue : '');

  useEffect(() => {
    const isCustomVal = defaultValue && !options.some(opt => opt.value === defaultValue);
    setIsCustom(isCustomVal);
    setSelectValue(isCustomVal ? '__custom__' : (defaultValue || options[0]?.value || ''));
    setCustomValue(isCustomVal ? defaultValue : '');
  }, [defaultValue]);

  const allOptions = [...options, { value: '__custom__', label: '기타 (직접 입력)' }];

  const handleSelectChange = (e) => {
    if (e.target.value === '__custom__') {
      setIsCustom(true);
      setSelectValue('__custom__');
      setCustomValue('');
    } else {
      setIsCustom(false);
      setSelectValue(e.target.value);
    }
  };

  if (isCustom) {
    return (
      <div>
        {label && <label className="block text-sm text-slate-400 mb-1.5">{label}</label>}
        <div className="flex gap-2">
          <input
            type="text"
            name={name}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          <button type="button" onClick={() => { setIsCustom(false); setSelectValue(options[0]?.value || ''); }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">목록</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-sm text-slate-400 mb-1.5">{label}</label>}
      <select
        name={name}
        value={selectValue}
        onChange={handleSelectChange}
        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition"
      >
        {allOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
};

const Select = ({ label, options, ...props }) => (
  <div>
    {label && <label className="block text-sm text-slate-400 mb-1.5">{label}</label>}
    <select {...props} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition">
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, ...props }) => {
  const variants = {
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    ghost: 'hover:bg-slate-800 text-slate-400 hover:text-white',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
  };
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2', lg: 'px-6 py-3 text-lg' };
  return (
    <button {...props} className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50`}>
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// 일괄 스케줄 설정 모달
const BulkScheduleModal = ({ isOpen, onClose, staff, scheduleData, setScheduleData, year, month }) => {
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]); // 선택된 요일들 (0=일, 1=월, ..., 6=토)

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 선택한 요일에 해당하는 이번 달 모든 날짜 구하기
  const getDatesForDays = (days) => {
    const dates = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      if (days.includes(date.getDay())) {
        dates.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }
    }
    return dates;
  };

  const toggleDay = (dayIndex) => {
    setSelectedDays(prev =>
      prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const applySchedule = async () => {
    if (!selectedStaff || selectedDays.length === 0) return;

    const dates = getDatesForDays(selectedDays);
    const newSchedule = { ...scheduleData };

    dates.forEach(dateKey => {
      if (!newSchedule[dateKey]) newSchedule[dateKey] = [];
      if (!newSchedule[dateKey].includes(selectedStaff.id)) {
        newSchedule[dateKey] = [...newSchedule[dateKey], selectedStaff.id];
      }
    });

    await setScheduleData(newSchedule);
    onClose();
  };

  const clearSchedule = async () => {
    if (!selectedStaff || selectedDays.length === 0) return;

    const dates = getDatesForDays(selectedDays);
    const newSchedule = { ...scheduleData };

    dates.forEach(dateKey => {
      if (newSchedule[dateKey]) {
        newSchedule[dateKey] = newSchedule[dateKey].filter(id => id !== selectedStaff.id);
      }
    });

    await setScheduleData(newSchedule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${year}년 ${month + 1}월 일괄 스케줄 설정`}>
      <div className="space-y-4">
        {/* 직원 선택 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">직원 선택</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {staff.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStaff(s)}
                className={`p-3 rounded-lg text-left transition ${selectedStaff?.id === s.id ? 'bg-indigo-500/20 border-2 border-indigo-500' : 'bg-slate-900/50 border border-slate-700 hover:border-slate-600'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: s.color || '#6366f1' }}>
                    {s.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{s.name}</p>
                    <p className="text-slate-500 text-xs">{s.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 요일 선택 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">근무 요일 선택 (복수 선택 가능)</label>
          <div className="flex gap-2 flex-wrap">
            {dayNames.map((name, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={`w-12 h-12 rounded-lg font-medium transition ${selectedDays.includes(idx) ? 'bg-indigo-500 text-white' : 'bg-slate-900/50 border border-slate-700 text-slate-400 hover:border-slate-600'}`}
                style={{ color: selectedDays.includes(idx) ? '#fff' : idx === 0 ? '#f87171' : idx === 6 ? '#60a5fa' : '#94a3b8' }}
              >
                {name}
              </button>
            ))}
          </div>
          {selectedDays.length > 0 && (
            <p className="text-slate-500 text-sm mt-2">
              선택된 요일: {selectedDays.sort((a,b) => a-b).map(d => dayNames[d]).join(', ')}
              ({getDatesForDays(selectedDays).length}일)
            </p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={clearSchedule}
            disabled={!selectedStaff || selectedDays.length === 0}
          >
            스케줄 삭제
          </Button>
          <Button
            className="flex-1"
            onClick={applySchedule}
            disabled={!selectedStaff || selectedDays.length === 0}
          >
            스케줄 적용
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// 상품 추가/수정 모달 (통합)
const ProductModal = ({ isOpen, onClose, onSubmit, editItem, ingredientProducts }) => {
  const [isIngredient, setIsIngredient] = useState(editItem?.isIngredient || false);
  const [ingredients, setIngredients] = useState(editItem?.ingredients || []);

  useEffect(() => {
    setIsIngredient(editItem?.isIngredient || false);
    setIngredients(editItem?.ingredients || []);
  }, [editItem]);

  const addIngredient = () => {
    setIngredients([...ingredients, { inventoryId: '', amount: 1 }]);
  };

  const updateIngredient = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = field === 'amount' ? Number(value) : value;
    setIngredients(updated);
  };

  const removeIngredient = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const validIngredients = ingredients.filter(ing => ing.inventoryId && ing.amount > 0);
    onSubmit({
      name: f.get('name'),
      category: f.get('category'),
      price: isIngredient ? Math.round(Number(f.get('cost'))) : Math.round(Number(f.get('price'))),
      cost: Math.round(Number(f.get('cost'))),
      quantity: Number(Number(f.get('quantity')).toFixed(2)),
      minStock: Number(Number(f.get('minStock')).toFixed(2)),
      unit: f.get('unit'),
      isIngredient,
      ingredients: isIngredient ? [] : validIngredients
    });
  };

  if (!isOpen) return null;

  const safeIngredients = Array.isArray(ingredientProducts) ? ingredientProducts : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editItem ? '상품 수정' : '상품 추가'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 상품 유형 선택 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">상품 유형</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsIngredient(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${!isIngredient ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              판매 상품
            </button>
            <button type="button" onClick={() => setIsIngredient(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${isIngredient ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
              재료 (원자재)
            </button>
          </div>
        </div>

        <Input name="name" label="상품명" defaultValue={editItem?.name} required />
        <SelectWithCustom name="category" label="카테고리" defaultValue={editItem?.category || (isIngredient ? '원두' : '커피')} options={isIngredient ? [{ value: '원두', label: '원두' }, { value: '유제품', label: '유제품' }, { value: '시럽', label: '시럽' }, { value: '포장재', label: '포장재' }] : [{ value: '커피', label: '커피' }, { value: '음료', label: '음료' }, { value: '베이커리', label: '베이커리' }, { value: '디저트', label: '디저트' }]} placeholder="카테고리 입력..." />

        <div className="grid grid-cols-2 gap-4">
          {!isIngredient && <Input name="price" label="판매가" type="number" step="1" defaultValue={editItem?.price ? Math.round(editItem.price) : 0} required />}
          <Input name="cost" label={isIngredient ? '단가' : '원가'} type="number" step="1" defaultValue={editItem?.cost ? Math.round(editItem.cost) : 0} required />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input name="quantity" label="재고 수량" type="number" step="0.01" defaultValue={editItem?.quantity ? Number(editItem.quantity.toFixed(2)) : 0} required />
          <Input name="minStock" label="최소 재고" type="number" step="0.01" defaultValue={editItem?.minStock ? Number(editItem.minStock.toFixed(2)) : 0} />
          <Input name="unit" label="단위" defaultValue={editItem?.unit || (isIngredient ? 'kg' : '개')} required />
        </div>
        <p className="text-slate-500 text-xs">최소 재고를 0으로 설정하면 재고 관리 안 함 (무제한)</p>

        {/* 재료 연결 (판매 상품만) */}
        {!isIngredient && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-slate-400">재료 연결 (선택사항)</label>
              <button type="button" onClick={addIngredient} className="text-xs text-indigo-400 hover:text-indigo-300">+ 재료 추가</button>
            </div>
            {ingredients.length === 0 ? (
              <p className="text-slate-500 text-sm py-3 text-center bg-slate-900/50 rounded-lg">연결된 재료 없음</p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, idx) => {
                  const selectedInv = safeIngredients.find(inv => inv.id === ing.inventoryId);
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                      <select value={ing.inventoryId} onChange={(e) => updateIngredient(idx, 'inventoryId', e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm">
                        <option value="">재료 선택</option>
                        {safeIngredients.map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name} ({inv.quantity}{inv.unit})</option>
                        ))}
                      </select>
                      <input type="number" value={ing.amount} onChange={(e) => updateIngredient(idx, 'amount', e.target.value)} className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm text-center" min="0.01" step="0.01" />
                      <span className="text-slate-400 text-sm w-8">{selectedInv?.unit || ''}</span>
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-red-400 hover:text-red-300 p-1"><X className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>취소</Button>
          <Button type="submit" className="flex-1">{editItem ? '수정' : '추가'}</Button>
        </div>
      </form>
    </Modal>
  );
};

// 매출 입력 모달 (개선됨)
const SalesInputModal = ({ isOpen, onClose, onSubmit, menu }) => {
  const [items, setItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('전체');

  // 안전한 메뉴 배열
  const safeMenu = Array.isArray(menu) ? menu : [];

  // 카테고리 목록 추출
  const categories = ['전체', ...new Set(safeMenu.map(item => item.category).filter(Boolean))];

  // 필터링된 메뉴
  const filteredMenu = safeMenu.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === '전체' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const addItem = (menuItem, qty = 1) => {
    const existing = items.find(i => i.id === menuItem.id);
    if (existing) {
      setItems(items.map(i => i.id === menuItem.id ? {...i, qty: i.qty + qty} : i));
    } else {
      setItems([...items, { ...menuItem, qty }]);
    }
  };

  const updateQty = (id, newQty, fromInput = false) => {
    // 입력 중일 때는 빈 값이나 0도 허용 (임시 상태)
    if (fromInput) {
      setItems(items.map(i => i.id === id ? {...i, qty: newQty} : i));
    } else {
      // 버튼 클릭 시에만 삭제 로직 적용
      if (newQty <= 0) {
        setItems(items.filter(i => i.id !== id));
      } else {
        setItems(items.map(i => i.id === id ? {...i, qty: newQty} : i));
      }
    }
  };

  // 입력 완료 시 검증
  const validateQty = (id) => {
    const item = items.find(i => i.id === id);
    if (!item || item.qty <= 0 || isNaN(item.qty)) {
      setItems(items.map(i => i.id === id ? {...i, qty: 1} : i));
    }
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  const total = items.reduce((sum, i) => sum + i.price * (i.qty || 0), 0);
  const totalCost = items.reduce((sum, i) => sum + (i.cost || 0) * (i.qty || 0), 0);
  const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);

  // 영수증 출력
  const printReceipt = (receiptItems, receiptTotal, method) => {
    const now = new Date();
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>영수증</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', monospace; width: 280px; padding: 20px; font-size: 12px; }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .double-line { border-top: 2px solid #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .store-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .total { font-size: 16px; font-weight: bold; }
          .footer { font-size: 10px; color: #666; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="store-name">StoreHub</div>
          <p>감사합니다</p>
        </div>
        <div class="line"></div>
        <p>${now.toLocaleDateString('ko-KR')} ${now.toLocaleTimeString('ko-KR')}</p>
        <p>결제: ${method === 'card' ? '카드' : method === 'cash' ? '현금' : '계좌이체'}</p>
        <div class="double-line"></div>
        ${receiptItems.map(item => `
          <div class="item">
            <span>${item.name} x${item.qty}</span>
            <span>${formatNumber(item.price * item.qty)}원</span>
          </div>
        `).join('')}
        <div class="double-line"></div>
        <div class="item total">
          <span>합계</span>
          <span>${formatNumber(receiptTotal)}원</span>
        </div>
        <div class="line"></div>
        <div class="center footer">
          <p>주문번호: ${Date.now().toString().slice(-6)}</p>
          <p>StoreHub POS</p>
          <p>이용해 주셔서 감사합니다</p>
        </div>
      </body>
      </html>
    `);
    receiptWindow.document.close();
    receiptWindow.print();
  };

  const handleSubmit = (withReceipt = false) => {
    // 유효한 아이템만 필터링 (수량이 1 이상인 것만)
    const validItems = items.filter(i => i.qty && i.qty > 0);
    if (validItems.length === 0) return;

    const finalTotal = validItems.reduce((sum, i) => sum + i.price * i.qty, 0);
    const finalCost = validItems.reduce((sum, i) => sum + (i.cost || 0) * i.qty, 0);

    onSubmit({
      items: validItems,
      total: finalTotal,
      cost: finalCost,
      profit: finalTotal - finalCost,
      paymentMethod,
      timestamp: new Date().toISOString()
    });

    // 영수증 출력
    if (withReceipt) {
      printReceipt(validItems, finalTotal, paymentMethod);
    }

    setItems([]);
    setSearchTerm('');
    setActiveCategory('전체');
    onClose();
  };

  // 모달 닫힐 때 초기화
  const handleClose = () => {
    setItems([]);
    setSearchTerm('');
    setActiveCategory('전체');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="매출 입력" size="xl">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 'auto' }}>
        {/* 왼쪽: 메뉴 선택 영역 */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          {/* 검색 */}
          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="메뉴 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg"
                style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
              />
            </div>
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-lg whitespace-nowrap transition"
                style={{
                  backgroundColor: activeCategory === cat ? '#6366f1' : '#1e293b',
                  color: activeCategory === cat ? '#fff' : '#94a3b8',
                  border: '1px solid ' + (activeCategory === cat ? '#6366f1' : '#334155')
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 메뉴 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 lg:max-h-80 overflow-y-auto pr-1">
            {filteredMenu.map(item => {
              const inCart = items.find(i => i.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="p-3 rounded-lg text-left transition relative"
                  style={{
                    backgroundColor: inCart ? '#312e81' : '#0f172a',
                    border: inCart ? '2px solid #6366f1' : '1px solid #334155'
                  }}
                >
                  {inCart && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#6366f1', color: '#fff' }}>
                      {inCart.qty}
                    </span>
                  )}
                  <p style={{ color: '#fff', fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>{item.name}</p>
                  <p style={{ color: '#818cf8', fontSize: '13px' }}>{formatNumber(item.price)}원</p>
                </button>
              );
            })}
            {filteredMenu.length === 0 && (
              <div className="col-span-2 sm:col-span-3 py-12 text-center" style={{ color: '#64748b' }}>
                메뉴가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 주문 내역 - 모바일에서는 위에 표시 */}
        <div className="lg:col-span-2 flex flex-col order-1 lg:order-2" style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px' }}>
          <div className="flex items-center justify-between mb-3">
            <h4 style={{ color: '#fff', fontWeight: 600 }}>주문 내역 ({totalQty}개)</h4>
            {items.length > 0 && (
              <button onClick={clearAll} style={{ color: '#f87171', fontSize: '13px' }}>전체 삭제</button>
            )}
          </div>

          {/* 주문 목록 */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4" style={{ maxHeight: items.length > 0 ? '180px' : '80px' }}>
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: '#64748b' }}>
                <ShoppingCart className="w-12 h-12 mb-2 opacity-30" />
                <p>메뉴를 선택하세요</p>
              </div>
            ) : items.map(item => (
              <div key={item.id} className="p-3 rounded-lg" style={{ backgroundColor: '#1e293b' }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>{item.name}</span>
                  <button onClick={() => removeItem(item.id)} style={{ color: '#f87171' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* 수량 조절 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-9 h-9 rounded flex items-center justify-center text-lg"
                      style={{ backgroundColor: '#334155', color: '#fff' }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.qty || ''}
                      onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0, true)}
                      onBlur={() => validateQty(item.id)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="w-14 h-9 text-center rounded text-lg"
                      style={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                      min="1"
                    />
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-9 h-9 rounded flex items-center justify-center text-lg"
                      style={{ backgroundColor: '#334155', color: '#fff' }}
                    >
                      +
                    </button>
                    {/* 빠른 수량 버튼 - 모바일에서 숨김 */}
                    <div className="hidden sm:flex gap-1 ml-2">
                      {[5, 10].map(n => (
                        <button
                          key={n}
                          onClick={() => updateQty(item.id, item.qty + n)}
                          className="px-2 h-9 rounded text-xs"
                          style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#94a3b8' }}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span style={{ color: '#818cf8', fontWeight: 600, fontSize: '15px' }}>{formatNumber(item.price * (item.qty || 0))}원</span>
                </div>
              </div>
            ))}
          </div>

          {/* 결제 방식 */}
          <div className="mb-3">
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>결제 방식</p>
            <div className="flex gap-2">
              {[{ value: 'card', label: '카드' }, { value: 'cash', label: '현금' }, { value: 'transfer', label: '계좌이체' }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPaymentMethod(opt.value)}
                  className="flex-1 py-2 rounded-lg transition"
                  style={{
                    backgroundColor: paymentMethod === opt.value ? '#6366f1' : '#1e293b',
                    color: paymentMethod === opt.value ? '#fff' : '#94a3b8',
                    border: '1px solid ' + (paymentMethod === opt.value ? '#6366f1' : '#334155')
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 합계 */}
          <div className="p-4 rounded-lg mb-3" style={{ backgroundColor: '#312e81' }}>
            <div className="flex justify-between items-center">
              <span style={{ color: '#c7d2fe' }}>총 금액</span>
              <span style={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}>{formatNumber(total)}원</span>
            </div>
            {totalCost > 0 && (
              <div className="flex justify-between text-sm mt-1">
                <span style={{ color: '#a5b4fc' }}>예상 이익</span>
                <span style={{ color: '#34d399' }}>+{formatNumber(total - totalCost)}원</span>
              </div>
            )}
          </div>

          {/* 결제 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={items.length === 0}
              className="flex-1 py-4 rounded-lg font-bold text-lg transition"
              style={{
                backgroundColor: items.length === 0 ? '#334155' : '#6366f1',
                color: items.length === 0 ? '#64748b' : '#fff',
                cursor: items.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              결제 완료
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={items.length === 0}
              className="px-4 py-4 rounded-lg font-bold transition flex items-center justify-center"
              style={{
                backgroundColor: items.length === 0 ? '#334155' : '#10b981',
                color: items.length === 0 ? '#64748b' : '#fff',
                cursor: items.length === 0 ? 'not-allowed' : 'pointer'
              }}
              title="영수증 출력"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// 로딩 화면
const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
      <p className="text-slate-400">데이터를 불러오는 중...</p>
    </div>
  </div>
);

// ========== 메인 대시보드 ==========
function Dashboard() {
  const { currentUser, userProfile, logout } = useAuth();
  const [darkMode, setDarkMode] = useLocalStorage('theme', true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Firestore 데이터 (실시간 동기화)
  const [salesData, setSalesData, salesStatus] = useStoreData(currentUser?.uid, 'salesData', generateSalesData());
  const [products, setProducts, prodStatus] = useStoreData(currentUser?.uid, 'products', defaultProducts);
  const [staff, setStaff, staffStatus] = useStoreData(currentUser?.uid, 'staff', defaultStaff);
  const [reservations, setReservations, resStatus] = useStoreData(currentUser?.uid, 'reservations', defaultReservations);
  const [customers, setCustomers, custStatus] = useStoreData(currentUser?.uid, 'customers', defaultCustomers);

  // 상품에서 판매용/재료용 분리 (편의를 위한 계산)
  const safeProducts = Array.isArray(products) ? products : [];
  const sellableProducts = safeProducts.filter(p => !p.isIngredient); // 판매용 상품
  const ingredientProducts = safeProducts.filter(p => p.isIngredient); // 재료 (원자재)

  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSalesInput, setShowSalesInput] = useState(false);
  const [scheduleData, setScheduleData] = useStoreData(currentUser?.uid, 'schedules', {});
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [canInstall, setCanInstall] = useState(false);
  const [resFilter, setResFilter] = useState('all');

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addToast('인터넷 연결됨', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addToast('오프라인 모드 - 일부 기능이 제한됩니다', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // PWA 설치 가능 여부 확인
  useEffect(() => {
    const handleInstallPrompt = () => {
      setCanInstall(!!window.deferredPrompt);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    // 이미 프롬프트가 있는지 확인
    if (window.deferredPrompt) setCanInstall(true);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  // PWA 설치 함수
  const installPWA = async () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
      const { outcome } = await window.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        addToast('앱이 설치되었습니다!', 'success');
      }
      window.deferredPrompt = null;
      setCanInstall(false);
    }
  };

  // 토스트 알림 추가 함수
  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  // 매장 정보 (userProfile에서 가져오기)
  const storeInfo = {
    name: userProfile?.storeName || '나의 매장',
    owner: userProfile?.ownerName || currentUser?.displayName || '관리자',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
    businessNumber: userProfile?.businessNumber || ''
  };

  // 데이터 로딩 상태
  const isLoading = salesStatus.loading || invStatus.loading || staffStatus.loading ||
                    menuStatus.loading || resStatus.loading || custStatus.loading;

  // 클라우드 연결 상태
  const isConnected = !salesStatus.error && !invStatus.error;

  // 통계 계산
  const stats = useMemo(() => {
    if (!Array.isArray(salesData) || salesData.length === 0) {
      return {
        todayRevenue: 0,
        todayOrders: 0,
        todayVisitors: 0,
        revenueChange: 0,
        monthlyRevenue: 0,
        monthlyChange: 0,
        lowStockCount: 0,
        todayReservations: 0,
        totalCustomers: 0,
        vipCustomers: 0,
      };
    }

    const today = salesData[salesData.length - 1] || {};
    const yesterday = salesData[salesData.length - 2] || {};
    const thisMonth = salesData.slice(-30).reduce((sum, d) => sum + (d?.revenue || 0), 0);
    const lastMonth = salesData.slice(-60, -30).reduce((sum, d) => sum + (d?.revenue || 0), 0);
    const lowStockCount = safeProducts.filter(i => (i.minStock || 0) > 0 && i.quantity <= i.minStock).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayReservations = Array.isArray(reservations) ? reservations.filter(r => r.date === todayStr).length : 0;

    return {
      todayRevenue: today.revenue || 0,
      todayOrders: today.orders || 0,
      todayVisitors: today.visitors || 0,
      revenueChange: yesterday.revenue ? Math.round((today.revenue - yesterday.revenue) / yesterday.revenue * 100) : 0,
      monthlyRevenue: thisMonth,
      monthlyChange: lastMonth ? Math.round((thisMonth - lastMonth) / lastMonth * 100) : 0,
      lowStockCount,
      todayReservations,
      totalCustomers: Array.isArray(customers) ? customers.length : 0,
      vipCustomers: Array.isArray(customers) ? customers.filter(c => c.tier === 'VIP').length : 0,
    };
  }, [salesData, safeProducts, reservations, customers]);

  // 카테고리별 매출 (파이차트용)
  const categoryStats = useMemo(() => {
    if (sellableProducts.length === 0) return [];
    const cats = {};
    sellableProducts.forEach(m => {
      if (!cats[m.category]) cats[m.category] = 0;
      cats[m.category] += m.sales * m.price;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [sellableProducts]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // 알림 생성 (강화된 버전)
  useEffect(() => {
    const newNotifications = [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // 재고 부족 알림
    safeProducts.filter(i => (i.minStock || 0) > 0 && i.quantity <= i.minStock).forEach(item => {
      newNotifications.push({
        id: `stock-${item.id}`,
        type: 'warning',
        category: 'products',
        title: '재고 부족',
        message: `${item.name} 재고가 부족합니다 (현재: ${item.quantity}${item.unit}, 최소: ${item.minStock}${item.unit})`,
        action: () => setActiveTab('products'),
        timestamp: now.toISOString()
      });
    });

    // 재고 주의 알림 (최소재고의 1.5배 이하)
    safeProducts.filter(i => (i.minStock || 0) > 0 && i.quantity > i.minStock && i.quantity <= i.minStock * 1.5).forEach(item => {
      newNotifications.push({
        id: `stock-warning-${item.id}`,
        type: 'info',
        category: 'products',
        title: '재고 주의',
        message: `${item.name} 재고가 곧 부족해질 수 있습니다 (${item.quantity}${item.unit})`,
        action: () => setActiveTab('products'),
        timestamp: now.toISOString()
      });
    });

    // 예약 알림 (오늘 예약)
    if (Array.isArray(reservations)) {
      const todayReservations = reservations.filter(r => r.date === todayStr);

      // 곧 시작하는 예약 (1시간 이내)
      todayReservations.forEach(r => {
        const [resHour, resMin] = r.time.split(':').map(Number);
        const [curHour, curMin] = currentTime.split(':').map(Number);
        const resMinutes = resHour * 60 + resMin;
        const curMinutes = curHour * 60 + curMin;
        const diff = resMinutes - curMinutes;

        if (diff > 0 && diff <= 60) {
          newNotifications.push({
            id: `res-soon-${r.id}`,
            type: 'warning',
            category: 'reservation',
            title: '예약 임박',
            message: `${r.name}님 예약이 ${diff}분 후입니다 (${r.time}, ${r.people}명)`,
            action: () => setActiveTab('reservations'),
            timestamp: now.toISOString()
          });
        }
      });

      // 대기 중인 예약
      const pendingCount = todayReservations.filter(r => r.status === 'pending').length;
      if (pendingCount > 0) {
        newNotifications.push({
          id: 'pending-reservations',
          type: 'info',
          category: 'reservation',
          title: '대기 중 예약',
          message: `확인이 필요한 예약이 ${pendingCount}건 있습니다`,
          action: () => setActiveTab('reservations'),
          timestamp: now.toISOString()
        });
      }
    }

    // 매출 달성 알림
    if (stats.todayRevenue > 2000000) {
      newNotifications.push({
        id: 'revenue-2m',
        type: 'success',
        category: 'sales',
        title: '매출 목표 달성',
        message: '오늘 매출 200만원을 돌파했습니다!',
        action: () => setActiveTab('sales'),
        timestamp: now.toISOString()
      });
    }
    if (stats.todayRevenue > 1000000 && stats.todayRevenue <= 2000000) {
      newNotifications.push({
        id: 'revenue-1m',
        type: 'success',
        category: 'sales',
        title: '매출 알림',
        message: '오늘 매출 100만원을 돌파했습니다!',
        action: () => setActiveTab('sales'),
        timestamp: now.toISOString()
      });
    }

    setNotifications(newNotifications);
  }, [safeProducts, reservations, stats.todayRevenue]);

  // 예약 시간 체크 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      if (Array.isArray(reservations)) {
        reservations.filter(r => r.date === todayStr).forEach(r => {
          // 정확히 30분 전일 때 토스트 표시
          const [resHour, resMin] = r.time.split(':').map(Number);
          const [curHour, curMin] = currentTime.split(':').map(Number);
          const diff = (resHour * 60 + resMin) - (curHour * 60 + curMin);

          if (diff === 30) {
            addToast(`${r.name}님 예약이 30분 후입니다 (${r.people}명)`, 'warning', 8000);
          }
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [reservations]);

  // 매출 입력 처리 (재고 자동 차감 포함)
  const handleSalesInput = async (sale) => {
    const today = new Date().toISOString().split('T')[0];
    const currentData = Array.isArray(salesData) ? salesData : [];
    const todayData = currentData.find(d => d.date === today);

    if (todayData) {
      await setSalesData(currentData.map(d => d.date === today ? {
        ...d,
        revenue: d.revenue + sale.total,
        cost: d.cost + sale.cost,
        profit: d.profit + sale.profit,
        orders: d.orders + 1
      } : d));
    } else {
      await setSalesData([...currentData, {
        date: today,
        label: `${new Date().getMonth()+1}/${new Date().getDate()}`,
        revenue: sale.total,
        cost: sale.cost,
        profit: sale.profit,
        orders: 1,
        visitors: 1
      }]);
    }

    // 상품 판매량 업데이트 및 재고 차감
    const updatedProducts = [...safeProducts];
    const lowStockItems = [];

    sale.items.forEach(soldItem => {
      const prodIdx = updatedProducts.findIndex(p => p.id === soldItem.id);
      if (prodIdx !== -1) {
        // 판매량 증가
        updatedProducts[prodIdx] = {
          ...updatedProducts[prodIdx],
          sales: (updatedProducts[prodIdx].sales || 0) + soldItem.qty,
          // 재고 차감 (minStock이 설정된 경우만)
          quantity: (updatedProducts[prodIdx].minStock || 0) > 0
            ? Math.max(0, Number((updatedProducts[prodIdx].quantity - soldItem.qty).toFixed(2)))
            : updatedProducts[prodIdx].quantity
        };

        // 재고 부족 체크
        if ((updatedProducts[prodIdx].minStock || 0) > 0 && updatedProducts[prodIdx].quantity <= updatedProducts[prodIdx].minStock) {
          lowStockItems.push(updatedProducts[prodIdx]);
        }

        // 하위 재료(ingredients)도 차감
        const product = safeProducts[prodIdx];
        if (product.ingredients && Array.isArray(product.ingredients)) {
          product.ingredients.forEach(ing => {
            const ingIdx = updatedProducts.findIndex(p => p.id === ing.inventoryId);
            if (ingIdx !== -1) {
              const deductAmount = ing.amount * soldItem.qty;
              updatedProducts[ingIdx] = {
                ...updatedProducts[ingIdx],
                quantity: Math.max(0, Number((updatedProducts[ingIdx].quantity - deductAmount).toFixed(2)))
              };
              if ((updatedProducts[ingIdx].minStock || 0) > 0 && updatedProducts[ingIdx].quantity <= updatedProducts[ingIdx].minStock) {
                lowStockItems.push(updatedProducts[ingIdx]);
              }
            }
          });
        }
      }
    });

    await setProducts(updatedProducts);

    // 재고 부족 알림 (중복 제거)
    const uniqueLowStock = [...new Map(lowStockItems.map(item => [item.id, item])).values()];
    uniqueLowStock.forEach(item => {
      addToast(`${item.name} 재고 부족! (${Number(item.quantity.toFixed(2))}${item.unit})`, 'warning');
    });

    // 결제 완료 토스트
    addToast(`${formatNumber(sale.total)}원 결제 완료`, 'success');
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 일일 정산표 프린트
  const printDailyReport = () => {
    if (!Array.isArray(salesData) || salesData.length === 0) return;
    const today = salesData[salesData.length - 1];
    if (!today) return;

    const content = `
      <h1>${storeInfo.name} 일일 정산표</h1>
      <p><strong>날짜:</strong> ${today.date}</p>
      <p><strong>대표:</strong> ${storeInfo.owner}</p>

      <div class="summary">
        <h3>매출 요약</h3>
        <table>
          <tr><td>총 매출</td><td class="text-right"><strong>${formatNumber(today.revenue)}원</strong></td></tr>
          <tr><td>원가</td><td class="text-right">${formatNumber(today.cost)}원</td></tr>
          <tr><td>순이익</td><td class="text-right" style="color:green"><strong>${formatNumber(today.profit)}원</strong></td></tr>
          <tr><td>주문 건수</td><td class="text-right">${today.orders}건</td></tr>
          <tr><td>이익률</td><td class="text-right">${Math.round(today.profit/today.revenue*100)}%</td></tr>
        </table>
      </div>

      <h3>인기 메뉴 TOP 5</h3>
      <table>
        <tr><th>순위</th><th>메뉴</th><th>판매량</th><th>매출</th></tr>
        ${Array.isArray(sellableProducts) ? [...sellableProducts].sort((a,b) => b.sales - a.sales).slice(0,5).map((m,i) => `
          <tr><td>${i+1}</td><td>${m.name}</td><td>${m.sales}건</td><td>${formatNumber(m.sales * m.price)}원</td></tr>
        `).join('') : ''}
      </table>
    `;
    printReport('일일 정산표', content);
  };

  // 월간 리포트 프린트
  const printMonthlyReport = () => {
    if (!Array.isArray(salesData) || salesData.length === 0) return;
    const monthData = salesData.slice(-30);
    const totalRevenue = monthData.reduce((s, d) => s + (d?.revenue || 0), 0);
    const totalCost = monthData.reduce((s, d) => s + (d?.cost || 0), 0);
    const totalProfit = monthData.reduce((s, d) => s + (d?.profit || 0), 0);
    const totalOrders = monthData.reduce((s, d) => s + (d?.orders || 0), 0);

    const content = `
      <h1>${storeInfo.name} 월간 리포트</h1>
      <p><strong>기간:</strong> ${monthData[0]?.date} ~ ${monthData[monthData.length-1]?.date}</p>

      <div class="summary">
        <h3>월간 매출 요약</h3>
        <table>
          <tr><td>총 매출</td><td class="text-right"><strong>${formatNumber(totalRevenue)}원</strong></td></tr>
          <tr><td>총 원가</td><td class="text-right">${formatNumber(totalCost)}원</td></tr>
          <tr><td>총 순이익</td><td class="text-right" style="color:green"><strong>${formatNumber(totalProfit)}원</strong></td></tr>
          <tr><td>총 주문</td><td class="text-right">${totalOrders}건</td></tr>
          <tr><td>일 평균 매출</td><td class="text-right">${formatNumber(Math.round(totalRevenue/30))}원</td></tr>
          <tr><td>평균 이익률</td><td class="text-right">${totalRevenue > 0 ? Math.round(totalProfit/totalRevenue*100) : 0}%</td></tr>
        </table>
      </div>

      <h3>일별 매출 내역</h3>
      <table>
        <tr><th>날짜</th><th>매출</th><th>원가</th><th>순이익</th><th>주문</th></tr>
        ${monthData.map(d => `
          <tr><td>${d.date}</td><td class="text-right">${formatNumber(d.revenue)}원</td><td class="text-right">${formatNumber(d.cost)}원</td><td class="text-right">${formatNumber(d.profit)}원</td><td class="text-right">${d.orders}건</td></tr>
        `).join('')}
      </table>
    `;
    printReport('월간 리포트', content);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-slate-400 text-sm mb-2">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm" style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}원</p>
        ))}
      </div>
    );
  };

  // 로딩 중이면 로딩 화면 표시
  if (isLoading) {
    return <LoadingScreen />;
  }

  // ========== 탭 렌더링 ==========
  const renderDashboard = () => (
    <div className="space-y-6 fade-in">
      {/* 빠른 액션 */}
      <div className="flex gap-3 flex-wrap">
        <Button icon={Plus} onClick={() => setShowSalesInput(true)}>매출 입력</Button>
        <Button variant="secondary" icon={Printer} onClick={printDailyReport}>일일 정산</Button>
        <Button variant="secondary" icon={FileText} onClick={printMonthlyReport}>월간 리포트</Button>
      </div>

      {/* 상단 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="오늘 매출" value={`${formatCurrency(stats.todayRevenue)}원`} change={Math.abs(stats.revenueChange)} trend={stats.revenueChange >= 0 ? 'up' : 'down'} icon={DollarSign} color="gradient-primary" subtitle="전일 대비" />
        <StatCard title="오늘 주문" value={`${stats.todayOrders}건`} icon={ShoppingCart} color="gradient-success" subtitle={`방문 ${stats.todayVisitors}명`} />
        <StatCard title="오늘 예약" value={`${stats.todayReservations}건`} icon={Calendar} color="gradient-warning" subtitle="대기중인 예약" onClick={() => setActiveTab('reservations')} />
        <StatCard title="재고 알림" value={`${stats.lowStockCount}건`} icon={Package} color={stats.lowStockCount > 0 ? 'gradient-danger' : 'bg-slate-600'} subtitle="부족 품목" onClick={() => setActiveTab('products')} />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">매출 추이</h3>
              <p className="text-slate-400 text-sm">최근 30일</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-slate-400">매출</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-slate-400">순이익</span></div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.isArray(salesData) ? salesData : []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v/10000}만`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#colorRevenue)" name="매출" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#colorProfit)" name="순이익" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 카테고리별 매출 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">카테고리별 매출</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {categoryStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${formatCurrency(v)}원`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {categoryStats.map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-400 text-sm">{cat.name}</span>
                </div>
                <span className="text-white text-sm">{formatCurrency(cat.value)}원</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 인기 메뉴 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">인기 메뉴 TOP 5</h3>
          <div className="space-y-3">
            {sellableProducts.length > 0 && [...sellableProducts].sort((a, b) => b.sales - a.sales).slice(0, 5).map((item, i) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-slate-400 text-black' : i === 2 ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-slate-500 text-xs">{item.sales}건 판매</p>
                </div>
                <p className="text-indigo-400 font-medium">{formatNumber(item.price)}원</p>
              </div>
            ))}
          </div>
        </div>

        {/* 오늘 예약 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">오늘 예약</h3>
          <div className="space-y-3">
            {Array.isArray(reservations) && reservations.filter(r => r.date === new Date().toISOString().split('T')[0] || r.date === '2026-01-18').slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{r.name}</p>
                  <p className="text-slate-500 text-sm">{r.time} · {r.people}명</p>
                </div>
                <Badge variant={r.status === 'confirmed' ? 'success' : 'warning'}>{r.status === 'confirmed' ? '확정' : '대기'}</Badge>
              </div>
            ))}
            {(!Array.isArray(reservations) || reservations.filter(r => r.date === new Date().toISOString().split('T')[0]).length === 0) && (
              <p className="text-slate-500 text-center py-4">오늘 예약이 없습니다</p>
            )}
          </div>
        </div>

        {/* 알림 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">알림</h3>
          <div className="space-y-3">
            {notifications.length > 0 ? notifications.slice(0, 5).map((n, i) => (
              <div key={n.id || i} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${n.type === 'warning' ? 'bg-amber-500/10' : n.type === 'success' ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`} onClick={() => n.action?.()}>
                {n.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" /> : n.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> : <Bell className="w-5 h-5 text-indigo-400 shrink-0" />}
                <div>
                  <p className={`text-sm font-medium ${n.type === 'warning' ? 'text-amber-200' : n.type === 'success' ? 'text-emerald-200' : 'text-indigo-200'}`}>{n.title || '알림'}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{n.message}</p>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-center py-4">새로운 알림이 없습니다</p>
            )}
          </div>
        </div>
      </div>

      {/* 추가 위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIP 고객 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">VIP 고객</h3>
            <button onClick={() => setActiveTab('customers')} className="text-indigo-400 text-sm hover:underline">전체보기</button>
          </div>
          <div className="space-y-3">
            {Array.isArray(customers) && customers
              .filter(c => c.tier === 'VIP' || c.tier === 'Gold')
              .sort((a, b) => b.totalSpent - a.totalSpent)
              .slice(0, 4)
              .map(c => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${c.tier === 'VIP' ? 'bg-purple-500' : 'bg-yellow-500'}`}>
                    {c.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-slate-500 text-sm">{c.visits}회 방문 · 최근 {c.lastVisit?.slice(5)}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={c.tier.toLowerCase()}>{c.tier}</Badge>
                    <p className="text-emerald-400 text-sm mt-1">{formatCurrency(c.totalSpent)}원</p>
                  </div>
                </div>
              ))}
            {(!Array.isArray(customers) || customers.filter(c => c.tier === 'VIP' || c.tier === 'Gold').length === 0) && (
              <p className="text-slate-500 text-center py-4">VIP 고객이 없습니다</p>
            )}
          </div>
        </div>

        {/* 월간 목표 & 실적 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">월간 실적</h3>
          <div className="space-y-4">
            {/* 매출 목표 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">매출 목표 (5,000만원)</span>
                <span className="text-white font-medium">{Math.min(100, Math.round(stats.monthlyRevenue / 50000000 * 100))}%</span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, stats.monthlyRevenue / 50000000 * 100)}%`,
                    background: stats.monthlyRevenue >= 50000000 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                  }}
                />
              </div>
              <p className="text-slate-500 text-xs mt-1">{formatCurrency(stats.monthlyRevenue)}원 / 5,000만원</p>
            </div>

            {/* 주문 목표 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">주문 목표 (3,000건)</span>
                <span className="text-white font-medium">{Math.min(100, Math.round(stats.todayOrders * 30 / 3000 * 100))}%</span>
              </div>
              <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.todayOrders * 30 / 3000 * 100)}%` }}
                />
              </div>
            </div>

            {/* 이번 달 요약 */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                <p className="text-slate-400 text-xs">일 평균 매출</p>
                <p className="text-white font-bold text-lg">{formatCurrency(Math.round(stats.monthlyRevenue / 30))}원</p>
              </div>
              <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                <p className="text-slate-400 text-xs">전월 대비</p>
                <p className={`font-bold text-lg ${stats.monthlyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.monthlyChange >= 0 ? '+' : ''}{stats.monthlyChange}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSales = () => {
    const safeSalesData = Array.isArray(salesData) ? salesData : [];
    const safeMenu = sellableProducts;

    // 기간별 데이터 계산
    const today = safeSalesData[safeSalesData.length - 1] || { revenue: 0, cost: 0, profit: 0, orders: 0 };
    const last7Days = safeSalesData.slice(-7);
    const last30Days = safeSalesData.slice(-30);
    const prevWeek = safeSalesData.slice(-14, -7);
    const prevMonth = safeSalesData.slice(-60, -30);

    const weeklyRevenue = last7Days.reduce((s, d) => s + (d?.revenue || 0), 0);
    const prevWeekRevenue = prevWeek.reduce((s, d) => s + (d?.revenue || 0), 0);
    const weeklyChange = prevWeekRevenue > 0 ? Math.round((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue * 100) : 0;

    const monthlyRevenue = last30Days.reduce((s, d) => s + (d?.revenue || 0), 0);
    const monthlyProfit = last30Days.reduce((s, d) => s + (d?.profit || 0), 0);
    const monthlyOrders = last30Days.reduce((s, d) => s + (d?.orders || 0), 0);
    const avgOrderValue = monthlyOrders > 0 ? Math.round(monthlyRevenue / monthlyOrders) : 0;

    // 베스트셀러
    const bestSellers = [...safeMenu].sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 5);

    // 카테고리별 매출
    const categoryRevenue = {};
    safeMenu.forEach(m => {
      if (!categoryRevenue[m.category]) categoryRevenue[m.category] = 0;
      categoryRevenue[m.category] += (m.sales || 0) * m.price;
    });
    const categoryData = Object.entries(categoryRevenue).map(([name, value]) => ({ name, value }));

    // 요일별 평균 매출
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayRevenue = [0, 0, 0, 0, 0, 0, 0];
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    safeSalesData.forEach(d => {
      const day = new Date(d.date).getDay();
      dayRevenue[day] += d.revenue || 0;
      dayCounts[day]++;
    });
    const avgByDay = dayNames.map((name, i) => ({
      name,
      avg: dayCounts[i] > 0 ? Math.round(dayRevenue[i] / dayCounts[i]) : 0
    }));
    const bestDay = avgByDay.reduce((best, curr) => curr.avg > best.avg ? curr : best, avgByDay[0]);

    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">매출 관리</h2>
            <p className="text-slate-400">매출 현황 및 상세 분석</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" icon={Download} onClick={() => exportToCSV(safeSalesData, 'sales')}>엑셀 다운로드</Button>
            <Button variant="secondary" icon={Printer} onClick={printDailyReport}>일일 정산</Button>
            <Button icon={FileText} onClick={printMonthlyReport}>월간 리포트</Button>
          </div>
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="오늘 매출" value={`${formatCurrency(today.revenue)}원`} icon={DollarSign} color="gradient-primary" subtitle={`${today.orders || 0}건 주문`} />
          <StatCard title="이번 주 매출" value={`${formatCurrency(weeklyRevenue)}원`} change={Math.abs(weeklyChange)} trend={weeklyChange >= 0 ? 'up' : 'down'} icon={TrendingUp} color="gradient-success" />
          <StatCard title="이번 달 매출" value={`${formatCurrency(monthlyRevenue)}원`} icon={Wallet} color="gradient-warning" subtitle={`순이익 ${formatCurrency(monthlyProfit)}원`} />
          <StatCard title="평균 객단가" value={`${formatNumber(avgOrderValue)}원`} icon={Receipt} color="gradient-info" subtitle={`총 ${monthlyOrders}건`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 매출 추이 그래프 */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">최근 30일 매출 추이</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last30Days}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value) => [formatNumber(value) + '원', '매출']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#salesGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 베스트셀러 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">베스트셀러 TOP 5</h3>
            <div className="space-y-3">
              {bestSellers.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-slate-400 text-sm">{item.sales || 0}잔 · {formatNumber((item.sales || 0) * item.price)}원</p>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && <p className="text-slate-500 text-center py-4">판매 데이터 없음</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 요일별 평균 매출 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">요일별 평균 매출</h3>
            <p className="text-slate-400 text-sm mb-4">최고 매출 요일: <span className="text-indigo-400 font-medium">{bestDay.name}요일</span></p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={avgByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => [formatNumber(value) + '원', '평균 매출']}
                  />
                  <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 카테고리별 매출 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">카테고리별 매출</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value) + '원'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 일별 매출 테이블 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">일별 매출 상세</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">날짜</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">매출</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">원가</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">순이익</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">주문</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">객단가</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">이익률</th>
                </tr>
              </thead>
              <tbody>
                {safeSalesData.slice().reverse().slice(0, 14).map(d => (
                  <tr key={d.date} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-white">{d.date}</td>
                    <td className="py-3 px-4 text-right text-white font-medium">{formatNumber(d.revenue)}원</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatNumber(d.cost)}원</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{formatNumber(d.profit)}원</td>
                    <td className="py-3 px-4 text-right text-slate-300">{d.orders}건</td>
                    <td className="py-3 px-4 text-right text-slate-300">{formatNumber(d.orders > 0 ? Math.round(d.revenue / d.orders) : 0)}원</td>
                    <td className="py-3 px-4 text-right"><Badge variant={d.revenue > 0 && d.profit/d.revenue > 0.65 ? 'success' : 'warning'}>{d.revenue > 0 ? Math.round(d.profit/d.revenue*100) : 0}%</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const [productFilter, setProductFilter] = useState('all'); // all, sellable, ingredient

  const renderProducts = () => {
    const filteredProducts = safeProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = productFilter === 'all' ||
        (productFilter === 'sellable' && !p.isIngredient) ||
        (productFilter === 'ingredient' && p.isIngredient);
      return matchesSearch && matchesFilter;
    });

    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">상품 관리</h2>
            <p className="text-slate-400">판매 상품 및 재료 통합 관리</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={() => exportToCSV(safeProducts, 'products')}>엑셀 다운로드</Button>
            <Button icon={Plus} onClick={() => { setEditItem(null); setShowModal('product'); }}>상품 추가</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="전체 상품" value={`${safeProducts.length}개`} icon={Package} color="gradient-primary" />
          <StatCard title="판매 상품" value={`${sellableProducts.length}개`} icon={ShoppingCart} color="gradient-info" />
          <StatCard title="재고 부족" value={`${stats.lowStockCount}개`} icon={AlertTriangle} color={stats.lowStockCount > 0 ? 'gradient-danger' : 'bg-slate-600'} />
          <StatCard title="총 재고가치" value={`${formatCurrency(safeProducts.reduce((s,i) => s + (i.quantity || 0) * (i.cost || 0), 0))}원`} icon={Wallet} color="gradient-success" />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: '전체' },
            { id: 'sellable', label: '판매 상품' },
            { id: 'ingredient', label: '재료 (원자재)' },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setProductFilter(filter.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${productFilter === filter.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input type="text" placeholder="상품 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">상품명</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">카테고리</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">판매가</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">원가</th>
                  <th className="text-right py-3 px-4 text-slate-400 font-medium">재고</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">상태</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(item => (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{item.name}</span>
                        {item.isIngredient && <Badge variant="secondary">재료</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{item.category}</td>
                    <td className="py-3 px-4 text-right text-white">{item.isIngredient ? '-' : `${formatNumber(item.price)}원`}</td>
                    <td className="py-3 px-4 text-right text-slate-400">{formatNumber(item.cost)}원</td>
                    <td className="py-3 px-4 text-right text-white">{Number((item.quantity || 0).toFixed(2))}{item.unit}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={
                        (item.minStock || 0) === 0 ? 'secondary' :
                        item.quantity <= item.minStock ? 'danger' :
                        item.quantity <= item.minStock * 1.5 ? 'warning' : 'success'
                      }>
                        {(item.minStock || 0) === 0 ? '무제한' :
                         item.quantity <= item.minStock ? '부족' :
                         item.quantity <= item.minStock * 1.5 ? '주의' : '정상'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => { setEditItem(item); setShowModal('product'); }} className="p-1.5 hover:bg-slate-700 rounded-lg"><Edit3 className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={() => setProducts(safeProducts.filter(i => i.id !== item.id))} className="p-1.5 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderStaff = () => {
    const safeStaff = Array.isArray(staff) ? staff : [];
    const safeSchedule = scheduleData || {};

    // 달력 생성
    const currentDate = new Date(selectedScheduleDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

    // 스케줄 토글
    const toggleSchedule = async (date, staffId) => {
      const dateKey = date;
      const currentSchedule = safeSchedule[dateKey] || [];
      const newSchedule = currentSchedule.includes(staffId)
        ? currentSchedule.filter(id => id !== staffId)
        : [...currentSchedule, staffId];

      await setScheduleData({
        ...safeSchedule,
        [dateKey]: newSchedule
      });
    };

    // 해당 날짜의 근무자 목록
    const getStaffForDate = (day) => {
      if (!day) return [];
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const staffIds = safeSchedule[dateKey] || [];
      return safeStaff.filter(s => staffIds.includes(s.id));
    };

    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">직원 관리</h2>
            <p className="text-slate-400">직원 현황 및 근무 스케줄</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={() => exportToCSV(safeStaff, 'staff')}>엑셀 다운로드</Button>
            <Button icon={Plus} onClick={() => { setEditItem(null); setShowModal('staff'); }}>직원 추가</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard title="전체 직원" value={`${safeStaff.length}명`} icon={Users} color="gradient-primary" />
          <StatCard title="근무중" value={`${safeStaff.filter(s => s.status === 'active').length}명`} icon={UserCheck} color="gradient-success" />
          <StatCard title="이번 달 인건비" value={`${formatCurrency(safeStaff.reduce((s,st) => s + (st.salary || 0), 0))}원`} icon={Wallet} color="gradient-warning" />
          <StatCard title="오늘 근무" value={`${(safeSchedule[today] || []).length}명`} icon={Clock} color="gradient-info" />
        </div>

        {/* 근무 스케줄 달력 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-white">근무 스케줄</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={Calendar} onClick={() => setShowModal('bulk-schedule')}>일괄 설정</Button>
              <button
                onClick={() => {
                  const prev = new Date(year, month - 1, 1);
                  setSelectedScheduleDate(prev.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                style={{ color: '#94a3b8' }}
              >
                ◀
              </button>
              <span className="text-white font-medium px-4">{year}년 {month + 1}월</span>
              <button
                onClick={() => {
                  const next = new Date(year, month + 1, 1);
                  setSelectedScheduleDate(next.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                style={{ color: '#94a3b8' }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <div key={day} className="text-center py-2 text-sm font-medium" style={{ color: i === 0 ? '#f87171' : i === 6 ? '#60a5fa' : '#94a3b8' }}>
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              const dateKey = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const isToday = dateKey === today;
              const staffForDay = getStaffForDate(day);

              return (
                <div
                  key={idx}
                  className={`min-h-16 sm:min-h-24 p-1 sm:p-2 rounded-lg ${day ? 'bg-slate-900/50 hover:bg-slate-700/50 cursor-pointer' : ''} ${isToday ? 'ring-2 ring-indigo-500' : ''}`}
                  onClick={() => day && setShowModal(`schedule-${dateKey}`)}
                >
                  {day && (
                    <>
                      <div className={`text-xs sm:text-sm mb-1 ${isToday ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>{day}</div>
                      <div className="space-y-0.5 sm:space-y-1">
                        {staffForDay.slice(0, window.innerWidth < 640 ? 2 : 3).map(s => (
                          <div key={s.id} className="text-xs px-1 sm:px-1.5 py-0.5 rounded truncate" style={{ backgroundColor: s.color + '40', color: s.color }}>
                            <span className="hidden sm:inline">{s.name}</span>
                            <span className="sm:hidden">{s.name.charAt(0)}</span>
                          </div>
                        ))}
                        {staffForDay.length > (window.innerWidth < 640 ? 2 : 3) && (
                          <div className="text-xs text-slate-500">+{staffForDay.length - (window.innerWidth < 640 ? 2 : 3)}</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-700">
            {safeStaff.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                <span className="text-sm text-slate-400">{s.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 직원 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {safeStaff.map(s => (
            <div key={s.id} className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-5 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: s.color || '#6366f1' }}>{s.name?.charAt(0)}</div>
                <Badge variant={s.status === 'active' ? 'success' : 'default'}>{s.status === 'active' ? '근무중' : '휴무'}</Badge>
              </div>
              <h4 className="text-white font-semibold text-lg">{s.name}</h4>
              <p className="text-slate-400 text-sm mb-3">{s.role}</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-400"><Phone className="w-4 h-4" /><span>{s.phone}</span></div>
                <div className="flex items-center gap-2 text-slate-400"><Wallet className="w-4 h-4" /><span>{formatNumber(s.salary || 0)}원/월</span></div>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                <button onClick={() => { setEditItem(s); setShowModal('staff'); }} className="flex-1 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition">수정</button>
                <button onClick={() => setStaff(staff.filter(st => st.id !== s.id))} className="flex-1 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition">삭제</button>
              </div>
            </div>
          ))}
        </div>

        {/* 스케줄 편집 모달 */}
        {showModal?.startsWith('schedule-') && (
          <Modal isOpen={true} onClose={() => setShowModal(null)} title={`${showModal.replace('schedule-', '')} 근무 배정`}>
            <div className="space-y-3">
              {safeStaff.map(s => {
                const dateKey = showModal.replace('schedule-', '');
                const isScheduled = (safeSchedule[dateKey] || []).includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSchedule(dateKey, s.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${isScheduled ? 'bg-indigo-500/20 border border-indigo-500' : 'bg-slate-900/50 border border-slate-700 hover:border-slate-600'}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: s.color || '#6366f1' }}>{s.name?.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{s.name}</p>
                      <p className="text-slate-400 text-sm">{s.role}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isScheduled ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                      {isScheduled && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </Modal>
        )}

        {/* 일괄 스케줄 설정 모달 */}
        {showModal === 'bulk-schedule' && (
          <BulkScheduleModal
            isOpen={true}
            onClose={() => setShowModal(null)}
            staff={safeStaff}
            scheduleData={safeSchedule}
            setScheduleData={setScheduleData}
            year={year}
            month={month}
          />
        )}
      </div>
    );
  };

  const renderReservations = () => {
    const safeReservations = Array.isArray(reservations) ? reservations : [];
    const todayStr = new Date().toISOString().split('T')[0];

    // 필터된 예약 목록
    const filteredReservations = safeReservations.filter(r => {
      if (resFilter === 'today') return r.date === todayStr;
      if (resFilter === 'pending') return r.status === 'pending';
      if (resFilter === 'confirmed') return r.status === 'confirmed';
      return true;
    }).sort((a, b) => {
      // 날짜순, 시간순 정렬
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });

    // 예약 상태 변경
    const changeStatus = async (id, newStatus) => {
      await setReservations(safeReservations.map(r => r.id === id ? {...r, status: newStatus} : r));
      addToast(`예약이 ${newStatus === 'confirmed' ? '확정' : newStatus === 'cancelled' ? '취소' : '대기'}되었습니다`, newStatus === 'confirmed' ? 'success' : 'info');
    };

    return (
      <div className="space-y-6 fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">예약 관리</h2>
            <p className="text-slate-400">예약 현황 및 관리</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={Download} onClick={() => exportToCSV(safeReservations, 'reservations')}>엑셀 다운로드</Button>
            <Button icon={Plus} onClick={() => { setEditItem(null); setShowModal('reservation'); }}>예약 추가</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="전체 예약" value={`${safeReservations.length}건`} icon={Calendar} color="gradient-primary" onClick={() => setResFilter('all')} />
          <StatCard title="오늘 예약" value={`${safeReservations.filter(r => r.date === todayStr).length}건`} icon={Clock} color="gradient-success" onClick={() => setResFilter('today')} />
          <StatCard title="대기중" value={`${safeReservations.filter(r => r.status === 'pending').length}건`} icon={AlertTriangle} color="gradient-warning" onClick={() => setResFilter('pending')} />
          <StatCard title="확정" value={`${safeReservations.filter(r => r.status === 'confirmed').length}건`} icon={CheckCircle} color="gradient-info" onClick={() => setResFilter('confirmed')} />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: '전체' },
            { id: 'today', label: '오늘' },
            { id: 'pending', label: '대기중' },
            { id: 'confirmed', label: '확정' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setResFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${resFilter === f.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 예약 카드 (모바일) / 테이블 (데스크톱) */}
        <div className="lg:hidden space-y-3">
          {filteredReservations.map(r => (
            <div key={r.id} className={`bg-slate-800/50 backdrop-blur border rounded-xl p-4 ${r.status === 'pending' ? 'border-amber-500/50' : r.status === 'confirmed' ? 'border-emerald-500/50' : 'border-slate-700/50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-semibold text-lg">{r.name}</p>
                  <p className="text-slate-400 text-sm">{r.phone}</p>
                </div>
                <Badge variant={r.status === 'confirmed' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'}>
                  {r.status === 'confirmed' ? '확정' : r.status === 'pending' ? '대기' : '취소'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <p className="text-slate-500 text-xs">날짜</p>
                  <p className="text-white font-medium">{r.date?.slice(5)}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <p className="text-slate-500 text-xs">시간</p>
                  <p className="text-white font-medium">{r.time}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <p className="text-slate-500 text-xs">인원</p>
                  <p className="text-white font-medium">{r.people}명</p>
                </div>
              </div>
              {r.note && <p className="text-slate-400 text-sm mb-3 bg-slate-900/50 rounded-lg p-2">{r.note}</p>}
              <div className="flex gap-2">
                {r.status === 'pending' && (
                  <button onClick={() => changeStatus(r.id, 'confirmed')} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition">확정</button>
                )}
                {r.status === 'confirmed' && (
                  <button onClick={() => changeStatus(r.id, 'pending')} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition">대기로 변경</button>
                )}
                {r.status !== 'cancelled' && (
                  <button onClick={() => changeStatus(r.id, 'cancelled')} className="py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition">취소</button>
                )}
                <button onClick={() => { setEditItem(r); setShowModal('reservation'); }} className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {filteredReservations.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>예약이 없습니다</p>
            </div>
          )}
        </div>

        {/* 데스크톱 테이블 */}
        <div className="hidden lg:block bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">예약자</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">연락처</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">날짜</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">시간</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">인원</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">메모</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">상태</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredReservations.map(r => (
                  <tr key={r.id} className={`border-b border-slate-700/50 hover:bg-slate-700/20 ${r.date === todayStr ? 'bg-indigo-500/5' : ''}`}>
                    <td className="py-3 px-4 text-white font-medium">{r.name}</td>
                    <td className="py-3 px-4 text-slate-400">{r.phone}</td>
                    <td className="py-3 px-4">
                      <span className={r.date === todayStr ? 'text-indigo-400 font-medium' : 'text-white'}>{r.date}</span>
                      {r.date === todayStr && <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">오늘</span>}
                    </td>
                    <td className="py-3 px-4 text-white">{r.time}</td>
                    <td className="py-3 px-4 text-center text-white">{r.people}명</td>
                    <td className="py-3 px-4 text-slate-400 max-w-32 truncate">{r.note || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={r.status}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm cursor-pointer"
                        style={{ color: r.status === 'confirmed' ? '#10b981' : r.status === 'pending' ? '#f59e0b' : '#ef4444' }}
                      >
                        <option value="pending" style={{ color: '#f59e0b' }}>대기</option>
                        <option value="confirmed" style={{ color: '#10b981' }}>확정</option>
                        <option value="cancelled" style={{ color: '#ef4444' }}>취소</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setEditItem(r); setShowModal('reservation'); }} className="p-1.5 hover:bg-slate-700 rounded-lg"><Edit3 className="w-4 h-4 text-slate-400" /></button>
                        <button onClick={() => setReservations(safeReservations.filter(res => res.id !== r.id))} className="p-1.5 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredReservations.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>예약이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomers = () => (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">고객 관리</h2>
          <p className="text-slate-400">단골 고객 및 등급 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} onClick={() => exportToCSV(Array.isArray(customers) ? customers : [], 'customers')}>엑셀 다운로드</Button>
          <Button icon={Plus} onClick={() => { setEditItem(null); setShowModal('customer'); }}>고객 추가</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="전체 고객" value={`${Array.isArray(customers) ? customers.length : 0}명`} icon={Users} color="gradient-primary" />
        <StatCard title="VIP 고객" value={`${stats.vipCustomers}명`} icon={Star} color="gradient-warning" />
        <StatCard title="이번 달 방문" value={`${Array.isArray(customers) ? customers.filter(c => c.lastVisit >= '2026-01-01').length : 0}명`} icon={UserCheck} color="gradient-success" />
        <StatCard title="총 매출 기여" value={`${formatCurrency(Array.isArray(customers) ? customers.reduce((s,c) => s + c.totalSpent, 0) : 0)}원`} icon={Wallet} color="gradient-danger" />
      </div>

      <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-medium">고객명</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">연락처</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">등급</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">방문 횟수</th>
                <th className="text-right py-3 px-4 text-slate-400 font-medium">총 소비금액</th>
                <th className="text-left py-3 px-4 text-slate-400 font-medium">최근 방문</th>
                <th className="text-center py-3 px-4 text-slate-400 font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(customers) && customers.map(c => (
                <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4 text-white font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-slate-400">{c.phone}</td>
                  <td className="py-3 px-4 text-center"><Badge variant={c.tier.toLowerCase()}>{c.tier}</Badge></td>
                  <td className="py-3 px-4 text-right text-white">{c.visits}회</td>
                  <td className="py-3 px-4 text-right text-emerald-400">{formatNumber(c.totalSpent)}원</td>
                  <td className="py-3 px-4 text-slate-400">{c.lastVisit}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditItem(c); setShowModal('customer'); }} className="p-1.5 hover:bg-slate-700 rounded-lg"><Edit3 className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => setCustomers(customers.filter(cu => cu.id !== c.id))} className="p-1.5 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 fade-in">
      <div>
        <h2 className="text-2xl font-bold text-white">설정</h2>
        <p className="text-slate-400">계정 및 앱 설정</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 계정 정보 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-lg gradient-primary"><Store className="w-5 h-5 text-white" /></div>
            <h3 className="text-lg font-semibold text-white">계정 정보</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-lg">
              <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
                {storeInfo.owner?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{storeInfo.name}</p>
                <p className="text-slate-400 text-sm">{currentUser?.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                    <Cloud className="w-4 h-4" />
                    <span>연결됨</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-red-400 text-sm">
                    <CloudOff className="w-4 h-4" />
                    <span>오프라인</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-white font-medium">클라우드 동기화</span>
              </div>
              <p className="text-slate-400 text-sm">
                모든 데이터가 클라우드에 자동 저장됩니다. 어느 기기에서든 로그인하여 데이터에 접근할 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg bg-slate-600">{darkMode ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}</div>
              <h3 className="text-lg font-semibold text-white">테마 설정</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">다크 모드</p>
                <p className="text-slate-400 text-sm">어두운 테마를 사용합니다</p>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className={`w-14 h-7 rounded-full transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${darkMode ? 'translate-x-7' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg gradient-success"><Database className="w-5 h-5 text-white" /></div>
              <h3 className="text-lg font-semibold text-white">데이터 관리</h3>
            </div>
            <div className="space-y-3">
              <Button variant="secondary" icon={Download} className="w-full" onClick={() => {
                const data = { salesData, products, staff, reservations, customers };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}>데이터 백업</Button>
              <Button variant="danger" icon={LogOut} className="w-full" onClick={handleLogout}>
                로그아웃
              </Button>
            </div>
          </div>

          {/* PWA 설치 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg gradient-primary"><Zap className="w-5 h-5 text-white" /></div>
              <h3 className="text-lg font-semibold text-white">앱 설치</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: isOnline ? '#059669' + '20' : '#dc2626' + '20' }}>
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className={isOnline ? 'text-emerald-400' : 'text-red-400'}>
                  {isOnline ? '온라인 상태' : '오프라인 모드'}
                </span>
              </div>

              {canInstall ? (
                <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                  <p className="text-white font-medium mb-2">홈 화면에 앱 추가</p>
                  <p className="text-slate-400 text-sm mb-3">
                    앱을 설치하면 더 빠르게 접근하고, 오프라인에서도 사용할 수 있습니다.
                  </p>
                  <Button icon={Download} className="w-full" onClick={installPWA}>
                    앱 설치하기
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">설치됨</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    StoreHub 앱이 이미 설치되어 있거나, 현재 브라우저에서 앱 설치를 지원하지 않습니다.
                  </p>
                </div>
              )}

              <div className="text-center pt-2">
                <p className="text-slate-600 text-xs">StoreHub v1.0.0</p>
                <p className="text-slate-600 text-xs">매장 관리 솔루션</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 폼 제출 핸들러
  const handleFormSubmit = async (type, data) => {
    if (type === 'product') {
      const newId = Math.max(0, ...safeProducts.map(i => i.id || 0)) + 1;
      if (editItem) {
        await setProducts(safeProducts.map(p => p.id === editItem.id ? {...p, ...data} : p));
      } else {
        await setProducts([...safeProducts, { id: newId, ...data, sales: 0 }]);
      }
    } else if (type === 'staff') {
      const safeList = Array.isArray(staff) ? staff : [];
      const newId = Math.max(0, ...safeList.map(i => i.id || 0)) + 1;
      editItem ? await setStaff(safeList.map(s => s.id === editItem.id ? {...s, ...data} : s)) : await setStaff([...safeList, { id: newId, ...data, color: `#${Math.floor(Math.random()*16777215).toString(16)}` }]);
    } else if (type === 'reservation') {
      const safeList = Array.isArray(reservations) ? reservations : [];
      const newId = Math.max(0, ...safeList.map(i => i.id || 0)) + 1;
      editItem ? await setReservations(safeList.map(r => r.id === editItem.id ? {...r, ...data} : r)) : await setReservations([...safeList, { id: newId, ...data }]);
    } else if (type === 'customer') {
      const safeList = Array.isArray(customers) ? customers : [];
      const newId = Math.max(0, ...safeList.map(i => i.id || 0)) + 1;
      editItem ? await setCustomers(safeList.map(c => c.id === editItem.id ? {...c, ...data} : c)) : await setCustomers([...safeList, { id: newId, ...data }]);
    }
    setShowModal(null);
    setEditItem(null);
  };

  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'sales', label: '매출관리', icon: BarChart2 },
    { id: 'products', label: '상품관리', icon: Package },
    { id: 'staff', label: '직원관리', icon: Users },
    { id: 'reservations', label: '예약관리', icon: Calendar },
    { id: 'customers', label: '고객관리', icon: UserCheck },
    { id: 'settings', label: '설정', icon: Settings },
  ];

  // Shield 아이콘 추가 import
  const Shield = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-900' : 'light bg-slate-100'}`}>
      {/* 모바일 헤더 */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-800 rounded-lg"><Menu className="w-6 h-6 text-white" /></button>
          <h1 className="text-lg font-bold text-white">{storeInfo.name}</h1>
          <button onClick={() => setShowNotificationCenter(true)} className="p-2 hover:bg-slate-800 rounded-lg relative">
            <Bell className="w-6 h-6 text-white" />
            {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>
      </header>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />}

      {/* 사이드바 */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center"><Zap className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-lg font-bold text-white">{storeInfo.name}</h1>
              <p className="text-xs text-slate-500">Business Manager</p>
            </div>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {tabs.map(tab => (
            <SidebarItem key={tab.id} icon={tab.icon} label={tab.label} active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} badge={tab.id === 'products' ? stats.lowStockCount : 0} />
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">{storeInfo.owner?.charAt(0) || 'U'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{storeInfo.owner}</p>
              <p className="text-xs text-slate-500">{currentUser?.email?.split('@')[0]}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 pb-20 lg:pb-0 p-4 lg:p-8">
          <div className="hidden lg:flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h1>
              <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isConnected ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                <span>{isConnected ? '클라우드 연결됨' : '오프라인'}</span>
              </div>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 hover:bg-slate-800 rounded-xl transition">{darkMode ? <Sun className="w-5 h-5 text-slate-400" /> : <Moon className="w-5 h-5 text-slate-600" />}</button>
              <button onClick={() => setShowNotificationCenter(true)} className="p-2.5 hover:bg-slate-800 rounded-xl transition relative">
                <Bell className="w-5 h-5 text-slate-400" />
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'staff' && renderStaff()}
          {activeTab === 'reservations' && renderReservations()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* 매출 입력 모달 */}
      <SalesInputModal isOpen={showSalesInput} onClose={() => setShowSalesInput(false)} onSubmit={handleSalesInput} menu={sellableProducts} />

      {/* 상품 모달 */}
      <ProductModal
        isOpen={showModal === 'product'}
        onClose={() => { setShowModal(null); setEditItem(null); }}
        onSubmit={(data) => handleFormSubmit('product', data)}
        editItem={editItem}
        ingredientProducts={ingredientProducts}
      />

      <Modal isOpen={showModal === 'staff'} onClose={() => { setShowModal(null); setEditItem(null); }} title={editItem ? '직원 수정' : '직원 추가'}>
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.target); handleFormSubmit('staff', { name: f.get('name'), role: f.get('role'), phone: f.get('phone'), salary: Math.round(Number(f.get('salary'))), status: f.get('status') }); }} className="space-y-4">
          <Input name="name" label="이름" defaultValue={editItem?.name} required />
          <SelectWithCustom name="role" label="직책" defaultValue={editItem?.role || '바리스타'} options={[{ value: '매니저', label: '매니저' }, { value: '바리스타', label: '바리스타' }, { value: '파트타임', label: '파트타임' }, { value: '인턴', label: '인턴' }]} placeholder="직책 입력..." />
          <PhoneInput name="phone" label="연락처" defaultValue={editItem?.phone} placeholder="01012345678" required />
          <Input name="salary" label="월급" type="number" step="1" defaultValue={editItem?.salary ? Math.round(editItem.salary) : 0} required />
          <Select name="status" label="상태" defaultValue={editItem?.status || 'active'} options={[{ value: 'active', label: '근무중' }, { value: 'inactive', label: '휴무' }]} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowModal(null); setEditItem(null); }}>취소</Button>
            <Button type="submit" className="flex-1">{editItem ? '수정' : '추가'}</Button>
          </div>
        </form>
      </Modal>

      
      <Modal isOpen={showModal === 'reservation'} onClose={() => { setShowModal(null); setEditItem(null); }} title={editItem ? '예약 수정' : '예약 추가'}>
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.target); handleFormSubmit('reservation', { name: f.get('name'), phone: f.get('phone'), date: f.get('date'), time: f.get('time'), people: Math.round(Number(f.get('people'))), status: f.get('status'), note: f.get('note') }); }} className="space-y-4">
          <Input name="name" label="예약자명" defaultValue={editItem?.name} required />
          <PhoneInput name="phone" label="연락처" defaultValue={editItem?.phone} placeholder="01012345678" required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" label="날짜" type="date" defaultValue={editItem?.date || new Date().toISOString().split('T')[0]} required />
            <Input name="time" label="시간" type="time" defaultValue={editItem?.time || '12:00'} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input name="people" label="인원" type="number" step="1" min="1" defaultValue={editItem?.people ? Math.round(editItem.people) : 2} required />
            <Select name="status" label="상태" defaultValue={editItem?.status || 'pending'} options={[{ value: 'pending', label: '대기' }, { value: 'confirmed', label: '확정' }, { value: 'cancelled', label: '취소' }]} />
          </div>
          <Input name="note" label="메모" defaultValue={editItem?.note} />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowModal(null); setEditItem(null); }}>취소</Button>
            <Button type="submit" className="flex-1">{editItem ? '수정' : '추가'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showModal === 'customer'} onClose={() => { setShowModal(null); setEditItem(null); }} title={editItem ? '고객 수정' : '고객 추가'}>
        <form onSubmit={e => { e.preventDefault(); const f = new FormData(e.target); handleFormSubmit('customer', { name: f.get('name'), phone: f.get('phone'), tier: f.get('tier'), visits: Math.round(Number(f.get('visits'))), totalSpent: Math.round(Number(f.get('totalSpent'))), lastVisit: f.get('lastVisit') }); }} className="space-y-4">
          <Input name="name" label="고객명" defaultValue={editItem?.name} required />
          <PhoneInput name="phone" label="연락처" defaultValue={editItem?.phone} placeholder="01012345678" required />
          <Select name="tier" label="등급" defaultValue={editItem?.tier || 'Bronze'} options={[{ value: 'VIP', label: 'VIP' }, { value: 'Gold', label: 'Gold' }, { value: 'Silver', label: 'Silver' }, { value: 'Bronze', label: 'Bronze' }]} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="visits" label="방문 횟수" type="number" step="1" defaultValue={editItem?.visits ? Math.round(editItem.visits) : 0} required />
            <Input name="totalSpent" label="총 소비금액" type="number" step="1" defaultValue={editItem?.totalSpent ? Math.round(editItem.totalSpent) : 0} required />
          </div>
          <Input name="lastVisit" label="최근 방문일" type="date" defaultValue={editItem?.lastVisit || new Date().toISOString().split('T')[0]} required />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => { setShowModal(null); setEditItem(null); }}>취소</Button>
            <Button type="submit" className="flex-1">{editItem ? '수정' : '추가'}</Button>
          </div>
        </form>
      </Modal>

      {/* 모바일 하단 네비게이션 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800">
        <div className="flex justify-around items-center h-16">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: '홈' },
            { id: 'sales', icon: BarChart2, label: '매출' },
            { id: 'products', icon: Package, label: '상품' },
            { id: 'staff', icon: Users, label: '직원' },
            { id: 'reservations', icon: Calendar, label: '예약' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full transition ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-500'}`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
              {item.id === 'products' && stats.lowStockCount > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-3 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* 모바일 빠른 매출 입력 버튼 */}
      <button
        onClick={() => setShowSalesInput(true)}
        className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-95"
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
      >
        <Plus className="w-7 h-7 text-white" />
      </button>

      {/* 토스트 알림 */}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in max-w-sm"
            style={{
              backgroundColor: toast.type === 'success' ? '#059669' : toast.type === 'warning' ? '#d97706' : toast.type === 'error' ? '#dc2626' : '#6366f1',
              color: '#fff'
            }}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <X className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Bell className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* 알림 센터 */}
      {showNotificationCenter && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowNotificationCenter(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-700 overflow-hidden animate-slide-left"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">알림 센터</h3>
              <button onClick={() => setShowNotificationCenter(false)} className="p-2 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-64px)] p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">새로운 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { n.action?.(); setShowNotificationCenter(false); }}
                    className={`p-4 rounded-xl cursor-pointer transition hover:scale-[1.02] ${
                      n.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/20' :
                      n.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                      'bg-indigo-500/10 border border-indigo-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        n.type === 'warning' ? 'bg-amber-500/20' :
                        n.type === 'success' ? 'bg-emerald-500/20' :
                        'bg-indigo-500/20'
                      }`}>
                        {n.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                        {n.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                        {n.type === 'info' && <Bell className="w-5 h-5 text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">{n.title}</p>
                        <p className="text-slate-400 text-sm mt-1">{n.message}</p>
                        <p className="text-slate-600 text-xs mt-2">
                          {n.category === 'inventory' && '재고 관리'}
                          {n.category === 'reservation' && '예약 관리'}
                          {n.category === 'sales' && '매출'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 앱 래퍼 ==========
function AppContent() {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // 로그인 안 됨
  if (!currentUser) {
    return <AuthPage />;
  }

  // 로그인은 됐지만 업종 선택 안 됨
  if (!userProfile?.businessType) {
    return <BusinessTypeSelect />;
  }

  // 모두 완료 → 대시보드
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
