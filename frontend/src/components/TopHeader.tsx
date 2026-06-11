import { ChevronDown } from 'lucide-react';

export function TopHeader() {
  return (
    <div className="top-header">
      <div className="top-header__inner">
        <p>Summer Sale For All Swim Suits And Free Express Delivery - OFF 50%!</p>
        <button>ShopNow</button>
        <span>
          English <ChevronDown size={16} />
        </span>
      </div>
    </div>
  );
}
