import { useState } from 'react';
import { Coffee, UtensilsCrossed, ShoppingBag, Scissors, Package, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const businessTypes = [
  {
    id: 'cafe',
    name: '카페',
    description: '커피, 음료, 베이커리',
    icon: Coffee,
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'restaurant',
    name: '음식점',
    description: '한식, 중식, 양식 등',
    icon: UtensilsCrossed,
    color: 'from-red-500 to-pink-600'
  },
  {
    id: 'retail',
    name: '소매점',
    description: '의류, 잡화, 편의점',
    icon: ShoppingBag,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'salon',
    name: '미용실',
    description: '헤어, 네일, 뷰티',
    icon: Scissors,
    color: 'from-purple-500 to-violet-600'
  },
  {
    id: 'empty',
    name: '직접 설정',
    description: '빈 상태로 시작하기',
    icon: Package,
    color: 'from-slate-500 to-slate-600'
  }
];

export default function BusinessTypeSelect() {
  const { selectBusinessType, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const handleSelect = async (typeId) => {
    setSelected(typeId);
    setLoading(true);
    try {
      await selectBusinessType(typeId);
    } catch (error) {
      console.error('업종 선택 오류:', error);
      setLoading(false);
      setSelected(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">
            환영합니다, {userProfile?.ownerName || '사장'}님!
          </h1>
          <p className="text-slate-400 text-lg">
            업종을 선택하면 맞춤 템플릿으로 시작할 수 있어요
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {businessTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selected === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleSelect(type.id)}
                disabled={loading}
                className={`
                  relative p-6 rounded-2xl border-2 text-left transition-all duration-200
                  ${isSelected
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                  }
                  ${loading && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4`}>
                  {isSelected && loading ? (
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  ) : (
                    <Icon className="w-7 h-7 text-white" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-1">{type.name}</h3>
                <p className="text-slate-400 text-sm">{type.description}</p>

                {isSelected && (
                  <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-indigo-500" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          나중에 설정에서 언제든지 변경할 수 있어요
        </p>
      </div>
    </div>
  );
}
