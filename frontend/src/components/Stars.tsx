import { Star } from "lucide-react";

type StarsProps = {
  value?: number;
};

export function Stars({ value = 5 }: StarsProps) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={16} fill={star <= Math.round(value) ? "#ffad33" : "none"} color="#ffad33" />
      ))}
    </div>
  );
}
